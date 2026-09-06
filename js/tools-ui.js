(function () {
  'use strict';
  var form = document.querySelector('[data-tool-form]');
  var resultBox = document.querySelector('[data-result]');
  if (!form || !resultBox || !window.MiMotorTools) return;
  var tool = document.body.dataset.tool;
  var labels = { combustible: 'Combustible', seguro: 'Seguro', impuesto: 'Impuesto', mantenimiento: 'Mantenimiento', itv: 'ITV', financiacion: 'Financiación', aparcamiento: 'Aparcamiento', otros: 'Otros gastos' };
  function fmt(value, decimals) { return Number(value).toLocaleString('es-ES', { minimumFractionDigits: decimals == null ? 2 : decimals, maximumFractionDigits: decimals == null ? 2 : decimals }); }
  function values() { return Object.fromEntries(new FormData(form).entries()); }
  function clear() { resultBox.replaceChildren(); }
  function title(text) { var h = document.createElement('h2'); h.textContent = text; resultBox.appendChild(h); }
  function note(text) { var p = document.createElement('p'); p.className = 'result-note'; p.textContent = text; resultBox.appendChild(p); }
  function metrics(items) {
    var dl = document.createElement('dl'); dl.className = 'metrics';
    items.forEach(function (item) { var row = document.createElement('div'); row.className = 'metric'; var dt = document.createElement('dt'); var dd = document.createElement('dd'); dt.textContent = item[0]; dd.textContent = item[1]; row.append(dt, dd); dl.appendChild(row); });
    resultBox.appendChild(dl);
  }
  function invalid() { clear(); title('Faltan datos'); note('Revisa los campos obligatorios y utiliza valores mayores que cero.'); }
  function renderMonthly(data) {
    var r = MiMotorTools.monthlyCost(data); if (!r.valid) return invalid(); clear(); title(fmt(r.month) + ' € al mes'); metrics([['Coste anual', fmt(r.year) + ' €'], ['Coste por 100 km', fmt(r.per100) + ' €'], ['Partida principal', labels[r.mainItem]]]); note('El cálculo suma combustible, costes anuales prorrateados y gastos mensuales. ' + labels[r.mainItem] + ' supone ' + fmt(r.items[r.mainItem]) + ' € al mes.');
  }
  function renderComparison(data) {
    var r = MiMotorTools.compareFuel(data); if (!r.valid) return invalid(); clear(); title(r.cheaper === 'empate' ? 'Coste equivalente' : 'La opción ' + r.cheaper.toUpperCase() + ' cuesta menos'); metrics([['Coste total opción A', fmt(r.totalA) + ' €'], ['Coste total opción B', fmt(r.totalB) + ' €'], ['Diferencia en el periodo', fmt(r.difference) + ' €'], ['Punto de equilibrio', r.breakEvenKm == null ? 'No se alcanza con estos datos' : fmt(r.breakEvenKm, 0) + ' km (' + fmt(r.breakEvenYears, 1) + ' años)']]); note(r.breakEvenKm == null ? 'Con estos supuestos, la mayor inversión inicial no se recupera mediante combustible y mantenimiento.' : (r.withinHorizon ? 'El punto de equilibrio cae dentro del horizonte indicado.' : 'El punto de equilibrio queda fuera del horizonte indicado.'));
  }
  function renderConsumption(data) {
    var r = MiMotorTools.realConsumption(data); if (!r.valid) return invalid(); clear(); title(fmt(r.consumption) + ' L/100 km'); var list = [['Consumo real', fmt(r.consumption) + ' L/100 km']]; if (r.costPer100 != null) list.push(['Coste por 100 km', fmt(r.costPer100) + ' €']); if (r.range != null) list.push(['Autonomía aproximada', fmt(r.range, 0) + ' km']); metrics(list); note('Para una medida fiable, llena el depósito, pon el parcial a cero, circula y vuelve a llenar en condiciones parecidas.');
  }
  function renderTires(data) {
    var r = MiMotorTools.tirePressure(data); if (!r.valid) return invalid(); clear(); title('Presión ' + r.status + ' a la recomendada'); metrics([['Diferencia', (r.difference > 0 ? '+' : '') + fmt(r.difference, 2) + ' bar'], ['Impacto prudente estimado', fmt(r.impactPercent, 1) + ' %'], ['Combustible adicional estimado', fmt(r.extraLitersYear, 1) + ' L/año']]); note('Es una orientación educativa, no una presión recomendada. Consulta la pegatina del vehículo o el manual y mide en frío.');
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); var data = values(); if (tool === 'monthly') renderMonthly(data); else if (tool === 'comparison') renderComparison(data); else if (tool === 'consumption') renderConsumption(data); else if (tool === 'tires') renderTires(data); });
})();
