import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Guard for the PROD deploy step in `.github/workflows/prod.yml`
 * ("Deploy al dedicado (PROD)").
 *
 * Read as TEXT, not parsed as YAML — same convention as the rest of the
 * ecosystem's workflow-wiring tests: the only YAML parsers around are
 * transitive, undeclared `node_modules`, so leaning on one would make this
 * gate depend on something an `npm install` can pull out from under it.
 *
 * What this pins (issue #88): the dedicated host runs git 1.8.3.1, where
 * `--tags` REPLACES the configured refspec instead of adding to it. So
 * `git fetch --prune --force --all --tags` fetches tags only and never
 * updates `refs/remotes/origin/*` — `origin/main` on the host froze at an old
 * release for two weeks with every deploy reporting green, until the step
 * was changed to reset to a commit SHA instead of a tag (the SHA never
 * arrived, and `git reset --hard` died loudly with
 * `fatal: Could not parse object <sha>`).
 */

const WORKFLOW_PATH = '.github/workflows/prod.yml';

function deployScript(): string {
  const yaml = readFileSync(WORKFLOW_PATH, 'utf-8');
  const jobStart = yaml.indexOf('  deploy_hetzner:');
  expect(jobStart, 'deploy_hetzner job not found in prod.yml').toBeGreaterThan(-1);
  // Next top-level job (two-space indented key) after deploy_hetzner, or EOF.
  const rest = yaml.slice(jobStart + 1);
  const nextJobMatch = rest.match(/\n {2}[a-zA-Z_-]+:\n/);
  const jobEnd = nextJobMatch
    ? jobStart + 1 + nextJobMatch.index!
    : yaml.length;
  return yaml.slice(jobStart, jobEnd);
}

test('deploy step never fetches with a bare --all --tags (git 1.8 drops the heads refspec)', () => {
  const script = deployScript();

  // Ancla NEGATIVA: la forma que rompe en git 1.8 no puede volver a colarse.
  // Sub-cadena exacta (no regex) para que un reordenamiento de flags no la
  // esquive por accidente ni la haga fallar por un motivo ajeno.
  expect(script).not.toContain('fetch --prune --force --all --tags');
  expect(script).not.toMatch(/git fetch[^\n]*--all[^\n]*--tags/);

  // Ancla POSITIVA #1: refspecs explícitas para heads y tags — la forma que
  // git 1.8 sí honra (medida en 1platform-console, PR #28 / issue de origen).
  expect(script).toContain('+refs/heads/*:refs/remotes/origin/*');
  expect(script).toContain('+refs/tags/*:refs/tags/*');

  // Ancla POSITIVA #2: una guarda verifica que el SHA a desplegar SÍ llegó
  // ANTES de tocar el árbol de trabajo — si el fetch no actualiza
  // `origin/main`, esto falla ruidosamente en vez de dejar que
  // `git reset --hard` reviente más abajo con un mensaje que no dice qué
  // pasó, o (peor, con un TAG) no reviente en absoluto y sirva un commit
  // viejo en silencio.
  expect(script).toMatch(/git cat-file -e "\$\{VERSION\}\^\{commit\}"/);

  // Orden: la guarda va ANTES del `git reset --hard`, no después ni ausente.
  const guardIndex = script.indexOf('git cat-file -e "${VERSION}^{commit}"');
  const resetIndex = script.indexOf('git reset --hard "${VERSION}"');
  expect(guardIndex).toBeGreaterThan(-1);
  expect(resetIndex).toBeGreaterThan(-1);
  expect(guardIndex).toBeLessThan(resetIndex);
});
