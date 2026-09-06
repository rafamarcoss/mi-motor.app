import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, pagesAt, exists } from './site-lib.mjs';
import { check, origin } from './editorial-core.mjs';
export async function validateSite(base) {
  const pages = await pagesAt(base); const sitemap = await readFile(join(base, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  check(new Set(urls).size === urls.length && urls.length === pages.length, 'Sitemap incompleto o duplicado');
  let links = 0;
  for (const p of pages) {
    check(p.title && /<html lang="es">/.test(p.html) && /<meta name="description" content="[^"]+">/.test(p.html), `Metadatos incompletos: ${p.url}`);
    check((p.html.match(/<h1\b/gi) || []).length === 1, `H1 inválido: ${p.url}`);
    check(p.html.includes(`rel="canonical" href="${origin}${p.url}"`), `Canonical incorrecto: ${p.url}`);
    check(urls.includes(origin + p.url), `URL fuera del sitemap: ${p.url}`);
    for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
    for (const m of p.html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = new URL(m[1].replace(/&amp;/g, '&'), origin + p.url);
      if (target.origin !== origin) continue;
      const pathname = decodeURIComponent(target.pathname); check(!pathname.includes('..'), 'Enlace inválido');
      const path = join(base, pathname, pathname.endsWith('/') ? 'index.html' : '');
      check(await exists(path), `Enlace roto ${p.url} → ${m[1]}`); links++;
      if (target.hash) {
        const html = await readFile(path, 'utf8');
        check(html.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `Ancla rota ${p.url} → ${m[1]}`);
      }
    }
  }
  for (const forbidden of ['worker', '.github', 'content', 'docs', 'scripts', '.env', 'tests']) check(!await exists(join(base, forbidden)), `Archivo privado en build: ${forbidden}`);
  return { pages: pages.length, links };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(await validateSite(join(root, 'dist'))));
