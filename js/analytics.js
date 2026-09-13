(function (root) {
  'use strict';
  var storageKey = 'mimotor_attribution_v1';
  function source() {
    try {
      var saved = sessionStorage.getItem(storageKey);
      if (saved) return saved;
      var params = new URLSearchParams(location.search);
      var value = params.get('utm_source') || document.referrer || 'direct';
      sessionStorage.setItem(storageKey, value.slice(0, 120));
      return value.slice(0, 120);
    } catch { return 'unknown'; }
  }
  function event(name, extra) {
    var payload = Object.assign({ event: name, attribution_source: source() }, extra || {});
    root.dataLayer = root.dataLayer || [];
    root.dataLayer.push(payload);
    if (typeof root.gtag === 'function') root.gtag('event', name, payload);
  }
  root.MiMotorAnalytics = { event: event, source: source };
})(window);
