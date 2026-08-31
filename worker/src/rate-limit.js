const WINDOW_SECONDS = 24 * 60 * 60;
const MAX_CALLS = 3;

export class AiRateLimiter {
  constructor({ store, secret, now = () => Date.now() } = {}) {
    this.store = store;
    this.secret = secret;
    this.now = now;
  }

  async remaining(request) {
    const key = await this.keyFor(request);
    if (!key) return null;
    const record = await this.store.get(key);
    if (!record || record.resetAt <= this.now()) return MAX_CALLS;
    return Math.max(0, MAX_CALLS - record.count);
  }

  async consume(request) {
    const key = await this.keyFor(request);
    if (!key) return { allowed: false, remaining: null, configured: false };
    const now = this.now();
    const current = await this.store.get(key);
    const record = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_SECONDS * 1000 }
      : current;
    if (record.count >= MAX_CALLS) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt, configured: true };
    }
    record.count += 1;
    await this.store.put(key, record, WINDOW_SECONDS);
    return { allowed: true, remaining: MAX_CALLS - record.count, resetAt: record.resetAt, configured: true };
  }

  async keyFor(request) {
    if (!this.secret || !this.store) return null;
    const forwarded = request?.headers?.get('CF-Connecting-IP') || request?.headers?.get('X-Forwarded-For');
    const ip = (forwarded || 'anonymous').split(',')[0].trim();
    const bytes = new TextEncoder().encode(ip);
    const secretBytes = new TextEncoder().encode(this.secret);
    const cryptoKey = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', cryptoKey, bytes);
    return `rate:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
}

export const RATE_LIMIT = Object.freeze({ maxCalls: MAX_CALLS, windowSeconds: WINDOW_SECONDS });
