/**
 * The module carousel, in WebGL (LMW-07, D-5). Shares `three` and the runtime
 * with the hero — one dependency, one chunk. Filled in by phase F3; until the
 * carousel section exists there is no `[data-scene="carousel"]` canvas and
 * this module is never imported.
 */
export async function mount(_canvas: HTMLCanvasElement): Promise<() => void> {
  return () => {};
}
