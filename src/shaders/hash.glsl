// Cheap hash helpers (original).
float nkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float nkHash1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
