/** GLSL sources, imported raw and assembled with shared helpers. */
import noise from './noise.glsl?raw';
import hash from './hash.glsl?raw';
import skyVert from './sky.vert?raw';
import skyFrag from './sky.frag?raw';
import cloudsVert from './clouds.vert?raw';
import cloudsFrag from './clouds.frag?raw';
import rainVert from './rain.vert?raw';
import rainFrag from './rain.frag?raw';
import windowsVert from './windows.vert?raw';
import windowsFrag from './windows.frag?raw';
import hologramVert from './hologram.vert?raw';
import hologramFrag from './hologram.frag?raw';
import signVert from './sign.vert?raw';
import signFrag from './sign.frag?raw';
import wetfloorVert from './wetfloor.vert?raw';
import wetfloorFrag from './wetfloor.frag?raw';
import particlesVert from './particles.vert?raw';
import particlesFrag from './particles.frag?raw';
import coreVert from './core.vert?raw';
import coreFrag from './core.frag?raw';
import steamVert from './steam.vert?raw';
import steamFrag from './steam.frag?raw';
import ringFrag from './ring.frag?raw';
import basicVert from './basic.vert?raw';

const withNoise = (src: string) => `${hash}\n${noise}\n${src}`;
const withHash = (src: string) => `${hash}\n${src}`;

export const SHADERS = {
  sky: { vertex: skyVert, fragment: withHash(skyFrag) },
  clouds: { vertex: cloudsVert, fragment: withNoise(cloudsFrag) },
  rain: { vertex: rainVert, fragment: rainFrag },
  windows: { vertex: windowsVert, fragment: withNoise(windowsFrag) },
  hologram: { vertex: withHash(hologramVert), fragment: hologramFrag },
  sign: { vertex: signVert, fragment: signFrag },
  wetfloor: { vertex: wetfloorVert, fragment: withNoise(wetfloorFrag) },
  particles: { vertex: particlesVert, fragment: particlesFrag },
  core: { vertex: withNoise(coreVert), fragment: coreFrag },
  steam: { vertex: steamVert, fragment: steamFrag },
  ring: { vertex: basicVert, fragment: ringFrag },
} as const;
