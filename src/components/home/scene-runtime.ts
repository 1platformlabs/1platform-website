/**
 * Shared WebGL boilerplate for the home's two scenes (D-5).
 *
 * One place owns the renderer, the resize handling, the RAF loop and the
 * teardown, because the failure modes live exactly there: `ViewTransitions`
 * re-fires `astro:page-load` on every navigation, so a scene that does not
 * dispose leaks a WebGL context per page view until the browser starts
 * refusing new ones. `three-boot.ts` calls the returned cleanup from
 * `astro:before-swap`.
 *
 * The loop also pauses when the canvas leaves the viewport or the tab is
 * hidden — a hero animation nobody can see has no business spending GPU.
 */
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { loadThree } from './three-load';

export type SceneContext = {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  width: number;
  height: number;
};

export type SceneDefinition = {
  /** Build the scene. Returns an optional extra disposer (textures, listeners). */
  setup(ctx: SceneContext): (() => void) | void;
  /** Called every rendered frame with seconds since mount and since last frame. */
  frame(ctx: SceneContext, elapsed: number, delta: number): void;
  /** Perspective distance in CSS px — matched to the CSS layer's `perspective`. */
  perspective: number;
};

export async function mountScene(
  canvas: HTMLCanvasElement,
  definition: SceneDefinition,
): Promise<() => void> {
  const THREE = await loadThree();

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 6000);
  camera.position.set(0, 0, definition.perspective);

  const ctx: SceneContext = { canvas, renderer, scene, camera, width: 0, height: 0 };

  /** Match the CSS layer: world units are CSS pixels on the z=0 plane. */
  function resize() {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    ctx.width = width;
    ctx.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = (2 * Math.atan(height / 2 / definition.perspective) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const extraDispose = definition.setup(ctx) ?? undefined;

  let raf = 0;
  let running = false;
  let inView = true;
  let last = performance.now();
  const start = last;

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const delta = (now - last) / 1000;
    last = now;
    definition.frame(ctx, (now - start) / 1000, delta);
    renderer.render(scene, camera);
  }

  function play() {
    if (running || !inView || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    inView ? play() : pause();
  });
  io.observe(canvas);

  const onVisibility = () => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVisibility);

  play();

  return () => {
    pause();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    extraDispose?.();
    scene.traverse((obj) => {
      const mesh = obj as { geometry?: { dispose(): void }; material?: { map?: { dispose(): void }; dispose(): void } };
      mesh.geometry?.dispose();
      if (mesh.material) {
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

/** The Lenis instance, published by lenis-init.ts — the single scroll source. */
export function currentScroll(): number {
  const lenis = (globalThis as { __lenis?: { scroll?: number } }).__lenis;
  return typeof lenis?.scroll === 'number' ? lenis.scroll : globalThis.scrollY;
}
