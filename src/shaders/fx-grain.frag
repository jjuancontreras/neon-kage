// Luminance-weighted film grain (original hash-based implementation;
// approach informed by mattdesl/glsl-film-grain, MIT).
uniform float uAmount;

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float n = grainHash(uv * resolution + fract(time * 7.13) * 431.0) - 0.5;
  float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  // Output is still linear here, so grain is mostly multiplicative: dark areas
  // stay clean after sRGB encoding instead of turning into static.
  vec3 c = inputColor.rgb * (1.0 + n * uAmount * 2.0) + n * uAmount * 0.02 * smoothstep(0.0, 0.05, luma);
  outputColor = vec4(max(c, 0.0), inputColor.a);
}
