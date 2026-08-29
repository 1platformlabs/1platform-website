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

export type CoverUv = { repeatX: number; repeatY: number; offsetX: number; offsetY: number };

/** UV crop equivalent to CSS `object-fit: cover`, centred on both axes. */
export function coverUv(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverUv {
  if (
    [sourceWidth, sourceHeight, targetWidth, targetHeight].some(
      (value) => !Number.isFinite(value) || value <= 0,
    )
  ) {
    return { repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 };
  }
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  if (sourceAspect > targetAspect) {
    const repeatX = targetAspect / sourceAspect;
    return { repeatX, repeatY: 1, offsetX: (1 - repeatX) / 2, offsetY: 0 };
  }
  const repeatY = sourceAspect / targetAspect;
  return { repeatX: 1, repeatY, offsetX: 0, offsetY: (1 - repeatY) / 2 };
}

export async function mount(canvas: HTMLCanvasElement): Promise<() => void> {
  const THREE = await loadThree();
  const fan = document.querySelector<HTMLElement>('[data-fan]');
  const planes = Array.from(fan?.querySelectorAll<HTMLElement>('[data-plane]') ?? []);
  if (!fan || planes.length === 0) return () => {};

  // Tokens only: if one disappears, the upgrade fails before allocating any
  // textures and three-boot leaves the complete CSS fallback in place.
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string): string => {
    const value = styles.getPropertyValue(name).trim();
    if (!value) throw new Error(`[fan] token ${name} is not defined`);
    return value;
  };
  const ink = token('--ref-ink');
  const gray = token('--ref-gray');

  const loader = new THREE.TextureLoader();
  const imageUrls = [
    ...new Set(
      planes.flatMap((plane) =>
        Array.from(plane.querySelectorAll<HTMLImageElement>('img'), (img) => img.currentSrc || img.src),
      ),
    ),
  ];
  // Reveal only after every real capture is available. The CSS layer stays
  // visible while these load, so the upgrade never flashes blank planes.
  const textures = await (async () => {
    const loaded = new Set<InstanceType<typeof THREE.Texture>>();
    try {
      const entries = await Promise.all(
        imageUrls.map(async (url) => {
          const texture = await loader.loadAsync(url);
          loaded.add(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          return [url, texture] as const;
        }),
      );
      return new Map(entries);
    } catch (error) {
      loaded.forEach((texture) => texture.dispose());
      throw error;
    }
  })();
  const fitCover = (
    texture: InstanceType<typeof THREE.Texture> | undefined,
    targetWidth: number,
    targetHeight: number,
  ) => {
    if (!texture) return undefined;
    const image = texture.image as {
      width?: number;
      height?: number;
      naturalWidth?: number;
      naturalHeight?: number;
    };
    const uv = coverUv(
      image.naturalWidth ?? image.width ?? 0,
      image.naturalHeight ?? image.height ?? 0,
      targetWidth,
      targetHeight,
    );
    texture.repeat.set(uv.repeatX, uv.repeatY);
    texture.offset.set(uv.offsetX, uv.offsetY);
    texture.needsUpdate = true;
    return texture;
  };
  // A View Transition may have removed this page while the textures were in
  // flight. Do not mount a renderer on a detached canvas or leave its textures
  // alive until some future navigation happens to clean them up.
  if (!canvas.isConnected || !fan.isConnected) {
    textures.forEach((texture) => texture.dispose());
    return () => {};
  }
  const group = new THREE.Group();
  let revealed = false;
  let renderedMediaCount = 0;

  let cleanupScene: () => void;
  try {
    cleanupScene = await mountScene(canvas, {
      perspective: PERSPECTIVE,
      setup({ scene }) {
        // Attach first so mountScene can traverse and dispose any meshes that
        // were already created if a later plane fails during setup.
        scene.add(group);
        for (const el of planes) {
          const w = Number(el.dataset.w);
          const h = Number(el.dataset.h);
          const angle = (Number(el.dataset.angle) * Math.PI) / 180;
          const radius = Number(el.dataset.radius);
          const dy = Number(el.dataset.dy ?? 0);

          const planeGroup = new THREE.Group();
          // CSS: translateY(dy) rotateY(angle) translateZ(-radius) puts the
          // plane at (-R·sinθ, dy, -R·cosθ) facing the orbit centre. CSS y grows
          // downward and three's grows upward, hence the sign flip on dy.
          planeGroup.position.set(-radius * Math.sin(angle), -dy, -radius * Math.cos(angle));
          planeGroup.rotation.y = angle;

          const media = Array.from(el.querySelectorAll<HTMLElement>('img, svg[data-placeholder]'));
          if (el.classList.contains('fan__plane--strip')) {
            // The DOM strip is one dark frame containing four square captures.
            // The previous upgrade textured one 550 × 150 plane with only the
            // first image, silently reducing 14 media to 11. Mirror the DOM with
            // a backplate and four independent meshes instead.
            planeGroup.add(
              new THREE.Mesh(
                new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({ color: ink, toneMapped: false }),
              ),
            );
            const padding = 6;
            const gap = 4;
            const cell = Math.min(
              (w - padding * 2 - gap * (media.length - 1)) / media.length,
              h - padding * 2,
            );
            const railWidth = cell * media.length + gap * (media.length - 1);
            media.forEach((item, index) => {
              const img = item instanceof HTMLImageElement ? item : null;
              const texture = fitCover(
                img ? textures.get(img.currentSrc || img.src) : undefined,
                cell,
                cell,
              );
              if (texture) renderedMediaCount += 1;
              const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(cell, cell),
                new THREE.MeshBasicMaterial({
                  color: texture ? 0xffffff : gray,
                  map: texture,
                  toneMapped: false,
                }),
              );
              mesh.position.set(-railWidth / 2 + cell / 2 + index * (cell + gap), 0, 1);
              planeGroup.add(mesh);
            });
          } else {
            const img = el.querySelector<HTMLImageElement>('img');
            const texture = fitCover(img ? textures.get(img.currentSrc || img.src) : undefined, w, h);
            if (texture) renderedMediaCount += 1;
            const frame = new THREE.Mesh(
              new THREE.PlaneGeometry(w + 4, h + 4),
              new THREE.MeshBasicMaterial({
                color: ink,
                opacity: 0.16,
                transparent: true,
                toneMapped: false,
                depthWrite: false,
              }),
            );
            frame.position.z = -1;
            planeGroup.add(frame);
            planeGroup.add(
              new THREE.Mesh(
                new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({
                  // Placeholder planes use the same neutral system surface as
                  // their SVG fallback, so a partial capture set stays honest.
                  color: texture ? 0xffffff : gray,
                  map: texture,
                  toneMapped: false,
                }),
              ),
            );
          }

          group.add(planeGroup);
        }
      },
      frame(_ctx, elapsed) {
        // Peak angular velocity 0.05 · 0.4 = 0.02 rad/s (D-5's drift budget).
        group.rotation.y = 0.05 * Math.sin(elapsed * 0.4);
        group.position.y = currentScroll() * PARALLAX * -1;

        if (!revealed) {
          revealed = true;
          canvas.dataset.mediaCount = String(renderedMediaCount);
          canvas.hidden = false;
          canvas.removeAttribute('hidden');
          fan.classList.add('fan--upgraded');
        }
      },
    });
  } catch (error) {
    textures.forEach((texture) => texture.dispose());
    throw error;
  }

  return () => {
    cleanupScene();
    canvas.hidden = true;
    delete canvas.dataset.mediaCount;
    fan.classList.remove('fan--upgraded');
  };
}
