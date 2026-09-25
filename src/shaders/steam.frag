uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vSeed;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float puff = smoothstep(0.5, 0.0, d);
  float wisp = 0.7 + 0.3 * sin((p.x + p.y) * 12.0 + vSeed * 30.0);
  gl_FragColor = vec4(uColor, puff * wisp * vAlpha * uOpacity);
}
