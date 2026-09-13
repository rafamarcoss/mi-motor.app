import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createSign } from 'node:crypto';
import { root } from './site-lib.mjs';
const day = new Date(); const iso = value => value.toISOString().slice(0, 10); const shift = days => new Date(day.getTime() - days * 86400000);
const base64url = value => Buffer.from(value).toString('base64url');
async function accessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000); const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({ iss: serviceAccount.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256'); signer.update(`${header}.${claim}`); signer.end(); const assertion = `${header}.${claim}.${signer.sign(serviceAccount.private_key, 'base64url')}`;
  const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) throw new Error(`OAuth GSC HTTP ${response.status}`); const body = await response.json(); if (!body.access_token) throw new Error('OAuth GSC no devolvió access_token'); return body.access_token;
}
async function query(startDate, endDate, token, site) { if (!token || !site) return null; const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 25000 }) }); if (!response.ok) throw new Error(`GSC HTTP ${response.status}`); return (await response.json()).rows || []; }
const current = { startDate: iso(shift(28)), endDate: iso(shift(1)) }; const previous = { startDate: iso(shift(56)), endDate: iso(shift(29)) };
const site = process.env.GSC_SITE_URL; let serviceAccount = null; if (process.env.GSC_SERVICE_ACCOUNT_JSON) try { serviceAccount = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON); } catch { throw new Error('GSC_SERVICE_ACCOUNT_JSON no es JSON válido'); }
const token = serviceAccount?.client_email && serviceAccount?.private_key ? await accessToken(serviceAccount) : null;
const [nowRows, beforeRows] = await Promise.all([query(current.startDate, current.endDate, token, site), query(previous.startDate, previous.endDate, token, site)]);
const report = { generatedAt: new Date().toISOString(), configured: Boolean(nowRows), current, previous, currentRows: nowRows, previousRows: beforeRows, note: nowRows ? 'Datos obtenidos de Search Console API.' : 'Bloqueado: define GSC_SERVICE_ACCOUNT_JSON y GSC_SITE_URL. No se inventan métricas.' };
await mkdir(join(root, 'reports'), { recursive: true }); await writeFile(join(root, 'reports', 'gsc-baseline.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ configured: report.configured, current: nowRows?.length || 0, previous: beforeRows?.length || 0 }));
