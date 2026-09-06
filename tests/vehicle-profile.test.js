const test = require('node:test');
const assert = require('node:assert/strict');
const vehicle = require('../js/vehicle-profile.js');

function memoryStorage() {
  const values = new Map();
  return { setItem(key, value) { values.set(key, value); }, getItem(key) { return values.get(key) || null; }, removeItem(key) { values.delete(key); }, values };
}

test('resuelve Opel Astra desde catálogo sin proveedor externo', () => {
  const result = vehicle.resolveLocal({ make: 'Opel', model: 'Astra', year: 2010, engine: '1.9 CDTI' });
  assert.equal(result.generation, 'H GTC');
  assert.equal(result.referenceConsumption, 6.1);
  assert.equal(result.source, 'local-catalog');
});

test('el selector deriva modelos, años y motores', () => {
  assert.deepEqual(vehicle.options({ make: 'Opel' }).models, ['Astra']);
  assert.deepEqual(vehicle.options({ make: 'Opel', model: 'Astra' }).years, [2010]);
});

test('localStorage conserva solo el perfil permitido', () => {
  const storage = memoryStorage();
  const input = { ...vehicle.catalog[0], customConsumption: 6.7, registration: '1234 ABC', email: 'x@example.com' };
  assert.equal(vehicle.save(input, storage), true);
  const raw = storage.values.get(vehicle.storageKey);
  assert.doesNotMatch(raw, /1234 ABC|example\.com/);
  assert.equal(vehicle.load(storage).customConsumption, 6.7);
});

test('rechaza perfiles incompletos o consumos imposibles', () => {
  assert.equal(vehicle.validate({ make: 'Opel' }), null);
  assert.equal(vehicle.validate({ ...vehicle.catalog[0], referenceConsumption: 80 }), null);
});

test('rechaza consumos personalizados negativos, infinitos y fuera de rango', () => {
  for (const customConsumption of [-1, 80, Infinity]) assert.equal(vehicle.validate({ ...vehicle.catalog[0], customConsumption }), null);
  const storage = memoryStorage(); vehicle.save(vehicle.catalog[0], storage); assert.equal(vehicle.remove(storage), true); assert.equal(vehicle.load(storage), null);
});
