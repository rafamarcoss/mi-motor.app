import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleUrl, origin, check, internalLinks } from './editorial-core.mjs';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicDirs = ['css', 'js', 'data', 'herramientas', 'guias', 'actualidad', 'ia-y-coche', 'tu-coche'];
export async function exists(path) { try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
export async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
export async function files(dir) {
  const result = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    check(!e.isSymbolicLink(), 'No se permiten enlaces simbólicos en el sitio');
    if (e.isDirectory()) result.push(...await files(join(dir, e.name))); else result.push(join(dir, e.name));
  }
  return result;
}
export async function pagesAt(base = root, built = false) {
  const candidates = [join(base, 'index.html')];
  for (const dir of publicDirs) if (await exists(join(base, dir))) candidates.push(...(await files(join(base, dir))).filter(f => f.endsWith('.html')));
  const pages = [];
  for (const path of candidates) {
    const html = await readFile(path, 'utf8');
    const url = '/' + relative(base, path).split(sep).join('/').replace(/index\.html$/, '');
    pages.push({ url, title: html.match(/<title>([^<]+)<\/title>/i)?.[1] || '', path, html, slug: url.split('/').filter(Boolean).at(-1) || 'inicio' });
  }
  return pages;
}
export async function articlesAt(base = root) {
  const dir = join(base, 'content/articles');
  if (!await exists(dir)) return [];
  return Promise.all((await readdir(dir)).filter(n => n.endsWith('.json')).sort().map(async name => {
    const record = await json(join(dir, name));
    check(name === `${record.article?.slug}.json`, 'El nombre debe coincidir con el slug');
    return record;
  }));
}
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function shell({ title, description, url, body, schema, preview = false }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${origin}${url}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${origin}${url}"><meta property="og:type" content="${schema?.['@type'] === 'BlogPosting' ? 'article' : 'website'}">${preview ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="stylesheet" href="/css/site.css">${schema ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': schema }).replace(/</g, '\\u003c')}</script>` : ''}</head><body><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/">MiMotor</a><nav class="nav" aria-label="Navegación principal"><a href="/tu-coche/">Tu coche</a><a href="/herramientas/">Herramientas</a><a href="/guias/">Guías</a><a href="/actualidad/">Actualidad</a></nav></div></header><main>${body}</main><footer class="site-footer"><div class="wrap"><a href="/herramientas/">Herramientas MiMotor</a></div></footer><script src="/js/analytics.js"></script></body></html>\n`;
}
export function renderArticle(a, evidence, pages, preview) {
  const refs = b => b.claimIds.length ? `<small> [${b.claimIds.map(id => `<a href="#${id}">${escape(id)}</a>`).join(', ')}]</small>` : '';
  function block(b) {
    const note = b.kind === 'example' ? '<small>Ejemplo hipotético.</small> ' : '';
    if (b.type === 'paragraph') return `<p>${note}${escape(b.text)}${refs(b)}</p>`;
    if (b.type === 'h3') return `<h3>${escape(b.text)}${refs(b)}</h3>`;
    if (b.type === 'list') return `${note}<ul>${b.items.map(v => `<li>${escape(v)}</li>`).join('')}</ul>${refs(b)}`;
    return `${note}<div class="table-scroll"><table><thead><tr>${b.headers.map(v => `<th scope="col">${escape(v)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row => `<tr>${row.map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${refs(b)}`;
  }
  const links = internalLinks(a, pages);
  return shell({ title: a.seoTitle, description: a.description, url: articleUrl(a), preview,
    schema: [{ '@type': 'BlogPosting', headline: a.title, description: a.description, datePublished: a.publishedAt, dateModified: a.updatedAt, inLanguage: 'es-ES', mainEntityOfPage: origin + articleUrl(a), author: { '@type': 'Organization', name: 'MiMotor', url: origin }, publisher: { '@type': 'Organization', name: 'MiMotor' } }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Guías', item: origin + '/guias/' }, { '@type': 'ListItem', position: 3, name: a.title, item: origin + articleUrl(a) }] }],
    body: `<article class="wrap prose hero">${preview ? '<p class="notice warning">Vista previa editorial. Pendiente de revisión; no publicada.</p>' : ''}<p class="eyebrow">${escape(a.category)}</p><h1>${escape(a.title)}</h1><p class="lead">${escape(a.excerpt)}</p><p><a class="btn btn-accent" data-article-calculator-cta data-cta-position="inicio" href="/herramientas/coste-viaje/">Calcular el coste de tu viaje</a></p><p class="small">Publicado: <time datetime="${a.publishedAt}">${a.publishedAt}</time> · Actualizado: <time datetime="${a.updatedAt}">${a.updatedAt}</time> · MiMotor</p>${a.sections.map((s, index) => `<section><h2>${escape(s.heading)}</h2>${s.blocks.map(block).join('')}${index === 0 ? '<p><a data-article-calculator-cta data-cta-position="medio" href="/herramientas/coste-viaje/">Pruébalo con tu consumo y ruta</a></p>' : ''}</section>`).join('')}${a.faq.length ? `<section><h2>Preguntas frecuentes</h2>${a.faq.map(f => `<h3>${escape(f.question)}</h3><p>${escape(f.answer)}${refs(f)}</p>`).join('')}</section>` : ''}<section><h2>Fuentes y comprobación</h2><ul>${a.claims.map(c => `<li id="${c.id}">${escape(c.text)}. <a href="${escape(evidence.find(e => e.id === c.sourceId).url)}" rel="noopener noreferrer">Fuente primaria</a> (consultada ${evidence.find(e => e.id === c.sourceId).retrievedAt.slice(0, 10)}).</li>`).join('')}</ul></section>${links.length ? `<section><h2>Herramientas y guías relacionadas</h2><ul>${links.map(l => `<li><a href="${l.url}">${escape(l.title)}</a></li>`).join('')}</ul></section>` : ''}<p><a class="btn btn-accent" data-article-calculator-cta data-cta-position="final" href="/herramientas/coste-viaje/">Calcular mi viaje</a></p></article><script>document.querySelectorAll('[data-article-calculator-cta]').forEach(function(a){a.addEventListener('click',function(){window.MiMotorAnalytics&&window.MiMotorAnalytics.event('article_calculator_cta_click',{cta_position:a.dataset.ctaPosition,article_slug:${JSON.stringify(a.slug)}})})});window.MiMotorAnalytics&&window.MiMotorAnalytics.event('seo_article_view',{article_slug:${JSON.stringify(a.slug)}})</script>` });
}
