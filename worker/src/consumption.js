const DRIVING_FACTORS = Object.freeze({ tranquilo: 0.94, normal: 1, sport: 1.1 });
const CLIMATE_FACTORS = Object.freeze({ off: 1, on: 1.04 });
const LOAD_FACTORS = Object.freeze({ light: 0.99, normal: 1, heavy: 1.06 });
const TRAFFIC_FACTORS = Object.freeze({ low: 1, medium: 1.04, high: 1.08 });

function boundedFactor(values, value) {
  return values[value] || 1;
}

export function calculateConsumption({ referenceConsumption, drivingMode, advanced = {} }) {
  const base = Number(referenceConsumption);
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error('referenceConsumption inválido.');
  }

  const adjusted = base
    * boundedFactor(DRIVING_FACTORS, drivingMode)
    * boundedFactor(CLIMATE_FACTORS, advanced.climate)
    * boundedFactor(LOAD_FACTORS, advanced.load)
    * boundedFactor(TRAFFIC_FACTORS, advanced.traffic);

  return {
    base: round(base, 2),
    adjusted: round(adjusted, 2),
    min: round(adjusted * 0.92, 2),
    max: round(adjusted * 1.08, 2),
    factors: {
      driving: DRIVING_FACTORS[drivingMode] || 1,
      climate: CLIMATE_FACTORS[advanced.climate] || 1,
      load: LOAD_FACTORS[advanced.load] || 1,
      traffic: TRAFFIC_FACTORS[advanced.traffic] || 1
    }
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
