uniform float uTime;
uniform float uPulse;
uniform float uShock;
varying vec3 vN;
varying vec3 vV;
varying float vDisp;
varying vec3 vPos;

void main() {
  float n = snoise(position * 0.8 + vec3(0.0, uTime * 0.35, 0.0));
  float beat = pow(0.5 + 0.5 * sin(uTime * 2.2), 6.0);
  float d = n * 0.2 + beat * 0.16 * uPulse + uShock * 0.55 * snoise(position * 3.0 + uTime * 4.0);
  vec3 p = position + normal * d;
  vDisp = d;
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
