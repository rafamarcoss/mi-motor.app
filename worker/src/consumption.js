const DRIVING_FACTORS = Object.freeze({ tranquilo: 0.94, normal: 1, sport: 1.1 });
const CLIMATE_FACTORS = Object.freeze({ off: 1, on: 1.04 });
const LOAD_FACTORS = Object.freeze({ light: 0.99, normal: 1, heavy: 1.06 });
const TRAFFIC_FACTORS = Object.freeze({ low: 1, medium: 1.04, high: 1.08 });

function boundedFactor(values, value) {
  return values[value] || 1;
}

export function calculateConsumption({ referenceConsumption, drivingMode, advanced = {} }) {
  const manual = Number(advanced.customConsumption);
  const base = Number.isFinite(manual) && manual > 0 ? manual : Number(referenceConsumption);
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
    source: Number.isFinite(manual) && manual > 0 ? 'manual' : 'reference',
    factors: {
      driving: DRIVING_FACTORS[drivingMode] || 1,
      climate: CLIMATE_FACTORS[advanced.climate] || 1,
      load: LOAD_FACTORS[advanced.load] || 1,
      traffic: TRAFFIC_FACTORS[advanced.traffic] || 1
    }
  };
}

export function calculateCost({ distanceKm, consumption, fuelPrice, advanced = {} }) {
  const distance = Number(distanceKm);
  const price = Number(fuelPrice);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(price) || price <= 0) {
    throw new Error('distanceKm y fuelPrice deben ser positivos.');
  }

  const roundTrip = advanced.roundTrip === true || advanced.roundTrip === 'true';
  const effectiveDistance = roundTrip ? distance * 2 : distance;
  const passengers = Number.isInteger(Number(advanced.passengers)) && Number(advanced.passengers) >= 1
    ? Number(advanced.passengers)
    : 1;

  const extras = advanced.extras && typeof advanced.extras === 'object' ? advanced.extras : {};
  const tolls = money(extras.tolls);
  const parking = money(extras.parking);
  const other = money(extras.other);
  const extrasTotal = round(tolls + parking + other, 2);

  const liters = round(effectiveDistance / 100 * consumption.adjusted, 2);
  const fuel = round(liters * price, 2);
  const total = round(fuel + extrasTotal, 2);

  return {
    liters,
    estimated: fuel,
    min: round(effectiveDistance / 100 * consumption.min * price + extrasTotal, 2),
    max: round(effectiveDistance / 100 * consumption.max * price + extrasTotal, 2),
    per100Km: round(consumption.adjusted * price, 2),
    distanceKm: round(effectiveDistance, 1),
    roundTrip,
    extras: { tolls, parking, other, total: extrasTotal },
    total,
    passengers,
    perPerson: round(total / passengers, 2)
  };
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
