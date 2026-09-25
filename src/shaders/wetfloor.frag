#include <fog_pars_fragment>
uniform float uTime;
uniform float uMotion;
uniform vec3 uBase;
uniform vec3 uTint;
uniform float uOpacity;
varying vec3 vWorld;

void main() {
  float n = snoise(vec3(vWorld.xz * 0.16, 1.7)) * 0.5 + 0.5;
  float puddle = smoothstep(0.42, 0.58, n);
  vec2 q = vWorld.xz * 2.6;
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  float t = fract(uTime * 0.9 * uMotion + nkHash(cell));
  float ring = smoothstep(0.03, 0.0, abs(length(f) - t * 0.45)) * (1.0 - t) * (1.0 - t) * puddle * step(0.55, nkHash(cell + 0.7));
  vec3 col = uBase * (1.0 - puddle * 0.5) + uTint * ring * 0.3;
  float a = mix(0.95, 0.42, puddle) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}
