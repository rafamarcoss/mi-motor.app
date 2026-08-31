(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MiMotorCalculator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DRIVING_MODIFIERS = {
    tranquilo: 0.94,
    normal: 1,
    sport: 1.1
  };

  function parseNumber(value) {
    var number = parseFloat(String(value == null ? '' : value).replace(/\s/g, '').replace(',', '.'));
    return isNaN(number) ? 0 : number;
  }

  function round(number, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
  }

  function calculateTrip(input) {
    input = input || {};
    var distance = parseNumber(input.distance);
    var baseConsumption = parseNumber(input.baseConsumption);
    var fuelPrice = parseNumber(input.fuelPrice);
    var driving = DRIVING_MODIFIERS[input.driving] ? input.driving : 'normal';

    if (distance <= 0 || baseConsumption <= 0 || fuelPrice <= 0) {
      return { valid: false, driving: driving };
    }

    var consumption = round(baseConsumption * DRIVING_MODIFIERS[driving], 2);
    var liters = round(distance * consumption / 100, 2);
    var cost = round(liters * fuelPrice, 2);
    var costPer100 = round(consumption * fuelPrice, 2);
    var rangeMin = round(cost * 0.92, 2);
    var rangeMax = round(cost * 1.08, 2);

    return {
      valid: true,
      driving: driving,
      consumption: consumption,
      liters: liters,
      cost: cost,
      costPer100: costPer100,
      rangeMin: rangeMin,
      rangeMax: rangeMax
    };
  }

  return {
    calculateTrip: calculateTrip,
    parseNumber: parseNumber,
    drivingModifiers: DRIVING_MODIFIERS
  };
});
