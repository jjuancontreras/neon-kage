uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uTint;
uniform vec3 uGlow;
varying vec3 vWorld;
varying vec2 vUv;

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * snoise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 p = vWorld.xz * 0.0045 + vec2(uTime * 0.006, uTime * 0.003);
  float n = fbm(vec3(p, uSeed));
  float density = smoothstep(-0.05, 0.5, n);
  float edge = 1.0 - smoothstep(0.3, 0.5, length(vUv - 0.5));
  float nearFade = smoothstep(2.0, 22.0, abs(cameraPosition.y - vWorld.y));
  float a = density * edge * nearFade * uOpacity;
  vec3 col = mix(uTint, uGlow, smoothstep(0.1, 0.7, n));
  gl_FragColor = vec4(col, a);
}
