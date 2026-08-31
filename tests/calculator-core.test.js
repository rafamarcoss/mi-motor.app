const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTrip } = require('../js/calculator-core.js');

test('calcula coste y rango de forma determinista', () => {
  assert.deepEqual(calculateTrip({
    distance: '165',
    baseConsumption: '6,1',
    fuelPrice: '1,455',
    driving: 'normal'
  }), {
    valid: true,
    driving: 'normal',
    consumption: 6.1,
    liters: 10.07,
    cost: 14.65,
    costPer100: 8.88,
    rangeMin: 13.48,
    rangeMax: 15.82
  });
});

test('aplica el ajuste de conducción sin delegar la fórmula', () => {
  const result = calculateTrip({
    distance: 100,
    baseConsumption: 6,
    fuelPrice: 1.5,
    driving: 'sport'
  });
  assert.equal(result.consumption, 6.6);
  assert.equal(result.cost, 9.9);
});

test('rechaza datos incompletos', () => {
  assert.equal(calculateTrip({ distance: 0, baseConsumption: 6, fuelPrice: 1.5 }).valid, false);
});
