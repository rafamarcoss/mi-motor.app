import { normaliseText } from './validation.js';

const KNOWN_VEHICLES = [
  {
    make: 'Opel',
    model: 'Astra',
    generation: 'H GTC',
    year: 2010,
    engine: '1.9 CDTI',
    fuel: 'diesel',
    powerCv: 120,
    powerKw: 88,
    referenceConsumption: 6.1,
    urbanConsumption: 7.8,
    roadConsumption: 5.1,
    displacementCc: 1910,
    tankLiters: 52,
    confidence: 0.96,
    source: 'local-catalog'
  }
];

export function vehicleId(vehicle) {
  return normaliseText([
    vehicle.make, vehicle.model, vehicle.generation, vehicle.year,
    vehicle.engine, vehicle.powerCv
  ].join('-')).replaceAll(' ', '-');
}

export function resolveKnownVehicle(input) {
  const text = normaliseText(typeof input === 'string' ? input : [input?.make, input?.model, input?.generation, input?.year, input?.engine, input?.powerCv].join(' '));
  const match = KNOWN_VEHICLES.find((vehicle) => {
    return text.includes('opel') && text.includes('astra') && text.includes('1 9')
      && text.includes('2010') && text.includes('120');
  });
  return match ? { ...match, vehicleId: vehicleId(match), cached: true } : null;
}

export function searchKnownVehicles(filters = {}) {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return KNOWN_VEHICLES.filter((vehicle) => entries.every(([key, value]) => normaliseText(vehicle[key]) === normaliseText(value))).map((vehicle) => ({ ...vehicle, vehicleId: vehicleId(vehicle) }));
}

export function validateVehicle(value) {
  const required = ['make', 'model', 'year', 'engine', 'fuel', 'powerCv', 'powerKw', 'referenceConsumption'];
  if (!value || required.some((key) => value[key] === undefined || value[key] === null)) return null;
  if (!Number.isInteger(Number(value.year)) || Number(value.year) < 1900 || Number(value.year) > 2100) return null;
  if (!['diesel', 'gasoline', 'hybrid', 'electric', 'unknown'].includes(value.fuel)) return null;
  if (!Number.isFinite(Number(value.referenceConsumption)) || Number(value.referenceConsumption) <= 0) return null;
  return {
    ...value,
    year: Number(value.year),
    powerCv: Number(value.powerCv),
    powerKw: Number(value.powerKw),
    referenceConsumption: Number(value.referenceConsumption),
    vehicleId: value.vehicleId || vehicleId(value)
  };
}
