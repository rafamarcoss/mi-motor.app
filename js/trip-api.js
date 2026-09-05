(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(globalThis);
  } else {
    root.MiMotorTripApi = factory(root);
  }
})(typeof self !== 'undefined' ? self : this, function (runtime) {
  'use strict';

  function isConfigured() {
    return typeof runtime.MIMOTOR_API_URL === 'string' && runtime.MIMOTOR_API_URL.trim().length > 0;
  }

  async function calculate(payload, options) {
    var endpoint = options && options.endpoint ? options.endpoint : runtime.MIMOTOR_API_URL;
    if (typeof endpoint !== 'string' || endpoint.trim().length === 0) return null;
    var fetchImpl = options && options.fetchImpl ? options.fetchImpl : runtime.fetch;
    var response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });
    } catch (error) {
      throw new ApiError('NETWORK_ERROR', 'No se pudo conectar con el backend de MiMotor.', 0, error);
    }

    var body;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', 'El backend devolvió una respuesta no válida.', response.status);
    }
    if (!response.ok || body.error) {
      var apiError = body.error || {};
      throw new ApiError(apiError.code || 'API_ERROR', apiError.message || 'No se pudo completar el cálculo.', response.status);
    }
    return body;
  }

  function ApiError(code, message, status, cause) {
    this.name = 'MiMotorApiError';
    this.code = code;
    this.message = message;
    this.status = status;
    this.cause = cause;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  return { isConfigured: isConfigured, calculate: calculate, ApiError: ApiError };
});
