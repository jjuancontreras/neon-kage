uniform vec3 uCyan;
uniform vec3 uMagenta;
uniform vec3 uVermilion;
uniform float uTime;
uniform float uShock;
varying vec3 vN;
varying vec3 vV;
varying float vDisp;
varying vec3 vPos;

void main() {
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.4);
  float bands = sin(vPos.y * 7.0 + vDisp * 18.0 - uTime * 2.6) * 0.5 + 0.5;
  float veins = smoothstep(0.92, 1.0, sin(vPos.x * 11.0 + vPos.z * 9.0 + uTime) * 0.5 + 0.5);
  vec3 inner = mix(uMagenta * 0.35, uVermilion * 1.2, smoothstep(0.05, 0.3, vDisp));
  vec3 col = inner * (0.35 + 0.65 * bands) + uCyan * fres * 3.2 + uCyan * veins * 0.8 + vec3(1.0) * uShock * 1.8;
  gl_FragColor = vec4(col, 1.0);
}
