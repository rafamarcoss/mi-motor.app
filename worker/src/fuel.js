import { normaliseText } from './validation.js';

export const MITECO_URL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
export const FUEL_FIELDS = Object.freeze({
  diesel: 'Precio Gasoleo A',
  gasoline: 'Precio Gasolina 95 E5'
});

export function parseFuelPrice(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function fuelStatistics(values) {
  const prices = values.map(parseFuelPrice).filter((price) => price !== null).sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return {
    samples: prices.length,
    min: round(prices[0], 3),
    max: round(prices[prices.length - 1], 3),
    mean: round(prices.reduce((sum, price) => sum + price, 0) / prices.length, 3),
    median: round(median, 3)
  };
}

export class MockFuelPriceProvider {
  constructor(price = 1.5) {
    this.price = price;
  }

  async average(zone, fuel) {
    return {
      type: fuel,
      averagePrice: this.price,
      area: zone,
      areaType: 'mock',
      sampleSize: 1,
      source: 'mock',
      updatedAt: null,
      fallback: true
    };
  }
}

export class MitecoFuelPriceProvider {
  constructor({ fetchImpl = fetch, cacheApi = globalThis.caches, timeoutMs = 12000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.cacheApi = cacheApi;
    this.timeoutMs = timeoutMs;
  }

  async average(zone, fuel) {
    const field = FUEL_FIELDS[fuel];
    if (!field) throw new ProviderError('FUEL_TYPE_UNSUPPORTED', 'Combustible no soportado.', 422);
    const dataset = await this.dataset();
    const rows = Array.isArray(dataset?.ListaEESSPrecio) ? dataset.ListaEESSPrecio : [];
    const target = normaliseText(zone);
    const municipalityMatches = rows.filter((row) => normaliseText(row.Municipio) === target);
    const municipalityRows = municipalityMatches.filter((row) => parseFuelPrice(row[field]) !== null);
    const province = municipalityMatches[0]?.Provincia || zone;
    const provinceRows = this.rowsFor(rows, 'Provincia', normaliseText(province), field);
    const selected = municipalityRows.length >= 3 ? municipalityRows : provinceRows;
    if (selected.length === 0) {
      throw new ProviderError('FUEL_ZONE_NOT_FOUND', `No hay precios disponibles para "${zone}".`, 422);
    }
    const statistics = fuelStatistics(selected.map((row) => row[field]));
    if (!statistics) throw new ProviderError('FUEL_PRICE_NOT_FOUND', 'La fuente no tiene un precio válido para esa zona.', 502);
    return {
      type: fuel,
      averagePrice: statistics.mean,
      area: selected[0][municipalityRows.length >= 3 ? 'Municipio' : 'Provincia'],
      areaType: municipalityRows.length >= 3 ? 'municipality' : 'province',
      sampleSize: statistics.samples,
      statistics,
      source: MITECO_URL,
      updatedAt: dataset.Fecha || null,
      fallback: false
    };
  }

  rowsFor(rows, field, target, priceField) {
    return rows.filter((row) => normaliseText(row[field]) === target && parseFuelPrice(row[priceField]) !== null);
  }

  async dataset() {
    const request = new Request(MITECO_URL, { method: 'GET' });
    if (this.cacheApi?.default) {
      const cached = await this.cacheApi.default.match(request);
      if (cached) return cached.json();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(MITECO_URL, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new ProviderError('FUEL_PROVIDER_ERROR', `La fuente de carburantes respondió HTTP ${response.status}.`, 502);
      const body = await response.json();
      if (this.cacheApi?.default) {
        await this.cacheApi.default.put(request, new Response(JSON.stringify(body), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' }
        }));
      }
      return body;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error.name === 'AbortError') throw new ProviderError('FUEL_TIMEOUT', 'La fuente de carburantes tardó demasiado.', 504);
      throw new ProviderError('FUEL_NETWORK_ERROR', 'No se pudo consultar la fuente de carburantes.', 502);
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

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
