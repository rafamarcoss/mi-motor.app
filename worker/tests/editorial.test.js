import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed } from '../src/editorial/feeds.js';
import { scoreCandidate } from '../src/editorial/scoring.js';
import { dedupeCandidates, canonicalUrl } from '../src/editorial/dedupe.js';
import { createSlug } from '../src/editorial/slug.js';
import { candidateId } from '../src/editorial/id.js';
import { buildDraftPrompt, generateEditorialDraft } from '../src/editorial/drafts.js';
import { buildReviewRecord, selectCandidateForReview } from '../src/editorial/review.js';

test('parsea RSS y conserva fuente y URL', () => {
  const items = parseFeed('<rss><channel><item><title>Gemini llega a Android Auto</title><link>https://example.com/a</link><pubDate>Thu, 03 Sep 2026 10:00:00 GMT</pubDate><description>Navegación por voz con IA para conductores</description></item></channel></rss>', { id: 'google', name: 'Google', authority: 5 });
  assert.equal(items[0].source, 'Google'); assert.equal(items[0].url, 'https://example.com/a');
});

test('puntúa alto una función útil de IA en el coche e ignora una noticia genérica', () => {
  const now = new Date('2026-09-04T12:00:00Z');
  assert.equal(scoreCandidate({ titleOriginal: 'Gemini llega a Android Auto', summary: 'Nueva navegación por voz con IA para conductores', authority: 5, publishedAt: '2026-09-03' }, now).relevant, true);
  assert.equal(scoreCandidate({ titleOriginal: 'Nuevo precio de una API', summary: 'Cambios para programadores', authority: 5, publishedAt: '2026-09-03' }, now).relevant, false);
});

test('deduplica por URL canónica y título', () => {
  const items = [{ url: 'https://example.com/a?utm_source=x', titleOriginal: 'La misma noticia' }, { url: 'https://example.com/a', titleOriginal: 'Otro título' }];
  assert.equal(dedupeCandidates(items).length, 1); assert.equal(canonicalUrl(items[0].url), 'https://example.com/a');
});

test('genera slugs estables y sin acentos', () => { assert.equal(createSlug('Gemini llega al automóvil: navegación útil'), 'gemini-llega-al-automovil-navegacion-util'); });

const candidate = { source: 'Google', titleOriginal: 'Gemini llega a Android Auto', summary: 'Navegación por voz', url: 'https://example.com/noticia?utm_source=rss', publishedAt: '2026-09-03', score: { total: 80, car: 20, ai: 16, usefulness: 21, authority: 10, recency: 10, relevant: true } };

test('genera un ID estable desde la URL canónica', () => {
  assert.equal(candidateId(candidate), candidateId({ ...candidate, url: 'https://example.com/noticia' }));
});

test('selecciona un solo candidato y no repite IDs ya revisados', () => {
  assert.equal(selectCandidateForReview([candidate])?.titleOriginal, candidate.titleOriginal);
  assert.equal(selectCandidateForReview([candidate], new Set([candidateId(candidate)])), null);
});

test('prepara una URL pública válida y trazabilidad de la fuente', () => {
  const review = buildReviewRecord(candidate, { status: 'pending' });
  assert.match(review.proposal.url, /^\/actualidad\/[a-z0-9-]+\/$/);
  assert.equal(review.source.url, candidate.url);
});

test('sin proveedor deja el candidato pendiente sin fallar', async () => {
  const draft = await generateEditorialDraft(candidate);
  assert.equal(draft.status, 'pending');
  assert.match(buildDraftPrompt(candidate), /No inventes datos/);
});
