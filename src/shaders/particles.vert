attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aRand;
uniform float uTime;
uniform float uMorph;
uniform float uSize;
uniform float uFlow;
uniform float uTunnelStart;
uniform float uTunnelLen;
uniform float uFade;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying vec3 vColor;
varying vec2 vUv;
varying float vAlpha;

const vec3 AXIS = vec3(0.0, 4.0, 0.0);

void main() {
  float m = clamp((uMorph - aRand.x * 0.4) / 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);

  vec3 end = aEnd;
  float speed = uFlow * (0.4 + aRand.y);
  end.z = uTunnelStart - mod(uTunnelStart - aEnd.z - uTime * speed, uTunnelLen);
  vec2 radial = end.xy - AXIS.xy;
  float ang = atan(radial.y, radial.x) + uTime * 0.08 * (aRand.z - 0.5);
  float rad = length(radial);
  end.xy = AXIS.xy + vec2(cos(ang), sin(ang)) * rad;

  vec3 center = mix(aStart, end, m);
  center.y += sin(m * 3.14159) * 8.0 * (aRand.w - 0.5);

  // Billboard while scattered; radial streaks once inside the tunnel.
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 tangent = vec3(-sin(ang), cos(ang), 0.0);
  float size = uSize * (0.45 + aRand.w);
  vec3 bb = (camRight * position.x + camUp * position.y) * size;
  vec3 streak = (tangent * position.x * 0.6 + vec3(0.0, 0.0, 1.0) * position.y * (2.0 + aRand.y * 10.0)) * size;
  vec3 wp = center + mix(bb, streak, m);

  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vColor = aRand.z > 0.86 ? uC2 : (aRand.z > 0.8 ? uC3 : uC1);
  vAlpha = uFade * smoothstep(0.3, 4.0, -mv.z) * (0.55 + 0.45 * aRand.y);
}
