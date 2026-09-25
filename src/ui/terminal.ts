import { emit, on } from '../core/bus';
import { heroU } from '../core/chapters';
import type { ScrollDriver } from '../core/scroll';
import { pickOracle } from './oracle';

type LineKind = 'cmd' | 'out' | 'err' | 'sys' | 'dim';

export interface TerminalDeps {
  readonly scroll: ScrollDriver;
  readonly toggleSound: (on?: boolean) => boolean;
  readonly status: () => string;
}

const HELP: ReadonlyArray<readonly [string, string]> = [
  ['help', 'list commands'],
  ['jack-in', 'dive straight into the datastream'],
  ['glitch', 'corrupt the signal (briefly)'],
  ['rain off | rain on', 'stop or restart the rain'],
  ['oracle', 'ask the shrine core a question'],
  ['goto <1-5>', 'jump to a chapter'],
  ['sound on | sound off', 'generative ambient audio'],
  ['status', 'renderer and quality readout'],
  ['clear', 'clear the log'],
  ['exit', 'close the terminal (or press esc)'],
];

/** Hidden terminal, toggled with the backtick key. */
export function initTerminal(deps: TerminalDeps): void {
  const root = document.getElementById('terminal');
  const log = root?.querySelector<HTMLElement>('.terminal-log');
  const form = root?.querySelector<HTMLFormElement>('form');
  const input = root?.querySelector<HTMLInputElement>('input');
  if (!root || !log || !form || !input) return;

  const history: string[] = [];
  let cursor = 0;
  let rainOn = true;

  const print = (text: string, kind: LineKind = 'out') => {
    const p = document.createElement('p');
    p.className = `t-${kind}`;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
  };

  const open = () => {
    root.hidden = false;
    if (!log.childElementCount) {
      print('NEON//KAGE maintenance shell v0.9 — type `help`', 'sys');
    }
    input.focus();
  };
  const close = () => {
    root.hidden = true;
    input.blur();
  };

  const commands: Record<string, (args: string[]) => void> = {
    help: () => HELP.forEach(([c, d]) => print(`  ${c.padEnd(22)}${d}`)),
    'jack-in': () => {
      print('establishing neural link…', 'sys');
      print('link stable. welcome to the stream.', 'sys');
      emit('glitch', { strength: 1 });
      deps.scroll.scrollToU(heroU(2));
    },
    glitch: () => {
      emit('glitch', { strength: 1 });
      print('signal corrupted.', 'sys');
    },
    rain: ([arg]) => {
      if (arg !== 'on' && arg !== 'off') return print('usage: rain on | rain off', 'err');
      rainOn = arg === 'on';
      emit('rain', { enabled: rainOn });
      print(rainOn ? 'precipitation restored.' : 'precipitation suspended. the city holds its breath.', 'sys');
    },
    oracle: () => print(`» ${pickOracle()}`, 'sys'),
    goto: ([n]) => {
      const i = Number(n) - 1;
      if (!(i >= 0 && i <= 4)) return print('usage: goto <1-5>', 'err');
      deps.scroll.scrollToU(heroU(i));
      print(`routing to chapter 0${i + 1}.`, 'dim');
    },
    sound: ([arg]) => {
      if (arg !== 'on' && arg !== 'off') return print('usage: sound on | sound off', 'err');
      const state = deps.toggleSound(arg === 'on');
      print(state ? 'ambient audio online.' : 'ambient audio muted.', 'dim');
    },
    status: () => print(deps.status(), 'dim'),
    clear: () => log.replaceChildren(),
    exit: close,
  };

  const run = (raw: string) => {
    const line = raw.trim().toLowerCase();
    if (!line) return;
    print(`$ ${line}`, 'cmd');
    history.push(line);
    cursor = history.length;
    const [name, ...args] = line.split(/\s+/);
    const cmd = commands[name];
    if (cmd) cmd(args);
    else print(`command not found: ${name} — try \`help\``, 'err');
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor];
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && history.length) {
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] ?? '';
      e.preventDefault();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote' || e.key === '`') {
      e.preventDefault();
      if (root.hidden) open();
      else close();
    } else if (e.key === 'Escape' && !root.hidden) {
      close();
    }
  });

  on('oracle', ({ line }) => {
    if (!root.hidden) print(`» ${line}`, 'sys');
  });
}
