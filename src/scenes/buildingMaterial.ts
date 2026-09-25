import { ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { smooth } from '../core/chapters';
import { SHADERS } from '../shaders';
import { color } from './palette';

/** Shared procedural facade material (lit window grid + dissolve edge). */
export const buildingMaterial = new ShaderMaterial({
  vertexShader: SHADERS.windows.vertex,
  fragmentShader: SHADERS.windows.fragment,
  fog: true,
  uniforms: UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uLit: { value: 0.24 },
      uBody: { value: color('body') },
      uWarm: { value: color('warm').multiplyScalar(0.3) },
      uCyan: { value: color('cyan').multiplyScalar(0.9) },
      uMagenta: { value: color('magenta').multiplyScalar(0.9) },
      uVermilion: { value: color('vermilion').multiplyScalar(0.9) },
      uEdge: { value: color('cyan') },
    },
  ]),
});

/** The city dissolves into data at the Market→Datastream seam and re-forms for the Ascent. */
export const dissolveAt = (u: number): number => smooth(0.365, 0.45, u) * (1 - smooth(0.8, 0.88, u));

export function updateBuildingMaterial(time: number, u: number): number {
  const d = dissolveAt(u);
  buildingMaterial.uniforms.uTime.value = time;
  buildingMaterial.uniforms.uDissolve.value = d;
  return d;
}
