const MAX_TEXT_LENGTH = 120;
const DRIVING_MODES = new Set(['tranquilo', 'normal', 'dinamico', 'sport']);

export function validateTripPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }

  const vehicle = validateVehicleInput(payload.vehicle);
  if (!vehicle.ok) return vehicle;
  const fields = ['origin', 'destination'];
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
    return { ok: false, error: 'drivingMode debe ser tranquilo, normal o dinamico.' };
  }

  const advanced = payload.advanced === undefined ? {} : payload.advanced;
  if (!advanced || typeof advanced !== 'object' || Array.isArray(advanced)) {
    return { ok: false, error: 'advanced debe ser un objeto.' };
  }

  return {
    ok: true,
    value: {
      vehicle: vehicle.value,
      origin: payload.origin.trim(),
      destination: payload.destination.trim(),
      drivingMode,
      advanced
    }
  };
}

export function validateVehicleInput(value) {
  if (typeof value === 'string') {
    if (!value.trim()) return { ok: false, error: 'Falta vehicle.' };
    if (value.length > MAX_TEXT_LENGTH) return { ok: false, error: `vehicle supera el máximo de ${MAX_TEXT_LENGTH} caracteres.` };
    return { ok: true, value: value.trim() };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'vehicle debe ser texto o un objeto estructurado.' };
  const result = {};
  for (const field of ['make', 'model', 'engine']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 80) return { ok: false, error: `vehicle.${field} no es válido.` };
    result[field] = value[field].trim();
  }
  const year = Number(value.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return { ok: false, error: 'vehicle.year no es válido.' };
  result.year = year;
  if (value.generation) result.generation = String(value.generation).trim().slice(0, 80);
  if (value.powerCv) result.powerCv = Number(value.powerCv);
  return { ok: true, value: result };
}

export function normaliseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
