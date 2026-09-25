uniform float uTime;
uniform float uGlitch;
uniform float uMirror;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vWorld;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float band = floor(wp.y * 3.0);
  float g = step(0.9, nkHash1(band + floor(uTime * 12.0))) * uGlitch;
  wp.x += (nkHash1(band * 3.1 + floor(uTime * 20.0)) - 0.5) * 0.9 * g;
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
