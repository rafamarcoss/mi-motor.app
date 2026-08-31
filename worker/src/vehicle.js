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
  const text = normaliseText(input);
  const match = KNOWN_VEHICLES.find((vehicle) => {
    return text.includes('opel') && text.includes('astra') && text.includes('1 9')
      && text.includes('2010') && text.includes('120');
  });
  return match ? { ...match, vehicleId: vehicleId(match), cached: true } : null;
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
