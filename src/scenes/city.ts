import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group,
  InstancedBufferAttribute, InstancedMesh, Matrix4, Points, Quaternion, ShaderMaterial, Vector3,
} from 'three';
import type { QualitySettings } from '../core/quality';
import type { FrameContext, SceneModule } from '../core/types';
import { buildingMaterial, updateBuildingMaterial } from './buildingMaterial';
import { color } from './palette';

const CELL = 26;
const MAX_TOWERS = 2600;

/** Regions kept clear for the rooftop, alley, tunnel and the ascent column. */
function isReserved(x: number, z: number): boolean {
  if (Math.abs(x) < 42 && z > -62 && z < 42) return true; // rooftop building + margin
  if (Math.abs(x) < 26 && z < -40 && z > -250) return true; // alley corridor
  if (Math.abs(x) < 60 && z <= -250 && z > -580) return true; // tunnel / shrine / ascent column
  return false;
}

interface Tower { x: number; z: number; w: number; d: number; h: number }

function planTowers(): Tower[] {
  const towers: Tower[] = [];
  for (let gx = -28; gx <= 28; gx++) {
    for (let gz = -58; gz <= 12; gz++) {
      const x = gx * CELL + (Math.random() - 0.5) * 6;
      const z = gz * CELL + (Math.random() - 0.5) * 6;
      if (isReserved(x, z) || Math.random() < 0.18) continue;
      const dist = Math.hypot(x, z + 400);
      const tall = Math.random() < 0.08;
      const h = tall ? 110 + Math.random() * 130 : 18 + Math.random() * 55 + Math.min(40, dist * 0.04);
      towers.push({ x, z, w: 9 + Math.random() * 12, d: 9 + Math.random() * 12, h });
    }
  }
  // Nearest first, so lowering the instance count drops the far field first.
  towers.sort((a, b) => Math.hypot(a.x, a.z + 200) - Math.hypot(b.x, b.z + 200));
  return towers.slice(0, MAX_TOWERS);
}

function beaconMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: color('vermilion').multiplyScalar(2.5) } },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      varying float vOn;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(900.0 / -mv.z, 2.0, 10.0);
        vOn = step(0.55, fract(uTime * 0.5 + aPhase));
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vOn;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vOn, 1.0);
      }`,
  });
}

/** Procedural skyline: instanced towers sharing the facade shader, plus aircraft beacons. */
export function createCity(initial: QualitySettings): SceneModule {
  const group = new Group();
  const towers = planTowers();

  const box = new BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const mesh = new InstancedMesh(box, buildingMaterial, towers.length);
  const seeds = new Float32Array(towers.length);
  const m = new Matrix4();
  const q = new Quaternion();
  towers.forEach((t, i) => {
    m.compose(new Vector3(t.x, 0, t.z), q, new Vector3(t.w, t.h, t.d));
    mesh.setMatrixAt(i, m);
    seeds[i] = Math.random();
  });
  mesh.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  mesh.count = Math.min(initial.towers, towers.length);
  mesh.frustumCulled = false;
  group.add(mesh);

  const beaconPos: number[] = [];
  const phases: number[] = [];
  towers.filter((t) => t.h > 100).forEach((t) => {
    beaconPos.push(t.x, t.h + 1.5, t.z);
    phases.push(Math.random());
  });
  const beaconGeo = new BufferGeometry();
  beaconGeo.setAttribute('position', new Float32BufferAttribute(beaconPos, 3));
  beaconGeo.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  const beaconMat = beaconMaterial();
  const beacons = new Points(beaconGeo, beaconMat);
  group.add(beacons);

  return {
    group,
    update(ctx: FrameContext) {
      const d = updateBuildingMaterial(ctx.time, ctx.u);
      group.visible = d < 0.999;
      beacons.visible = d < 0.2;
      beaconMat.uniforms.uTime.value = ctx.time;
    },
    setQuality(qs) {
      mesh.count = Math.min(qs.towers, towers.length);
    },
  };
}
