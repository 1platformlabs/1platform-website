/**
 * The hero fan, in WebGL (LMW-04 CA-2, D-19).
 *
 * The geometry is READ FROM THE CSS LAYER, not duplicated: every plane in
 * `.fan` carries its size, angle, radius and vertical offset as data
 * attributes, and its texture is the very image the CSS layer already loaded.
 * That is what makes the crossfade seamless — the scene cannot disagree with
 * the fallback about where a plane sits, because both read the same numbers.
 *
 * Motion: a slow drift (peaking at ~0.02 rad/s) plus a scroll parallax fed by
 * Lenis, the page's single scroll source. The first rendered frame reveals the
 * canvas and fades the CSS layer out; disposal restores it.
 */
import { mountScene, currentScroll } from './scene-runtime';
import { loadThree } from './three-load';

const PERSPECTIVE = 1200;
const PARALLAX = 0.15;

export async function mount(canvas: HTMLCanvasElement): Promise<() => void> {
  const THREE = await loadThree();
  const fan = document.querySelector<HTMLElement>('[data-fan]');
  const planes = Array.from(fan?.querySelectorAll<HTMLElement>('[data-plane]') ?? []);
  if (!fan || planes.length === 0) return () => {};

  const loader = new THREE.TextureLoader();
  const group = new THREE.Group();
  let revealed = false;

  const cleanupScene = await mountScene(canvas, {
    perspective: PERSPECTIVE,
    setup({ scene }) {
      for (const el of planes) {
        const w = Number(el.dataset.w);
        const h = Number(el.dataset.h);
        const angle = (Number(el.dataset.angle) * Math.PI) / 180;
        const radius = Number(el.dataset.radius);
        const dy = Number(el.dataset.dy ?? 0);

        const geometry = new THREE.PlaneGeometry(w, h);
        const img = el.querySelector('img');
        const material = new THREE.MeshBasicMaterial({
          // Placeholder planes (no capture yet) render as the neutral surface
          // the SVG placeholder uses, so the two layers still match.
          color: img ? 0xffffff : 0xd9d9d9,
          toneMapped: false,
        });
        if (img) {
          const texture = loader.load(img.currentSrc || img.src);
          texture.colorSpace = THREE.SRGBColorSpace;
          material.map = texture;
        }

        const mesh = new THREE.Mesh(geometry, material);
        // CSS: translateY(dy) rotateY(angle) translateZ(-radius) puts the
        // plane at (-R·sinθ, dy, -R·cosθ) facing the orbit centre. CSS y grows
        // downward and three's grows upward, hence the sign flip on dy.
        mesh.position.set(-radius * Math.sin(angle), -dy, -radius * Math.cos(angle));
        mesh.rotation.y = angle;
        group.add(mesh);
      }
      scene.add(group);
    },
    frame(_ctx, elapsed) {
      // Peak angular velocity 0.05 · 0.4 = 0.02 rad/s (D-5's drift budget).
      group.rotation.y = 0.05 * Math.sin(elapsed * 0.4);
      group.position.y = currentScroll() * PARALLAX * -1;

      if (!revealed) {
        revealed = true;
        canvas.hidden = false;
        canvas.removeAttribute('hidden');
        fan.classList.add('fan--upgraded');
      }
    },
  });

  return () => {
    cleanupScene();
    canvas.hidden = true;
    fan.classList.remove('fan--upgraded');
  };
}
