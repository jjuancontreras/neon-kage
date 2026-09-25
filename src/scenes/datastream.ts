import {
  AdditiveBlending, BufferGeometry, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry,
  LineBasicMaterial, LineLoop, Mesh, PlaneGeometry, ShaderMaterial, Vector3,
} from 'three';
import { smooth } from '../core/chapters';
import type { QualitySettings } from '../core/quality';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { color } from './palette';

const MAX_PARTICLES = 120_000;
const TUNNEL_START = -200;
const TUNNEL_LEN = 240;
const LANES = 72;
const RING_COUNT = 28;

/** Start: the alley facades and skyline broken into window-sized fragments. End: tunnel lanes. */
function fillAttributes(start: Float32Array, end: Float32Array, rand: Float32Array): void {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const r = Math.random();
    let x: number;
    let y: number;
    let z: number;
    if (r < 0.7) {
      const side = Math.random() < 0.5 ? -1 : 1;
      x = side * (8 + Math.random() * 0.3);
      y = Math.floor(Math.random() * 18) * 2.6 + 1.3;
      z = -120 - Math.floor(Math.random() * 82) * 1.7;
    } else {
      x = (Math.random() - 0.5) * 140;
      y = Math.random() * 90;
      z = -140 - Math.random() * 160;
    }
    start.set([x, y, z], i * 3);

    const lane = Math.floor(Math.random() * LANES);
    const ang = (lane / LANES) * Math.PI * 2 + (Math.random() - 0.5) * 0.02;
    const rad = 6 + Math.pow(Math.random(), 2) * 7;
    end.set([Math.cos(ang) * rad, 4 + Math.sin(ang) * rad, TUNNEL_START - Math.random() * TUNNEL_LEN], i * 3);
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
}

function createRings(): { group: Group; mats: LineBasicMaterial[] } {
  const group = new Group();
  const mats: LineBasicMaterial[] = [];
  const pts: Vector3[] = [];
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * Math.PI * 2;
    pts.push(new Vector3(Math.cos(a) * 15, Math.sin(a) * 15, 0));
  }
  const geo = new BufferGeometry().setFromPoints(pts);
  for (let i = 0; i < RING_COUNT; i++) {
    const mat = new LineBasicMaterial({ color: color(i % 4 === 0 ? 'vermilion' : 'magenta'), transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false });
    const ring = new LineLoop(geo, mat);
    ring.position.set(0, 4, TUNNEL_START - 12 - i * 8.5);
    ring.rotation.z = (i * Math.PI) / 12;
    group.add(ring);
    mats.push(mat);
  }
  return { group, mats };
}

/** Chapter 3: the city dissolves into 100k+ instanced particles that stream through a data tunnel. */
export function createDatastream(initial: QualitySettings): SceneModule {
  const group = new Group();
  const plane = new PlaneGeometry(1, 1);
  const geo = new InstancedBufferGeometry();
  geo.index = plane.index;
  geo.setAttribute('position', plane.attributes.position);
  geo.setAttribute('uv', plane.attributes.uv);
  const start = new Float32Array(MAX_PARTICLES * 3);
  const end = new Float32Array(MAX_PARTICLES * 3);
  const rand = new Float32Array(MAX_PARTICLES * 4);
  fillAttributes(start, end, rand);
  geo.setAttribute('aStart', new InstancedBufferAttribute(start, 3));
  geo.setAttribute('aEnd', new InstancedBufferAttribute(end, 3));
  geo.setAttribute('aRand', new InstancedBufferAttribute(rand, 4));
  geo.instanceCount = Math.min(MAX_PARTICLES, initial.particles);

  const mat = new ShaderMaterial({
    vertexShader: SHADERS.particles.vertex,
    fragmentShader: SHADERS.particles.fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uSize: { value: 0.13 },
      uFlow: { value: 16 },
      uTunnelStart: { value: TUNNEL_START },
      uTunnelLen: { value: TUNNEL_LEN },
      uFade: { value: 0 },
      uC1: { value: color('cyan').multiplyScalar(0.7) },
      uC2: { value: color('magenta') },
      uC3: { value: color('vermilion') },
    },
  });
  const particles = new Mesh(geo, mat);
  particles.frustumCulled = false;
  particles.renderOrder = 5;
  group.add(particles);

  const rings = createRings();
  group.add(rings.group);
  let flowTime = 0;

  return {
    group,
    update(ctx: FrameContext) {
      const fade = smooth(0.34, 0.39, ctx.u) * (1 - smooth(0.6, 0.67, ctx.u));
      group.visible = fade > 0.001;
      if (!group.visible) return;
      flowTime += ctx.dt * ctx.motion;
      mat.uniforms.uTime.value = flowTime;
      mat.uniforms.uMorph.value = smooth(0.37, 0.48, ctx.u);
      mat.uniforms.uFade.value = fade;
      const ringVis = smooth(0.42, 0.47, ctx.u) * fade;
      rings.mats.forEach((m, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(flowTime * 3 - i * 0.6);
        m.opacity = ringVis * (0.12 + 0.4 * pulse);
      });
    },
    setQuality(q) {
      geo.instanceCount = Math.min(MAX_PARTICLES, q.particles);
    },
  };
}
