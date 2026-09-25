# NEON KAGE

A five-chapter, scroll-driven, real-time WebGL journey through a rain-soaked cyberpunk megacity at night. Think Blade Runner meets Ghost in the Shell, with a digital Shinto shrine at its centre. The palette is neon vermilion, electric cyan and acid magenta on ink-black.

It is a from-scratch, futuristic reinterpretation of the *idea* behind [MengTo/kage](https://github.com/MengTo/kage), a scroll-driven night walk through a temple. No Kage code, shaders, images, fonts or text were used; see [RESEARCH.md](RESEARCH.md) and `npm run kage-check`.

| # | Chapter | What happens |
|---|---|---|
| 01 | **Arrival** | The camera descends through clouds and GPU rain onto a rooftop with a flickering holographic torii. The title resolves with an anime.js glitch-scramble. |
| 02 | **Market** | A neon alley with procedural canvas-drawn kanji signs, steam vents, wet-floor reflections and hovering drones. Signs brighten and stutter as the cursor nears them. |
| 03 | **Datastream** | The city dissolves window by window into 120k instanced particles (desktop). The camera flies a data tunnel through chromatic aberration and a datamosh seam. |
| 04 | **Shrine Core** | A floating wireframe shrine around a pulsing GLSL AI core. Click the core, or the *Consult the core* button, for a shockwave and an oracle line. |
| 05 | **Ascent** | The camera rises above the re-forming skyline into a synthetic magenta-to-cyan sunrise, then the credits. |

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + static build into dist/
npm run preview      # serve dist/ on http://localhost:4173
```

Verification tooling:

```bash
npx playwright install chromium   # once
npm run verify       # Playwright: 2 viewports × (normal + reduced motion), screenshots → verify/screenshots/
npm run size         # gzipped JS budget check (< 600 KB, fonts excluded)
npm run kage-check   # proves no MengTo/kage code, text or assets were copied
```

URL flags:
- `?quality=high|mid|low` forces a quality tier and disables the FPS governor.
- `?debug` shows FPS and the tier in the HUD.

## Controls

| Input | Action |
|---|---|
| Scroll / swipe | Travel along the camera path |
| `↓` `→` / `↑` `←` | Next / previous chapter |
| `1`–`5` | Jump to a chapter |
| `` ` `` (backtick) | Open or close the hidden terminal |
| Cursor near a sign | The sign flares (chapter 2) |
| Click the core | Shockwave + oracle (chapter 4) |
| **Sound** button | Opt-in generative ambient audio. It's muted by default. |

Terminal commands: `help`, `jack-in`, `glitch`, `rain off`, `rain on`, `oracle`, `goto <1-5>`, `sound on|off`, `status`, `clear`, `exit`.

## How it's built

- **One continuous camera path.** Two `CatmullRomCurve3` curves (position and look-at) are keyed by path progress `u`. Each `<section>` owns exactly one fifth of `u`, so the DOM text layer and the camera always agree on the chapter (`src/core/scroll.ts`, `src/core/cameraPath.ts`).
- **All 3D is procedural.** Towers are instanced boxes with a hashed window-grid shader and a noise dissolve edge. The torii is merged primitives with a bent kasagi. The kanji signs are drawn on `<canvas>` at runtime. The shrine is `EdgesGeometry` of flared cone roofs. The rain is instanced line streaks wrapped around the camera in the vertex shader.
- **Post-processing** uses pmndrs `postprocessing`, merged into two full-screen passes:
  1. Bloom.
  2. A custom *Signal* effect (chromatic aberration, glitch slices, macroblock datamosh), then neutral tone mapping, custom CRT scanlines with a vignette, and custom film grain.

  Glitch bursts fire on chapter changes.
- **UI layer.** A HUD has corner brackets, live readouts and anime.js-drawn SVG lines. There is also a chapter rail, a reticle cursor with magnetic hover (`pointer: fine` only), and the terminal.
- **Adaptive quality.** The starting tier comes from the GPU string, cores, memory, pointer type and Save-Data. At runtime an FPS governor steps down pixel ratio, particles, rain and towers.

| Tier | Pixel ratio | Particles | Rain | Towers |
|---|---|---|---|---|
| high | ≤ 2 | 120,000 | 14,000 | 2,600 |
| mid | ≤ 1.5 | 40,000 | 8,000 | 1,700 |
| low | 1 | 15,000 | 3,500 | 1,000 |

- **Accessibility.** The page uses semantic landmarks, and all narrative is real DOM text. There's a skip link and keyboard navigation, `aria-current` on the rail, and the terminal is an `aria-live` log.
- **Reduced motion.** `prefers-reduced-motion` replaces camera flights with still hero shots and ink crossfades. It turns off glitches, the datamosh, shake and the scramble, and slows the rain.
- **Fallback.** If WebGL 2 is unavailable, or the context is lost, the page switches to CSS gradient backdrops with the full text.

Source layout (every file is under 500 lines):

```
src/core     engine, camera path, scroll→progress, chapters, quality tiers, event bus
src/scenes   sky, rain, city, rooftop (torii), market, signs, drones, steam, datastream, shrine, ascent
src/shaders  GLSL (sky, clouds, rain, windows, hologram, sign, wet floor, particles, core, fx-*)
src/fx       EffectComposer pipeline + custom Signal / CRT / Grain effects
src/ui       HUD, nav rail, reticle cursor, terminal, title, oracle, crossfade veil
src/audio    Web Audio ambient generator
scripts      verify.mjs (Playwright), size.mjs, kage-check.mjs
```

## CREDITS

### Runtime libraries
| Library | Version | License | Use |
|---|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | 0.186.1 | MIT | WebGL engine, `BufferGeometryUtils` |
| [postprocessing](https://github.com/pmndrs/postprocessing) (pmndrs) | 6.39.5 | Zlib | EffectComposer, Bloom, tone mapping, `Effect` base class |
| [anime.js](https://github.com/juliangarnier/anime) | 4.5.0 | MIT | Title scramble, HUD SVG line drawing, panel reveals |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.26 | MIT | Smooth scroll |

### Fonts (self-hosted via Fontsource)
| Font | Package | License |
|---|---|---|
| Space Grotesk | @fontsource/space-grotesk 5.3.0 | SIL OFL 1.1 |
| JetBrains Mono | @fontsource/jetbrains-mono 5.3.0 | SIL OFL 1.1 |
| Noto Sans JP | @fontsource/noto-sans-jp 5.3.0 | SIL OFL 1.1 |

### Build and verification tooling
| Tool | Version | License |
|---|---|---|
| [Vite](https://github.com/vitejs/vite) | 8.3.1 | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | 7.0.2 | Apache-2.0 |
| [Playwright](https://github.com/microsoft/playwright) | 1.63.0 | Apache-2.0 |
| [@types/three](https://github.com/three-types/three-ts-types) | 0.186.0 | MIT |

### Code borrowed, with attribution in the source
| Source | License | Where |
|---|---|---|
| [stegu/webgl-noise](https://github.com/stegu/webgl-noise) (Ian McEwan, Stefan Gustavson; originally [ashima/webgl-noise](https://github.com/ashima/webgl-noise)) | MIT | `src/shaders/noise.glsl`: 3D simplex noise |

### References (concepts only, no code copied)
| Reference | License | What it informed |
|---|---|---|
| [MengTo/kage](https://github.com/MengTo/kage) | None granted | The original idea of a scroll-driven night walk. Concepts only, per RESEARCH.md. |
| [mattdesl/glsl-film-grain](https://github.com/mattdesl/glsl-film-grain) | MIT | Luminance-weighted grain approach |
| [felixturner/bad-tv-shader](https://github.com/felixturner/bad-tv-shader) | MIT | Row-slice analog glitch approach |
| [ektogamat/threejs-vanilla-holographic-material](https://github.com/ektogamat/threejs-vanilla-holographic-material) | MIT | Fresnel + scanline + flicker hologram recipe |
| [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) | MIT | Modular scene structure for an interactive three.js site |
| [mrdoob/glsl-sandbox](https://github.com/mrdoob/glsl-sandbox) | MIT | Tunnel composition ideas |
| [Codrops/RainEffect](https://github.com/Codrops/RainEffect) | No license file | Visual inspiration only |
| [alexr4/datamoshing-GLSL](https://github.com/alexr4/datamoshing-GLSL) | GPL-3.0 | Looked at, **not used**. Our datamosh is original. |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | Prosperity/Patron | Looked at, **not used** |

All other code, shaders, text, oracle lines and procedural assets are original to this project.
