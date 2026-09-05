const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlFiles = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (['.git', 'worker', 'node_modules', 'dist', '.build-staging'].includes(entry.name)) continue;
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

test('todas las páginas declaran español, título, descripción y canonical', () => {
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /<html lang="es">/i, file);
    assert.match(html, /<title>[^<]+<\/title>/i, file);
    assert.match(html, /<meta name="description" content="[^"]+">/i, file);
    assert.match(html, /<link rel="canonical" href="https:\/\/mi-motor\.app\//i, file);
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1/i, file);
  }
});

test('cada URL del sitemap corresponde a una página', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>https:\/\/mi-motor\.app\/(.*?)<\/loc>/g)].map((match) => match[1]);
  for (const url of urls) {
    const file = url ? path.join(root, url, 'index.html') : path.join(root, 'index.html');
    assert.equal(fs.existsSync(file), true, `Falta ${file}`);
  }
});

test('no quedan enlaces públicos vacíos', () => {
  for (const file of htmlFiles) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /href="#"/i, file);
});

test('el producto público no expone el generador de prompts eliminado', () => {
  for (const file of htmlFiles) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /prompt-coche|generador de prompts|crear prompt|copiar prompt/i, file);
  assert.equal(fs.existsSync(path.join(root, 'herramientas', 'prompt-coche', 'index.html')), false);
});

test('cada herramienta interactiva carga núcleo, interfaz, formulario y resultado', () => {
  const tools = ['coste-mensual-coche', 'gasolina-o-diesel', 'consumo-real', 'presion-neumaticos'];
  for (const tool of tools) {
    const html = fs.readFileSync(path.join(root, 'herramientas', tool, 'index.html'), 'utf8');
    assert.match(html, /js\/tools-core\.js/);
    assert.match(html, /js\/tools-ui\.js/);
    assert.match(html, /data-tool-form/);
    assert.match(html, /data-result/);
  }
});

test('coste de viaje usa coche estructurado, personalización y resultado transparente', () => {
  const html = fs.readFileSync(path.join(root, 'herramientas', 'coste-viaje', 'index.html'), 'utf8');
  for (const marker of ['data-trip-vehicle-make', 'data-trip-vehicle-model', 'data-trip-vehicle-year', 'data-trip-vehicle-engine', 'data-trip-manual-consumption', 'data-trip-tolls', 'data-trip-result-breakdown', 'data-remember-vehicle']) assert.match(html, new RegExp(marker));
});
