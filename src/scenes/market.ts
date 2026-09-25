import {
  BoxGeometry, BufferGeometry, Group, InstancedBufferAttribute, InstancedMesh, Line, LineBasicMaterial,
  Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, Quaternion, ShaderMaterial, SphereGeometry,
  UniformsLib, UniformsUtils, Vector3,
} from 'three';
import { window01 } from '../core/chapters';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { buildingMaterial, dissolveAt } from './buildingMaterial';
import { createDrones } from './drones';
import { color } from './palette';
import { createSigns, type SignSpec } from './signs';
import { createSteam } from './steam';

const ALLEY_HALF = 8;
const ALLEY_START = -54;
const ALLEY_END = -262;

const WORDS_V = ['電脳', '拉麺', '夜市', '雨宿', '居酒屋', '薬局', '占い', '記憶', '未来', '無限', '夢', '影'];
const WORDS_H = ['ネオン', '電気街', 'カラオケ', '神経網'];
const SUBS = ['OPEN 24H', 'NO.07', 'B1F', '¥880', 'SYNAPSE', 'NEO-EDO', 'VACANCY', '2F-3F'];
const HUES = ['vermilion', 'cyan', 'magenta'] as const;

function signSpecs(): SignSpec[] {
  const specs: SignSpec[] = [];
  WORDS_V.forEach((text, i) => {
    const side = i % 2 ? 1 : -1;
    const blade = i % 3 !== 2;
    const z = -92 - i * 13 - Math.random() * 4;
    specs.push({
      text,
      sub: SUBS[i % SUBS.length],
      hue: HUES[i % 3],
      vertical: true,
      position: blade ? [side * (ALLEY_HALF - 1.1), 5.5 + Math.random() * 5, z] : [side * (ALLEY_HALF - 0.05), 6 + Math.random() * 6, z],
      rotationY: blade ? 0 : -side * (Math.PI / 2),
      scale: 0.9 + Math.random() * 0.35,
    });
  });
  WORDS_H.forEach((text, i) => {
    const side = i % 2 ? -1 : 1;
    specs.push({
      text,
      sub: SUBS[(i + 3) % SUBS.length],
      hue: HUES[(i + 1) % 3],
      vertical: false,
      position: [side * (ALLEY_HALF - 0.05), 3.6 + (i % 2) * 7, -110 - i * 30],
      rotationY: -side * (Math.PI / 2),
      scale: 1,
    });
  });
  return specs;
}

function buildFacades(group: Group): void {
  const boxes: Array<{ x: number; z: number; w: number; h: number; d: number }> = [];
  for (const side of [-1, 1]) {
    let z = ALLEY_START;
    while (z > ALLEY_END) {
      const len = 10 + Math.random() * 14;
      const depth = 14 + Math.random() * 10;
      boxes.push({ x: side * (ALLEY_HALF + depth / 2), z: z - len / 2, w: depth, h: 18 + Math.random() * 40, d: len - 0.4 });
      z -= len;
    }
  }
  const geo = new BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mesh = new InstancedMesh(geo, buildingMaterial, boxes.length);
  const seeds = new Float32Array(boxes.length);
  const m = new Matrix4();
  boxes.forEach((b, i) => {
    m.compose(new Vector3(b.x, 0, b.z), new Quaternion(), new Vector3(b.w, b.h, b.d));
    mesh.setMatrixAt(i, m);
    seeds[i] = Math.random();
  });
  geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  mesh.frustumCulled = false;
  group.add(mesh);

  const cableMat = new LineBasicMaterial({ color: 0x1a1726 });
  for (let i = 0; i < 16; i++) {
    const z0 = -70 - Math.random() * 170;
    const y0 = 9 + Math.random() * 14;
    const pts: Vector3[] = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      pts.push(new Vector3(-ALLEY_HALF + t * ALLEY_HALF * 2, y0 - Math.sin(t * Math.PI) * 1.8, z0 + (t - 0.5) * 6));
    }
    group.add(new Line(new BufferGeometry().setFromPoints(pts), cableMat));
  }

  const lanternMat = new MeshBasicMaterial({ color: color('vermilion').multiplyScalar(0.7) });
  for (let i = 0; i < 10; i++) {
    const lantern = new Mesh(new SphereGeometry(0.26, 12, 10), lanternMat);
    lantern.scale.y = 1.35;
    lantern.position.set((i % 2 ? 1 : -1) * (ALLEY_HALF - 0.7), 3.3, -80 - i * 16);
    group.add(lantern);
  }
}

function buildFloor(group: Group): ShaderMaterial {
  const len = ALLEY_START - ALLEY_END + 10;
  const cz = (ALLEY_START + ALLEY_END) / 2;
  const catcher = new Mesh(new PlaneGeometry(140, len + 60), new MeshBasicMaterial({ color: 0x000000, fog: false }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.set(0, -26, cz);
  group.add(catcher);

  const mat = new ShaderMaterial({
    vertexShader: SHADERS.wetfloor.vertex,
    fragmentShader: SHADERS.wetfloor.fragment,
    transparent: true,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uBase: { value: color('body').multiplyScalar(0.7) },
        uTint: { value: color('magenta').multiplyScalar(0.3) },
        uOpacity: { value: 1 },
      },
    ]),
  });
  const floor = new Mesh(new PlaneGeometry(ALLEY_HALF * 2, len), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, cz);
  floor.renderOrder = 2;
  group.add(floor);
  return mat;
}

/** Chapter 2: neon alley with canvas-kanji signs, steam, drones and a wet floor. */
export function createMarket(pixelRatio: number): SceneModule {
  const group = new Group();
  buildFacades(group);
  const floorMat = buildFloor(group);
  const signs = createSigns(signSpecs());
  group.add(signs.group);
  const drones = createDrones();
  group.add(drones.group);
  const vents = Array.from({ length: 6 }, (_, i) => new Vector3((i % 2 ? 1 : -1) * (ALLEY_HALF - 1.4), 0, -96 - i * 24));
  const steam = createSteam(vents, pixelRatio);
  group.add(steam.points);

  const lights = [
    new PointLight(color('magenta'), 40, 30, 1.5),
    new PointLight(color('cyan'), 40, 30, 1.5),
  ];
  lights[0].position.set(-4, 8, -120);
  lights[1].position.set(4, 8, -175);
  group.add(...lights);

  return {
    group,
    update(ctx: FrameContext) {
      const vis = window01(0.17, 0.44, 0.02, ctx.u);
      group.visible = vis > 0.001;
      if (!group.visible) return;
      const solid = 1 - dissolveAt(ctx.u);
      floorMat.uniforms.uTime.value = ctx.time;
      floorMat.uniforms.uMotion.value = ctx.motion;
      floorMat.uniforms.uOpacity.value = solid;
      signs.update(ctx, solid);
      drones.group.visible = solid > 0.3;
      drones.update(ctx);
      steam.update(ctx.time, ctx.motion, vis * solid);
    },
  };
}
