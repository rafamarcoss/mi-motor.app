import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SOURCES } from '../src/editorial/sources.js';
import { parseFeed } from '../src/editorial/feeds.js';
import { scoreCandidate } from '../src/editorial/scoring.js';
import { dedupeCandidates } from '../src/editorial/dedupe.js';
import { createSlug } from '../src/editorial/slug.js';

const mode = process.env.EDITORIAL_MODE || 'review';
if (!['review', 'auto'].includes(mode)) throw new Error('EDITORIAL_MODE debe ser review o auto');
const output = resolve('../.github/editorial/candidates.json');
let existing = [];
try { existing = JSON.parse(await readFile(output, 'utf8')); } catch {}
const discoveredAt = new Date().toISOString();
const fetched = [];

for (const source of SOURCES) {
  if (source.manual) {
    console.log(`${source.name}: revisión manual configurada (${source.page})`);
    continue;
  }
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent': 'MiMotorEditorial/1.0 (+https://mi-motor.app/)' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = parseFeed(await response.text(), source);
    fetched.push(...items.slice(0, 30));
    console.log(`${source.name}: ${items.length} entradas leídas`);
  } catch (error) { console.warn(`${source.name}: fuente omitida (${error.message})`); }
}

const scored = fetched.map((item) => ({ ...item, discoveredAt, slug: createSlug(item.titleOriginal), categories: ['IA', 'automoción'], score: scoreCandidate(item) })).filter((item) => item.score.relevant);
const fresh = dedupeCandidates(scored, existing);
const combined = [...existing, ...fresh].sort((a, b) => b.score.total - a.score.total).slice(0, 300);
await mkdir(resolve('../.github/editorial'), { recursive: true });
await writeFile(output, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
console.log(`Candidatos relevantes nuevos: ${fresh.length}. Total guardado: ${combined.length}. Modo: ${mode}.`);
if (mode === 'auto') console.warn('El modo auto está deliberadamente bloqueado: requiere validación editorial humana antes de publicar.');
