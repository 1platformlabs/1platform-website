import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

const VISUAL_DIR = join(process.cwd(), 'tests', 'visual')

function orphanSnapshotDirectories(specs: Set<string>, snapshotDirs: string[]): string[] {
  return snapshotDirs.filter((dir) => !specs.has(dir.replace(/-snapshots$/, ''))).sort()
}

test('every visual snapshot directory has an executable spec', () => {
  const entries = readdirSync(VISUAL_DIR, { withFileTypes: true })
  const specs = new Set(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts')).map((entry) => entry.name))
  const snapshotDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.spec.ts-snapshots'))
    .map((entry) => entry.name)

  expect(
    orphanSnapshotDirectories(specs, snapshotDirs),
    'a screenshot directory survived after its only executable spec was deleted',
  ).toEqual([])

  const snapshottedSpecs = [...specs].filter((spec) =>
    readFileSync(join(VISUAL_DIR, spec), 'utf8').includes('toHaveScreenshot('),
  )
  const snapshotSet = new Set(snapshotDirs)
  expect(
    snapshottedSpecs.filter((spec) => !snapshotSet.has(`${spec}-snapshots`)),
    'a visual spec has no committed Linux baseline',
  ).toEqual([])

  const pngs = snapshotDirs.flatMap((dir) =>
    readdirSync(join(VISUAL_DIR, dir)).filter((name) => name.endsWith('-linux.png')),
  )
  expect(pngs, 'the visual contract is four platform + four clinic renders').toHaveLength(8)
})

test('CONTROL: the inventory detects the historical showcase failure shape', () => {
  expect(
    orphanSnapshotDirectories(new Set(['home.spec.ts']), [
      'home.spec.ts-snapshots',
      'showcase.spec.ts-snapshots',
    ]),
  ).toEqual(['showcase.spec.ts-snapshots'])
})
