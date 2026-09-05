(function () {
  'use strict';
  var form = document.querySelector('[data-profile-form]'); if (!form) return;
  var api = window.MiMotorVehicle;
  var status = document.querySelector('[data-profile-status]');
  function fill(p) { if (p) Object.keys(p).forEach(function (key) { if (form.elements[key]) form.elements[key].value = p[key] == null ? '' : p[key]; }); }
  var saved = api.load(); fill(saved);
  status.textContent = saved ? 'Coche recuperado de este dispositivo.' : 'Todavía no has guardado un coche.';
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = Object.fromEntries(new FormData(form)); data.source = 'user';
    ['referenceConsumption', 'customConsumption', 'tankLiters'].forEach(function (key) { data[key] = Number(String(data[key] || '').replace(',', '.')); });
    status.textContent = api.save(data) ? 'Coche guardado. Puedes usarlo en las calculadoras.' : 'No se pudo guardar. Revisa los valores y el permiso de almacenamiento del navegador.';
  });
  document.querySelector('[data-profile-remove]').addEventListener('click', function () { if (api.remove()) { form.reset(); status.textContent = 'Coche eliminado de este dispositivo.'; } else status.textContent = 'El navegador no permite borrar el almacenamiento.'; });
})();
