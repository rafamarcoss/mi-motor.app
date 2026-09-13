export class UnavailableAIProvider {
  async normalizeVehicle() {
    throw new ProviderError('AI_NOT_CONFIGURED', 'La normalización IA todavía no está configurada en el backend.', 503);
  }
}

export class MockAIProvider {
  constructor(vehicle) {
    this.vehicle = vehicle;
  }

  async normalizeVehicle() {
    return { ...this.vehicle, source: 'mock-ai', confidence: this.vehicle.confidence ?? 0.9 };
  }
}

export class DeepSeekProvider {
  constructor({ apiKey, model = 'deepseek-v4-flash', fetchImpl = fetch, timeoutMs = 10000 } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async normalizeVehicle(input) {
    if (!this.apiKey) throw new ProviderError('AI_NOT_CONFIGURED', 'Falta DEEPSEEK_API_KEY.', 503);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_tokens: 220,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Devuelve únicamente JSON válido con make, model, generation, year, engine, fuel, powerCv, powerKw, referenceConsumption y confidence. Si hay ambigüedad, usa null en los campos inciertos y confidence bajo. No inventes fuentes ni datos.' },
            { role: 'user', content: `Normaliza este vehículo: ${input}` }
          ]
        })
      });
      if (!response.ok) throw new ProviderError('AI_PROVIDER_ERROR', `DeepSeek respondió HTTP ${response.status}.`, 502);
      const body = await response.json();
      this.lastUsage = body?.usage || null;
      this.lastModel = body?.model || this.model;
      const content = body?.choices?.[0]?.message?.content;
      const parsed = JSON.parse(stripJsonFence(content));
      return parsed;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error.name === 'AbortError') throw new ProviderError('AI_TIMEOUT', 'La identificación del vehículo tardó demasiado.', 504);
      throw new ProviderError('AI_INVALID_RESPONSE', 'La respuesta de IA no se pudo validar.', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class OpenAIResponsesProvider {
  constructor({ apiKey, model = 'gpt-5.6-luna', fetchImpl = fetch, timeoutMs = 10000 } = {}) { this.apiKey = apiKey; this.model = model; this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; }
  async normalizeVehicle(input) {
    if (!this.apiKey) throw new ProviderError('AI_NOT_CONFIGURED', 'Falta OPENAI_API_KEY.', 503);
    try {
      const response = await this.fetchImpl('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(this.timeoutMs), headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, store: false, reasoning: { effort: 'low' }, max_output_tokens: 220, text: { format: { type: 'json_schema', name: 'vehicle', strict: true, schema: { type: 'object', additionalProperties: false, required: ['make', 'model', 'generation', 'year', 'engine', 'fuel', 'powerCv', 'powerKw', 'referenceConsumption', 'confidence'], properties: { make: { type: ['string', 'null'] }, model: { type: ['string', 'null'] }, generation: { type: ['string', 'null'] }, year: { type: ['number', 'null'] }, engine: { type: ['string', 'null'] }, fuel: { type: ['string', 'null'] }, powerCv: { type: ['number', 'null'] }, powerKw: { type: ['number', 'null'] }, referenceConsumption: { type: ['number', 'null'] }, confidence: { type: 'number' } } } } }, input: `Normaliza este vehículo. Si hay ambigüedad usa null y confidence bajo. No inventes datos: ${input}` }) });
      if (!response.ok) throw new ProviderError('AI_PROVIDER_ERROR', `OpenAI respondió HTTP ${response.status}.`, 502);
      const body = await response.json(); this.lastUsage = body?.usage || null; this.lastModel = body?.model || this.model;
      return JSON.parse(body?.output_text);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new ProviderError('AI_TIMEOUT', 'La identificación del vehículo tardó demasiado.', 504);
      throw new ProviderError('AI_INVALID_RESPONSE', 'La respuesta de IA no se pudo validar.', 502);
    }
  }
}

export class ProviderError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function stripJsonFence(value) {
  return String(value || '').replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}
