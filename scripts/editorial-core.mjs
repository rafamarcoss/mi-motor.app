import { createHash } from 'node:crypto';

export const origin = 'https://mi-motor.app';
export const normalise = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stop = new Set(['como', 'para', 'del', 'las', 'los', 'con', 'una', 'que', 'por', 'coche', 'de', 'el', 'en', 'y', 'un']);
const tokens = value => new Set(normalise(value).split(' ').filter(word => word.length > 2 && !stop.has(word)));
export const hash = text => createHash('sha256').update(text).digest('hex');
export const articleUrl = a => `/guias/${a.slug}/`;
export function check(condition, message) { if (!condition) throw new Error(message); }
export function duplicate(topic, records) {
  const words = tokens(`${topic.keyword} ${topic.title}`);
  return records.find(other => {
    if (topic.slug === other.slug || topic.id === other.id || (topic.intent && topic.intent === other.intent)) return true;
    if (normalise(topic.keyword) && normalise(topic.keyword) === normalise(other.keyword)) return true;
    const theirs = tokens(`${other.keyword || ''} ${other.title}`);
    const common = [...words].filter(word => theirs.has(word)).length;
    return common >= 2 && common / Math.min(words.size, theirs.size) >= 0.8;
  });
}
export function validateTopic(t) {
  for (const key of ['id', 'slug', 'intent']) check(typeof t[key] === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t[key]) && t[key].length <= 90, `Tema: ${key} inválido`);
  for (const key of ['title', 'keyword', 'brief']) check(typeof t[key] === 'string' && t[key].length > 10 && t[key].length < 2000, `Tema: falta ${key}`);
  check(['costes', 'consumo', 'mantenimiento', 'itv', 'neumaticos', 'actualidad', 'ia-y-coche'].includes(t.category), 'Categoría inválida');
  check(Array.isArray(t.sources) && t.sources.length >= 1 && t.sources.length <= 3, 'Se requieren de 1 a 3 fuentes primarias');
}
export function validateConfig(c) {
  for (const [key, min, max] of [['maxArticles', 1, 1], ['maxRequests', 1, 2], ['maxTokens', 500, 6000], ['timeoutMs', 1000, 60000], ['maxSourceBytes', 1000, 1000000], ['maxOutputBytes', 1000, 100000], ['sourceMaxAgeDays', 1, 90]]) check(Number.isInteger(c[key]) && c[key] >= min && c[key] <= max, `Límite inválido: ${key}`);
  check(c.provider === 'openai-compatible', 'Proveedor no compatible');
  check(Array.isArray(c.allowedSourceHosts) && c.allowedSourceHosts.length > 0, 'Faltan dominios primarios');
}
export function sourceUrl(value, config) {
  const u = new URL(value);
  check(u.protocol === 'https:' && !u.username && !u.password && !u.port && config.allowedSourceHosts.includes(u.hostname), 'Fuente fuera de la lista de dominios permitidos');
  return u.href;
}
export async function boundedText(response, maxBytes) {
  check(Number(response.headers.get('content-length') || 0) <= maxBytes, 'Respuesta demasiado grande');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; check(size <= maxBytes, 'Respuesta demasiado grande'); chunks.push(value); }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function research(topic, config, fetchImpl = fetch) {
  validateTopic(topic);
  const evidence = [];
  for (const url of topic.sources) {
    const safeUrl = sourceUrl(url, config);
    const response = await fetchImpl(safeUrl, { redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs), headers: { Accept: 'text/html,text/plain' } });
    check(response.ok, `Fuente no disponible: HTTP ${response.status}`);
    check(/text\/(html|plain)/i.test(response.headers.get('content-type') || ''), 'Fuente no textual: usar una página HTML primaria');
    const raw = await boundedText(response, config.maxSourceBytes);
    const main = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || raw;
    const text = main.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 14000);
    check(text.length >= 200, 'Fuente sin contenido suficiente');
    evidence.push({ id: `s${evidence.length + 1}`, url: safeUrl, retrievedAt: new Date().toISOString(), sha256: hash(text), text });
  }
  return evidence;
}
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
function plain(value, min = 1, max = 1500) { return typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[<>]|https?:\/\/|\]\(/i.test(value); }
export function validateArticle(a, evidence, config, now = new Date()) {
  check(a && typeof a === 'object', 'Artículo inválido');
  for (const key of ['slug', 'topicId', 'intent']) check(typeof a[key] === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a[key]) && a[key].length <= 90, `Artículo: ${key} inválido`);
  for (const [key, min, max] of [['title', 15, 110], ['seoTitle', 15, 65], ['description', 60, 165], ['excerpt', 40, 300], ['keyword', 10, 120]]) check(plain(a[key], min, max), `Artículo: ${key} inválido`);
  check(['costes', 'consumo', 'mantenimiento', 'itv', 'neumaticos', 'actualidad', 'ia-y-coche'].includes(a.category), 'Categoría inválida');
  check(a.market === 'ES', 'El mercado debe ser ES');
  check(dateValid(a.publishedAt) && dateValid(a.updatedAt) && a.updatedAt >= a.publishedAt && a.updatedAt <= now.toISOString().slice(0, 10), 'Fechas inválidas');
  check(['needs-review', 'approved'].includes(a.status), 'Estado editorial inválido');
  if (a.status === 'approved') check(plain(a.review?.reviewer, 2, 100) && dateValid(a.review?.date) && a.review.date >= a.updatedAt && a.review.date <= now.toISOString().slice(0, 10), 'Falta revisión humana fechada');
  check(Array.isArray(evidence) && evidence.length >= 1 && evidence.length <= 3, 'Falta investigación');
  const sources = new Map();
  for (const e of evidence) {
    sourceUrl(e.url, config);
    check(typeof e.text === 'string' && e.text.length >= 200 && e.text.length <= 14000 && e.sha256 === hash(e.text), 'Evidencia alterada o vacía');
    const age = now.getTime() - Date.parse(e.retrievedAt);
    // Freshness is required for pending drafts; approved evergreen content keeps its original research date.
    check(Number.isFinite(age) && age >= -60000 && (a.status === 'approved' || age <= config.sourceMaxAgeDays * 86400000), 'La investigación necesita actualizarse');
    check(/^s[1-3]$/.test(e.id) && !sources.has(e.id), 'ID de fuente inválido'); sources.set(e.id, e);
  }
  check(Array.isArray(a.claims) && a.claims.length >= 1 && a.claims.length <= 25, 'Falta registro de afirmaciones');
  const claims = new Set();
  for (const c of a.claims) {
    check(/^c\d+$/.test(c.id) && !claims.has(c.id) && plain(c.text, 10), 'Afirmación inválida');
    check(typeof c.quote === 'string' && c.quote.length >= 20 && c.quote.length <= 1000 && sources.get(c.sourceId)?.text.includes(c.quote), 'Afirmación sin extracto verificable'); claims.add(c.id);
  }
  check(Array.isArray(a.sections) && a.sections.length >= 2 && a.sections.length <= 12, 'Estructura H2 inválida');
  const used = new Set();
  for (const section of a.sections) {
    check(plain(section.heading, 5, 120), 'H2 inválido');
    check(Array.isArray(section.blocks) && section.blocks.length >= 1 && section.blocks.length <= 12, 'Bloques inválidos');
    for (const b of section.blocks) {
      check(['paragraph', 'list', 'table', 'h3'].includes(b.type), 'Tipo de bloque no permitido');
      check(['sourced', 'example', 'guidance'].includes(b.kind), 'Clasificar cada bloque: sourced, example o guidance');
      check(Array.isArray(b.claimIds) && b.claimIds.every(id => claims.has(id)), 'Referencias de afirmación inválidas');
      if (b.kind === 'sourced') check(b.claimIds.length > 0, 'Hecho sin evidencia');
      b.claimIds.forEach(id => used.add(id));
      if (b.type === 'paragraph' || b.type === 'h3') check(plain(b.text, 5, b.type === 'h3' ? 120 : 1800), 'Texto inválido');
      if (b.type === 'list') check(Array.isArray(b.items) && b.items.length >= 2 && b.items.length <= 10 && b.items.every(v => plain(v, 5, 400)), 'Lista inválida');
      if (b.type === 'table') check(Array.isArray(b.headers) && b.headers.length >= 2 && b.headers.length <= 5 && b.headers.every(v => plain(v, 1, 80)) && Array.isArray(b.rows) && b.rows.length >= 1 && b.rows.length <= 10 && b.rows.every(row => Array.isArray(row) && row.length === b.headers.length && row.every(v => plain(v, 1, 200))), 'Tabla inválida');
    }
  }
  check([...claims].every(id => used.has(id)), 'Afirmación sin uso en el artículo');
  check(Array.isArray(a.faq) && a.faq.length <= 4 && a.faq.every(f => plain(f.question, 10, 140) && plain(f.answer, 20, 800) && Array.isArray(f.claimIds) && f.claimIds.length > 0 && f.claimIds.every(id => claims.has(id))), 'FAQ inválida o sin fuente');
  const prose = a.sections.flatMap(s => s.blocks).map(b => b.text || [...(b.items || []), ...(b.rows || []).flat()].join(' ')).join(' ');
  check(prose.split(/\s+/).length >= 160, 'Contenido insuficiente: falta una explicación útil');
  check(!/en un mundo cada vez|es importante destacar|cabe mencionar|no solo.{0,150}sino tambi[eé]n|soluci[oó]n robusta/i.test(prose), 'Prosa genérica');
  return a;
}
export function internalLinks(article, pages) {
  const weights = tokens(`${article.title} ${article.keyword} ${article.category}`);
  return pages.filter(p => p.url !== articleUrl(article)).map(p => ({ ...p, score: [...tokens(p.title)].filter(w => weights.has(w)).length })).filter(p => p.score > 0).sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).slice(0, 3);
}
