import { readFileSync } from 'node:fs'

export function fabricatedPricingPattern(): RegExp {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8')
  // The only `-rnE` (no `i`) grep against BOTH `$SRC` and `$PROSE` in the
  // file — rule 10 is the only other rule scanning both directories, and it
  // uses `-rniE`, so this cannot match rule 10's line by accident.
  const m = guard.match(/grep -rnE '([^']+)' \$SRC \$PROSE/)
  if (!m) throw new Error('could not read rule 3 from check-tells.sh')
  return new RegExp(m[1])
}

export function replaceCountPatterns(): { en: RegExp; es: RegExp } {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8')
  const candidates = [...guard.matchAll(/grep -rniE '([^']+)' \$SRC\b/g)].map((m) => m[1])
  const en = candidates.find((p) => p.includes('vendors'))
  const es = candidates.find((p) => p.includes('herramientas'))
  if (!en || !es) throw new Error('could not read rule 4 from check-tells.sh')
  return { en: new RegExp(en, 'i'), es: new RegExp(es, 'i') }
}

