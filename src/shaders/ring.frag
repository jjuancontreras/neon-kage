uniform vec3 uColor;
uniform float uProgress;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float band = smoothstep(0.06, 0.0, abs(r - 0.94)) + smoothstep(0.25, 0.0, abs(r - 0.9)) * 0.35;
  float a = band * (1.0 - uProgress);
  gl_FragColor = vec4(uColor * a * 2.5, a);
}
