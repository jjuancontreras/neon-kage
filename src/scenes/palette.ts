import { Color } from 'three';

/** Brand palette (sRGB hex → linear Color via three's color management). */
export const HEX = {
  ink: '#07070b',
  haze: '#1b0d2a',
  vermilion: '#ff3b1f',
  cyan: '#00e5ff',
  magenta: '#ff2bd6',
  bone: '#e9e6f0',
  warm: '#ffb86b',
  body: '#0b0b14',
} as const;

export type PaletteKey = keyof typeof HEX;

export const color = (key: PaletteKey): Color => new Color(HEX[key]);
