import {
  AdditiveBlending, BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide,
  EdgesGeometry, Float32BufferAttribute, GridHelper, Group, IcosahedronGeometry, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, Points, PointsMaterial, Raycaster,
  ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { emit, on } from '../core/bus';
import { window01 } from '../core/chapters';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { color } from './palette';

export const SHRINE_CENTER = new Vector3(0, 10, -480);
const SHOCK_SECONDS = 1.6;

function flaredRoof(radius: number, height: number, y: number): BufferGeometry {
  const roof = new ConeGeometry(radius, height, 4, 5, true);
  roof.rotateY(Math.PI / 4);
  const p = roof.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i)) / radius;
    p.setY(i, p.getY(i) + 0.9 * r ** 4);
  }
  roof.translate(0, y, 0);
  return roof;
}

function shrineFrame(): { vermilion: BufferGeometry; cyan: BufferGeometry } {
  const struct: BufferGeometry[] = [];
  const corners = [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2], [0, -4.2], [0, 4.2], [-4.2, 0], [4.2, 0]];
  corners.forEach(([x, z]) => {
    const pillar = new CylinderGeometry(0.22, 0.26, 6, 6);
    pillar.translate(x, 3, z);
    struct.push(pillar);
  });
  const beam = new BoxGeometry(9.2, 0.4, 9.2);
  beam.translate(0, 6.1, 0);
  struct.push(beam, flaredRoof(8.6, 3.2, 7.9), flaredRoof(5.8, 2.6, 10.4));
  const spire = new CylinderGeometry(0.05, 0.14, 3.2, 6);
  spire.translate(0, 13.2, 0);
  struct.push(spire);

  const base: BufferGeometry[] = [];
  const step1 = new BoxGeometry(12.5, 0.6, 12.5);
  step1.translate(0, -0.3, 0);
  const step2 = new BoxGeometry(10.5, 0.6, 10.5);
  step2.translate(0, 0.3, 0);
  const rock = new IcosahedronGeometry(7.5, 1);
  rock.scale(1, 0.5, 1);
  rock.translate(0, -4.4, 0);
  base.push(step1, step2, rock);

  const edges = (parts: BufferGeometry[]) => new EdgesGeometry(mergeGeometries(parts.map((g) => g.toNonIndexed())), 12);
  return { vermilion: edges(struct), cyan: edges(base) };
}

const lineMat = (hex: 'vermilion' | 'cyan', k: number) =>
  new LineBasicMaterial({ color: color(hex).multiplyScalar(k), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });

function starfield(): Points {
  const pos: number[] = [];
  for (let i = 0; i < 3500; i++) {
    const v = new Vector3().randomDirection().multiplyScalar(90 + Math.random() * 160);
    pos.push(v.x, v.y * 0.6, v.z);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return new Points(geo, new PointsMaterial({ color: color('cyan').multiplyScalar(0.7), size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending }));
}

/** Chapter 4: floating wireframe shrine around a pulsing AI core. Click the core for a shockwave. */
export function createShrine(canvas: HTMLCanvasElement): SceneModule {
  const group = new Group();
  group.position.copy(SHRINE_CENTER);
  const floating = new Group();
  group.add(floating);

  const frame = shrineFrame();
  floating.add(new LineSegments(frame.vermilion, lineMat('vermilion', 1.6)));
  floating.add(new LineSegments(frame.cyan, lineMat('cyan', 0.9)));

  const coreMat = new ShaderMaterial({
    vertexShader: SHADERS.core.vertex,
    fragmentShader: SHADERS.core.fragment,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 1 },
      uShock: { value: 0 },
      uCyan: { value: color('cyan') },
      uMagenta: { value: color('magenta') },
      uVermilion: { value: color('vermilion') },
    },
  });
  const core = new Mesh(new IcosahedronGeometry(1.9, 24), coreMat);
  core.position.y = 3.2;
  floating.add(core);
  const hitTarget = new Mesh(new SphereGeometry(3, 12, 8), new MeshBasicMaterial({ visible: false }));
  core.add(hitTarget);

  const orbitMat = new MeshBasicMaterial({ color: color('cyan').multiplyScalar(2) });
  const orbits = [2.9, 3.4, 3.9].map((r, i) => {
    const ring = new Mesh(new TorusGeometry(r, 0.018, 4, 120), orbitMat);
    ring.rotation.set(i * 0.9, i * 0.5, 0);
    core.add(ring);
    return ring;
  });

  const shockMat = new ShaderMaterial({
    vertexShader: SHADERS.ring.vertex,
    fragmentShader: SHADERS.ring.fragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: color('cyan') }, uProgress: { value: 1 } },
  });
  const shock = new Mesh(new PlaneGeometry(1, 1), shockMat);
  shock.visible = false;
  shock.renderOrder = 6;
  group.add(shock);

  const grid = new GridHelper(600, 60, color('magenta'), color('magenta'));
  const gridMat = grid.material as LineBasicMaterial;
  gridMat.transparent = true;
  gridMat.opacity = 0.12;
  gridMat.depthWrite = false;
  grid.position.y = -34;
  group.add(grid, starfield());

  let shockT = SHOCK_SECONDS;
  let camera: FrameContext['camera'] | null = null;
  let active = false;
  const ray = new Raycaster();
  const ndc = new Vector2();

  on('shockwave', () => {
    shockT = 0;
  });

  const hitsCore = (ev: PointerEvent): boolean => {
    if (!active || !camera) return false;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(hitTarget, false).length > 0;
  };
  window.addEventListener('pointerup', (ev) => {
    if ((ev.target as Element | null)?.closest('button, a, input, [data-ui]')) return;
    if (hitsCore(ev)) emit('shockwave', undefined);
  });
  window.addEventListener('pointermove', (ev) => {
    document.documentElement.classList.toggle('is-core-hover', hitsCore(ev));
  });

  return {
    group,
    update(ctx: FrameContext) {
      const vis = window01(0.56, 0.84, 0.03, ctx.u);
      group.visible = vis > 0.001;
      camera = ctx.camera;
      active = group.visible && ctx.chapter === 3;
      if (!group.visible) return;
      const t = ctx.time * ctx.motion;
      floating.position.y = Math.sin(t * 0.6) * 0.6;
      floating.rotation.y = t * 0.05;
      orbits.forEach((o, i) => {
        o.rotation.x += ctx.dt * ctx.motion * (0.3 + i * 0.2);
        o.rotation.y += ctx.dt * ctx.motion * (0.2 - i * 0.1);
      });

      shockT += ctx.dt;
      const p = Math.min(1, shockT / SHOCK_SECONDS);
      shock.visible = p < 1;
      if (shock.visible) {
        const s = 2 + p * (ctx.reduced ? 30 : 70);
        shock.scale.set(s, s, s);
        shock.position.set(0, floating.position.y + 3.2, 0);
        shock.quaternion.copy(ctx.camera.quaternion);
        shockMat.uniforms.uProgress.value = p;
      }
      coreMat.uniforms.uTime.value = ctx.time * (ctx.reduced ? 0.4 : 1);
      coreMat.uniforms.uShock.value = ctx.reduced ? 0 : Math.max(0, 1 - p * 1.6);
      core.scale.setScalar(1 + (1 - p) * (ctx.reduced ? 0.05 : 0.25));
    },
  };
}
