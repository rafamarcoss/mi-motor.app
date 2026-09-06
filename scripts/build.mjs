import { cp, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, publicDirs, exists, pagesAt, articlesAt, json, renderArticle, escape } from './site-lib.mjs';
import { validateArticle, validateConfig, duplicate, articleUrl, origin, check } from './editorial-core.mjs';
import { validateSite } from './validate-site.mjs';
export async function build({ base = root, preview = false } = {}) {
  const config = await json(join(base, 'content/editorial.config.json')); validateConfig(config);
  const pages = await pagesAt(base); const records = await articlesAt(base);
  const registry = await json(join(base, 'content/registry.json'));
  const seen = [...registry, ...pages];
  for (const { article, evidence } of records) {
    validateArticle(article, evidence, config);
    check(preview || article.status === 'approved', 'Producción bloqueada: artículo pendiente de revisión');
    check(!duplicate({ ...article, id: article.topicId }, seen), 'Artículo duplicado o canibalización');
    seen.push({ ...article, id: article.topicId });
  }
  const output = join(base, 'dist'); const staging = join(base, '.build-staging');
  // Both deletion targets are fixed children of the repository; never accept a CLI deletion path.
  check(relative(base, staging) === '.build-staging' && relative(base, output) === 'dist', 'Ruta de build inválida');
  await rm(staging, { recursive: true, force: true }); await mkdir(staging);
  try {
    for (const name of ['index.html', 'CNAME', 'robots.txt', ...publicDirs]) if (await exists(join(base, name))) await cp(join(base, name), join(staging, name), { recursive: true });
    const related = [...pages, ...records.map(({ article }) => ({ title: article.title, url: articleUrl(article) }))];
    for (const { article, evidence } of records) {
      const dir = join(staging, 'guias', article.slug); await mkdir(dir);
      await writeFile(join(dir, 'index.html'), renderArticle(article, evidence, related, preview));
    }
    if (records.length) {
      const { readFile } = await import('node:fs/promises');
      const index = join(staging, 'guias/index.html'); let html = await readFile(index, 'utf8');
      check(html.includes('<div class="article-list">'), 'No existe punto de inserción del índice');
      html = html.replace('<div class="article-list">', '<div class="article-list">' + records.map(({ article: a }) => `<article class="article-row"><h2><a href="${articleUrl(a)}">${escape(a.title)}</a></h2><p>${escape(a.excerpt)}</p></article>`).join(''));
      await writeFile(index, html);
    }
    const builtPages = await pagesAt(staging);
    const dates = new Map(records.map(({ article }) => [articleUrl(article), article.updatedAt]));
    await writeFile(join(staging, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${builtPages.sort((a, b) => a.url.localeCompare(b.url)).map(p => `<url><loc>${origin}${p.url}</loc>${dates.has(p.url) ? `<lastmod>${dates.get(p.url)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
    await writeFile(join(staging, '.nojekyll'), '');
    if (preview) await writeFile(join(staging, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    const result = await validateSite(staging);
    await rm(output, { recursive: true, force: true }); await rename(staging, output);
    return { ...result, articles: records.length, preview, output };
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(await build({ preview: process.argv.includes('--preview') })));
