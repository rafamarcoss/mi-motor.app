const EUR_USD = 0.92;
export const PRICES = Object.freeze({ 'gpt-5.6-luna': { inputPerMillionUsd: 0.20, outputPerMillionUsd: 1.20, effectiveFrom: '2026-09-13' } });
export function costFor(model, usage = {}) {
  const price = PRICES[model]; const inputTokens = Number(usage.input_tokens || usage.inputTokens || 0); const outputTokens = Number(usage.output_tokens || usage.outputTokens || 0);
  if (!price || !Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return { usd: null, eur: null, inputTokens: 0, outputTokens: 0, priceDate: null };
  const usd = inputTokens * price.inputPerMillionUsd / 1e6 + outputTokens * price.outputPerMillionUsd / 1e6;
  return { usd: Number(usd.toFixed(8)), eur: Number((usd * EUR_USD).toFixed(8)), inputTokens, outputTokens, priceDate: price.effectiveFrom };
}
export async function recordAiUsage(store, record) {
  const day = new Date().toISOString().slice(0, 10); const key = `ai-usage:${day}`;
  const previous = await store.get(key) || { day, requests: 0, completed: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, costEur: 0, models: {} }; const cost = costFor(record.model, record.usage);
  const next = { ...previous, requests: previous.requests + 1, completed: previous.completed + (record.status === 'completed' ? 1 : 0), failed: previous.failed + (record.status === 'completed' ? 0 : 1), inputTokens: previous.inputTokens + cost.inputTokens, outputTokens: previous.outputTokens + cost.outputTokens, costUsd: Number((previous.costUsd + (cost.usd || 0)).toFixed(8)), costEur: Number((previous.costEur + (cost.eur || 0)).toFixed(8)), models: { ...previous.models, [record.model || 'unknown']: (previous.models[record.model || 'unknown'] || 0) + 1 }, updatedAt: new Date().toISOString() };
  await store.put(key, next, 400 * 24 * 3600); return next;
}
