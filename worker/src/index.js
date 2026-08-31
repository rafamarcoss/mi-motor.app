import { calculateConsumption, calculateCost } from './consumption.js';
import { DeepSeekProvider, UnavailableAIProvider } from './ai.js';
import { createStore, MemoryStore } from './store.js';
import { AiRateLimiter } from './rate-limit.js';
import { validateTripPayload } from './validation.js';
import { validateVehicle, resolveKnownVehicle, vehicleId } from './vehicle.js';
import { MitecoFuelPriceProvider } from './fuel.js';
import { OpenRouteServiceProvider, UnavailableRoutingProvider, routeCacheKey } from './routing.js';

const CACHE_TTL = Object.freeze({ route: 3600, fuel: 1800, vehicle: 30 * 24 * 3600 });

export default {
  async fetch(request, env, executionContext) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!isAllowedOrigin(request, env)) return json({ error: { code: 'CORS_FORBIDDEN', message: 'Origen no permitido.' } }, 403, cors);
    if (new URL(request.url).pathname === '/health') return json({ ok: true, service: 'mimotor-api' }, 200, cors);
    if (new URL(request.url).pathname !== '/api/trip') return json({ error: { code: 'NOT_FOUND', message: 'Endpoint no encontrado.' } }, 404, cors);
    if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST.' } }, 405, cors);

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 20_000) return json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'La petición es demasiado grande.' } }, 413, cors);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: { code: 'INVALID_JSON', message: 'El cuerpo no es JSON válido.' } }, 400, cors);
    }

    try {
      const result = await buildTrip(payload, {
        env,
        request,
        executionContext,
        store: createStore(env),
        persistentStore: Boolean(env.MIMOTOR_KV),
        providers: createProviders(env)
      });
      return json(result, 200, cors);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      const code = error.code || 'TRIP_ERROR';
      const message = status >= 500 && !error.code ? 'No se pudo completar el cálculo.' : error.message;
      return json({ error: { code, message } }, status, cors);
    }
  }
};

export async function buildTrip(payload, { env = {}, request = new Request('https://mi-motor.app/api/trip'), store = new MemoryStore(), persistentStore = true, providers = createProviders(env) } = {}) {
  const validation = validateTripPayload(payload);
  if (!validation.ok) throw new ApiError('INVALID_INPUT', validation.error, 422);
  const input = validation.value;

  const vehicleResult = await resolveVehicle(input.vehicle, { env, request, store, persistentStore, providers });
  const route = await getOrFetch(store, routeCacheKey(input.origin, input.destination), CACHE_TTL.route, () => providers.routing.route(input.origin, input.destination));
  const fuel = await getFuel(store, `fuel:${vehicleResult.fuel}:${input.origin.toLowerCase()}`, providers.fuel, vehicleResult.fuel === 'gasoline' ? 'gasoline' : 'diesel', input.origin);
  if (!fuel || !Number.isFinite(fuel.averagePrice) || fuel.averagePrice <= 0) {
    throw new ApiError('FUEL_UNAVAILABLE', 'No hay un precio medio verificable para esa zona.', 502);
  }

  const consumption = calculateConsumption({
    referenceConsumption: vehicleResult.referenceConsumption,
    drivingMode: input.drivingMode,
    advanced: input.advanced
  });
  const cost = calculateCost({ distanceKm: route.distanceKm, consumption, fuelPrice: fuel.averagePrice });
  const rateLimiter = new AiRateLimiter({ store, secret: env.RATE_LIMIT_SECRET });

  return {
    route,
    vehicle: vehicleResult,
    consumption,
    fuel,
    cost,
    usage: { remainingAiCalculations: await rateLimiter.remaining(request) }
  };
}

async function resolveVehicle(input, { env, request, store, persistentStore, providers }) {
  const known = resolveKnownVehicle(input);
  if (known) {
    await store.put(`vehicle:${known.vehicleId}`, known, CACHE_TTL.vehicle);
    return known;
  }

  const inputKey = `vehicle-input:${input.toLowerCase().replace(/\s+/g, '-')}`;
  const cached = await store.get(inputKey);
  if (cached) return cached;
  if (!env.DEEPSEEK_API_KEY) throw new ApiError('VEHICLE_NEEDS_PRECISION', 'No se pudo identificar la motorización sin una fuente configurada.', 422);
  if (!persistentStore) throw new ApiError('AI_RATE_LIMIT_NOT_CONFIGURED', 'El límite IA necesita un namespace KV persistente.', 503);

  const rateLimiter = new AiRateLimiter({ store, secret: env.RATE_LIMIT_SECRET });
  const quota = await rateLimiter.consume(request);
  if (!quota.configured) throw new ApiError('AI_RATE_LIMIT_NOT_CONFIGURED', 'El límite IA no está configurado en el backend.', 503);
  if (!quota.allowed) throw new ApiError('AI_RATE_LIMITED', 'Has alcanzado los 3 cálculos IA de las últimas 24 horas.', 429);

  const resolved = validateVehicle(await providers.ai.normalizeVehicle(input));
  if (!resolved || (resolved.confidence !== undefined && Number(resolved.confidence) < 0.55)) {
    throw new ApiError('VEHICLE_AMBIGUOUS', 'Necesitamos precisar año y motorización para estimar el consumo.', 422);
  }
  const result = { ...resolved, source: resolved.source || 'deepseek', cached: false };
  await store.put(inputKey, result, CACHE_TTL.vehicle);
  await store.put(`vehicle:${vehicleId(result)}`, result, CACHE_TTL.vehicle);
  return result;
}

function createProviders(env) {
  return {
    routing: env.OPENROUTESERVICE_API_KEY
      ? new OpenRouteServiceProvider({ apiKey: env.OPENROUTESERVICE_API_KEY })
      : new UnavailableRoutingProvider(),
    fuel: new MitecoFuelPriceProvider(),
    ai: env.DEEPSEEK_API_KEY
      ? new DeepSeekProvider({ apiKey: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL || 'deepseek-chat' })
      : new UnavailableAIProvider()
  };
}

async function getOrFetch(store, key, ttl, fetcher) {
  const cached = await store.get(key);
  if (cached) return cached;
  const value = await fetcher();
  await store.put(key, value, ttl);
  return value;
}

async function getFuel(store, key, provider, fuel, zone) {
  const cached = await store.get(key);
  if (cached) return { ...cached, cached: true };
  try {
    const value = await provider.average(zone, fuel);
    await store.put(key, value, CACHE_TTL.fuel);
    await store.put(`${key}:stale`, value, 7 * 24 * 3600);
    return value;
  } catch (error) {
    const stale = await store.get(`${key}:stale`);
    if (stale) return { ...stale, cached: true, fallback: true, stale: true };
    throw error;
  }
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  return !origin || origin === (env.ALLOWED_ORIGIN || 'https://mi-motor.app');
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || 'https://mi-motor.app';
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
  if (!origin || origin === allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
