(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MiMotorTools = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function number(value) {
    var parsed = parseFloat(String(value == null ? '' : value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value, decimals) {
    var factor = Math.pow(10, decimals == null ? 2 : decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function monthlyCost(input) {
    input = input || {};
    var kmMonth = number(input.kmMonth);
    var consumption = number(input.consumption);
    var fuelPrice = number(input.fuelPrice);
    if (kmMonth <= 0 || consumption <= 0 || fuelPrice <= 0) return { valid: false };
    var items = {
      combustible: kmMonth * consumption / 100 * fuelPrice,
      seguro: number(input.insuranceAnnual) / 12,
      impuesto: number(input.taxAnnual) / 12,
      mantenimiento: number(input.maintenanceAnnual) / 12,
      itv: number(input.itvAnnual) / 12,
      financiacion: number(input.financeMonthly),
      aparcamiento: number(input.parkingMonthly),
      otros: number(input.otherMonthly)
    };
    var totalMonth = Object.values(items).reduce(function (sum, value) { return sum + value; }, 0);
    var mainItem = Object.keys(items).reduce(function (best, key) { return items[key] > items[best] ? key : best; }, 'combustible');
    return {
      valid: true,
      month: round(totalMonth),
      year: round(totalMonth * 12),
      per100: round(totalMonth / kmMonth * 100),
      items: Object.fromEntries(Object.entries(items).map(function (entry) { return [entry[0], round(entry[1])]; })),
      mainItem: mainItem
    };
  }

  function compareFuel(input) {
    input = input || {};
    var years = number(input.years);
    var annualKm = number(input.annualKm);
    function scenario(prefix) {
      return {
        purchase: number(input[prefix + 'Purchase']),
        consumption: number(input[prefix + 'Consumption']),
        variablePerKm: number(input[prefix + 'Consumption']) / 100 * number(input[prefix + 'FuelPrice']),
        maintenance: number(input[prefix + 'Maintenance'])
      };
    }
    var a = scenario('a');
    var b = scenario('b');
    if (years <= 0 || annualKm <= 0 || a.consumption <= 0 || b.consumption <= 0 || a.variablePerKm <= 0 || b.variablePerKm <= 0) return { valid: false };
    var totalA = a.purchase + years * (annualKm * a.variablePerKm + a.maintenance);
    var totalB = b.purchase + years * (annualKm * b.variablePerKm + b.maintenance);
    var annualDifference = annualKm * (a.variablePerKm - b.variablePerKm) + (a.maintenance - b.maintenance);
    var purchaseDifference = b.purchase - a.purchase;
    var breakEvenYears = annualDifference > 0 && purchaseDifference > 0 ? purchaseDifference / annualDifference : null;
    return {
      valid: true,
      totalA: round(totalA),
      totalB: round(totalB),
      cheaper: totalA === totalB ? 'empate' : (totalA < totalB ? 'a' : 'b'),
      difference: round(Math.abs(totalA - totalB)),
      breakEvenKm: breakEvenYears == null ? null : round(breakEvenYears * annualKm, 0),
      breakEvenYears: breakEvenYears == null ? null : round(breakEvenYears, 1),
      withinHorizon: breakEvenYears != null && breakEvenYears <= years
    };
  }

  function realConsumption(input) {
    input = input || {};
    var liters = number(input.liters);
    var km = number(input.km);
    var fuelPrice = number(input.fuelPrice);
    var tank = number(input.tank);
    if (liters <= 0 || km <= 0) return { valid: false };
    var consumption = liters / km * 100;
    return { valid: true, consumption: round(consumption), costPer100: fuelPrice > 0 ? round(consumption * fuelPrice) : null, range: tank > 0 ? round(tank / consumption * 100, 0) : null };
  }

  function tirePressure(input) {
    input = input || {};
    var recommended = number(input.recommended);
    var current = number(input.current);
    var annualKm = number(input.annualKm);
    var consumption = number(input.consumption);
    if (recommended <= 0 || current <= 0 || annualKm <= 0 || consumption <= 0) return { valid: false };
    var difference = current - recommended;
    var deficitRatio = Math.max(0, -round(difference, 2) / recommended);
    var estimatedImpact = Math.min(0.03, deficitRatio * 0.1);
    return { valid: true, difference: round(difference, 2), status: Math.abs(difference) < 0.1 ? 'cercana' : (difference < 0 ? 'inferior' : 'superior'), impactPercent: round(estimatedImpact * 100, 1), extraLitersYear: round(annualKm * consumption / 100 * estimatedImpact, 1) };
  }

  return { number: number, monthlyCost: monthlyCost, compareFuel: compareFuel, realConsumption: realConsumption, tirePressure: tirePressure };
});
