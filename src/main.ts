import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/noto-sans-jp/700.css';
import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/ui.css';

import { Ambient } from './audio/ambient';
import { on } from './core/bus';
import { heroU } from './core/chapters';
import { startDirector } from './core/director';
import { Engine } from './core/engine';
import { isDebug, prefersReducedMotion } from './core/env';
import { detectTier } from './core/quality';
import { ScrollDriver } from './core/scroll';
import { initCursor } from './ui/cursor';
import { initHud } from './ui/hud';
import { initNav } from './ui/nav';
import { initOracle } from './ui/oracle';
import { initTerminal } from './ui/terminal';
import { initTitle } from './ui/title';
import { createCrossfade } from './ui/veil';

declare global {
  interface Window {
    __neon?: {
      readonly webgl: boolean;
      readonly ready: () => boolean;
      readonly frames: () => number;
      readonly chapter: () => number;
      readonly goto: (index: number, immediate?: boolean) => void;
    };
  }
}

const JP_GLYPHS = '電脳拉麺夜市雨宿居酒屋薬局占い記憶未来無限夢影ネオン電気街カラオケ神経網';

/** Make sure the kanji glyphs used by the canvas signs are loaded before we draw them. */
async function loadSignFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('700 64px "Noto Sans JP"', JP_GLYPHS),
      document.fonts.load('600 18px "JetBrains Mono"', 'OPEN 24H'),
    ]);
  } catch {
    // Canvas falls back to system fonts; the scene still works.
  }
}

function createEngine(reduced: boolean, scroll: ScrollDriver): Engine | null {
  const canvas = document.getElementById('gl') as HTMLCanvasElement | null;
  if (!canvas) return null;
  try {
    const gl = canvas.getContext('webgl2', { antialias: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    const engine = new Engine({
      canvas,
      gl,
      tier: detectTier(gl),
      reduced,
      getScrollU: () => scroll.u,
      crossfade: createCrossfade(document.getElementById('veil') as HTMLElement),
    });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      document.documentElement.classList.add('no-webgl');
    });
    return engine;
  } catch (err) {
    console.warn('[neon-kage] WebGL disabled, using the text-only fallback.', err);
    document.documentElement.classList.add('no-webgl');
    return null;
  }
}

async function boot(): Promise<void> {
  const root = document.documentElement;
  root.classList.add('is-booting');
  const reduced = prefersReducedMotion();
  const debug = isDebug();
  const sections = [...document.querySelectorAll<HTMLElement>('section.chapter')];
  const scroll = new ScrollDriver(sections, reduced);
  const director = startDirector(scroll);

  await loadSignFonts();
  const engine = createEngine(reduced, scroll);
  const audio = new Ambient();
  const soundBtn = document.querySelector<HTMLButtonElement>('.sound-toggle');
  const setSound = (force?: boolean) => {
    const playing = audio.toggle(force);
    soundBtn?.setAttribute('aria-pressed', String(playing));
    const label = soundBtn?.querySelector('b');
    if (label) label.textContent = playing ? 'on' : 'off';
    return playing;
  };
  soundBtn?.addEventListener('click', () => setSound());
  on('chapter', ({ index }) => audio.setChapter(index));

  initHud(
    {
      u: () => engine?.progress ?? scroll.u,
      position: () => engine?.camera.position ?? null,
      speed: () => engine?.speed ?? 0,
      fps: () => engine?.fps ?? null,
      tier: () => engine?.tier ?? null,
    },
    reduced,
    debug,
  );
  initNav(scroll, () => director.chapter);
  initCursor(reduced);
  initOracle(reduced);
  initTerminal({
    scroll,
    toggleSound: setSound,
    status: () =>
      engine
        ? `renderer: webgl2 · tier: ${engine.tier} · fps: ${engine.fps.toFixed(0)} · reduced-motion: ${reduced}`
        : `renderer: css fallback · reduced-motion: ${reduced}`,
  });

  engine?.warmup();
  engine?.start();
  requestAnimationFrame(() => {
    root.classList.remove('is-booting');
    initTitle(reduced);
  });

  window.__neon = {
    webgl: engine !== null,
    ready: () => (engine ? engine.frames > 2 : true),
    frames: () => engine?.frames ?? 0,
    chapter: () => director.chapter,
    goto: (index, immediate = false) => scroll.scrollToU(heroU(index), immediate),
  };
}

void boot();
