/**
 * The ONE place that loads `three`, and the honest number for what it costs.
 *
 * three 0.185 ships split in two files — `three.module.min.js` (86.8 KB gzip)
 * IMPORTS `three.core.min.js` (101.5 KB gzip) — so "three is 86.8 KB gzip"
 * measures half the library. The real cost is ~188 KB gzip however it is
 * served; bundled it comes out at 187.3 (measured on this build, single
 * hashed chunk, loaded only after `requestIdleCallback` on the home). That is
 * why the home's JS budget is 200 KB gzip and not the 180 the plan derived
 * from the half-measurement (D-5 — recorded as a deviation).
 *
 * One call site so the chunk graph stays a straight line: boot → scene →
 * here → three.
 */export type ThreeModule = typeof import('three');

let promise: Promise<ThreeModule> | null = null;

export function loadThree(): Promise<ThreeModule> {
  promise ??= import('three');
  return promise;
}
