(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MiMotorVehicle = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'mimotor.vehicle.v1';
  var ALLOWED_FUELS = ['diesel', 'gasoline', 'hybrid', 'electric', 'lpg', 'cng'];
  var CATALOG = Object.freeze([
    Object.freeze({ make: 'Opel', model: 'Astra', generation: 'H GTC', year: 2010, engine: '1.9 CDTI 120 CV', fuel: 'diesel', displacementCc: 1910, powerCv: 120, referenceConsumption: 6.1, urbanConsumption: 7.8, roadConsumption: 5.1, tankLiters: 52, source: 'local-catalog', confidence: 0.96 })
  ]);

  function text(value) { return String(value == null ? '' : value).trim().slice(0, 80); }
  function normalise(value) { return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function unique(values) { return values.filter(function (value, index) { return values.indexOf(value) === index; }); }
  function search(filters) {
    filters = filters || {};
    return CATALOG.filter(function (vehicle) {
      return (!filters.make || normalise(vehicle.make) === normalise(filters.make))
        && (!filters.model || normalise(vehicle.model) === normalise(filters.model))
        && (!filters.year || Number(vehicle.year) === Number(filters.year))
        && (!filters.engine || normalise(vehicle.engine).includes(normalise(filters.engine)));
    }).map(function (vehicle) { return Object.assign({}, vehicle); });
  }
  function options(filters) {
    var matches = search(filters);
    return { makes: unique(CATALOG.map(function (vehicle) { return vehicle.make; })), models: unique(matches.map(function (vehicle) { return vehicle.model; })), years: unique(matches.map(function (vehicle) { return vehicle.year; })).sort().reverse(), engines: unique(matches.map(function (vehicle) { return vehicle.engine; })) };
  }
  function resolveLocal(input) { return search(input)[0] || null; }
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    for (var key of ['customConsumption', 'powerCv', 'tankLiters', 'confidence']) {
      if (input[key] !== undefined && input[key] !== null && input[key] !== '' && !Number.isFinite(Number(input[key]))) return null;
    }
    var profile = {
      make: text(input.make), model: text(input.model), generation: text(input.generation), year: Number(input.year), engine: text(input.engine), fuel: text(input.fuel).toLowerCase(),
      referenceConsumption: Number(input.referenceConsumption), customConsumption: Number(input.customConsumption) || null, powerCv: Number(input.powerCv) || null,
      tankLiters: Number(input.tankLiters) || null, source: text(input.source) || 'user', confidence: Number(input.confidence) || null
    };
    if (!profile.make || !profile.model || !Number.isInteger(profile.year) || profile.year < 1900 || profile.year > new Date().getFullYear() + 1) return null;
    if (!profile.engine || ALLOWED_FUELS.indexOf(profile.fuel) === -1) return null;
    if (!Number.isFinite(profile.referenceConsumption) || profile.referenceConsumption <= 0 || profile.referenceConsumption > 40) return null;
    for (var pair of [['customConsumption', 40], ['powerCv', 2000], ['tankLiters', 200], ['confidence', 1]]) {
      var n = profile[pair[0]];
      if (n !== null && (!Number.isFinite(n) || n <= 0 || n > pair[1])) return null;
    }
    return profile;
  }
  function save(input, storage) { var profile = validate(input); if (!profile) return false; try { (storage || localStorage).setItem(STORAGE_KEY, JSON.stringify(profile)); return true; } catch { return false; } }
  function load(storage) { try { return validate(JSON.parse((storage || localStorage).getItem(STORAGE_KEY))); } catch { return null; } }
  function remove(storage) { try { (storage || localStorage).removeItem(STORAGE_KEY); return true; } catch { return false; } }
  function label(vehicle) { return [vehicle.make, vehicle.model, vehicle.generation, vehicle.year, vehicle.engine].filter(Boolean).join(' · '); }
  function fuelLabel(fuel) { return ({ diesel: 'Diésel', gasoline: 'Gasolina', hybrid: 'Híbrido', electric: 'Eléctrico', lpg: 'GLP', cng: 'GNC' })[fuel] || fuel; }
  return { catalog: CATALOG, search: search, options: options, resolveLocal: resolveLocal, validate: validate, save: save, load: load, remove: remove, label: label, fuelLabel: fuelLabel, storageKey: STORAGE_KEY };
});
