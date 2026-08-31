import { normaliseText } from './validation.js';

const ORS_URL = 'https://api.heigit.org';

export class UnavailableRoutingProvider {
  async route() {
    throw new ProviderError('ROUTING_NOT_CONFIGURED', 'El routing todavía no está configurado en el backend.', 503);
  }
}

export class MockRoutingProvider {
  constructor(route = { distanceKm: 245, durationMinutes: 155 }) {
    this.routeResult = route;
  }

  async route(origin, destination) {
    return { origin, destination, ...this.routeResult, provider: 'mock' };
  }
}

export class OpenRouteServiceProvider {
  constructor({ apiKey, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async route(origin, destination) {
    if (!this.apiKey) throw new ProviderError('ROUTING_NOT_CONFIGURED', 'Falta OPENROUTESERVICE_API_KEY.', 503);
    const [start, end] = await Promise.all([this.geocode(origin), this.geocode(destination)]);
    const response = await this.request(`${ORS_URL}/openrouteservice/v2/directions/driving-car/json`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ coordinates: [start, end], instructions: false })
    });
    const summary = response?.routes?.[0]?.summary;
    if (!summary || !Number.isFinite(summary.distance)) {
      throw new ProviderError('ROUTING_INVALID_RESPONSE', 'El proveedor de routing no devolvió una ruta válida.', 502);
    }
    return {
      origin,
      destination,
      distanceKm: round(summary.distance / 1000, 1),
      durationMinutes: Math.round(summary.duration / 60),
      provider: 'openrouteservice'
    };
  }

  async geocode(query) {
    const url = `${ORS_URL}/pelias/v1/search?text=${encodeURIComponent(query)}&size=1&boundary.country=ES`;
    const response = await this.request(url, { headers: { Authorization: this.apiKey, Accept: 'application/json' } });
    const coordinates = response?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new ProviderError('GEOCODING_NOT_FOUND', `No se encontró "${query}" en España.`, 422);
    }
    return coordinates;
  }

  async request(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new ProviderError('ROUTING_PROVIDER_ERROR', `Routing respondió HTTP ${response.status}.`, 502);
      return await response.json();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error.name === 'AbortError') throw new ProviderError('ROUTING_TIMEOUT', 'El proveedor de routing tardó demasiado.', 504);
      throw new ProviderError('ROUTING_NETWORK_ERROR', 'No se pudo consultar el proveedor de routing.', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class ProviderError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function routeCacheKey(origin, destination) {
  return `route:${normaliseText(origin)}:${normaliseText(destination)}`;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
