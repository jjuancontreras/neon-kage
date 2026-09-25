import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { smooth } from '../core/chapters';
import type { FrameContext, SceneModule } from '../core/types';
import { color } from './palette';

interface Spinner { mesh: Mesh; speed: number; x0: number }

const SPAN = 1400;

/** Chapter 5: sky traffic streaking across the re-formed skyline at sunrise. */
export function createAscent(): SceneModule {
  const group = new Group();
  const mats = (['cyan', 'magenta', 'vermilion', 'bone'] as const).map(
    (k) => new MeshBasicMaterial({ color: color(k).multiplyScalar(k === 'bone' ? 1.5 : 2.4), transparent: true }),
  );
  const geo = new BoxGeometry(6, 0.35, 0.35);
  const spinners: Spinner[] = Array.from({ length: 36 }, (_, i) => {
    const mesh = new Mesh(geo, mats[i % mats.length]);
    const dir = i % 2 ? 1 : -1;
    mesh.position.set(0, 70 + Math.random() * 120, -620 - Math.random() * 600);
    mesh.scale.x = 0.6 + Math.random() * 1.4;
    group.add(mesh);
    return { mesh, speed: dir * (25 + Math.random() * 45), x0: (Math.random() - 0.5) * SPAN };
  });

  return {
    group,
    update(ctx: FrameContext) {
      const vis = smooth(0.8, 0.86, ctx.u);
      group.visible = vis > 0.001;
      if (!group.visible) return;
      mats.forEach((m) => (m.opacity = vis));
      const t = ctx.time * ctx.motion;
      for (const s of spinners) {
        const x = ((((s.x0 + t * s.speed) % SPAN) + SPAN * 1.5) % SPAN) - SPAN / 2;
        s.mesh.position.x = x;
      }
    },
  };
}
