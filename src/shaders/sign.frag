#include <fog_pars_fragment>
uniform sampler2D uMap;
uniform float uIntensity;
uniform float uTime;
uniform float uSeed;
uniform float uReflect;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vec2 uv = vUv;
  vec4 tex;
  if (uReflect > 0.5) {
    uv.x += sin(vWorld.z * 2.7 + uTime * 1.9) * 0.012 + sin(vWorld.x * 6.0 + uTime * 3.1) * 0.006;
    tex = texture2D(uMap, uv) * 0.3
        + texture2D(uMap, uv + vec2(0.0, 0.035)) * 0.25
        + texture2D(uMap, uv - vec2(0.0, 0.035)) * 0.25
        + texture2D(uMap, uv + vec2(0.0, 0.08)) * 0.2;
    tex.rgb *= exp(vWorld.y * 0.22) * 0.55;
  } else {
    tex = texture2D(uMap, uv);
  }
  float buzz = 0.93 + 0.07 * sin(uTime * 55.0 + uSeed * 10.0);
  gl_FragColor = vec4(tex.rgb * uIntensity * buzz * uOpacity, tex.a * uOpacity);
  #include <fog_fragment>
}
