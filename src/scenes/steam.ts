import { BufferGeometry, Float32BufferAttribute, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';
import { SHADERS } from '../shaders';
import { color } from './palette';

const PUFFS_PER_VENT = 14;

export interface Steam {
  readonly points: Points;
  update(time: number, motion: number, opacity: number): void;
}

/** Soft rising steam from a list of vent positions (one draw call). */
export function createSteam(vents: readonly Vector3[], pixelRatio: number): Steam {
  const pos: number[] = [];
  const seeds: number[] = [];
  vents.forEach((v) => {
    for (let i = 0; i < PUFFS_PER_VENT; i++) {
      pos.push(v.x + (Math.random() - 0.5) * 0.6, v.y, v.z + (Math.random() - 0.5) * 0.6);
      seeds.push(i / PUFFS_PER_VENT + Math.random() * 0.05);
    }
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  const mat = new ShaderMaterial({
    vertexShader: SHADERS.steam.vertex,
    fragmentShader: SHADERS.steam.fragment,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uMotion: { value: 1 },
      uColor: { value: color('bone').lerp(color('magenta'), 0.12).multiplyScalar(0.5) },
      uOpacity: { value: 0.28 },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    update(time, motion, opacity) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uMotion.value = motion;
      mat.uniforms.uOpacity.value = 0.28 * opacity;
      points.visible = opacity > 0.001;
    },
  };
}
