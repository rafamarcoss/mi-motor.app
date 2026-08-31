const MAX_TEXT_LENGTH = 120;
const DRIVING_MODES = new Set(['tranquilo', 'normal', 'sport']);

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

  return {
    ok: true,
    value: {
      vehicle: payload.vehicle.trim(),
      origin: payload.origin.trim(),
      destination: payload.destination.trim(),
      drivingMode,
      advanced
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
