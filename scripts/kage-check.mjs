// Proves no MengTo/kage code or assets were copied into NEON KAGE:
//  1. clones kage (shallow) into the OS temp dir — never into this repo
//  2. compares SHA-256 hashes of every kage file against every project file
//  3. greps for distinctive kage tokens (asset paths, anchors, fonts)
//  4. compares 16-token shingles (after removing <meta>/<link> head boilerplate) of kage's index.html / PROMPT.md with our sources
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative, sep } from 'node:path';

const REF = join(tmpdir(), 'kage-ref');
const SCAN = ['src', 'public', 'index.html', 'dist', 'scripts'];
const TEXT_EXT = new Set(['.ts', '.js', '.mjs', '.html', '.css', '.glsl', '.vert', '.frag', '.json', '.md']);
const TOKENS = ['secret-pathways', 'kage-preview', 'three.min.js', 'Kyoto', '影の道', 'Onest', '#pathways', '#eternity', '#lessons', 'id="gate"'];
const SELF = 'scripts/kage-check.mjs';

function walk(p, out = []) {
  if (!existsSync(p)) return out;
  if (statSync(p).isFile()) {
    out.push(p);
    return out;
  }
  for (const f of readdirSync(p)) {
    if (f === '.git' || f === 'node_modules') continue;
    walk(join(p, f), out);
  }
  return out;
}
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

if (!existsSync(REF)) {
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/MengTo/kage.git', REF], { stdio: 'ignore' });
}
const refFiles = walk(REF);
const ours = SCAN.flatMap((p) => walk(p)).filter((f) => relative('.', f).split(sep).join('/') !== SELF);
console.log(`kage reference: ${refFiles.length} files (shallow clone in ${REF})`);
console.log(`neon-kage scanned: ${ours.length} files in ${SCAN.join(', ')}`);

// 1. identical files
const refHashes = new Map(refFiles.map((f) => [sha(f), relative(REF, f)]));
const dupes = ours.filter((f) => refHashes.has(sha(f)));
console.log(`\n[1] identical-file hash matches: ${dupes.length}`);
dupes.forEach((f) => console.log(`    ${f} == kage/${refHashes.get(sha(f))}`));

// 2. distinctive tokens
let tokenHits = 0;
console.log('\n[2] distinctive kage tokens:');
for (const t of TOKENS) {
  const hits = ours.filter((f) => TEXT_EXT.has(extname(f)) && readFileSync(f, 'utf8').includes(t));
  tokenHits += hits.length;
  console.log(`    ${JSON.stringify(t).padEnd(20)} ${hits.length ? hits.join(', ') : '0 hits'}`);
}

// 3. shared 16-token shingles with kage's own text/code
// Universal <head> boilerplate (<meta viewport>, <link rel=icon>, data-URI SVG
// preambles) is identical on most sites, so it is stripped before comparing.
// CSS splits into very short tokens (`margin 0 padding 0`), so the window is 16
// tokens: roughly two lines of code or four CSS declarations in a row.
const stripBoilerplate = (s) => s.replace(/<meta\s[^>]*>/gi, ' ').replace(/<link\s[^>]*>/gi, ' ');
const tokens = (s) => stripBoilerplate(s).split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
const shingles = (s, n = 16) => {
  const t = tokens(s);
  const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n).join(' '));
  return set;
};
const refText = ['index.html', 'PROMPT.md', 'README.md'].map((f) => join(REF, f)).filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n');
const refSh = shingles(refText);
let shared = 0;
const examples = [];
for (const f of ours.filter((x) => TEXT_EXT.has(extname(x)) && !x.includes('dist'))) {
  for (const s of shingles(readFileSync(f, 'utf8'))) {
    if (refSh.has(s)) {
      shared++;
      if (examples.length < 5) examples.push(`${f}: "${s}"`);
    }
  }
}
console.log(`\n[3] shared 16-token sequences with kage index.html/PROMPT.md/README.md: ${shared}`);
examples.forEach((e) => console.log(`    ${e}`));

const clean = dupes.length === 0 && tokenHits === 0 && shared === 0;
console.log(`\nRESULT: ${clean ? 'CLEAN — no Kage code, text or assets found in NEON KAGE' : 'MATCHES FOUND'}`);
process.exit(clean ? 0 : 1);
