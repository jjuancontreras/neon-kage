# NEON KAGE — Research (Phase 0)

Research date: 2026-09-25. Everything below was gathered before any project code was written.

---

## 1. Kage (MengTo/kage): concept study only

**Sources:**
- https://github.com/MengTo/kage (README, PROMPT.md)
- https://mengto.github.io/kage/ (live site)

**License:** the README says no reuse or redistribution license is granted for Kage's original code or artwork. Its vendored three.js keeps its own MIT license. **NEON KAGE copies no Kage code, shaders, images, fonts, text, class names or anchors.** The techniques below are paraphrased so the ideas can be reinterpreted. `scripts/kage-check.mjs` enforces this mechanically (hash comparison plus a grep for distinctive tokens).

### What Kage does (paraphrased)
| Technique | How Kage approaches it | NEON KAGE's reinterpretation |
|---|---|---|
| Scroll-driven camera | One continuous camera path is bound to page scroll with eased interpolation and slight parallax. It feels like a single tracking shot, not scene swaps. | `CatmullRomCurve3` position and look-at curves are sampled by a single normalized scroll value. Lenis smooths the input and a critically damped follow smooths the pose. |
| Chapter structure | A hero section plus editorially composed chapters, each framed like a cinematic shot. Headings reveal word by word. | Five `<section data-chapter>` blocks with codes 01-ARV…05-ASC. Each chapter owns a range of scroll progress and a set of scene groups. |
| HTML over WebGL | A full-viewport canvas sits underneath the editorial text and pre-rendered foreground cutouts, which pin and fade during handoffs. | A fixed canvas underneath a semantic HTML text layer, a HUD and a nav rail. **No bitmap plates.** Everything is procedural, including the kanji signs, which are drawn on canvas at runtime. |
| Fog / atmosphere | Depth haze, warm/cool dual lighting, rain, drifting leaves, embers. | `FogExp2` in ink-blue. GPU rain streaks wrap around the camera. Steam sprites and drone lights. |
| Bloom / grade | Restrained bloom, film grain, vignette. | pmndrs `BloomEffect` (mipmap blur) plus custom CRT, grain and signal effects (chromatic aberration, glitch, datamosh), all written for this project. |
| Reduced motion | The full reading experience is kept and motion degrades gracefully. | Camera flights become per-chapter still poses with CSS crossfades. Glitch, datamosh, shake and scramble are disabled. Rain slows. |
| Cursor | Custom cursor on fine pointers only. | A reticle with magnetic snapping to interactive elements, gated by `(pointer:fine)` and disabled under reduced motion. |
| Deploy | Static, relative paths, no remote fonts. | Vite static build with `base: './'`. Fonts are self-hosted through @fontsource. |

---

## 2. Stack research (current versions from the npm registry, 2026-09-25)

| Package | Version | Notes from docs/types |
|---|---|---|
| three | 0.186.1 | ESM, tree-shakeable. `InstancedMesh`, `InstancedBufferAttribute`, `CatmullRomCurve3.getPointAt`, `ShaderMaterial`, `CanvasTexture`. |
| postprocessing (pmndrs) | 6.39.5 | `EffectComposer` → `RenderPass` → `EffectPass(camera, ...effects)`. Effects merge into a single shader; only **one convolution effect per pass**. Custom effects extend `Effect(name, frag, {uniforms: Map})` with `mainImage` / `mainUv`. |
| three/examples EffectComposer | (bundled) | Every ShaderPass costs a full-screen draw. Rejected in favor of pmndrs merging, which matters on mobile. |
| animejs | 4.5.0 | Modular v4 API: `animate`, `createTimeline`, `stagger`, `svg.createDrawable` (`draw: '0 1'`), and **`scrambleText()`**, a built-in text-scramble function value, used for the glitch title. |
| gsap + ScrollTrigger | 3.15.0 | Very capable, but the camera, HUD and chapters all derive from one progress float, so ScrollTrigger would duplicate what Lenis + a mapper already do. Not used, which saves about 45 KB gzip. |
| lenis | 1.3.26 | Smooth-scroll input. It exposes `progress`, `scrollTo(target, {immediate})` and a `raf(time)` driver. MIT. |
| tone | 15.1.22 | A rich synth framework (~80 KB+ gzip). Ambient pads, noise and pings take about 150 lines of raw **Web Audio**, so Tone.js isn't used. |
| lil-gui / tweakpane | — / 4.0.5 | YAGNI. A `?debug` flag prints FPS and tier in the HUD instead. |
| vite | 8.3.1 | Static build, `?raw` GLSL imports. |
| playwright | 1.63.0 | Headless Chromium with SwiftShader provides WebGL for verification. |

### Final stack and reasons
- **Vite 8 + vanilla TypeScript.** Static build, no framework, fast HMR.
- **three r186.** The standard for procedural real-time 3D. InstancedMesh makes 120k particles a single draw call.
- **pmndrs postprocessing.** Effect merging keeps the whole grade to two full-screen passes plus bloom. All non-bloom effects are custom GLSL written for this project.
- **Lenis.** Smooth, accessible scroll that stays native, with no scroll-jacking. It is skipped under reduced motion.
- **anime.js v4.** DOM choreography: `scrambleText` for the title, drawable SVG for the HUD lines, staggered reveals, and terminal and oracle transitions.
- **Raw Web Audio.** Generative, opt-in, zero dependencies.
- **@fontsource, self-hosted, all SIL OFL 1.1.** Space Grotesk (display), JetBrains Mono (HUD/terminal), Noto Sans JP (kanji signs and Japanese accents).

---

## 3. Creative-coding reference repos and licenses

Licenses were checked with `gh api repos/<repo> --jq .license.spdx_id` on 2026-09-25.

| Repo | License | What it contributes | Borrow code? |
|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT | Engine, and examples for instanced meshes and fog | Library dependency |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | Composer, Bloom, `Effect` API | Library dependency (Zlib is permissive) |
| [stegu/webgl-noise](https://github.com/stegu/webgl-noise) (fork of [ashima/webgl-noise](https://github.com/ashima/webgl-noise)) | MIT | 3D simplex noise (`snoise`) | **Yes.** Ported into `src/shaders/noise.glsl` with an attribution header |
| [mattdesl/glsl-film-grain](https://github.com/mattdesl/glsl-film-grain) | MIT | Approach to luminance-weighted film grain | Concept only. Our grain is a hash-based rewrite |
| [felixturner/bad-tv-shader](https://github.com/felixturner/bad-tv-shader) | MIT | Approach to row-jitter / rolling distortion for analog glitch | Concept only. Our glitch uses block-hash displacement |
| [ektogamat/threejs-vanilla-holographic-material](https://github.com/ektogamat/threejs-vanilla-holographic-material) | MIT | Fresnel + scanline + flicker hologram recipe | Concept only. Our hologram shader is written from scratch |
| [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) | MIT | Structure of a scroll/interaction-driven three.js site, with modular scene classes | Concept only |
| [mrdoob/glsl-sandbox](https://github.com/mrdoob/glsl-sandbox) | MIT | Tunnel / raymarch-free polar tunnel ideas | Concept only |
| [Codrops/RainEffect](https://github.com/Codrops/RainEffect) | **No license file** | Rain-on-glass look | **No.** Inspiration only |
| [alexr4/datamoshing-GLSL](https://github.com/alexr4/datamoshing-GLSL) | **GPL-3.0** | Datamosh look | **No.** Incompatible license. Our datamosh is an original block-smear effect |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | Prosperity/Patron (NOASSERTION) | Shader function catalog | **No.** Not MIT/Apache |

**Rule:** only MIT, Apache-2.0 or Zlib code is copied, and every copied function carries a header naming its source and license. In this project the only verbatim port is simplex noise (stegu/ashima, MIT).

---

## 4. Scene plan

Palette tokens:
- ink `#07070b`
- vermilion `#ff3b1f`
- cyan `#00e5ff`
- magenta `#ff2bd6`
- bone text `#e9e6f0`

The tone is restrained: most of the frame is ink, and neon is an accent.

| # | Code | Scroll range | Camera | Content | FX |
|---|---|---|---|---|---|
| 1 | 01-ARV ARRIVAL | 0.00–0.20 | Descends from y≈220 through cloud planes to the rooftop at y≈62 | Sky dome, fbm clouds, GPU rain, instanced skyline, holographic torii on the roof, puddles. anime.js scramble title. | Bloom; glitch burst when leaving |
| 2 | 02-MKT MARKET | 0.20–0.40 | Drops off the roof edge to street level and tracks down the alley | Alley walls, 14 canvas-kanji neon signs that brighten and flicker near the cursor (raycast), steam sprites, 5 hovering drones, wet reflective floor | Glitch; **datamosh** at the 2→3 boundary |
| 3 | 03-DST DATASTREAM | 0.40–0.60 | Flies into a polar data tunnel | 120k instanced particles (desktop) morphing from city grid to tunnel helix; tunnel rings | **Chromatic aberration** ramps with speed |
| 4 | 04-SHR SHRINE CORE | 0.60–0.80 | Arcs around the floating shrine | Wireframe shrine (edges of procedural roofs and pillars) around an AI core: a custom GLSL noise and fresnel pulse. Click triggers a shockwave ring and an oracle line. | Bloom peaks |
| 5 | 05-ASC ASCENT | 0.80–1.00 | Rises to y≈300 facing east | Magenta→cyan synthetic sunrise on the sky dome, sun disc with scan-bands, skyline silhouette, credits roll | Grain eases, CRT fades |

### Camera path (top view, −Z is forward)
```
 y
 220 ●  (sky)                                                   ● 300 (ascent)
      \                                                        /
  62   ●──● rooftop/torii                                     /
            \                                                /
   2         ●───────● alley ──●  tunnel  ●═══════● ── ● shrine orbit
   z:  0    -40     -120     -200       -330      -420   -520
```

### Adaptive quality
| Tier | Detection | Pixel ratio | Particles | Post |
|---|---|---|---|---|
| high | desktop, ≥ 8 cores, non-software GPU | min(DPR, 2) | 120k | Bloom + signal (CA/glitch/datamosh) + CRT + grain |
| mid | desktop, or a strong mobile | min(DPR, 1.5) | 40k | Same, bloom at lower resolution |
| low | mobile, save-data, software GPU | 1 | 15k | Bloom + CRT/grain; signal effect limited to glitch bursts |

A runtime FPS governor steps the tier down after a sustained stretch below the threshold.

### Accessibility and fallback
- Semantic HTML: `<header>`, `<nav>` (chapter rail with `aria-current`), `<main>` with 5 `<section>` elements, `<footer>` credits.
- All narrative text is real DOM text.
- If WebGL fails, `html.no-webgl` swaps in CSS-gradient backdrops per chapter. Nav and terminal still work.
- `prefers-reduced-motion`: no smoothing, no flights, no glitches; crossfades between still poses.
