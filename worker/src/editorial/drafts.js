const REQUIRED_SECTIONS = ['## Qué cambia', '## Por qué importa al conductor', '## Límites y dudas', '## Fuentes'];

function pending(provider, reason) {
  return { status: 'pending', provider, model: null, reason };
}

export function buildDraftPrompt(candidate) {
  return `Redacta un borrador editorial en español de España para MiMotor.\n\nFuente primaria: ${candidate.url}\nTítulo original: ${candidate.titleOriginal}\nResumen del feed: ${candidate.summary || 'No disponible'}\n\nReglas:\n- No inventes datos ni amplíes lo que no esté en la fuente.\n- Separa hechos confirmados, interpretación y dudas.\n- Explica la utilidad para un conductor normal.\n- No publiques consejos mecánicos o de seguridad sin fuente oficial.\n- Incluye exactamente estas secciones: ## Qué cambia, ## Por qué importa al conductor, ## Límites y dudas, ## Fuentes.\n- Incluye la URL de la fuente primaria en Fuentes.`;
}

export async function generateEditorialDraft(candidate, options = {}) {
  const provider = options.provider || 'none';
  if (provider === 'none') return pending('none', 'Proveedor de IA no configurado; candidato pendiente de redacción.');
  if (provider !== 'openai-compatible') return pending(provider, `Proveedor no compatible: ${provider}.`);

  const { apiKey, baseUrl, model, fetchImpl = fetch } = options;
  if (!apiKey || !baseUrl || !model) return pending(provider, 'Faltan EDITORIAL_AI_API_KEY, EDITORIAL_AI_BASE_URL o EDITORIAL_AI_MODEL.');

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1500, messages: [{ role: 'user', content: buildDraftPrompt(candidate) }] }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) return pending(provider, `El proveedor respondió HTTP ${response.status}.`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content?.trim() || '';
  const valid = REQUIRED_SECTIONS.every((section) => content.includes(section)) && content.includes(candidate.url);
  if (!valid) return pending(provider, 'La respuesta no superó la validación de estructura y atribución.');
  return { status: 'generated', provider, model, content };
}
