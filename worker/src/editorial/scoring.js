const CAR = ['car', 'cars', 'vehicle', 'vehicles', 'automotive', 'driving', 'driver', 'android auto', 'carplay', 'coche', 'vehículo', 'conducción', 'navegación'];
const AI = ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'siri', 'apple intelligence', 'ia', 'asistente'];
const USEFUL = ['maps', 'navigation', 'voice', 'vision', 'travel', 'trip', 'document', 'manual', 'mapas', 'navegación', 'voz', 'viaje', 'documento'];

function hits(text, words) { return words.filter((word) => text.includes(word)).length; }

export function scoreCandidate(item, now = new Date()) {
  const text = `${item.titleOriginal} ${item.summary}`.toLocaleLowerCase('es');
  const car = Math.min(30, hits(text, CAR) * 10);
  const ai = Math.min(25, hits(text, AI) * 8);
  const usefulness = Math.min(25, hits(text, USEFUL) * 7);
  const authority = Math.min(10, Number(item.authority || 0) * 2);
  const published = Date.parse(item.publishedAt);
  const days = Number.isFinite(published) ? Math.max(0, (now.getTime() - published) / 86400000) : 30;
  const recency = days <= 2 ? 10 : days <= 7 ? 7 : days <= 30 ? 3 : 0;
  const total = car + ai + usefulness + authority + recency;
  return { total, car, ai, usefulness, authority, recency, relevant: car >= 10 && ai >= 8 && usefulness >= 7 && total >= 45 };
}
