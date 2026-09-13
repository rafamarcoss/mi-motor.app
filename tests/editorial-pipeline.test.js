const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const config = require('../content/editorial.config.json');
const root = path.resolve(__dirname, '..');
async function fixture() {
  const { hash } = await import('../scripts/editorial-core.mjs');
  const text = 'Fuente simulada para pruebas: los costes indicados por el usuario se pueden sumar para elaborar un presupuesto. Este texto es un fixture técnico y no una fuente factual para publicación. '.repeat(3);
  const day = new Date().toISOString().slice(0, 10);
  const paragraph = 'Este ejemplo sirve para comprobar el reparto del importe que introduces. Anota el combustible consumido, suma los peajes del recorrido y añade el aparcamiento que vayas a compartir. Antes de dividir, acuerda entre cuántas personas se distribuye la suma, incluido el conductor si así lo decidís. Usa el gasto total del recorrido completo y revisa que no hayas contado dos veces la vuelta. La cifra es un presupuesto del ejemplo y se puede corregir cuando tengas los recibos. Si cambia el número de personas, el mismo importe se reparte de nuevo entre los participantes indicados.';
  return {
    article: { slug: 'repartir-gastos-viaje-coche', topicId: 'repartir-gastos-viaje', intent: 'reparto-gastos-entre-ocupantes', title: 'Cómo repartir los gastos de un viaje entre personas', seoTitle: 'Repartir gastos de un viaje entre personas | MiMotor', description: 'Suma combustible, peajes y aparcamiento y divide el total entre los participantes. Un ejemplo para revisar el presupuesto antes del viaje.', excerpt: 'Un ejemplo de reparto con los importes que has indicado para el viaje.', keyword: 'repartir gastos viaje coche', category: 'costes', market: 'ES', publishedAt: day, updatedAt: day, status: 'needs-review', claims: [{ id: 'c1', text: 'Los importes del ejemplo forman un presupuesto', sourceId: 's1', quote: text.slice(0, 100) }], sections: [{ heading: 'Preparar el presupuesto del ejemplo', blocks: [{ type: 'paragraph', kind: 'sourced', text: paragraph, claimIds: ['c1'] }] }, { heading: 'Revisar los gastos al regresar', blocks: [{ type: 'paragraph', kind: 'example', text: paragraph, claimIds: [] }, { type: 'table', kind: 'example', headers: ['Concepto', 'Importe'], rows: [['Combustible', '30 €'], ['Parking', '10 €']], claimIds: [] }] }], faq: [] },
    evidence: [{ id: 's1', url: 'https://www.idae.es/prueba', retrievedAt: new Date().toISOString(), text, sha256: hash(text) }]
  };
}
async function workspace(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'mimotor-test-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  for (const name of ['index.html', 'CNAME', 'robots.txt', 'content', 'css', 'js', 'herramientas', 'guias', 'actualidad', 'ia-y-coche', 'tu-coche']) await fs.cp(path.join(root, name), path.join(base, name), { recursive: true });
  return base;
}
test('valida metadatos, fechas, fuentes, estructura y aprobación humana', async () => {
  const { validateArticle } = await import('../scripts/editorial-core.mjs'); const f = await fixture();
  assert.equal(validateArticle(f.article, f.evidence, config), f.article);
  for (const patch of [{ slug: '../escape' }, { description: 'corta' }, { updatedAt: '2026-02-30' }, { status: 'approved' }, { title: '<script>alert(1)</script>' }, { market: 'US' }]) assert.throws(() => validateArticle({ ...f.article, ...patch }, f.evidence, config));
  assert.throws(() => validateArticle(f.article, [{ ...f.evidence[0], text: 'alterado' }], config));
  const bad = structuredClone(f.article); bad.claims[0].quote = 'Una cita que no existe en la fuente'; assert.throws(() => validateArticle(bad, f.evidence, config));
});
test('detecta slug repetido, misma intención y canibalización de títulos', async () => {
  const { duplicate } = await import('../scripts/editorial-core.mjs');
  const records = [{ id: 'uno', slug: 'consumo-real', title: 'Cómo medir consumo real del coche', keyword: 'consumo real', intent: 'consumo' }];
  assert.ok(duplicate({ slug: 'consumo-real' }, records));
  assert.ok(duplicate({ intent: 'consumo' }, records));
  assert.ok(duplicate({ title: 'Medir el consumo real en tu coche' }, records));
  assert.equal(duplicate({ title: 'Presupuesto de mantenimiento anual', keyword: 'mantenimiento' }, records), undefined);
});
test('dry-run no llama a la red ni escribe artículos; omite revisiones remotas', async t => {
  const base = await workspace(t); const { generate, plan } = await import('../scripts/editorial.mjs');
  const result = await generate({ base, dryRun: true, env: {}, fetchImpl: () => { throw Error('No debe llamar'); } });
  assert.equal(result.requests, 0); assert.ok(result.topic);
  assert.equal((await plan(base, [result.topic.id])).topic, null);
  await assert.rejects(fs.access(path.join(base, 'content/articles')));
});
test('falla por secretos ausentes antes de investigar', async t => {
  const base = await workspace(t); const { generate } = await import('../scripts/editorial.mjs');
  await assert.rejects(generate({ base, env: {}, fetchImpl: () => { throw Error('No debe llamar'); } }), /Falta EDITORIAL_AI_API_KEY/);
});
test('rechaza límites que permitirían consumo de IA descontrolado', async () => {
  const { validateConfig } = await import('../scripts/editorial-core.mjs');
  for (const patch of [{ maxArticles: 2 }, { maxRequests: 3 }, { maxTokens: 100000 }, { timeoutMs: 900000 }]) assert.throws(() => validateConfig({ ...config, ...patch }));
});
test('investigación bloquea hosts no permitidos, PDF, citas vacías y respuestas grandes', async () => {
  const { sourceUrl, research, boundedText } = await import('../scripts/editorial-core.mjs');
  assert.throws(() => sourceUrl('https://127.0.0.1/', config));
  assert.throws(() => sourceUrl('https://www.idae.es.evil.test/', config));
  await assert.rejects(boundedText(new Response('x'.repeat(100)), 30));
  const topic = require('../content/topics.json')[0];
  await assert.rejects(research(topic, config, async () => new Response('pdf', { headers: { 'content-type': 'application/pdf' } })), /no textual/);
});
test('genera un artículo revisable, con máximo de tokens, sin sobrescribir', async t => {
  const base = await workspace(t); const { generate } = await import('../scripts/editorial.mjs'); const f = await fixture(); let calls = 0;
  const fetchImpl = async (url, options) => {
    if (options.method !== 'POST') return new Response(f.evidence[0].text, { headers: { 'content-type': 'text/plain' } });
    calls++; const body = JSON.parse(options.body); assert.equal(body.max_output_tokens, 4500); assert.equal(body.reasoning.effort, 'low');
    return Response.json({ status: 'completed', output_text: JSON.stringify(f.article), model: 'configurable-test-model' });
  };
  const options = { base, env: { EDITORIAL_AI_API_KEY: 'test-only', EDITORIAL_AI_BASE_URL: 'https://provider.example', EDITORIAL_AI_MODEL: 'configurable-test-model' }, fetchImpl };
  const result = await generate(options); assert.equal(result.status, 'needs-review'); assert.equal(calls, 1);
  const file = path.join(base, 'content/articles', result.slug + '.json'); const before = await fs.readFile(file, 'utf8');
  const next = await generate(options); assert.equal(next.topic, null); assert.equal(calls, 1); assert.equal(await fs.readFile(file, 'utf8'), before);
});
test('retry de 503 se detiene exactamente en dos solicitudes de modelo', async t => {
  const base = await workspace(t); const { generate } = await import('../scripts/editorial.mjs'); const f = await fixture(); let calls = 0;
  await assert.rejects(generate({ base, env: { EDITORIAL_AI_API_KEY: 'test', EDITORIAL_AI_BASE_URL: 'https://provider.example', EDITORIAL_AI_MODEL: 'test' }, fetchImpl: async (url, o) => { if (o.method !== 'POST') return new Response(f.evidence[0].text, { headers: { 'content-type': 'text/plain' } }); calls++; return new Response('', { status: 503 }); } }), /2 intentos/);
  assert.equal(calls, 2);
});
test('build preview incluye artículo, índice, enlaces y sitemap; producción rechaza borrador', async t => {
  const base = await workspace(t); const { build } = await import('../scripts/build.mjs'); const f = await fixture();
  await fs.mkdir(path.join(base, 'content/articles')); await fs.writeFile(path.join(base, 'content/articles', f.article.slug + '.json'), JSON.stringify(f));
  await assert.rejects(build({ base }), /pendiente/);
  const result = await build({ base, preview: true }); assert.equal(result.articles, 1);
  const article = await fs.readFile(path.join(base, 'dist/guias', f.article.slug, 'index.html'), 'utf8');
  assert.match(article, /noindex,nofollow/); assert.match(article, /<table>/); assert.match(article, /datePublished/);
  assert.match(await fs.readFile(path.join(base, 'dist/guias/index.html'), 'utf8'), /repartir-gastos-viaje-coche/);
  assert.match(await fs.readFile(path.join(base, 'dist/sitemap.xml'), 'utf8'), /repartir-gastos-viaje-coche/);
  await assert.rejects(fs.access(path.join(base, 'dist/content')));
  f.article.status = 'approved'; f.article.review = { reviewer: 'Revisor de prueba', date: f.article.updatedAt };
  await fs.writeFile(path.join(base, 'content/articles', f.article.slug + '.json'), JSON.stringify(f));
  assert.equal((await build({ base })).preview, false);
});
test('enlaces internos son deterministas y excluyen el propio artículo', async () => {
  const { internalLinks } = await import('../scripts/editorial-core.mjs'); const { article } = await fixture();
  const pages = [{ url: '/herramientas/coste-viaje/', title: 'Coste del viaje' }, { url: '/guias/' + article.slug + '/', title: article.title }];
  assert.deepEqual(internalLinks(article, pages).map(p => p.url), ['/herramientas/coste-viaje/']);
});
