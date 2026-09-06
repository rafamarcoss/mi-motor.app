(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MiMotorShare = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var numbers = { distance: [0.1, 30000], consumption: [0.1, 40], 'manual-consumption': [0, 40], price: [0.01, 20], passengers: [1, 9], tolls: [0, 100000], parking: [0, 100000], other: [0, 100000] };
  var choices = { fuel: ['diesel', 'gasoline', 'hybrid', 'lpg'], driving: ['tranquilo', 'normal', 'dinamico'], type: ['ida', 'vuelta'], 'route-type': ['ciudad', 'mixto', 'carretera'], ac: ['apagado', 'normal', 'intenso'], luggage: ['ligero', 'normal', 'cargado'], speed: ['100', '110', '120', '130'], season: ['invierno', 'templado', 'verano'], tires: ['correcta', 'baja'] };
  function clean(input) {
    var out = {};
    Object.keys(numbers).forEach(function (key) {
      if (input[key] === undefined || input[key] === '') return;
      var n = Number(String(input[key]).replace(',', '.'));
      if (!Number.isFinite(n) || n < numbers[key][0] || n > numbers[key][1] || (key === 'passengers' && !Number.isInteger(n))) throw new Error('Dato compartido inválido');
      out[key] = String(n);
    });
    Object.keys(choices).forEach(function (key) { if (input[key] !== undefined) { if (!choices[key].includes(input[key])) throw new Error('Opción compartida inválida'); out[key] = input[key]; } });
    if (!out.distance || !out.consumption || !out.price) throw new Error('Faltan datos del cálculo');
    return out;
  }
  function encode(input) { return '#calculo=' + encodeURIComponent(JSON.stringify(clean(input))); }
  function decode(hash) { if (!hash.startsWith('#calculo=')) return null; if (hash.length > 3000) throw new Error('Enlace demasiado largo'); return clean(JSON.parse(decodeURIComponent(hash.slice(9)))); }
  return { encode: encode, decode: decode };
});
