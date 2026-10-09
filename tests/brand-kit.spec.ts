import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { kitAssetFile } from '../scripts/brand-kit.mjs';

test('kit assets accept only the matching tenant and exact role filename', async () => {
  const base = await mkdtemp(join(tmpdir(), 'brand-kit-path-'));
  try {
    await mkdir(join(base, 'tenant-a'));
    await writeFile(join(base, 'tenant-a/logo.png'), 'original');
    expect(await kitAssetFile(base, 'tenant-a', 'tenant-a/logo.png', 'logo.png')).toBe(await realpath(join(base, 'tenant-a/logo.png')));
    for (const path of ['../logo.png', '/tmp/logo.png', 'tenant-b/logo.png', 'tenant-a/../logo.png', 'tenant-a/logo-source.png', 'tenant-a\\logo.png']) {
      await expect(kitAssetFile(base, 'tenant-a', path, 'logo.png')).rejects.toThrow('Invalid brand kit asset path');
    }
    for (const slug of ['../tenant-a', 'tenant/a', '', 'Tenant-A']) {
      await expect(kitAssetFile(base, slug, `${slug}/logo.png`, 'logo.png')).rejects.toThrow('Invalid brand kit asset identity');
    }
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('source, destination and tenant-directory symlinks cannot escape the kit', async () => {
  const base = await mkdtemp(join(tmpdir(), 'brand-kit-link-'));
  try {
    const kit = join(base, 'kit');
    const outside = join(base, 'outside');
    await mkdir(join(kit, 'tenant-a'), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, 'logo.png'), 'must remain unchanged');
    await symlink(join(outside, 'logo.png'), join(kit, 'tenant-a/logo.png'));
    await symlink(join(outside, 'logo.png'), join(kit, 'tenant-a/logo-source.png'));
    await symlink(outside, join(kit, 'tenant-b'));
    for (const [slug, name] of [['tenant-a', 'logo.png'], ['tenant-a', 'logo-source.png'], ['tenant-b', 'logo.png']]) {
      await expect(kitAssetFile(kit, slug, `${slug}/${name}`, name)).rejects.toThrow('symbolic links');
    }
    expect(await readFile(join(outside, 'logo.png'), 'utf8')).toBe('must remain unchanged');
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('preparation refuses CLI manifest paths before reading or changing files', async () => {
  const base = await mkdtemp(join(tmpdir(), 'brand-kit-cli-'));
  try {
    const outside = join(base, 'manifest.json');
    await writeFile(outside, '{"untouched":true}\n');
    const result = spawnSync(process.execPath, ['scripts/prepare-brand-assets.mjs', outside], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('accepts no arguments');
    expect(await readFile(outside, 'utf8')).toBe('{"untouched":true}\n');
  } finally { await rm(base, { recursive: true, force: true }); }
});
