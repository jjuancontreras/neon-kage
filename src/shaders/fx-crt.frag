// CRT scanlines, faint aperture mask and vignette (original).
uniform float uStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float s = 0.5 + 0.5 * sin(uv.y * resolution.y * 2.0943951);
  float scan = 1.0 - uStrength * 0.28 * (1.0 - s);
  float m = mod(floor(uv.x * resolution.x), 3.0);
  vec3 mask = vec3(m == 0.0 ? 1.0 : 0.96, m == 1.0 ? 1.0 : 0.96, m == 2.0 ? 1.0 : 0.96);
  mask = mix(vec3(1.0), mask, uStrength);
  float vig = 1.0 - smoothstep(0.42, 0.98, length((uv - 0.5) * vec2(1.0, 0.82))) * 0.6;
  outputColor = vec4(inputColor.rgb * scan * mask * vig, inputColor.a);
}
