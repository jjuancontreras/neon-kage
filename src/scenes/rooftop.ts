import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, EdgesGeometry, Group,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  PointLight, RingGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { on } from '../core/bus';
import { window01 } from '../core/chapters';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { buildingMaterial } from './buildingMaterial';
import { color } from './palette';
import { createSteam } from './steam';

export const ROOF_Y = 60;
const TORII_Z = -20;
const TORII_HEIGHT = 10.4;

/** Torii built from primitives; the kasagi (top lintel) is bent upward at its ends. */
function toriiGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const x of [-4.2, 4.2]) {
    const pillar = new CylinderGeometry(0.36, 0.46, 9.6, 16, 1);
    pillar.translate(x, 4.8, 0);
    parts.push(pillar);
  }
  const kasagi = new BoxGeometry(13, 0.7, 1.05, 32, 1, 1);
  const p = kasagi.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.028 * p.getX(i) ** 2);
  kasagi.translate(0, 10.0, 0);
  const shimaki = new BoxGeometry(11.6, 0.45, 0.85);
  shimaki.translate(0, 9.35, 0);
  const nuki = new BoxGeometry(10.6, 0.5, 0.5);
  nuki.translate(0, 7.4, 0);
  const gakuzuka = new BoxGeometry(0.55, 1.5, 0.45);
  gakuzuka.translate(0, 8.35, 0);
  parts.push(kasagi, shimaki, nuki, gakuzuka);
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

function hologramMaterial(mirror: boolean): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: SHADERS.hologram.vertex,
    fragmentShader: SHADERS.hologram.fragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uMirror: { value: mirror ? 1 : 0 },
      uColor: { value: color('vermilion') },
      uRim: { value: color('magenta').lerp(color('vermilion'), 0.4) },
      uFlicker: { value: 1 },
      uBaseY: { value: mirror ? ROOF_Y - TORII_HEIGHT : ROOF_Y },
      uHeight: { value: TORII_HEIGHT },
      uOpacity: { value: mirror ? 0.3 : 1 },
    },
  });
}

/** Random stutters: mostly on, with brief dropouts like a failing projector. */
function createFlicker() {
  let next = 1.5;
  let stutterEnd = 0;
  return (time: number, reduced: boolean): number => {
    if (reduced) return 0.92;
    if (time > next) {
      stutterEnd = time + 0.12 + Math.random() * 0.35;
      next = time + 1.8 + Math.random() * 4;
    }
    if (time < stutterEnd) return Math.sin(time * 90) > 0 ? 1 : 0.15;
    return 0.94 + Math.random() * 0.06;
  };
}

function buildRoof(group: Group): void {
  const hidden = new MeshBasicMaterial({ visible: false });
  const bm = buildingMaterial;
  const building = new Mesh(new BoxGeometry(60, ROOF_Y, 84), [bm, bm, hidden, hidden, bm, bm]);
  building.position.set(0, ROOF_Y / 2, -8);
  group.add(building);

  const catcher = new Mesh(new PlaneGeometry(60, 84), new MeshBasicMaterial({ color: 0x000000, fog: false }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.set(0, ROOF_Y - 16, -8);
  group.add(catcher);

  const floorMat = new ShaderMaterial({
    vertexShader: SHADERS.wetfloor.vertex,
    fragmentShader: SHADERS.wetfloor.fragment,
    transparent: true,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uBase: { value: color('body').multiplyScalar(0.8) },
        uTint: { value: color('cyan').multiplyScalar(0.25) },
        uOpacity: { value: 1 },
      },
    ]),
  });
  const floor = new Mesh(new PlaneGeometry(60, 84), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, ROOF_Y, -8);
  floor.renderOrder = 2;
  floor.name = 'roofFloor';
  group.add(floor);

  const dark = new MeshStandardMaterial({ color: 0x0c0c16, roughness: 0.7, metalness: 0.4 });
  const led = new MeshBasicMaterial({ color: color('cyan').multiplyScalar(0.55) });
  const parapets: Array<[number, number, number, number]> = [
    [0, 34, 60, 0.8], [0, -50, 60, 0.8], [30, -8, 0.8, 84], [-30, -8, 0.8, 84],
  ];
  parapets.forEach(([x, z, w, d]) => {
    const wall = new Mesh(new BoxGeometry(w, 1.3, d), dark);
    wall.position.set(x, ROOF_Y + 0.65, z);
    const strip = new Mesh(new BoxGeometry(Math.max(w, 0.12), 0.06, Math.max(d, 0.12)), led);
    strip.position.set(x, ROOF_Y + 1.33, z);
    group.add(wall, strip);
  });

  const props: Array<[number, number, number, number, number]> = [
    [-19, 3, 8, 3.2, 6], [18, 12, 6, 2.6, 9], [-16, -36, 10, 4, 5], [20, -30, 5, 5, 5],
  ];
  props.forEach(([x, z, w, h, d]) => {
    const hvac = new Mesh(new BoxGeometry(w, h, d), dark);
    hvac.position.set(x, ROOF_Y + h / 2, z);
    group.add(hvac);
  });
  const tank = new Mesh(new CylinderGeometry(3.2, 3.2, 6, 20), dark);
  tank.position.set(22, ROOF_Y + 7, 22);
  const legs = new Mesh(new BoxGeometry(5, 4, 5), dark);
  legs.position.set(22, ROOF_Y + 2, 22);
  const mast = new Mesh(new CylinderGeometry(0.15, 0.25, 22, 8), dark);
  mast.position.set(-24, ROOF_Y + 11, 26);
  group.add(tank, legs, mast);
}

/** Chapter 1: rain-slick rooftop with a flickering holographic torii. */
export function createRooftop(pixelRatio: number): SceneModule {
  const group = new Group();
  buildRoof(group);

  const geo = toriiGeometry();
  const holoMat = hologramMaterial(false);
  const torii = new Mesh(geo, holoMat);
  torii.position.set(0, ROOF_Y, TORII_Z);
  const edges = new LineSegments(
    new EdgesGeometry(geo, 25),
    new LineBasicMaterial({ color: color('bone').multiplyScalar(1.5), transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }),
  );
  edges.renderOrder = 4;
  torii.renderOrder = 4;
  torii.add(edges);
  group.add(torii);

  const mirrorMat = hologramMaterial(true);
  const mirror = new Mesh(geo, mirrorMat);
  mirror.scale.y = -1;
  mirror.position.set(0, ROOF_Y, TORII_Z);
  mirror.renderOrder = 1;
  group.add(mirror);

  const padMat = new MeshBasicMaterial({ color: color('vermilion').multiplyScalar(1.4), transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  for (const x of [-4.2, 4.2]) {
    const pad = new Mesh(new RingGeometry(0.7, 1.05, 40), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, ROOF_Y + 0.03, TORII_Z);
    pad.renderOrder = 3;
    group.add(pad);
  }

  const light = new PointLight(color('vermilion'), 60, 40, 1.6);
  light.position.set(0, ROOF_Y + 7, TORII_Z + 2);
  group.add(light);

  const steam = createSteam([new Vector3(-16, ROOF_Y + 4, -36), new Vector3(18, ROOF_Y + 2.6, 12)], pixelRatio);
  group.add(steam.points);

  const floor = group.getObjectByName('roofFloor') as Mesh<PlaneGeometry, ShaderMaterial>;
  const flicker = createFlicker();
  let glitch = 0;
  on('glitch', ({ strength }) => (glitch = Math.max(glitch, strength)));

  return {
    group,
    update(ctx: FrameContext) {
      const vis = window01(0.0, 0.24, 0.02, ctx.u);
      group.visible = vis > 0.001;
      if (!group.visible) return;
      glitch = Math.max(0, glitch - ctx.dt * 2);
      const f = flicker(ctx.time, ctx.reduced);
      for (const mat of [holoMat, mirrorMat]) {
        mat.uniforms.uTime.value = ctx.time * ctx.motion;
        mat.uniforms.uFlicker.value = f;
        mat.uniforms.uGlitch.value = ctx.reduced ? 0 : Math.max(glitch, f < 0.5 ? 1 : 0);
      }
      edges.material.opacity = 0.35 * f;
      light.intensity = 60 * f;
      floor.material.uniforms.uTime.value = ctx.time;
      floor.material.uniforms.uMotion.value = ctx.motion;
      steam.update(ctx.time, ctx.motion, vis);
    },
  };
}
