"""Scoped SitePages update. Dry-run by default; production apply needs approval.

Run with the Core API interpreter and working directory. The patch contains
public copy only. No document replacement from a public census is permitted.
"""
import argparse
import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson.json_util import dumps
from pymongo import MongoClient


def updated_blocks(blocks, changes):
    result = dict(blocks)
    for key, change in changes.items():
        if blocks.get(key) not in (change['before'], change['after']):
            raise ValueError(f'Content changed concurrently: {key}')
        result[key] = change['after']
    return result


def next_timestamp(previous):
    # Mongo stores milliseconds. Advance the same CAS token used by Core writers.
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    now = now.replace(microsecond=now.microsecond // 1000 * 1000)
    if previous is not None:
        previous = previous.replace(tzinfo=None)
        now = max(now, previous + timedelta(milliseconds=1))
    return now


def validate_patch(patch):
    assert (patch['tenant_slug'], patch['domain'], patch['route']) == (
        'oneplatform', '1platform.pro', '@infrastructure-home')
    assert set(patch['locales']) == {'en', 'es'}
    keys = {f'infrastructure.capabilities.{key}.{field}'
            for key in ['plates', 'videos', 'sales', 'scheduling', 'social', 'content']
            for field in ['name', 'description']}
    keys.update(['infrastructure.capabilities.agents.description',
                 'infrastructure.connected.vision.status',
                 'infrastructure.connected.note', 'infrastructure.intelligence.note'])
    for changes in patch['locales'].values():
        assert set(changes) == keys
        assert all(isinstance(c['after'], str) and c['after'].strip() for c in changes.values())

def apply_prepared(db, prepared):
    changed = []
    try:
        for doc, blocks in prepared:
            if doc['blocks'] == blocks:
                continue
            timestamp = next_timestamp(doc.get('updated_at'))
            result = db.site_pages.update_one({'_id': doc['_id'],
                'tenant_slug': 'oneplatform', 'published': True, 'blocks': doc['blocks'],
                'updated_at': doc.get('updated_at')},
                {'$set': {'blocks': blocks, 'updated_at': timestamp}})
            assert result.modified_count == 1, 'Concurrent content update; refusing overwrite'
            changed.append((doc, blocks, timestamp))
        for doc, blocks in prepared:
            expected = {**doc, 'blocks': blocks}
            for changed_doc, _, timestamp in changed:
                if changed_doc['_id'] == doc['_id']:
                    expected['updated_at'] = timestamp
            assert db.site_pages.find_one({'_id': doc['_id']}) == expected
    except BaseException:
        for doc, blocks, timestamp in reversed(changed):
            result = db.site_pages.update_one({'_id': doc['_id'], 'blocks': blocks,
                'updated_at': timestamp}, {'$set': {'blocks': doc['blocks'],
                'updated_at': next_timestamp(timestamp)}})
            assert result.modified_count == 1, 'Rollback blocked by concurrent edit; inspect backup'
        raise
    return len(changed)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    from app.core.config import settings
    allowed = {
        'local': 'e2e_landing_capabilities_refresh',
        'production': '1platform-api-prod',
    }
    assert allowed.get(settings.ENVIRONMENT.lower()) == settings.MONGODB_DB_NAME
    patch = json.loads((Path(__file__).resolve().parents[1] / 'docs/landing-capabilities-content.json').read_text())
    validate_patch(patch)
    with MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000) as client:
        db = client[settings.MONGODB_DB_NAME]
        assert db.site_tenants.count_documents({
            'slug': 'oneplatform', 'domain': '1platform.pro', 'status': 'published'}) == 1
        docs = list(db.site_pages.find({'tenant_slug': 'oneplatform',
            'route': '@infrastructure-home', 'locale': {'$in': ['en', 'es']}, 'published': True}))
        assert len(docs) == 2 and {doc['locale'] for doc in docs} == {'en', 'es'}
        prepared = [(doc, updated_blocks(doc['blocks'], patch['locales'][doc['locale']])) for doc in docs]
        print(json.dumps({'mode': 'apply' if args.apply else 'dry-run',
            'tenant': 'oneplatform', 'documents': 2, 'keys_per_locale': len(patch['locales']['en']),
            'changed_documents': sum(doc['blocks'] != blocks for doc, blocks in prepared)}))
        if not args.apply:
            return
        backup = Path(tempfile.mkdtemp(prefix='landing-capabilities-backup-')) / 'pages.json'
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(dumps(docs))
        count = apply_prepared(db, prepared)
        print(json.dumps({'updated': count, 'verified_documents': 2, 'backup': str(backup)}))


if __name__ == '__main__':
    main()
