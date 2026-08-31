import { normaliseText } from './validation.js';

export const MITECO_URL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

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
    const dataset = await this.dataset();
    const rows = Array.isArray(dataset?.ListaEESSPrecio) ? dataset.ListaEESSPrecio : [];
    const field = fuel === 'gasoline' ? 'Precio Gasolina 95 E5' : 'Precio Gasoleo A';
    const target = normaliseText(zone);
    const municipalityRows = this.rowsFor(rows, 'Municipio', target, field);
    const provinceRows = this.rowsFor(rows, 'Provincia', target, field);
    const selected = municipalityRows.length >= 3 ? municipalityRows : provinceRows;
    if (selected.length === 0) {
      throw new ProviderError('FUEL_ZONE_NOT_FOUND', `No hay precios disponibles para "${zone}".`, 422);
    }
    const prices = selected.map((row) => Number(String(row[field]).replace(',', '.'))).filter((price) => Number.isFinite(price) && price > 0);
    if (prices.length === 0) throw new ProviderError('FUEL_PRICE_NOT_FOUND', 'La fuente no tiene un precio válido para esa zona.', 502);
    return {
      type: fuel,
      averagePrice: round(prices.reduce((sum, price) => sum + price, 0) / prices.length, 3),
      area: selected[0][municipalityRows.length >= 3 ? 'Municipio' : 'Provincia'],
      areaType: municipalityRows.length >= 3 ? 'municipality' : 'province',
      sampleSize: prices.length,
      source: MITECO_URL,
      updatedAt: dataset.Fecha || null,
      fallback: false
    };
  }

  rowsFor(rows, field, target, priceField) {
    return rows.filter((row) => normaliseText(row[field]) === target && row[priceField]);
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
