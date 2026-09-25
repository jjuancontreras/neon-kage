uniform float uSunrise;
uniform float uVoid;
uniform vec3 uInk;
uniform vec3 uHaze;
uniform vec3 uMagenta;
uniform vec3 uCyan;
uniform vec3 uVermilion;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float horizon = exp(-abs(y) * 9.0);

  // Night: ink zenith, sodium-magenta city glow pooled at the horizon.
  float above = smoothstep(-0.18, 0.0, y);
  vec3 night = mix(uInk, uHaze, horizon * above);
  night += uMagenta * 0.05 * exp(-max(y, 0.0) * 16.0) * above;
  vec2 sp = floor(d.xz / (y + 1.2) * 420.0);
  night += step(0.9978, nkHash(sp)) * smoothstep(0.15, 0.6, y) * 0.5;

  // Synthetic sunrise to the east (-Z): magenta horizon, cyan zenith.
  float east = clamp(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), vec3(0.0, 0.0, -1.0)) * 0.5 + 0.5, 0.0, 1.0);
  vec3 dawn = mix(uMagenta * 0.9, uCyan * 0.55, smoothstep(-0.02, 0.5, y));
  dawn = mix(dawn, uVermilion, exp(-abs(y - 0.015) * 26.0) * east * 0.75);
  dawn *= mix(0.25, 1.0, east);
  dawn = mix(dawn, uInk, smoothstep(0.0, -0.2, y));

  vec3 sunDir = normalize(vec3(0.0, 0.05 + uSunrise * 0.07, -1.0));
  float sd = distance(d, sunDir);
  float disc = smoothstep(0.14, 0.136, sd);
  float below = step(d.y, sunDir.y);
  float bands = step(0.42, fract((sunDir.y - d.y) * 55.0));
  disc *= mix(1.0, bands, below);
  vec3 sunCol = mix(uVermilion * 2.2, vec3(2.2, 1.6, 2.0), smoothstep(-0.12, 0.12, d.y - sunDir.y));
  vec3 dawnFull = dawn + sunCol * disc + uMagenta * exp(-sd * 5.0) * 0.45;

  vec3 col = mix(night, dawnFull, uSunrise);

  // Cyberspace void for the datastream and shrine chapters.
  vec3 voidCol = mix(vec3(0.0, 0.0, 0.006), uHaze * 0.5, horizon * 0.8);
  col = mix(col, voidCol, uVoid);
  gl_FragColor = vec4(col, 1.0);
}
