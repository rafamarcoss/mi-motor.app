const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../js/trip-api.js');

test('sin endpoint configurado no hace ninguna llamada', async () => {
  assert.equal(api.calculate ? await api.calculate({}) : null, null);
});

test('envía una petición POST y devuelve el contrato del backend', async () => {
  let request;
  const payload = { vehicle: 'Opel Astra', origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {} };
  const result = await api.calculate(payload, {
    endpoint: 'https://api.example.test/api/trip',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ route: { distanceKm: 10 }, usage: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });
  assert.equal(result.route.distanceKm, 10);
  assert.equal(request.url, 'https://api.example.test/api/trip');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), payload);
});

test('convierte errores HTTP del backend en un error útil', async () => {
  await assert.rejects(
    () => api.calculate({}, {
      endpoint: 'https://api.example.test/api/trip',
      fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'ROUTING_NOT_CONFIGURED', message: 'Routing no configurado.' } }), { status: 503 })
    }),
    (error) => error.code === 'ROUTING_NOT_CONFIGURED' && error.status === 503
  );
});
