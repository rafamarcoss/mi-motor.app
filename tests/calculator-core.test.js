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
    source: 'reference',
    consumption: { base: 6.1, adjusted: 6.1, min: 5.61, max: 6.59 },
    distanceKm: 165,
    roundTrip: false,
    liters: 10.07,
    cost: 14.65,
    extras: { tolls: 0, parking: 0, other: 0, total: 0 },
    total: 14.65,
    perPerson: 14.65,
    passengers: 1,
    costPer100: 8.88,
    rangeMin: 13.48,
    rangeMax: 15.82,
    factors: { driving: 1, climate: 1, load: 1, traffic: 1 },
    adjustments: []
  });
});

test('el consumo manual tiene prioridad sobre el de referencia', () => {
  const result = calculateTrip({
    distance: 100,
    baseConsumption: '6,1',
    customConsumption: '5,5',
    fuelPrice: '1,5',
    driving: 'normal'
  });
  assert.equal(result.source, 'manual');
  assert.equal(result.consumption.base, 5.5);
  assert.equal(result.liters, 5.5);
  assert.ok(result.adjustments.some((item) => item.label === 'Consumo indicado por ti'));
});

test('aplica factores sin duplicar el modo de conducción', () => {
  const result = calculateTrip({
    distance: 100,
    baseConsumption: 6,
    fuelPrice: 1.5,
    driving: 'sport',
    climate: 'on',
    load: 'heavy',
    traffic: 'high'
  });
  assert.equal(result.consumption.adjusted, 7.86);
  assert.equal(result.cost, 11.79);
  assert.deepEqual(result.adjustments.map((item) => item.percent), [10, 4, 6, 8]);
});

test('ida y vuelta duplica la distancia', () => {
  const result = calculateTrip({
    distance: 245,
    baseConsumption: 6.1,
    fuelPrice: 1.49,
    driving: 'normal',
    roundTrip: true
  });
  assert.equal(result.distanceKm, 490);
  assert.equal(result.liters, 29.89);
  assert.equal(result.cost, 44.54);
  assert.equal(result.total, 44.54);
});

test('los extras se suman al coste total', () => {
  const result = calculateTrip({
    distance: 245,
    baseConsumption: 6.1,
    fuelPrice: 1.49,
    driving: 'normal',
    extras: { tolls: '5', parking: '3', other: '2' }
  });
  assert.equal(result.extras.total, 10);
  assert.equal(result.cost, 22.28);
  assert.equal(result.total, 32.28);
});

test('el coste por persona divide entre los pasajeros', () => {
  const result = calculateTrip({
    distance: 245,
    baseConsumption: 6.1,
    fuelPrice: 1.49,
    driving: 'normal',
    passengers: 4
  });
  assert.equal(result.total, 22.28);
  assert.equal(result.perPerson, 5.57);
});

test('rechaza datos incompletos', () => {
  assert.equal(calculateTrip({ distance: 0, baseConsumption: 6, fuelPrice: 1.5 }).valid, false);
  assert.equal(calculateTrip({ distance: 100, baseConsumption: 6, fuelPrice: 0 }).valid, false);
});