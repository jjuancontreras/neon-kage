// Prints raw + gzipped sizes of the built JS (fonts and CSS excluded) and
// fails if the gzipped total reaches the 600 KB budget.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 600;
const dir = 'dist/assets';
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
if (!files.length) {
  console.error('No JS found in dist/assets — run `npm run build` first.');
  process.exit(1);
}
let raw = 0;
let gz = 0;
console.log('file'.padEnd(40), 'raw KB'.padStart(10), 'gzip KB'.padStart(10));
for (const f of files) {
  const buf = readFileSync(join(dir, f));
  const g = gzipSync(buf, { level: 9 }).length;
  raw += buf.length;
  gz += g;
  console.log(f.padEnd(40), (buf.length / 1024).toFixed(1).padStart(10), (g / 1024).toFixed(1).padStart(10));
}
console.log('-'.repeat(62));
console.log('TOTAL JS'.padEnd(40), (raw / 1024).toFixed(1).padStart(10), (gz / 1024).toFixed(1).padStart(10));
const ok = gz / 1024 < BUDGET_KB;
console.log(`gzipped JS ${(gz / 1024).toFixed(1)} KB ${ok ? '<' : '>='} ${BUDGET_KB} KB budget (fonts excluded) → ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
