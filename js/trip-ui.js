(function () {
  'use strict';
  var root = document.querySelector('[data-trip-calculator]');
  if (!root || !window.MiMotorCalculator || !window.MiMotorTripApi) return;
  var vehicleApi = window.MiMotorVehicle;
  var form = root.querySelector('[data-trip-form]');
  var button = root.querySelector('[data-trip-submit]');
  var fields = {};
  ['vehicle', 'vehicle-make', 'vehicle-model', 'vehicle-year', 'vehicle-engine', 'origin', 'destination', 'driving', 'type', 'passengers', 'distance', 'duration', 'fuel', 'consumption', 'manual-consumption', 'price', 'price-mode', 'route-type', 'ac', 'luggage', 'speed', 'season', 'tires', 'tolls', 'parking', 'other'].forEach(function (name) { fields[name] = root.querySelector('[data-trip-' + name + ']'); });
  var output = {};
  ['route', 'duration', 'vehicle', 'cost', 'fuel-cost', 'liters', 'consumption', 'per100', 'person', 'type', 'range', 'price', 'explanation', 'note', 'breakdown', 'scenarios'].forEach(function (name) { output[name] = root.querySelector('[data-trip-result-' + name + ']'); });
  var resolved = null;
  var sharedCalculation = false;
  var currentProfile = vehicleApi ? vehicleApi.load() : null;
  var routeKey = null;
  var remoteEnabled = root.querySelector('[data-use-api]');
  var shareButton = root.querySelector('[data-trip-share]');
  var shareOutput = root.querySelector('[data-share-output]');
  function clearResult() {
    ['cost', 'fuel-cost', 'liters', 'consumption', 'per100', 'person', 'range'].forEach(function (key) { if (output[key]) output[key].textContent = '—'; });
    if (output.scenarios) output.scenarios.replaceChildren();
    if (output.breakdown) output.breakdown.replaceChildren();
    if (shareButton) shareButton.disabled = true;
    if (shareOutput) shareOutput.hidden = true;
  }
  if (remoteEnabled) {
    remoteEnabled.checked = MiMotorTripApi.isConfigured();
    remoteEnabled.disabled = !MiMotorTripApi.isConfigured();
  }
  if (fields['price-mode'] && !MiMotorTripApi.isConfigured()) {
    fields['price-mode'].value = 'manual'; fields['price-mode'].querySelector('[value="automatico"]').disabled = true;
  }

  function format(value, decimals) { return MiMotorCalculator.parseNumber(value).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
  function value(name, fallback) { return fields[name] ? fields[name].value : fallback; }
  function selectedVehicle() {
    if (!vehicleApi || !fields['vehicle-make']) return null;
    var input = { make: value('vehicle-make'), model: value('vehicle-model'), year: value('vehicle-year'), engine: value('vehicle-engine') };
    if (currentProfile && ['make', 'model', 'year', 'engine'].every(function (key) { return String(input[key]) === String(currentProfile[key]); })) return currentProfile;
    return vehicleApi.resolveLocal(input);
  }
  function vehicleText(vehicle) {
    if (vehicle && vehicleApi) return vehicleApi.label(vehicle);
    return fields.vehicle ? fields.vehicle.value.trim() : [value('vehicle-make'), value('vehicle-model'), value('vehicle-year'), value('vehicle-engine')].filter(Boolean).join(' ');
  }

  function fillVehicle(profile) {
    if (!profile) return;
    currentProfile = profile;
    if (fields['vehicle-make']) fields['vehicle-make'].value = profile.make;
    if (fields['vehicle-model']) fields['vehicle-model'].value = profile.model;
    if (fields['vehicle-year']) fields['vehicle-year'].value = profile.year;
    if (fields['vehicle-engine']) fields['vehicle-engine'].value = profile.engine;
    if (fields.fuel && vehicleApi) fields.fuel.value = profile.fuel;
    if (fields.consumption) fields.consumption.value = String(profile.referenceConsumption).replace('.', ',');
    if (fields['manual-consumption']) fields['manual-consumption'].value = profile.customConsumption ? String(profile.customConsumption).replace('.', ',') : '';
    var summary = root.querySelector('[data-vehicle-summary]');
    if (summary) {
      summary.replaceChildren();
      var strong = document.createElement('strong'); strong.textContent = vehicleApi.label(profile);
      var span = document.createElement('span'); span.textContent = vehicleApi.fuelLabel(profile.fuel) + ' · Referencia: ' + format(profile.referenceConsumption, 1) + ' L/100 km';
      var small = document.createElement('small'); small.textContent = 'Fuente: ' + (profile.source === 'local-catalog' ? 'catálogo MiMotor (cobertura limitada)' : profile.source === 'user' ? 'dato indicado por ti' : 'estimación automática, pendiente de verificar');
      summary.append(strong, span, small);
    }
  }

  function resolveFromFields() {
    var local = selectedVehicle();
    if (local) return local;
    if (fields['vehicle-make']) return vehicleApi.validate({ make: value('vehicle-make'), model: value('vehicle-model'), year: value('vehicle-year'), engine: value('vehicle-engine'), fuel: value('fuel'), referenceConsumption: MiMotorCalculator.parseNumber(value('consumption')) || MiMotorCalculator.parseNumber(value('manual-consumption')), source: 'user' });
    return null;
  }

  function calculationInput() {
    return {
      distance: value('distance'),
      baseConsumption: value('consumption'),
      manualConsumption: value('manual-consumption'), fuelPrice: value('price'),
      driving: value('driving', 'normal'), routeType: value('route-type', 'mixto'), ac: value('ac', 'apagado'),
      passengers: value('passengers', 1), luggage: value('luggage', 'normal'), highwaySpeed: value('speed', 110),
      season: value('season', 'templado'), tires: value('tires', 'correcta'), roundTrip: value('type', 'ida') === 'vuelta',
      tolls: value('tolls', 0), parking: value('parking', 0), otherCosts: value('other', 0)
    };
  }

  var factorNames = { driving: 'Estilo de conducción', route: 'Tipo de ruta', ac: 'Climatización', occupants: 'Ocupantes', luggage: 'Equipaje', speed: 'Velocidad de autovía', season: 'Estación', tires: 'Presión de neumáticos' };
  function render() {
    var result = MiMotorCalculator.calculateTrip(calculationInput());
    if (!result.valid) { clearResult(); if (output.explanation) output.explanation.textContent = 'Revisa distancia, consumo y precio del combustible.'; return; }
    if (shareButton) shareButton.disabled = false;
    var profile = selectedVehicle();
    var from = value('origin', 'Origen').trim() || 'Origen'; var to = value('destination', 'Destino').trim() || 'Destino';
    if (output.route) output.route.textContent = (sharedCalculation ? 'Cálculo compartido' : from + ' → ' + to) + ' · ' + format(result.distance, 0) + ' km';
    if (output.duration) output.duration.textContent = resolved && resolved.duration ? 'Duración aproximada: ' + format(resolved.duration * (result.roundTrip ? 2 : 1), 0) + ' min' : 'Duración no disponible en modo local';
    if (output.vehicle) output.vehicle.textContent = sharedCalculation ? 'Datos del enlace' : vehicleText(profile) || 'Tu coche';
    if (output.type) output.type.textContent = result.roundTrip ? 'Ida y vuelta' : 'Solo ida';
    if (output.cost) output.cost.textContent = format(result.totalCost, 2) + ' €';
    if (output['fuel-cost']) output['fuel-cost'].textContent = format(result.fuelCost, 2) + ' €';
    if (output.liters) output.liters.textContent = format(result.liters, 2) + ' L';
    if (output.consumption) output.consumption.textContent = format(result.consumption, 2) + ' L/100 km';
    if (output.per100) output.per100.textContent = format(result.costPer100, 2) + ' €';
    if (output.person) output.person.textContent = format(result.costPerPerson, 2) + ' €';
    if (output.range) output.range.textContent = format(result.rangeMin, 2) + ' € – ' + format(result.rangeMax, 2) + ' €';
    if (output.price) output.price.textContent = (fields.fuel ? vehicleApi.fuelLabel(fields.fuel.value) : 'Combustible') + ' · ' + format(calculationInput().fuelPrice, 3) + ' €/L';
    if (output.explanation) output.explanation.textContent = 'Partimos de ' + format(result.baseConsumption, 1) + ' L/100 km (' + (result.baseSource === 'manual' ? 'dato indicado por ti' : 'referencia del vehículo') + '). El resultado es una estimación, no una medición científica.';
    if (output.breakdown) {
      output.breakdown.replaceChildren();
      result.explanations.forEach(function (item) { var li = document.createElement('li'); li.textContent = factorNames[item.key] + ': ' + (item.percent > 0 ? '+' : '') + format(item.percent, 1) + ' %'; output.breakdown.appendChild(li); });
      if (!result.explanations.length) { var li = document.createElement('li'); li.textContent = 'Sin ajustes sobre el consumo base.'; output.breakdown.appendChild(li); }
    }
    if (output.scenarios) {
      var names = { tranquilo: 'Tranquilo', normal: 'Normal', dinamico: 'Dinámico' };
      output.scenarios.replaceChildren();
      MiMotorCalculator.compareDrivingScenarios(calculationInput()).forEach(function (scenario) { var item = document.createElement('div'); item.className = 'scenario'; item.innerHTML = '<strong>' + names[scenario.driving] + '</strong><span>' + format(scenario.consumption, 1) + ' L/100 km</span><b>' + format(scenario.cost, 2) + ' €</b>'; output.scenarios.appendChild(item); });
    }
    if (output.note) output.note.textContent = (resolved && resolved.sources ? resolved.sources : 'Cálculo local con los datos indicados.') + (value('price-mode') === 'manual' ? ' Se utiliza tu precio manual.' : '');
  }

  if (vehicleApi && fields['vehicle-make']) {
    fillVehicle(vehicleApi.load() || vehicleApi.catalog[0]);

  } else if (vehicleApi && fields.vehicle) {
    var savedVehicle = vehicleApi.load();
    if (savedVehicle) {
      fields.vehicle.value = vehicleApi.label(savedVehicle);
      if (fields.consumption) fields.consumption.value = String(savedVehicle.customConsumption || savedVehicle.referenceConsumption).replace('.', ',');
    }
  }
  form.addEventListener('input', function (event) {
    if (event.target.matches('[data-trip-vehicle], [data-trip-vehicle-make], [data-trip-vehicle-model], [data-trip-vehicle-year], [data-trip-vehicle-engine]')) {
      currentProfile = null; resolved = null; routeKey = null;
      if (fields['vehicle-make']) {
        fields.consumption.value = ''; fields['manual-consumption'].value = '';
        var summary = root.querySelector('[data-vehicle-summary]');
        if (summary) summary.textContent = 'Vehículo sin ficha local. Introduce un consumo conocido o activa la consulta de datos.';
        var match = selectedVehicle(); if (match) fillVehicle(match);
      }
      clearResult();
      return;
    }
    if (event.target.matches('[data-trip-origin], [data-trip-destination]')) {
      resolved = null; routeKey = null; clearResult();
      if (output.note) output.note.textContent = 'Ruta modificada. Comprueba la distancia y vuelve a calcular.';
      return;
    }
    if (event.target === fields['price-mode'] && value('price-mode') === 'automatico' && resolved?.fuelPrice) fields.price.value = String(resolved.fuelPrice).replace('.', ',');
    if (event.target === fields.price && fields['price-mode']) fields['price-mode'].value = 'manual';
    if (resolved) render();
  });
  if (shareButton) shareButton.addEventListener('click', async function () {
    var input = {}; Object.keys(fields).forEach(function (key) { if (fields[key]) input[key] = fields[key].value; });
    try {
      var url = location.origin + '/herramientas/coste-viaje/' + MiMotorShare.encode(input);
      shareOutput.hidden = false; shareOutput.value = url; shareOutput.select();
      if (navigator.clipboard) { try { await navigator.clipboard.writeText(url); } catch {} }
    } catch (error) { if (output.note) output.note.textContent = error.message; }
  });
  if (window.MiMotorShare) {
    try {
      var shared = MiMotorShare.decode(location.hash);
      if (shared) {
        sharedCalculation = true;
        if (fields['manual-consumption']) fields['manual-consumption'].value = '';
        Object.keys(shared).forEach(function (key) { if (fields[key]) fields[key].value = shared[key]; });
        if (remoteEnabled) remoteEnabled.checked = false;
        if (fields['price-mode']) fields['price-mode'].value = 'manual';
        resolved = { sources: 'Cálculo compartido: datos manuales. El enlace no incluye coche, origen ni destino.' }; render();
      }
    } catch { if (output.note) output.note.textContent = 'El enlace compartido no es válido.'; }
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); button.disabled = true; button.setAttribute('aria-busy', 'true');
    sharedCalculation = false;
    var profile = resolveFromFields(); var carText = vehicleText(profile);
    var key = JSON.stringify([carText, value('origin'), value('destination')]);
    try {
      var remote = null;
      var useApi = MiMotorTripApi.isConfigured() && (!remoteEnabled || remoteEnabled.checked);
      if (useApi && routeKey !== key) remote = await MiMotorTripApi.calculate({ vehicle: profile || carText, origin: value('origin'), destination: value('destination'), drivingMode: 'normal', advanced: {} });
      if (remote) {
        resolved = { distance: remote.route.distanceKm, duration: remote.route.durationMinutes, vehicle: remote.vehicle, fuelPrice: remote.fuel.averagePrice, sources: 'Fuentes: ruta ' + remote.route.provider + ', combustible MITECO, vehículo ' + (remote.vehicle.source === 'local-catalog' ? 'catálogo MiMotor' : 'identificación automática') + '.' };
        if (fields.distance) fields.distance.value = remote.route.distanceKm;
        if (fields.price && value('price-mode', 'automatico') === 'automatico') fields.price.value = String(remote.fuel.averagePrice).replace('.', ',');
        var normalized = vehicleApi.validate(remote.vehicle);
        if (normalized) { var custom = value('manual-consumption'); fillVehicle(normalized); if (fields['manual-consumption']) fields['manual-consumption'].value = custom; profile = normalized; }
        resolved.sources += ' Precio consultado: ' + (remote.fuel.updatedAt || 'fecha no disponible') + (remote.fuel.stale ? ' · dato antiguo de respaldo' : '') + '.';
        routeKey = JSON.stringify([vehicleText(profile), value('origin'), value('destination')]);
      } else if (!useApi || !resolved) resolved = { sources: 'Modo local: distancia y precio indicados por ti. Los valores iniciales son ejemplos.' };
      if (profile && root.querySelector('[data-remember-vehicle]')?.checked) vehicleApi.save(Object.assign({}, profile, { customConsumption: Number(String(value('manual-consumption')).replace(',', '.')) || null }));
      render();
    } catch (error) { clearResult(); resolved = null; routeKey = null; if (output.explanation) output.explanation.textContent = error.message || 'No se pudo completar el cálculo.'; if (output.note) output.note.textContent = 'No mostramos datos externos sin verificar.'; }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
    if (window.innerWidth < 980 && root.querySelector('.calc-results')) root.querySelector('.calc-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
