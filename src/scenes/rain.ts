import {
  AdditiveBlending, BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry,
  LineSegments, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3,
} from 'three';
import { on } from '../core/bus';
import { window01 } from '../core/chapters';
import type { QualitySettings } from '../core/quality';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { color } from './palette';

const MAX_DROPS = 14_000;
const BOX = new Vector3(70, 60, 70);

/** GPU rain: instanced line streaks wrapped in a box that follows the camera. */
export function createRain(initial: QualitySettings): SceneModule {
  const geo = new InstancedBufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 0]), 3));
  const offsets = new Float32Array(MAX_DROPS * 3);
  const speeds = new Float32Array(MAX_DROPS);
  for (let i = 0; i < MAX_DROPS; i++) {
    offsets[i * 3] = Math.random() * BOX.x;
    offsets[i * 3 + 1] = Math.random() * BOX.y;
    offsets[i * 3 + 2] = Math.random() * BOX.z;
    speeds[i] = 26 + Math.random() * 18;
  }
  geo.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aSpeed', new InstancedBufferAttribute(speeds, 1));
  geo.instanceCount = initial.rainDrops;

  const mat = new ShaderMaterial({
    vertexShader: SHADERS.rain.vertex,
    fragmentShader: SHADERS.rain.fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uBox: { value: BOX },
        uLen: { value: 1.1 },
        uWind: { value: new Vector2(3, 1.5) },
        uColor: { value: color('cyan').lerp(color('bone'), 0.6).multiplyScalar(0.55) },
        uOpacity: { value: 1 },
      },
    ]),
  });

  const lines = new LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 6;
  let enabled = true;
  on('rain', ({ enabled: e }) => (enabled = e));
  let simTime = 0;

  return {
    group: lines,
    update(ctx: FrameContext) {
      simTime += ctx.dt * (ctx.reduced ? 0.35 : 1);
      const vis = enabled ? Math.max(window01(0.0, 0.42, 0.04, ctx.u), window01(0.8, 0.86, 0.04, ctx.u) * 0.6) : 0;
      lines.visible = vis > 0.001;
      mat.uniforms.uTime.value = simTime;
      mat.uniforms.uOpacity.value = vis;
    },
    setQuality(q) {
      geo.instanceCount = Math.min(MAX_DROPS, q.rainDrops);
    },
  };
}
