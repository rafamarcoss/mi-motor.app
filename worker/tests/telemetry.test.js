import test from 'node:test';
import assert from 'node:assert/strict';
import { costFor, recordAiUsage } from '../src/telemetry.js';
import { MemoryStore } from '../src/store.js';
test('calcula coste Luna por tokens reales devueltos por Responses', () => { assert.deepEqual(costFor('gpt-5.6-luna', { input_tokens: 1000000, output_tokens: 1000000 }), { usd: 1.4, eur: 1.288, inputTokens: 1000000, outputTokens: 1000000, priceDate: '2026-09-13' }); });
test('agrega telemetría sin contenido de usuario', async () => { const store = new MemoryStore(); await recordAiUsage(store, { status: 'completed', model: 'gpt-5.6-luna', usage: { input_tokens: 100, output_tokens: 20 } }); const result = await recordAiUsage(store, { status: 'failed', model: 'gpt-5.6-luna' }); assert.equal(result.requests, 2); assert.equal(result.failed, 1); assert.equal(result.inputTokens, 100); });
