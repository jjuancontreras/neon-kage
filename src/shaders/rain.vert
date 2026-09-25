#include <fog_pars_vertex>
attribute vec3 aOffset;
attribute float aSpeed;
uniform float uTime;
uniform vec3 uBox;
uniform float uLen;
uniform vec2 uWind;
varying float vAlpha;

void main() {
  vec3 o = aOffset;
  o.y -= uTime * aSpeed;
  o.xz += uWind * uTime * aSpeed * 0.12;
  vec3 rel = mod(o - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = cameraPosition + rel;
  // position.y: 0 = drop head, 1 = tail (trails up and against the wind)
  wp += vec3(-uWind.x * 0.12, 1.0, -uWind.y * 0.12) * position.y * uLen * (0.55 + aSpeed * 0.02);
  float radial = 1.0 - smoothstep(uBox.x * 0.2, uBox.x * 0.5, length(rel.xz));
  vAlpha = (1.0 - position.y) * radial;
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
