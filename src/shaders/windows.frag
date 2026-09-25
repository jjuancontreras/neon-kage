#include <fog_pars_fragment>
uniform float uTime;
uniform float uDissolve;
uniform float uLit;
uniform vec3 uBody;
uniform vec3 uWarm;
uniform vec3 uCyan;
uniform vec3 uMagenta;
uniform vec3 uVermilion;
uniform vec3 uEdge;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
varying float vBaseY;

void main() {
  vec3 n = normalize(vNormalW);
  float h = vWorld.y - vBaseY;
  vec3 col = uBody * (0.55 + 0.45 * smoothstep(0.0, 60.0, h));

  if (abs(n.y) < 0.5) {
    vec2 f = (abs(n.x) > 0.5 ? vWorld.zy : vWorld.xy) + vSeed * 31.0;
    vec2 cell = vec2(1.7, 2.6);
    vec2 id = floor(f / cell);
    vec2 g = fract(f / cell);
    float win = step(0.2, g.x) * step(g.x, 0.8) * step(0.28, g.y) * step(g.y, 0.72);
    float r = nkHash(id + vSeed * 7.13);
    float lit = step(1.0 - uLit, r);
    float pick = nkHash(id * 1.37 + vSeed * 3.1);
    vec3 wc = uWarm;
    if (pick > 0.955) wc = uCyan;
    else if (pick > 0.925) wc = uMagenta;
    else if (pick > 0.91) wc = uVermilion;
    float flick = 0.85 + 0.15 * sin(uTime * (1.0 + r * 3.0) + r * 60.0);
    col += wc * win * lit * (0.25 + 0.75 * nkHash(id + 3.1)) * flick * step(2.5, h);
    // storefront band at street level
    col += wc * 0.35 * step(h, 2.4) * step(0.6, pick) * step(0.4, g.x);
  } else {
    col *= 1.3;
  }

  if (uDissolve > 0.001) {
    float dn = snoise(vWorld * 0.11 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5 + 0.5;
    float cut = uDissolve * 1.2 - 0.1;
    if (dn < cut) discard;
    col += uEdge * smoothstep(cut + 0.07, cut, dn) * 5.0;
  }

  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
