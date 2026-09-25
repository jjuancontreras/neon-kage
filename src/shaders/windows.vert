#include <fog_pars_vertex>
attribute float aSeed;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
varying float vBaseY;

void main() {
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix * im) * normal);
  vSeed = aSeed;
  vBaseY = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).y;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
