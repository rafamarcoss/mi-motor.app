const MAX_TEXT_LENGTH = 120;
const DRIVING_MODES = new Set(['tranquilo', 'normal', 'sport']);
const CLIMATE_MODES = new Set(['off', 'on']);
const LOAD_MODES = new Set(['light', 'normal', 'heavy']);
const TRAFFIC_MODES = new Set(['low', 'medium', 'high']);
const EXTRAS_KEYS = ['tolls', 'parking', 'other'];
const MAX_EXTRAS_ITEM = 2000;

export function validateTripPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }

  const fields = ['vehicle', 'origin', 'destination'];
  for (const field of fields) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      return { ok: false, error: `Falta ${field}.` };
    }
    if (payload[field].length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `${field} supera el máximo de ${MAX_TEXT_LENGTH} caracteres.` };
    }
  }

  const drivingMode = payload.drivingMode || 'normal';
  if (!DRIVING_MODES.has(drivingMode)) {
    return { ok: false, error: 'drivingMode debe ser tranquilo, normal o sport.' };
  }

  const advanced = payload.advanced === undefined ? {} : payload.advanced;
  if (!advanced || typeof advanced !== 'object' || Array.isArray(advanced)) {
    return { ok: false, error: 'advanced debe ser un objeto.' };
  }

  const cleanAdvanced = {};

  if (CLIMATE_MODES.has(advanced.climate)) cleanAdvanced.climate = advanced.climate;
  if (LOAD_MODES.has(advanced.load)) cleanAdvanced.load = advanced.load;
  if (TRAFFIC_MODES.has(advanced.traffic)) cleanAdvanced.traffic = advanced.traffic;

  cleanAdvanced.roundTrip = advanced.roundTrip === true || advanced.roundTrip === 'true';

  const passengers = Number(advanced.passengers);
  if (Number.isInteger(passengers) && passengers >= 1 && passengers <= 8) cleanAdvanced.passengers = passengers;

  const customConsumption = Number(advanced.customConsumption);
  if (Number.isFinite(customConsumption) && customConsumption > 0 && customConsumption <= 40) {
    cleanAdvanced.customConsumption = Math.round(customConsumption * 100) / 100;
  }

  const fuelPrice = Number(advanced.fuelPrice);
  if (Number.isFinite(fuelPrice) && fuelPrice >= 0.5 && fuelPrice <= 5) {
    cleanAdvanced.fuelPrice = Math.round(fuelPrice * 1000) / 1000;
  }

  const extras = {};
  for (const key of EXTRAS_KEYS) {
    const value = Number(advanced[key]);
    if (Number.isFinite(value) && value >= 0 && value <= MAX_EXTRAS_ITEM) {
      extras[key] = Math.round(value * 100) / 100;
    }
  }
  if (Object.keys(extras).length > 0) cleanAdvanced.extras = extras;

  return {
    ok: true,
    value: {
      vehicle: payload.vehicle.trim(),
      origin: payload.origin.trim(),
      destination: payload.destination.trim(),
      drivingMode,
      advanced: cleanAdvanced
    }
  };
}

export function normaliseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
