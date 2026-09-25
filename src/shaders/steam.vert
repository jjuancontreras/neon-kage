attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uMotion;
varying float vAlpha;
varying float vSeed;

void main() {
  float life = 6.0;
  float age = fract((uTime * uMotion) / life + aSeed);
  vec3 p = position;
  p.y += age * 9.0;
  p.x += sin(age * 4.0 + aSeed * 20.0) * 1.2 * age;
  p.z += cos(age * 3.0 + aSeed * 13.0) * 0.8 * age;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (90.0 + age * 260.0) * uPixelRatio / max(1.0, -mv.z);
  vAlpha = smoothstep(0.0, 0.15, age) * (1.0 - smoothstep(0.5, 1.0, age));
  vSeed = aSeed;
}
