import { BackSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry } from 'three';
import { smooth, window01 } from '../core/chapters';
import type { FrameContext, SceneModule } from '../core/types';
import { SHADERS } from '../shaders';
import { color } from './palette';

const CLOUD_LAYERS = [
  { y: 190, seed: 1.3, opacity: 0.75 },
  { y: 150, seed: 4.7, opacity: 0.6 },
  { y: 112, seed: 8.1, opacity: 0.5 },
] as const;

/** Sky dome (night → void → synthetic sunrise) and the cloud deck of chapter 1. */
export function createSky(): SceneModule {
  const group = new Group();

  const skyMat = new ShaderMaterial({
    vertexShader: SHADERS.sky.vertex,
    fragmentShader: SHADERS.sky.fragment,
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uSunrise: { value: 0 },
      uVoid: { value: 0 },
      uInk: { value: color('ink') },
      uHaze: { value: color('haze') },
      uMagenta: { value: color('magenta') },
      uCyan: { value: color('cyan') },
      uVermilion: { value: color('vermilion') },
    },
  });
  const dome = new Mesh(new SphereGeometry(4000, 48, 24), skyMat);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  group.add(dome);

  const clouds = new Group();
  const cloudMats = CLOUD_LAYERS.map((layer) => {
    const mat = new ShaderMaterial({
      vertexShader: SHADERS.clouds.vertex,
      fragmentShader: SHADERS.clouds.fragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: layer.opacity },
        uSeed: { value: layer.seed },
        uTint: { value: color('haze').multiplyScalar(0.9) },
        uGlow: { value: color('magenta').multiplyScalar(0.16) },
      },
    });
    const plane = new Mesh(new PlaneGeometry(1600, 1600), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, layer.y, -150);
    clouds.add(plane);
    return { mat, base: layer.opacity };
  });
  group.add(clouds);

  return {
    group,
    update(ctx: FrameContext) {
      dome.position.copy(ctx.camera.position);
      skyMat.uniforms.uSunrise.value = smooth(0.8, 0.97, ctx.u);
      skyMat.uniforms.uVoid.value = window01(0.44, 0.78, 0.04, ctx.u);
      // Clouds for the descent, and again as a sea below the ascent.
      const vis = Math.max(1 - smooth(0.12, 0.2, ctx.u), smooth(0.84, 0.92, ctx.u));
      clouds.visible = vis > 0.001;
      for (const c of cloudMats) {
        c.mat.uniforms.uTime.value = ctx.time;
        c.mat.uniforms.uOpacity.value = c.base * vis;
      }
    },
  };
}
