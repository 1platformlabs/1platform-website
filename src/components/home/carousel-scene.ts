/**
 * The module carousel in WebGL (LMW-07 CA-3, D-5): a ring of "monitors" that
 * turns as the DOM controller moves the index. Shares `three` and the runtime
 * with the hero — one dependency, one chunk.
 *
 * The DOM stays in charge: `ModuleCarousel.astro` owns the index, the arrows,
 * the progress bar and the live region, and broadcasts `mods:index`; this
 * scene only follows. A click raycasts to a plane and navigates to the same
 * URL the fallback card links to (CA-4); the keyboard path is the DOM's
 * hidden "open" link, which needs no raycast.
 *
 * Each plane's texture is the CARD rasterised — media, bezel, dot and name —
 * so the upgrade shows the same thing the fallback shows.
 */
import { CARD_PITCH } from './modules-content';
import { mountScene } from './scene-runtime';
import { loadThree } from './three-load';

const PERSPECTIVE = 1200;
const TEXTURE_SIZE = 452;

function rasterizeCard(card: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  // Tokens only — no hex fallback (the guard's rule 5, and rightly: a
  // fallback here would let a renamed token repaint the scene off-system in
  // silence). A missing token throws; three-boot catches it and the CSS rail
  // stays, which is the correct failure.
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string): string => {
    const value = styles.getPropertyValue(name).trim();
    if (!value) throw new Error(`[carousel] token ${name} is not defined`);
    return value;
  };
  const ink = token('--ref-ink');
  const gray = token('--ref-gray');
  const orange = token('--ref-orange');
  const white = token('--ref-white');

  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const pad = 16;
  const mediaH = TEXTURE_SIZE - pad * 2 - 56;
  const img = card.querySelector('img');
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, pad, pad, TEXTURE_SIZE - pad * 2, mediaH);
  } else {
    ctx.fillStyle = gray;
    ctx.fillRect(pad, pad, TEXTURE_SIZE - pad * 2, mediaH);
  }

  ctx.fillStyle = orange;
  ctx.beginPath();
  ctx.arc(pad + 10, pad + 10, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = white;
  ctx.font = '400 25.6px Inter, system-ui, sans-serif';
  ctx.fillText(card.dataset.modLabel ?? '', pad, TEXTURE_SIZE - 24, TEXTURE_SIZE - pad * 2);

  return canvas;
}

export async function mount(canvas: HTMLCanvasElement): Promise<() => void> {
  const THREE = await loadThree();
  const section = canvas.closest('section');
  const viewport = document.querySelector<HTMLElement>('[data-mods]');
  const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-mod-card]'));
  if (!section || !viewport || cards.length === 0) return () => {};

  const count = cards.length;
  const step = (Math.PI * 2) / count;
  const radius = CARD_PITCH / (2 * Math.sin(step / 2));
  let targetIndex = Number(viewport.dataset.initial ?? 0);
  let angle = -targetIndex * step;
  let revealed = false;

  const meshes: { mesh: InstanceType<ThreeMesh>; href: string }[] = [];
  type ThreeMesh = typeof THREE.Mesh;

  const onIndex = (e: Event) => {
    targetIndex = (e as CustomEvent<{ index: number }>).detail.index;
  };
  viewport.addEventListener('mods:index', onIndex);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, cameraRef!);
    const hit = raycaster.intersectObjects(meshes.map((m) => m.mesh))[0];
    if (!hit) return;
    const found = meshes.find((m) => m.mesh === hit.object);
    if (found) globalThis.location.href = found.href;
  };
  canvas.addEventListener('click', onClick);

  let cameraRef: InstanceType<typeof THREE.PerspectiveCamera> | null = null;

  const cleanupScene = await mountScene(canvas, {
    perspective: PERSPECTIVE,
    setup({ scene, camera }) {
      cameraRef = camera;
      for (const card of cards) {
        const texture = new THREE.CanvasTexture(rasterizeCard(card));
        texture.colorSpace = THREE.SRGBColorSpace;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(226, 226),
          new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
        );
        scene.add(mesh);
        meshes.push({ mesh, href: card.href });
      }
    },
    frame(_ctx, _elapsed, delta) {
      const target = -targetIndex * step;
      angle += (target - angle) * Math.min(1, delta * 6);
      meshes.forEach(({ mesh }, i) => {
        const theta = i * step + angle;
        mesh.position.set(radius * Math.sin(theta), 0, radius * Math.cos(theta) - radius);
        mesh.rotation.y = theta;
      });
      if (!revealed) {
        revealed = true;
        canvas.hidden = false;
        section.classList.add('mods--upgraded');
      }
    },
  });

  return () => {
    viewport.removeEventListener('mods:index', onIndex);
    canvas.removeEventListener('click', onClick);
    cleanupScene();
    canvas.hidden = true;
    section.classList.remove('mods--upgraded');
  };
}
