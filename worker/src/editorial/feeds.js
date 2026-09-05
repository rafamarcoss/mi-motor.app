function decode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (match) return decode(match[1]);
  }
  return '';
}

function link(block) {
  const textLink = tag(block, ['link']);
  if (/^https?:\/\//.test(textLink)) return textLink;
  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return href ? decode(href[1]) : '';
}

export function parseFeed(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => ({
    sourceId: source.id,
    source: source.name,
    authority: source.authority,
    titleOriginal: tag(block, ['title']),
    url: link(block),
    publishedAt: tag(block, ['pubDate', 'published', 'updated']),
    summary: tag(block, ['description', 'summary', 'content'])
  })).filter((item) => item.titleOriginal && item.url);
}
