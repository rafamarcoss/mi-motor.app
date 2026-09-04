const test = require('node:test');
const assert = require('node:assert/strict');
const Profile = require('../js/vehicle-profile.js');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const VALID_PROFILE = {
  make: 'Opel',
  model: 'Astra',
  generation: 'H GTC',
  year: 2010,
  engine: '1.9 CDTI 120 CV',
  fuel: 'diesel',
  referenceConsumption: 6.1,
  customConsumption: null
};

test('sanitiza un perfil válido y descarta claves ajenas', () => {
  const clean = Profile.sanitize({ ...VALID_PROFILE, email: 'yo@test.es', plate: '1234ABC' });
  assert.equal(clean.make, 'Opel');
  assert.equal(clean.year, 2010);
  assert.equal('email' in clean, false);
  assert.equal('plate' in clean, false);
});

test('lista blanca: solo claves permitidas', () => {
  const clean = Profile.sanitize(VALID_PROFILE);
  Object.keys(clean).forEach((key) => {
    assert.ok(Profile.ALLOWED_KEYS.includes(key), key);
  });
});

test('rechaza perfiles incompletos o inválidos', () => {
  assert.equal(Profile.sanitize(null), null);
  assert.equal(Profile.sanitize({ ...VALID_PROFILE, make: '' }), null);
  assert.equal(Profile.sanitize({ ...VALID_PROFILE, year: 1500 }), null);
  assert.equal(Profile.sanitize({ ...VALID_PROFILE, fuel: 'kerosene' }), null);
  assert.equal(Profile.sanitize({ ...VALID_PROFILE, referenceConsumption: 0 }), null);
});

test('guarda, lee y limpia el perfil de forma segura', () => {
  Profile.setStorage(memoryStorage());
  Profile.clear();
  assert.equal(Profile.load(), null);
  assert.equal(Profile.save(VALID_PROFILE), true);
  const loaded = Profile.load();
  assert.equal(loaded.make, 'Opel');
  assert.equal(loaded.referenceConsumption, 6.1);
  assert.equal('email' in loaded, false);
  Profile.clear();
  assert.equal(Profile.load(), null);
});

test('devuelve null si el JSON guardado está corrupto', () => {
  const storage = memoryStorage();
  Profile.setStorage(storage);
  storage.setItem(Profile.STORAGE_KEY, '{no-es-json');
  assert.equal(Profile.load(), null);
  storage.setItem(Profile.STORAGE_KEY, JSON.stringify({ make: 'SoloMarca' }));
  assert.equal(Profile.load(), null);
});

test('construye la ficha visible del coche', () => {
  assert.equal(Profile.describe(VALID_PROFILE), 'Opel Astra H GTC · 1.9 CDTI 120 CV · 2010 · Diésel');
  assert.equal(Profile.fuelLabel('diesel'), 'Diésel');
  assert.equal(Profile.fuelLabel('gasoline'), 'Gasolina');
});

test('no persiste datos personales aunque lleguen en el perfil', () => {
  const storage = memoryStorage();
  Profile.setStorage(storage);
  Profile.save({ ...VALID_PROFILE, email: 'x@x.es', plate: 'ABC' });
  const raw = storage.getItem(Profile.STORAGE_KEY);
  assert.equal(raw.includes('email'), false);
  assert.equal(raw.includes('plate'), false);
});