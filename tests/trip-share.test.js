const test = require('node:test');
const assert = require('node:assert/strict');
const share = require('../js/trip-share.js');
const calculator = require('../js/calculator-core.js');
test('el enlace conserva las cifras, excluyendo coche, identidad y ruta', () => {
  const encoded = share.encode({ distance: '245', consumption: '6,1', price: '1,5', passengers: '3', origin: 'Dirección privada', vehicle: 'Mi matrícula' });
  assert.doesNotMatch(decodeURIComponent(encoded), /privada|matrícula/);
  assert.deepEqual(share.decode(encoded), { distance: '245', consumption: '6.1', price: '1.5', passengers: '3' });
});
test('rechaza enlaces manipulados y valores no finitos', () => {
  for (const distance of [Infinity, '-1', 'NaN']) assert.throws(() => share.encode({ distance, consumption: '6', price: '1.5' }));
  assert.throws(() => share.decode('#calculo=%zz'));
  assert.equal(calculator.calculateTrip({ distance: Infinity, baseConsumption: 6, fuelPrice: 1.5 }).valid, false);
});
