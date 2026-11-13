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


def landing_capability_keys():
    keys = {f'infrastructure.capabilities.{key}.{field}'
            for key in ['plates', 'videos', 'sales', 'scheduling', 'social', 'content']
            for field in ['name', 'description']}
    keys.update(['infrastructure.capabilities.agents.description',
                 'infrastructure.connected.vision.status',
                 'infrastructure.connected.note', 'infrastructure.intelligence.note'])
    return keys


# Each versioned patch may only touch its own reviewed keys.
PATCHES = {
    'landing-capabilities-content.json': landing_capability_keys(),
    'payment-availability-content.json': {
        f'infrastructure.payments.{card}.{field}'
        for card in ['phone', 'subscriptions'] for field in ['status', 'description']},
}

# Multi-route patches (`routes` instead of `route`): each route maps to the exact
# keys it may touch. A key whose `before` is null is created; any other key must
# still hold `before` (or already hold `after`, which makes re-runs idempotent).
_REMOTE = 'paymentsInvoicing.remote.'
_CARD_PRESENT = 'solutions.group.intelligence.item.cardPresent.desc'
ROUTE_PATCHES = {
    'content-patches/cobros-remotos-a-terminal-preparacion.json': {
        '/payments-invoicing/': {'paymentsInvoicing.charge.terminal.prerequisite',
            *(_REMOTE + k for k in ['eyebrow', 'status', 'title', 'description',
                                    'currency', 'warning', 'guideCta'])},
        '/solutions/': {_CARD_PRESENT},
    },
    'content-patches/cobros-remotos-a-terminal-encendido.json': {
        '/payments-invoicing/': {_REMOTE + 'status'},
        '/solutions/': {_CARD_PRESENT},
    },
}


def validate_patch(patch, keys):
    assert (patch['tenant_slug'], patch['domain'], patch['route']) == (
        'oneplatform', '1platform.pro', '@infrastructure-home')
    assert set(patch['locales']) == {'en', 'es'}
    for changes in patch['locales'].values():
        assert set(changes) == keys
        assert all(isinstance(c['after'], str) and c['after'].strip() for c in changes.values())

def validate_route_patch(patch, routes):
    assert (patch['tenant_slug'], patch['domain']) == ('oneplatform', '1platform.pro')
    assert set(patch['routes']) == set(routes)
    for route, locales in patch['routes'].items():
        assert set(locales) == {'en', 'es'}
        for changes in locales.values():
            assert set(changes) == routes[route]
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
    parser.add_argument('--patch', choices=sorted([*PATCHES, *ROUTE_PATCHES]), default='landing-capabilities-content.json')
    args = parser.parse_args()
    from app.core.config import settings
    allowed = {
        'local': 'e2e_landing_capabilities_refresh',
        'production': '1platform-api-prod',
    }
    assert allowed.get(settings.ENVIRONMENT.lower()) == settings.MONGODB_DB_NAME
    patch = json.loads((Path(__file__).resolve().parents[1] / 'docs' / args.patch).read_text())
    multi = args.patch in ROUTE_PATCHES
    if multi:
        validate_route_patch(patch, ROUTE_PATCHES[args.patch])
    else:
        validate_patch(patch, PATCHES[args.patch])
    with MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000) as client:
        db = client[settings.MONGODB_DB_NAME]
        assert db.site_tenants.count_documents({
            'slug': 'oneplatform', 'domain': '1platform.pro', 'status': 'published'}) == 1
        routes = list(patch['routes']) if multi else ['@infrastructure-home']
        docs = list(db.site_pages.find({'tenant_slug': 'oneplatform',
            'route': {'$in': routes}, 'locale': {'$in': ['en', 'es']}, 'published': True}))
        expected_docs = 2 * len(routes)
        assert len(docs) == expected_docs and {(doc['route'], doc['locale']) for doc in docs} == {
            (r, l) for r in routes for l in ('en', 'es')}
        changes_for = (lambda doc: patch['routes'][doc['route']][doc['locale']]) if multi else (
            lambda doc: patch['locales'][doc['locale']])
        prepared = [(doc, updated_blocks(doc['blocks'], changes_for(doc))) for doc in docs]
        print(json.dumps({'mode': 'apply' if args.apply else 'dry-run',
            'patch': args.patch, 'tenant': 'oneplatform', 'documents': expected_docs,
            'keys_per_locale': sum(len(v['en']) for v in patch['routes'].values()) if multi else len(patch['locales']['en']),
            'changed_documents': sum(doc['blocks'] != blocks for doc, blocks in prepared)}))
        if not args.apply:
            return
        backup = Path(tempfile.mkdtemp(prefix='landing-capabilities-backup-')) / 'pages.json'
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(dumps(docs))
        count = apply_prepared(db, prepared)
        print(json.dumps({'updated': count, 'verified_documents': expected_docs, 'backup': str(backup)}))


if __name__ == '__main__':
    main()
