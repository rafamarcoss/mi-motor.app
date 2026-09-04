(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MiMotorCalculator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FACTORS = Object.freeze({
    driving: Object.freeze({ tranquilo: 0.94, normal: 1, sport: 1.1 }),
    climate: Object.freeze({ off: 1, on: 1.04 }),
    load: Object.freeze({ light: 0.99, normal: 1, heavy: 1.06 }),
    traffic: Object.freeze({ low: 1, medium: 1.04, high: 1.08 })
  });

  var FACTOR_LABELS = Object.freeze({
    driving: {
      tranquilo: 'Conducción tranquila',
      normal: 'Conducción normal',
      sport: 'Conducción dinámica'
    },
    climate: { on: 'Aire acondicionado', off: 'Aire acondicionado apagado' },
    load: {
      light: 'Carga ligera',
      normal: 'Carga normal',
      heavy: 'Carga pesada'
    },
    traffic: {
      low: 'Tráfico fluido',
      medium: 'Tráfico medio',
      high: 'Tráfico denso'
    }
  });

  function parseNumber(value) {
    var number = parseFloat(String(value == null ? '' : value).replace(/\s/g, '').replace(',', '.'));
    return isNaN(number) ? 0 : number;
  }

  function round(number, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
  }

  function factorFor(table, value) {
    return table[value] || 1;
  }

  function money(value) {
    var number = parseNumber(value);
    return number > 0 ? round(number, 2) : 0;
  }

  function passengerCount(value) {
    var number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 8 ? number : 1;
  }

  function adjustmentPercent(factor) {
    return Math.round((factor - 1) * 100);
  }

  function calculateTrip(input) {
    input = input || {};

    var distance = parseNumber(input.distance);
    var baseConsumption = parseNumber(input.baseConsumption);
    var customConsumption = parseNumber(input.customConsumption);
    var fuelPrice = parseNumber(input.fuelPrice);
    var driving = FACTORS.driving[input.driving] ? input.driving : 'normal';

    var effectiveBase = customConsumption > 0 ? customConsumption : baseConsumption;
    if (distance <= 0 || effectiveBase <= 0 || fuelPrice <= 0) {
      return { valid: false, driving: driving };
    }

    var fDriving = factorFor(FACTORS.driving, driving);
    var fClimate = factorFor(FACTORS.climate, input.climate);
    var fLoad = factorFor(FACTORS.load, input.load);
    var fTraffic = factorFor(FACTORS.traffic, input.traffic);

    var consumption = round(effectiveBase * fDriving * fClimate * fLoad * fTraffic, 2);
    var roundTrip = input.roundTrip === true || input.roundTrip === 'true';
    var distanceKm = round(distance * (roundTrip ? 2 : 1), 1);
    var liters = round(distanceKm * consumption / 100, 2);
    var fuelCost = round(liters * fuelPrice, 2);

    var tolls = money(input.extras && input.extras.tolls);
    var parking = money(input.extras && input.extras.parking);
    var other = money(input.extras && input.extras.other);
    var extrasTotal = round(tolls + parking + other, 2);
    var total = round(fuelCost + extrasTotal, 2);

    var passengers = passengerCount(input.passengers);
    var perPerson = round(total / passengers, 2);

    var adjustments = [];
    if (customConsumption > 0) {
      adjustments.push({ label: 'Consumo indicado por ti', percent: 0, source: 'manual' });
    }
    [['driving', fDriving], ['climate', fClimate], ['load', fLoad], ['traffic', fTraffic]].forEach(function (pair) {
      var percent = adjustmentPercent(pair[1]);
      if (percent !== 0) {
        adjustments.push({ label: FACTOR_LABELS[pair[0]][input[pair[0]]] || pair[0], percent: percent });
      }
    });

    return {
      valid: true,
      driving: driving,
      source: customConsumption > 0 ? 'manual' : 'reference',
      consumption: {
        base: round(effectiveBase, 2),
        adjusted: consumption,
        min: round(consumption * 0.92, 2),
        max: round(consumption * 1.08, 2)
      },
      distanceKm: distanceKm,
      roundTrip: roundTrip,
      liters: liters,
      cost: fuelCost,
      extras: { tolls: tolls, parking: parking, other: other, total: extrasTotal },
      total: total,
      perPerson: perPerson,
      passengers: passengers,
      costPer100: round(consumption * fuelPrice, 2),
      rangeMin: round(total * 0.92, 2),
      rangeMax: round(total * 1.08, 2),
      factors: {
        driving: fDriving,
        climate: fClimate,
        load: fLoad,
        traffic: fTraffic
      },
      adjustments: adjustments
    };
  }

  return {
    calculateTrip: calculateTrip,
    parseNumber: parseNumber,
    drivingModifiers: FACTORS.driving,
    FACTORS: FACTORS,
    FACTOR_LABELS: FACTOR_LABELS
  };
});