function normalizedTitle(title = '') {
  return title.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function canonicalUrl(value = '') {
  try { const url = new URL(value); url.hash = ''; ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => url.searchParams.delete(key)); return url.toString().replace(/\/$/, ''); } catch { return value; }
}

export function dedupeCandidates(items, existing = []) {
  const urls = new Set(existing.map((item) => canonicalUrl(item.url)));
  const titles = new Set(existing.map((item) => normalizedTitle(item.titleOriginal)));
  return items.filter((item) => {
    const url = canonicalUrl(item.url); const title = normalizedTitle(item.titleOriginal);
    if (!url || !title || urls.has(url) || titles.has(title)) return false;
    urls.add(url); titles.add(title); item.url = url; return true;
  });
}
