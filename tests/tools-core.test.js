const test = require('node:test');
const assert = require('node:assert/strict');
const tools = require('../js/tools-core.js');

test('calcula el coste mensual y desglosa partidas', () => {
  const result = tools.monthlyCost({ kmMonth: 1000, consumption: 6, fuelPrice: 1.5, insuranceAnnual: 600, taxAnnual: 120, maintenanceAnnual: 360, itvAnnual: 60, financeMonthly: 0, parkingMonthly: 50, otherMonthly: 10 });
  assert.equal(result.month, 245);
  assert.equal(result.year, 2940);
  assert.equal(result.per100, 24.5);
  assert.equal(result.mainItem, 'combustible');
});

test('calcula el punto de equilibrio entre dos escenarios', () => {
  const result = tools.compareFuel({ years: 10, annualKm: 15000, aPurchase: 20000, aConsumption: 7, aFuelPrice: 1.6, aMaintenance: 500, bPurchase: 22000, bConsumption: 5, bFuelPrice: 1.5, bMaintenance: 600 });
  assert.equal(result.valid, true);
  assert.equal(result.breakEvenKm, 65934);
  assert.equal(result.withinHorizon, true);
});

test('calcula consumo lleno a lleno, coste y autonomía', () => {
  assert.deepEqual(tools.realConsumption({ liters: 42, km: 650, fuelPrice: 1.5, tank: 55 }), { valid: true, consumption: 6.46, costPer100: 9.69, range: 851 });
});

test('estima con prudencia el impacto de presión baja', () => {
  const result = tools.tirePressure({ recommended: 2.4, current: 2.1, annualKm: 15000, consumption: 6 });
  assert.equal(result.status, 'inferior');
  assert.equal(result.impactPercent, 1.3);
  assert.equal(result.extraLitersYear, 11.3);
});
