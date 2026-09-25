import {
  AdditiveBlending, CanvasTexture, DoubleSide, Group, Mesh, NormalBlending, PlaneGeometry, SRGBColorSpace,
  ShaderMaterial, UniformsLib, UniformsUtils, Vector3,
} from 'three';
import type { FrameContext } from '../core/types';
import { SHADERS } from '../shaders';
import { HEX } from './palette';

export interface SignSpec {
  readonly text: string;
  readonly sub: string;
  readonly hue: 'vermilion' | 'cyan' | 'magenta';
  readonly vertical: boolean;
  readonly position: readonly [number, number, number];
  /** Y rotation in radians: 0 = blade sign facing the alley axis, ±π/2 = flat on a wall. */
  readonly rotationY: number;
  readonly scale: number;
}

const PANEL = '#0a0710';

/** Draws a neon sign onto a canvas: dark panel, glowing border, glowing kanji. */
function drawSign(spec: SignSpec): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = spec.vertical ? 160 : 512;
  const h = spec.vertical ? 512 : 176;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const neon = HEX[spec.hue];

  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = neon;
  ctx.lineWidth = 5;
  ctx.shadowColor = neon;
  ctx.shadowBlur = 16;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  const glyphs = [...spec.text];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (spec.vertical) {
    const size = Math.min(104, (h - 110) / glyphs.length);
    ctx.font = `700 ${size}px "Noto Sans JP", sans-serif`;
    glyphs.forEach((g, i) => glowText(ctx, g, w / 2, 44 + size * (i + 0.5), neon));
    ctx.font = '600 18px "JetBrains Mono", monospace';
    glowText(ctx, spec.sub, w / 2, h - 34, neon, 6);
  } else {
    const size = Math.min(100, (w - 60) / glyphs.length);
    ctx.font = `700 ${size}px "Noto Sans JP", sans-serif`;
    glowText(ctx, spec.text, w / 2, h / 2 - 12, neon);
    ctx.font = '600 18px "JetBrains Mono", monospace';
    glowText(ctx, spec.sub, w / 2, h - 30, neon, 6);
  }
  return canvas;
}

function glowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, neon: string, blur = 22): void {
  ctx.shadowColor = neon;
  ctx.shadowBlur = blur;
  ctx.fillStyle = neon;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur / 3;
  ctx.fillStyle = '#fff4fb';
  ctx.globalAlpha = 0.75;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function signMaterial(map: CanvasTexture, reflect: boolean, seed: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: SHADERS.sign.vertex,
    fragmentShader: SHADERS.sign.fragment,
    side: DoubleSide,
    fog: true,
    transparent: reflect,
    depthWrite: !reflect,
    blending: reflect ? AdditiveBlending : NormalBlending,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uMap: { value: map },
        uIntensity: { value: 1.6 },
        uTime: { value: 0 },
        uSeed: { value: seed },
        uReflect: { value: reflect ? 1 : 0 },
        uOpacity: { value: 1 },
      },
    ]),
  });
}

interface LiveSign {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly reflection: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly center: Vector3;
  readonly base: number;
  prox: number;
}

export interface Signs {
  readonly group: Group;
  update(ctx: FrameContext, opacity: number): void;
}

const ndc = new Vector3();

/** Neon kanji signs with wet-floor reflections; brighten and stutter near the cursor. */
export function createSigns(specs: readonly SignSpec[]): Signs {
  const group = new Group();
  const live: LiveSign[] = specs.map((spec, i) => {
    const tex = new CanvasTexture(drawSign(spec));
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    const [w, h] = spec.vertical ? [1.4, 4.48] : [4.6, 1.58];
    const geo = new PlaneGeometry(w * spec.scale, h * spec.scale);
    const mesh = new Mesh(geo, signMaterial(tex, false, i));
    mesh.position.set(...spec.position);
    mesh.rotation.y = spec.rotationY;
    const reflection = new Mesh(geo, signMaterial(tex, true, i));
    reflection.position.set(spec.position[0], -spec.position[1], spec.position[2]);
    reflection.rotation.y = spec.rotationY;
    reflection.scale.y = -1;
    reflection.renderOrder = 1;
    group.add(mesh, reflection);
    return { mesh, reflection, center: new Vector3(...spec.position), base: 1.5 + Math.random() * 0.5, prox: 0 };
  });

  return {
    group,
    update(ctx, opacity) {
      const aspect = ctx.camera.aspect;
      for (const s of live) {
        let target = 0;
        if (ctx.pointer) {
          ndc.copy(s.center).project(ctx.camera);
          if (ndc.z < 1) {
            const dx = (ndc.x - ctx.pointer.x) * aspect;
            const dy = ndc.y - ctx.pointer.y;
            const d = Math.hypot(dx, dy);
            target = 1 - Math.min(1, Math.max(0, (d - 0.06) / 0.4));
          }
        }
        s.prox += (target - s.prox) * Math.min(1, ctx.dt * 8);
        const stutter = !ctx.reduced && s.prox > 0.55 && Math.random() < 0.12 ? 0.35 : 1;
        const intensity = s.base * (0.7 + s.prox * 1.1) * stutter;
        for (const m of [s.mesh, s.reflection]) {
          m.material.uniforms.uTime.value = ctx.time;
          m.material.uniforms.uIntensity.value = intensity;
          m.material.uniforms.uOpacity.value = opacity;
        }
        const sc = 1 + s.prox * 0.05;
        s.mesh.scale.set(sc, sc, 1);
      }
    },
  };
}
