varying vec3 vColor;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec2 p = abs(vUv - 0.5);
  float core = 1.0 - smoothstep(0.12, 0.5, max(p.x, p.y));
  gl_FragColor = vec4(vColor * (0.5 + core * 1.6) * vAlpha * core, 1.0);
}
