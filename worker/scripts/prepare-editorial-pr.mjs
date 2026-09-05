import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateEditorialDraft } from '../src/editorial/drafts.js';
import { buildReviewRecord, selectCandidateForReview } from '../src/editorial/review.js';

const editorialDir = resolve('../.github/editorial');
const reviewsDir = resolve(editorialDir, 'reviews');
const draftsDir = resolve(editorialDir, 'drafts');
const candidates = JSON.parse(await readFile(resolve(editorialDir, 'candidates.json'), 'utf8'));
let reviewedIds = new Set();
try { reviewedIds = new Set((await readdir(reviewsDir)).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, ''))); } catch {}

const candidate = selectCandidateForReview(candidates, reviewedIds);
if (!candidate) {
  console.log('No hay candidatos nuevos que alcancen el umbral editorial.');
  process.exit(0);
}

const draft = await generateEditorialDraft(candidate, {
  provider: process.env.EDITORIAL_AI_PROVIDER || 'none',
  apiKey: process.env.EDITORIAL_AI_API_KEY,
  baseUrl: process.env.EDITORIAL_AI_BASE_URL,
  model: process.env.EDITORIAL_AI_MODEL
});
const review = buildReviewRecord(candidate, { ...draft, content: undefined });
await mkdir(reviewsDir, { recursive: true });
await writeFile(resolve(reviewsDir, `${review.id}.json`), `${JSON.stringify(review, null, 2)}\n`, 'utf8');

const files = [`.github/editorial/reviews/${review.id}.json`, '.github/editorial/candidates.json'];
if (draft.status === 'generated') {
  await mkdir(draftsDir, { recursive: true });
  await writeFile(resolve(draftsDir, `${review.id}.md`), `${draft.content}\n`, 'utf8');
  files.push(`.github/editorial/drafts/${review.id}.md`);
}

const branch = `editorial/revision-${review.id}`;
const title = `Editorial: revisar ${candidate.titleOriginal}`.slice(0, 120);
const body = `## Candidato editorial\n\n- ID: \`${review.id}\`\n- Fuente primaria: ${candidate.source}\n- URL: ${candidate.url}\n- Publicado: ${candidate.publishedAt || 'Fecha no disponible'}\n- Puntuación: ${candidate.score.total}/100\n- Borrador: ${draft.status === 'generated' ? `generado con ${draft.provider} / ${draft.model}` : draft.reason}\n- URL propuesta: \`${review.proposal.url}\`\n\n## Revisión obligatoria\n\n- [ ] Abrir y comprobar la fuente primaria.\n- [ ] Añadir una segunda fuente si la afirmación lo necesita.\n- [ ] Verificar hechos, fechas, nombres y atribuciones.\n- [ ] Revisar utilidad real para un conductor.\n- [ ] Revisar límites, seguridad, privacidad y lenguaje.\n- [ ] Crear el artículo público solo después de aprobar este candidato.\n\nEste PR no publica contenido en \`/actualidad/\`.\n`;
await writeFile(resolve(editorialDir, 'pr-body.md'), body, 'utf8');
await writeFile(resolve(editorialDir, 'pr-meta.json'), `${JSON.stringify({ id: review.id, branch, title, bodyFile: '.github/editorial/pr-body.md', files }, null, 2)}\n`, 'utf8');
console.log(`PR editorial preparado: ${branch}`);
