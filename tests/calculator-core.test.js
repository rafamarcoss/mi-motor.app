const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTrip, compareDrivingScenarios, factors } = require('../js/calculator-core.js');

test('calcula el escenario base de forma determinista', () => {
  const result = calculateTrip({ distance: 165, baseConsumption: 6.1, fuelPrice: 1.455, driving: 'normal', routeType: 'mixto', ac: 'apagado', luggage: 'normal', highwaySpeed: 110, season: 'templado', tires: 'correcta' });
  assert.equal(result.valid, true);
  assert.equal(result.consumption, 5.98);
  assert.equal(result.liters, 9.87);
  assert.equal(result.fuelCost, 14.36);
});

test('aplica ida y vuelta, pasajeros y costes adicionales', () => {
  const result = calculateTrip({ distance: 100, baseConsumption: 5, fuelPrice: 2, driving: 'normal', roundTrip: true, passengers: 4, tolls: 12, parking: 8, highwaySpeed: 110 });
  assert.equal(result.distance, 200);
  assert.equal(result.additionalCosts, 20);
  assert.equal(result.totalCost, 40.2);
  assert.equal(result.costPerPerson, 10.05);
});

test('el consumo manual sustituye la referencia', () => {
  const result = calculateTrip({ distance: 100, baseConsumption: 6.1, manualConsumption: 7, fuelPrice: 1.5, highwaySpeed: 110 });
  assert.equal(result.baseConsumption, 7);
  assert.equal(result.baseSource, 'manual');
});

test('centraliza factores prudentes y explica sus efectos', () => {
  const result = calculateTrip({ distance: 100, baseConsumption: 6, fuelPrice: 1.5, driving: 'dinamico', routeType: 'carretera', ac: 'intenso', passengers: 4, luggage: 'cargado', highwaySpeed: 120, season: 'verano', tires: 'baja' });
  assert.equal(factors.drivingStyle.dinamico, 1.1);
  assert.ok(result.consumption > 6);
  assert.ok(result.explanations.some((item) => item.key === 'ac' && item.percent === 6));
});

test('compara conducción sin llamadas ni estado externo', () => {
  const scenarios = compareDrivingScenarios({ distance: 245, baseConsumption: 6.1, fuelPrice: 1.49, highwaySpeed: 110 });
  assert.deepEqual(scenarios.map((item) => item.driving), ['tranquilo', 'normal', 'dinamico']);
  assert.ok(scenarios[0].cost < scenarios[1].cost && scenarios[1].cost < scenarios[2].cost);
});

test('rechaza datos incompletos', () => { assert.equal(calculateTrip({ distance: 0, baseConsumption: 6, fuelPrice: 1.5 }).valid, false); });
