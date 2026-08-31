import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { buildTrip } from '../src/index.js';
import { MemoryStore } from '../src/store.js';
import { MockAIProvider } from '../src/ai.js';
import { MockFuelPriceProvider } from '../src/fuel.js';
import { MockRoutingProvider } from '../src/routing.js';

function providers(ai = null) {
  return {
    routing: new MockRoutingProvider({ distanceKm: 245, durationMinutes: 155 }),
    fuel: new MockFuelPriceProvider(1.48),
    ai
  };
}

const knownVehicle = 'Opel Astra H GTC 2010 1.9 CDTI 120 CV';

test('construye un viaje con vehículo conocido sin llamar a IA', async () => {
  const result = await buildTrip({
    vehicle: knownVehicle,
    origin: 'Córdoba',
    destination: 'Chipiona',
    drivingMode: 'normal',
    advanced: {}
  }, { store: new MemoryStore(), providers: providers(), env: {} });

  assert.equal(result.route.distanceKm, 245);
  assert.equal(result.vehicle.fuel, 'diesel');
  assert.equal(result.fuel.averagePrice, 1.48);
  assert.equal(result.cost.liters, 14.95);
  assert.equal(result.cost.estimated, 22.13);
  assert.equal(result.usage.remainingAiCalculations, null);
});

test('rechaza payload inválido antes de tocar proveedores', async () => {
  await assert.rejects(
    () => buildTrip({ vehicle: 'coche', origin: '', destination: 'Madrid' }, { providers: providers(), env: {} }),
    (error) => error.code === 'INVALID_INPUT' && error.status === 422
  );
});

test('cachea una normalización IA y no consume cuota en la segunda consulta', async () => {
  let calls = 0;
  const ai = {
    async normalizeVehicle(input) {
      calls += 1;
      return new MockAIProvider({
        make: 'Seat', model: 'León', generation: 'III', year: 2018,
        engine: '1.5 TSI', fuel: 'gasoline', powerCv: 150, powerKw: 110,
        referenceConsumption: 6.4
      }).normalizeVehicle(input);
    }
  };
  const store = new MemoryStore();
  const env = { DEEPSEEK_API_KEY: 'configured-for-test', RATE_LIMIT_SECRET: 'test-secret' };
  const payload = { vehicle: 'Seat León 2018 1.5 150 CV', origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {} };
  const first = await buildTrip(payload, { store, providers: providers(ai), env });
  const second = await buildTrip(payload, { store, providers: providers(ai), env });

  assert.equal(calls, 1);
  assert.equal(first.vehicle.cached, false);
  assert.equal(second.vehicle.cached, false);
  assert.equal(second.usage.remainingAiCalculations, 2);
});

test('bloquea la cuarta llamada IA en la ventana de 24 horas', async () => {
  const store = new MemoryStore();
  const env = { DEEPSEEK_API_KEY: 'configured-for-test', RATE_LIMIT_SECRET: 'test-secret' };
  const aiVehicle = {
    make: 'Ford', model: 'Focus', generation: 'IV', year: 2020,
    engine: '1.0 EcoBoost', fuel: 'gasoline', powerCv: 125, powerKw: 92,
    referenceConsumption: 6.2
  };
  for (let index = 0; index < 3; index += 1) {
    await buildTrip({
      vehicle: `Ford Focus 2020 1.0 ${125 + index} CV`, origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {}
    }, { store, providers: providers(new MockAIProvider(aiVehicle)), env, request: new Request('https://mi-motor.app/api/trip', { headers: { 'CF-Connecting-IP': '203.0.113.10' } }) });
  }

  await assert.rejects(
    () => buildTrip({ vehicle: 'Ford Focus 2020 1.0 128 CV', origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {} }, { store, providers: providers(new MockAIProvider(aiVehicle)), env, request: new Request('https://mi-motor.app/api/trip', { headers: { 'CF-Connecting-IP': '203.0.113.10' } }) }),
    (error) => error.code === 'AI_RATE_LIMITED' && error.status === 429
  );
});

test('usa último precio cacheado y lo marca como fallback si falla la fuente', async () => {
  const store = new MemoryStore();
  await store.put('fuel:diesel:córdoba:stale', {
    type: 'diesel', averagePrice: 1.48, area: 'Córdoba', areaType: 'municipality',
    sampleSize: 12, source: 'miteco-rest', updatedAt: '31/08/2026'
  }, 3600);
  const failingFuel = { average: async () => { throw new Error('fuente caída'); } };
  const result = await buildTrip({
    vehicle: knownVehicle, origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {}
  }, {
    store,
    env: {},
    providers: { routing: new MockRoutingProvider(), fuel: failingFuel, ai: null }
  });
  assert.equal(result.fuel.averagePrice, 1.48);
  assert.equal(result.fuel.fallback, true);
  assert.equal(result.fuel.stale, true);
});

test('no llama a IA sin almacenamiento persistente de cuota', async () => {
  await assert.rejects(
    () => buildTrip({
      vehicle: 'Toyota Corolla 2020 1.8 122 CV', origin: 'Córdoba', destination: 'Chipiona', drivingMode: 'normal', advanced: {}
    }, {
      store: new MemoryStore(), persistentStore: false,
      env: { DEEPSEEK_API_KEY: 'configured-for-test', RATE_LIMIT_SECRET: 'test-secret' },
      providers: providers(new MockAIProvider({
        make: 'Toyota', model: 'Corolla', generation: 'XII', year: 2020,
        engine: '1.8', fuel: 'hybrid', powerCv: 122, powerKw: 90, referenceConsumption: 4.5
      }))
    }),
    (error) => error.code === 'AI_RATE_LIMIT_NOT_CONFIGURED' && error.status === 503
  );
});

test('health y CORS responden sin proveedores externos', async () => {
  const health = await worker.fetch(new Request('https://api.mi-motor.app/health', { headers: { Origin: 'https://mi-motor.app' } }), { ALLOWED_ORIGIN: 'https://mi-motor.app' });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const forbidden = await worker.fetch(new Request('https://api.mi-motor.app/health', { headers: { Origin: 'https://otro.example' } }), { ALLOWED_ORIGIN: 'https://mi-motor.app' });
  assert.equal(forbidden.status, 403);
});
