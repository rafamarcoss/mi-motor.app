(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MiMotorProfile = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'mimotor.vehicle';
  var FUELS = ['diesel', 'gasoline', 'hybrid', 'electric', 'unknown'];
  var ALLOWED_KEYS = [
    'make', 'model', 'generation', 'year', 'engine', 'fuel',
    'referenceConsumption', 'customConsumption', 'updatedAt'
  ];
  var MAX_STRING = 48;
  var MAX_CONSUMPTION = 40;

  var storage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;

  function setStorage(adapter) {
    storage = adapter;
  }

  var FUEL_LABELS = {
    diesel: 'Diésel',
    gasoline: 'Gasolina',
    hybrid: 'Híbrido',
    electric: 'Eléctrico',
    unknown: ''
  };

  function cleanString(value) {
    if (typeof value !== 'string') return null;
    var text = value.trim().slice(0, MAX_STRING);
    return text.length > 0 ? text : null;
  }

  function cleanYear(value) {
    var year = Number(value);
    return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
  }

  function cleanConsumption(value) {
    var number = Number(String(value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(number) && number > 0 && number <= MAX_CONSUMPTION
      ? Math.round(number * 100) / 100
      : null;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    var out = {};
    var make = cleanString(raw.make);
    var model = cleanString(raw.model);
    var engine = cleanString(raw.engine);
    var generation = cleanString(raw.generation);
    var year = cleanYear(raw.year);
    var referenceConsumption = cleanConsumption(raw.referenceConsumption);
    var customConsumption = cleanConsumption(raw.customConsumption);
    var fuel = FUELS.indexOf(raw.fuel) >= 0 ? raw.fuel : null;

    if (!make || !model || !year || !engine || !fuel || !referenceConsumption) return null;

    out.make = make;
    out.model = model;
    out.year = year;
    out.engine = engine;
    out.fuel = fuel;
    out.referenceConsumption = referenceConsumption;
    if (generation) out.generation = generation;
    if (customConsumption !== null) out.customConsumption = customConsumption;
    out.updatedAt = typeof raw.updatedAt === 'string'
      ? raw.updatedAt.slice(0, 24)
      : new Date().toISOString();
    return out;
  }

  function load() {
    if (!storage) return null;
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return sanitize(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function save(profile) {
    var clean = sanitize(profile);
    if (!clean || !storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clear() {
    if (!storage) return;
    try { storage.removeItem(STORAGE_KEY); } catch (error) { /* sin acceso */ }
  }

  function name(profile) {
    if (!profile) return '';
    return [profile.make, profile.model, profile.generation].filter(Boolean).join(' ');
  }

  function spec(profile) {
    if (!profile) return '';
    var fuelLabel = FUEL_LABELS[profile.fuel] || '';
    return [profile.engine, profile.year, fuelLabel].filter(Boolean).join(' · ');
  }

  function describe(profile) {
    if (!profile) return '';
    return (name(profile) + ' · ' + spec(profile)).replace(/^ · | · $/g, '');
  }

  function fuelLabel(fuel) {
    return FUEL_LABELS[fuel] || '';
  }

  return {
    sanitize: sanitize,
    load: load,
    save: save,
    clear: clear,
    setStorage: setStorage,
    name: name,
    spec: spec,
    describe: describe,
    fuelLabel: fuelLabel,
    STORAGE_KEY: STORAGE_KEY,
    ALLOWED_KEYS: ALLOWED_KEYS,
    FUELS: FUELS
  };
});