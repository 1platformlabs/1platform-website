"""Exercise content CAS and idempotency against the private bank, never PROD."""
import json
import os
from pathlib import Path
import subprocess
import sys
from pymongo import MongoClient

assert os.environ['MONGODB_DB_NAME'] == 'e2e_landing_capabilities_refresh'
assert os.environ['MONGODB_URL'].startswith('mongodb://127.0.0.1:27106/')
root = Path(__file__).resolve().parents[2]
patch = json.loads((root / 'docs/landing-capabilities-content.json').read_text())
with MongoClient(os.environ['MONGODB_URL']) as client:
    collection = client[os.environ['MONGODB_DB_NAME']].site_pages
    query = {'tenant_slug': 'oneplatform', 'route': '@infrastructure-home', 'locale': {'$in': ['en', 'es']}, 'published': True}
    docs = list(collection.find(query))
    assert len(docs) == 2
    for doc in docs:
        blocks = dict(doc['blocks'])
        for key, change in patch['locales'][doc['locale']].items():
            if change['before'] is None:
                blocks.pop(key, None)
            else:
                blocks[key] = change['before']
        collection.update_one({'_id': doc['_id']}, {'$set': {'blocks': blocks}})
    before = {doc['_id']: doc for doc in collection.find({})}
    command = [sys.executable, str(root / 'scripts/update-landing-capabilities.py'), '--patch', str(root / 'docs/landing-capabilities-content.json')]
    subprocess.run(command, check=True)
    assert before == {doc['_id']: doc for doc in collection.find({})}, 'Dry-run must not write'
    subprocess.run([*command, '--apply'], check=True)
    after = {doc['_id']: doc for doc in collection.find({})}
    assert before.keys() == after.keys()
    changed = {doc['_id'] for doc in docs}
    for key, old in before.items():
        current = after[key]
        if key not in changed:
            assert current == old, 'Unrelated document changed'
            continue
        expected = dict(old['blocks'])
        expected.update({key: change['after'] for key, change in patch['locales'][old['locale']].items()})
        assert current['blocks'] == expected
        assert current['updated_at'] > old['updated_at']
        assert {k:v for k,v in current.items() if k not in ('blocks','updated_at')} == {k:v for k,v in old.items() if k not in ('blocks','updated_at')}
        result = collection.update_one({'_id': key, 'updated_at': old['updated_at']}, {'$set': {'blocks': old['blocks']}})
        assert result.matched_count == 0, 'A stale Core writer must not overwrite the patch'
    subprocess.run([*command, '--apply'], check=True)
    assert after == {doc['_id']: doc for doc in collection.find({})}, 'Second apply must be a no-op'
print('Private DB: dry-run, exact scope, metadata preservation, stale writer rejection and idempotency passed')
