(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MiMotorCalculator = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FACTORS = Object.freeze({
    drivingStyle: Object.freeze({ tranquilo: 0.94, normal: 1, dinamico: 1.1, sport: 1.1 }),
    routeType: Object.freeze({ ciudad: 1.18, mixto: 1, carretera: 0.94 }),
    ac: Object.freeze({ apagado: 1, normal: 1.03, intenso: 1.06 }),
    luggage: Object.freeze({ ligero: 0.99, normal: 1, cargado: 1.04 }),
    highwaySpeed: Object.freeze({ '100': 0.94, '110': 0.98, '120': 1.04, '130': 1.12 }),
    season: Object.freeze({ invierno: 1.05, templado: 1, verano: 1.02 }),
    tires: Object.freeze({ correcta: 1, baja: 1.03 })
  });

  function parseNumber(value) {
    var number = parseFloat(String(value == null ? '' : value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  }

  function round(number, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round((number + Number.EPSILON) * factor) / factor;
  }

  function factor(group, value, fallback) { return FACTORS[group][value] || FACTORS[group][fallback]; }
  function occupantFactor(passengers) {
    if (passengers >= 5) return 1.05;
    if (passengers >= 3) return 1.03;
    if (passengers === 2) return 1.015;
    return 1;
  }

  function calculateTrip(input) {
    input = input || {};
    var distance = parseNumber(input.distance);
    var referenceConsumption = parseNumber(input.baseConsumption);
    var manualConsumption = parseNumber(input.manualConsumption);
    var baseConsumption = manualConsumption > 0 ? manualConsumption : referenceConsumption;
    var fuelPrice = parseNumber(input.fuelPrice);
    var passengers = Math.min(9, Math.max(1, Math.floor(parseNumber(input.passengers) || 1)));
    var roundTrip = input.roundTrip === true || input.roundTrip === 'true';
    var driving = FACTORS.drivingStyle[input.driving] ? input.driving : 'normal';
    var factors = {
      driving: factor('drivingStyle', driving, 'normal'),
      route: factor('routeType', input.routeType, 'mixto'),
      ac: factor('ac', input.ac, 'apagado'),
      occupants: occupantFactor(passengers),
      luggage: factor('luggage', input.luggage, 'normal'),
      speed: factor('highwaySpeed', String(input.highwaySpeed || '110'), '110'),
      season: factor('season', input.season, 'templado'),
      tires: factor('tires', input.tires, 'correcta')
    };
    if (distance <= 0 || baseConsumption <= 0 || fuelPrice <= 0) return { valid: false, driving: driving };

    var effectiveDistance = round(distance * (roundTrip ? 2 : 1), 2);
    var combinedFactor = Object.keys(factors).reduce(function (total, key) { return total * factors[key]; }, 1);
    var consumption = round(baseConsumption * combinedFactor, 2);
    var liters = round(effectiveDistance * consumption / 100, 2);
    var fuelCost = round(liters * fuelPrice, 2);
    var extras = { tolls: Math.max(0, parseNumber(input.tolls)), parking: Math.max(0, parseNumber(input.parking)), other: Math.max(0, parseNumber(input.otherCosts)) };
    var additionalCosts = round(extras.tolls + extras.parking + extras.other, 2);
    var totalCost = round(fuelCost + additionalCosts, 2);
    var explanations = Object.keys(factors).map(function (key) { return { key: key, factor: factors[key], percent: round((factors[key] - 1) * 100, 1) }; }).filter(function (item) { return item.percent !== 0; });

    return {
      valid: true, driving: driving, distance: effectiveDistance, passengers: passengers, roundTrip: roundTrip,
      baseConsumption: baseConsumption, baseSource: manualConsumption > 0 ? 'manual' : 'reference', consumption: consumption,
      liters: liters, fuelCost: fuelCost, additionalCosts: additionalCosts, extras: extras, totalCost: totalCost, cost: totalCost,
      costPerPerson: round(totalCost / passengers, 2), costPer100: round(consumption * fuelPrice, 2),
      rangeMin: round(fuelCost * 0.92 + additionalCosts, 2), rangeMax: round(fuelCost * 1.08 + additionalCosts, 2),
      factors: factors, explanations: explanations
    };
  }

  function compareDrivingScenarios(input) {
    return ['tranquilo', 'normal', 'dinamico'].map(function (driving) {
      var result = calculateTrip(Object.assign({}, input, { driving: driving }));
      return { driving: driving, consumption: result.consumption, cost: result.totalCost };
    });
  }

  return { calculateTrip: calculateTrip, compareDrivingScenarios: compareDrivingScenarios, parseNumber: parseNumber, factors: FACTORS };
});
