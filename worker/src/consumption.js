export const CONSUMPTION_FACTORS = Object.freeze({
  driving: Object.freeze({ tranquilo: 0.94, normal: 1, dinamico: 1.1, sport: 1.1 }),
  route: Object.freeze({ ciudad: 1.18, mixto: 1, carretera: 0.94 }),
  ac: Object.freeze({ apagado: 1, normal: 1.03, intenso: 1.06, off: 1, on: 1.04 }),
  load: Object.freeze({ light: 0.99, normal: 1, heavy: 1.06, ligero: 0.99, cargado: 1.04 }),
  speed: Object.freeze({ 100: 0.94, 110: 0.98, 120: 1.04, 130: 1.12 }),
  season: Object.freeze({ invierno: 1.05, templado: 1, verano: 1.02 }),
  tires: Object.freeze({ correcta: 1, baja: 1.03 }),
  traffic: Object.freeze({ low: 1, medium: 1.04, high: 1.08 })
});

function boundedFactor(values, value) {
  return values[value] || 1;
}

export function calculateConsumption({ referenceConsumption, drivingMode, advanced = {} }) {
  const base = Number(referenceConsumption);
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error('referenceConsumption inválido.');
  }

  const factors = {
    driving: boundedFactor(CONSUMPTION_FACTORS.driving, drivingMode),
    route: boundedFactor(CONSUMPTION_FACTORS.route, advanced.routeType),
    ac: boundedFactor(CONSUMPTION_FACTORS.ac, advanced.ac || advanced.climate),
    load: boundedFactor(CONSUMPTION_FACTORS.load, advanced.load),
    speed: boundedFactor(CONSUMPTION_FACTORS.speed, advanced.highwaySpeed),
    season: boundedFactor(CONSUMPTION_FACTORS.season, advanced.season),
    tires: boundedFactor(CONSUMPTION_FACTORS.tires, advanced.tires),
    traffic: boundedFactor(CONSUMPTION_FACTORS.traffic, advanced.traffic)
  };
  const adjusted = base * Object.values(factors).reduce((total, value) => total * value, 1);

  return {
    base: round(base, 2),
    adjusted: round(adjusted, 2),
    min: round(adjusted * 0.92, 2),
    max: round(adjusted * 1.08, 2),
    factors
  };
}

export function calculateCost({ distanceKm, consumption, fuelPrice }) {
  const distance = Number(distanceKm);
  const price = Number(fuelPrice);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error('distanceKm y fuelPrice deben ser positivos.');
  }

  const liters = round(distance / 100 * consumption.adjusted, 2);
  return {
    liters,
    estimated: round(liters * price, 2),
    min: round(distance / 100 * consumption.min * price, 2),
    max: round(distance / 100 * consumption.max * price, 2),
    per100Km: round(consumption.adjusted * price, 2)
  };
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
