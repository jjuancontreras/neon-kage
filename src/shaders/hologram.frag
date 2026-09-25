uniform vec3 uColor;
uniform vec3 uRim;
uniform float uTime;
uniform float uFlicker;
uniform float uBaseY;
uniform float uHeight;
uniform float uOpacity;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vWorld;

void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.0);
  float lines = 0.45 + 0.55 * step(0.45, fract(vWorld.y * 5.0 - uTime * 1.2));
  float local = (vWorld.y - uBaseY) / uHeight;
  float sweep = exp(-abs(local - fract(uTime * 0.22)) * 28.0);
  vec3 col = uColor * lines * 1.5 + uRim * fres * 2.4 + uRim * sweep * 1.5;
  float a = (0.3 + 0.7 * fres + sweep * 0.5) * uFlicker * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
