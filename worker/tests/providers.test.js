import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateConsumption, calculateCost } from '../src/consumption.js';
import { DeepSeekProvider } from '../src/ai.js';
import { MitecoFuelPriceProvider } from '../src/fuel.js';
import { OpenRouteServiceProvider } from '../src/routing.js';

test('aplica factores avanzados sin duplicar el modo de conducción', () => {
  const consumption = calculateConsumption({
    referenceConsumption: 6,
    drivingMode: 'sport',
    advanced: { climate: 'on', load: 'heavy', traffic: 'high' }
  });
  assert.equal(consumption.base, 6);
  assert.equal(consumption.adjusted, 7.86);
  assert.equal(calculateCost({ distanceKm: 100, consumption, fuelPrice: 1.5 }).estimated, 11.79);
});

test('calcula media municipal del dataset oficial de carburantes', async () => {
  const provider = new MitecoFuelPriceProvider({
    fetchImpl: async () => new Response(JSON.stringify({
      Fecha: '31/08/2026 18:00:00',
      ListaEESSPrecio: [
        { Municipio: 'Córdoba', Provincia: 'CÓRDOBA', 'Precio Gasoleo A': '1,480' },
        { Municipio: 'Córdoba', Provincia: 'CÓRDOBA', 'Precio Gasoleo A': '1,500' },
        { Municipio: 'Córdoba', Provincia: 'CÓRDOBA', 'Precio Gasoleo A': '1,490' },
        { Municipio: 'Sevilla', Provincia: 'SEVILLA', 'Precio Gasoleo A': '1,600' }
      ]
    }))
  });
  const result = await provider.average('cordoba', 'diesel');
  assert.equal(result.averagePrice, 1.49);
  assert.equal(result.areaType, 'municipality');
  assert.equal(result.sampleSize, 3);
  assert.equal(result.fallback, false);
});

test('usa provincia cuando el municipio tiene poca muestra', async () => {
  const provider = new MitecoFuelPriceProvider({
    fetchImpl: async () => new Response(JSON.stringify({
      Fecha: '31/08/2026',
      ListaEESSPrecio: [
        { Municipio: 'Pueblo', Provincia: 'CÓRDOBA', 'Precio Gasolina 95 E5': '1,600' },
        { Municipio: 'Pueblo', Provincia: 'CÓRDOBA', 'Precio Gasolina 95 E5': '1,620' },
        { Municipio: 'Ciudad', Provincia: 'CÓRDOBA', 'Precio Gasolina 95 E5': '1,580' }
      ]
    }))
  });
  const result = await provider.average('Pueblo', 'gasoline');
  assert.equal(result.averagePrice, 1.6);
  assert.equal(result.areaType, 'province');
  assert.equal(result.sampleSize, 3);
  assert.equal(result.area, 'CÓRDOBA');
});

test('openrouteservice geocodifica y calcula la ruta en dos peticiones', async () => {
  const calls = [];
  const provider = new OpenRouteServiceProvider({
    apiKey: 'test-key',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url.includes('/geocode/search')) {
        return new Response(JSON.stringify({ features: [{ geometry: { coordinates: url.includes('C%C3%B3rdoba') ? [-4.78, 37.88] : [-6.43, 36.74] } }] }));
      }
      return new Response(JSON.stringify({ routes: [{ summary: { distance: 245000, duration: 9300 } }] }));
    }
  });
  const result = await provider.route('Córdoba', 'Chipiona');
  assert.equal(result.distanceKm, 245);
  assert.equal(result.durationMinutes, 155);
  assert.equal(result.provider, 'openrouteservice');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.includes('test-key'), false);
  assert.equal(calls[0].options.headers.Authorization, 'test-key');
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.headers.Authorization, 'test-key');
});

test('DeepSeek recibe un prompt cerrado y devuelve JSON normalizable', async () => {
  let requestBody;
  const provider = new DeepSeekProvider({
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"make":"Opel","model":"Astra","generation":"H","year":2010,"engine":"1.9 CDTI","fuel":"diesel","powerCv":120,"powerKw":88,"referenceConsumption":6.1,"confidence":0.9}' } }] }));
    }
  });
  const result = await provider.normalizeVehicle('Opel Astra H 2010 1.9 120 CV');
  assert.equal(result.make, 'Opel');
  assert.equal(requestBody.temperature, 0);
  assert.deepEqual(requestBody.response_format, { type: 'json_object' });
  assert.equal(requestBody.messages[1].content.includes('Opel Astra'), true);
  assert.equal(requestBody.messages[1].content.includes('prompt'), false);
});
