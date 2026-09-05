import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
test('limita el cuerpo real sin content-length en ambos endpoints', async () => {
  for (const endpoint of ['trip', 'vehicle/resolve']) {
    const request = new Request('https://mi-motor.app/api/' + endpoint, { method: 'POST', body: JSON.stringify({ vehicle: 'x'.repeat(21000) }) });
    assert.equal(request.headers.get('content-length'), null);
    const response = await worker.fetch(request, {});
    assert.equal(response.status, 413);
  }
});
