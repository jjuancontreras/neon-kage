// Signal corruption: chromatic aberration, band-slice glitch, macroblock datamosh (original).
uniform float uGlitch;
uniform float uMosh;
uniform float uAberration;

float sigHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;
  if (uMosh > 0.001) {
    vec2 grid = vec2(28.0, 16.0);
    vec2 blk = floor(uv * grid);
    float h = sigHash(blk + floor(time * 10.0) * 0.37);
    float mhit = step(1.0 - uMosh * 0.85, h);
    vec2 dir = vec2(sigHash(blk + 3.1) - 0.5, sigHash(blk + 7.7) - 0.5);
    p += dir * 0.09 * uMosh * mhit;
    vec2 q = (floor(p * grid * 3.0) + 0.5) / (grid * 3.0);
    p = mix(p, q, mhit * step(0.5, sigHash(blk + 11.0)));
  }
  if (uGlitch > 0.001) {
    float band = floor(uv.y * 46.0);
    float r = sigHash(vec2(band, floor(time * 30.0)));
    p.x += (r - 0.5) * 0.14 * uGlitch * step(1.0 - uGlitch * 0.55, r);
  }
  float ca = uAberration + uGlitch * 0.012 + uMosh * 0.01;
  vec2 dc = (uv - 0.5) * ca;
  vec4 c = texture2D(inputBuffer, p);
  c.r = texture2D(inputBuffer, p + dc).r;
  c.b = texture2D(inputBuffer, p - dc).b;
  if (uMosh > 0.001) {
    c.rgb = mix(c.rgb, floor(c.rgb * 5.0) / 5.0 + vec3(0.03, 0.0, 0.05), uMosh * 0.45);
  }
  outputColor = vec4(c.rgb, inputColor.a);
}
