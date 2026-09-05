(function () {
  'use strict';
  if (!window.MiMotorVehicle) return;
  var container = document.querySelector('[data-vehicle-context]');
  if (!container) return;
  var profile = MiMotorVehicle.load();
  if (!profile) { container.hidden = true; return; }
  var details = document.createElement('div');
  var title = document.createElement('strong'); title.textContent = 'Tu coche: ' + MiMotorVehicle.label(profile);
  var note = document.createElement('p'); note.textContent = 'Consumo guardado: ' + (profile.customConsumption || profile.referenceConsumption).toLocaleString('es-ES') + ' L/100 km';
  details.append(title, note);
  var button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = 'Usar estos datos';
  container.replaceChildren(details, button);
  button.addEventListener('click', function () {
    var consumption = document.querySelector('[name="consumption"]');
    var tank = document.querySelector('[name="tank"]');
    var comparison = document.querySelector(profile.fuel === 'diesel' ? '[name="bConsumption"]' : '[name="aConsumption"]');
    if (consumption) consumption.value = String(profile.customConsumption || profile.referenceConsumption).replace('.', ',');
    if (tank && profile.tankLiters) tank.value = String(profile.tankLiters).replace('.', ',');
    if (comparison) comparison.value = String(profile.customConsumption || profile.referenceConsumption).replace('.', ',');
    this.textContent = 'Datos aplicados'; this.disabled = true;
  });
})();
