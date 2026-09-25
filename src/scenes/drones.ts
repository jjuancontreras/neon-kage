import {
  AdditiveBlending, BoxGeometry, ConeGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  ShaderMaterial, SphereGeometry, TorusGeometry,
} from 'three';
import type { FrameContext } from '../core/types';
import { color } from './palette';

interface Drone {
  readonly root: Group;
  readonly light: Mesh<SphereGeometry, MeshBasicMaterial>;
  readonly rotors: Mesh[];
  readonly base: { x: number; y: number; z: number };
  readonly phase: number;
  readonly span: number;
}

/** Soft volumetric-looking cone: brightest at the lens, fading toward the ground. */
function beamMaterial(hue: 'cyan' | 'magenta' | 'vermilion'): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uColor: { value: color(hue).multiplyScalar(0.12) } },
    vertexShader: /* glsl */ `
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vT = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        gl_FragColor = vec4(uColor * vT * vT * facing, 1.0);
      }`,
  });
}

const body = new MeshStandardMaterial({ color: 0x14141f, roughness: 0.4, metalness: 0.8 });

function buildDrone(hue: 'cyan' | 'magenta' | 'vermilion'): Omit<Drone, 'base' | 'phase' | 'span'> {
  const root = new Group();
  root.add(new Mesh(new BoxGeometry(0.9, 0.22, 0.9), body));
  const ringMat = new MeshBasicMaterial({ color: color(hue).multiplyScalar(1.8) });
  const rotors: Mesh[] = [];
  for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) {
    const ring = new Mesh(new TorusGeometry(0.32, 0.025, 6, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.08, z);
    rotors.push(ring);
    root.add(ring);
  }
  const light = new Mesh(new SphereGeometry(0.09, 10, 8), new MeshBasicMaterial({ color: color('vermilion').multiplyScalar(4) }));
  light.position.set(0, -0.16, 0.42);
  root.add(light);
  const beam = new Mesh(new ConeGeometry(1.6, 7, 24, 1, true), beamMaterial(hue));
  beam.position.y = -3.6;
  beam.renderOrder = 5;
  root.add(beam);
  return { root, light, rotors };
}

/** Hovering surveillance drones patrolling the alley. */
export function createDrones(): { group: Group; update(ctx: FrameContext): void } {
  const group = new Group();
  const hues = ['cyan', 'magenta', 'cyan', 'vermilion', 'magenta'] as const;
  const drones: Drone[] = hues.map((hue, i) => {
    const d = buildDrone(hue);
    const base = { x: (i % 2 ? 1 : -1) * (1.5 + Math.random() * 3), y: 8 + Math.random() * 6, z: -100 - i * 26 };
    group.add(d.root);
    return { ...d, base, phase: Math.random() * Math.PI * 2, span: 6 + Math.random() * 8 };
  });

  return {
    group,
    update(ctx) {
      const t = ctx.time * ctx.motion;
      for (const d of drones) {
        d.root.position.set(
          d.base.x + Math.sin(t * 0.3 + d.phase) * 1.5,
          d.base.y + Math.sin(t * 1.3 + d.phase) * 0.35,
          d.base.z + Math.sin(t * 0.18 + d.phase) * d.span,
        );
        d.root.rotation.y = Math.sin(t * 0.2 + d.phase) * 0.6;
        d.root.rotation.z = Math.sin(t * 0.9 + d.phase) * 0.05;
        d.rotors.forEach((r, i) => (r.rotation.z = t * (i % 2 ? 30 : -30)));
        d.light.visible = Math.sin(t * 4 + d.phase) > 0.2;
      }
    },
  };
}
