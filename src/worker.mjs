import { initialState, previewImport, transition, gates, safeExport, DomainError, canonical, validateJsonBounds } from './domain.mjs';
import { SAMPLE_ROWS, FIXTURE_SETS, POLICY } from './fixtures.mjs';
import { runDomainEvaluation } from './evaluation.mjs';

export const LIMITS = Object.freeze({ bodyBytes: 65536, sessionTtlMs: 6 * 60 * 60 * 1000, requestsPerSession: 1000, requestsPerMinute: 120, evaluationPerSession: 10, sessionCreationsPerMinute: 10 });
const HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'X-Frame-Options': 'DENY',
};
function json(value, status = 200, extra = {}) { return new Response(JSON.stringify(value), { status, headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } }); }
function errorResponse(error) {
  const code = error instanceof DomainError ? error.code : 'INTERNAL_ERROR';
  const status = { INTERNAL_ERROR: 500, STALE_REVISION: 409, STALE_PREVIEW: 409, IDEMPOTENCY_CONFLICT: 409, GATE_BLOCKED: 409, INVALID_TRANSITION: 409, ROLLBACK_REQUIRED: 409, POST_REVIEW_REQUIRED: 409, UNAUTHORIZED: 401, SESSION_EXPIRED: 410, FORBIDDEN_ORIGIN: 403, DEPLOYMENT_NOT_CONFIGURED: 503, RATE_LIMIT_UNAVAILABLE: 503, RATE_LIMITED: 429, SESSION_CAPACITY: 429, BODY_TOO_LARGE: 413, NOT_FOUND: 404, METHOD_NOT_ALLOWED: 405 }[code] || 400;
  return json({ error: { code, message: error instanceof DomainError ? error.message : 'The bounded workspace request could not be completed.', details: error instanceof DomainError ? error.details : {} } }, status);
}
function raise(code, message, details = {}) { throw new DomainError(code, message, details); }
function local(url, env) { return env.LOCAL_DEV === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); }
function policy(request, env) {
  const url = new URL(request.url);
  let origin;
  try { origin = new URL(env.APP_ORIGIN).origin; } catch { raise('DEPLOYMENT_NOT_CONFIGURED', 'The approved application origin is not configured.'); }
  if (env.APP_ORIGIN !== origin || url.origin !== origin || (!local(url, env) && url.protocol !== 'https:')) raise('FORBIDDEN_ORIGIN', 'Request destination does not match the configured application origin.');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.headers.get('Origin') !== origin) raise('FORBIDDEN_ORIGIN', 'A mutation or session creation requires the exact same Origin.');
    const site = request.headers.get('Sec-Fetch-Site');
    if (site && site !== 'same-origin' && site !== 'none') raise('FORBIDDEN_ORIGIN', 'Cross-site workspace requests are refused.');
  } else {
    const supplied = request.headers.get('Origin');
    if (supplied && supplied !== origin) raise('FORBIDDEN_ORIGIN', 'Cross-origin workspace reads are refused.');
    const site = request.headers.get('Sec-Fetch-Site');
    if (site && !['same-origin', 'none'].includes(site)) raise('FORBIDDEN_ORIGIN', 'Cross-site workspace reads are refused.');
  }
  if (!local(url, env) && (env.RATE_LIMIT_ENFORCED !== 'true' || typeof env.SESSION_LIMITER?.limit !== 'function' || typeof env.REQUEST_LIMITER?.limit !== 'function')) raise('RATE_LIMIT_UNAVAILABLE', 'Public session creation rate protection is not provisioned. The API fails closed.');
  return url;
}
async function boundedJson(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) raise('INVALID_SCHEMA', 'Only application/json requests are accepted.');
  const announced = request.headers.get('Content-Length');
  if (announced && (!/^\d+$/.test(announced) || Number(announced) > LIMITS.bodyBytes)) raise('BODY_TOO_LARGE', 'Request exceeds the 64 KiB JSON bound.');
  const reader = request.body?.getReader();
  if (!reader) raise('INVALID_SCHEMA', 'JSON request body is required.');
  const chunks = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.byteLength;
    if (total > LIMITS.bodyBytes) { await reader.cancel(); raise('BODY_TOO_LARGE', 'Request exceeds the 64 KiB JSON bound.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { raise('INVALID_SCHEMA', 'Request must contain valid UTF-8 JSON.'); }
  validateJsonBounds(parsed); return parsed;
}
async function sha256(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join(''); }
function token() { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function cookieName(url) { return url.protocol === 'https:' ? '__Host-feedback_session' : 'feedback_session_local'; }
function readToken(request, url) {
  const name = cookieName(url), items = (request.headers.get('Cookie') || '').split(';').map(part => part.trim());
  const matches = items.filter(item => item.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1); return /^[a-zA-Z0-9_-]{43}$/.test(value) ? value : null;
}
// Local-development metadata only; no visitor state is shared. Public deployments never use this fallback.
const localCreations = new Map();
const localRequests = new Map();
async function requestLimit(request, env, url) {
  const key = await sha256(`feedback-api:${request.headers.get('CF-Connecting-IP') || 'local-or-unavailable'}`);
  if (typeof env.REQUEST_LIMITER?.limit === 'function') {
    const result = await env.REQUEST_LIMITER.limit({ key }); if (!result.success) raise('RATE_LIMITED', 'Workspace request rate limit reached.'); return;
  }
  if (!local(url, env)) raise('RATE_LIMIT_UNAVAILABLE', 'Public request rate protection is missing.');
  const minute = Math.floor(Date.now() / 60000), prior = localRequests.get(key), entry = prior?.minute === minute ? prior : { minute, count: 0 };
  if (entry.count >= LIMITS.requestsPerMinute) raise('RATE_LIMITED', 'Local workspace request rate limit reached.');
  if (localRequests.size >= 100) localRequests.clear(); entry.count++; localRequests.set(key, entry);
}
async function creationLimit(request, env, url) {
  const key = await sha256(`feedback-release-proof:${request.headers.get('CF-Connecting-IP') || 'local-or-unavailable'}`);
  if (typeof env.SESSION_LIMITER?.limit === 'function') {
    const result = await env.SESSION_LIMITER.limit({ key }); if (!result.success) raise('RATE_LIMITED', 'Synthetic session creation limit reached. Retry after a minute.'); return;
  }
  if (!local(url, env)) raise('RATE_LIMIT_UNAVAILABLE', 'Public session creation rate protection is missing.');
  const minute = Math.floor(Date.now() / 60000), prior = localCreations.get(key), entry = prior?.minute === minute ? prior : { minute, count: 0 };
  if (entry.count >= LIMITS.sessionCreationsPerMinute) raise('RATE_LIMITED', 'Local synthetic session creation limit reached.');
  if (localCreations.size >= 100) localCreations.clear(); entry.count++; localCreations.set(key, entry);
}
function strictKeys(value, required) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== required.length || required.some(key => !Object.prototype.hasOwnProperty.call(value, key))) raise('INVALID_SCHEMA', 'JSON object has missing or unrecognised fields.');
}

export default {
  async fetch(request, env) {
    try {
      const rawUrl = new URL(request.url);
      if (!rawUrl.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method)) raise('METHOD_NOT_ALLOWED', 'Static resources are read-only.');
        const asset = await env.ASSETS.fetch(request);
        const headers = new Headers(asset.headers); for (const [name, value] of Object.entries(HEADERS)) headers.set(name, value);
        return new Response(asset.body, { status: asset.status, headers });
      }
      const url = policy(request, env);
      await requestLimit(request, env, url);
      if (url.search) raise('INVALID_SCHEMA', 'API query parameters are not supported.');
      const routes = { '/api/session': 'POST', '/api/state': 'GET', '/api/fixtures': 'GET', '/api/preview': 'POST', '/api/command': 'POST', '/api/export': 'GET', '/api/eval': 'POST' };
      if (!routes[url.pathname]) raise('NOT_FOUND', 'Unknown workspace API route.');
      if (routes[url.pathname] !== request.method) raise('METHOD_NOT_ALLOWED', 'Unsupported method for this workspace route.');
      if (!env.SESSIONS) raise('DEPLOYMENT_NOT_CONFIGURED', 'Visitor-isolated persistence is not provisioned.');
      if (url.pathname === '/api/session') {
        await creationLimit(request, env, url); const body = await boundedJson(request); strictKeys(body, []);
        const opaqueToken = token(), id = env.SESSIONS.idFromName(await sha256(opaqueToken)), object = env.SESSIONS.get(id);
        const response = await object.fetch('https://visitor.internal/create', { method: 'POST', body: '{}' });
        if (!response.ok) return response;
        const headers = new Headers(response.headers);
        headers.set('Set-Cookie', `${cookieName(url)}=${opaqueToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${LIMITS.sessionTtlMs / 1000}${url.protocol === 'https:' ? '; Secure' : ''}`);
        return new Response(response.body, { status: response.status, headers });
      }
      const opaqueToken = readToken(request, url); if (!opaqueToken) raise('UNAUTHORIZED', 'Create a synthetic visitor workspace to continue.');
      const id = env.SESSIONS.idFromName(await sha256(opaqueToken)), object = env.SESSIONS.get(id);
      return await object.fetch(new Request(`https://visitor.internal${url.pathname}`, { method: request.method, headers: request.headers, ...(request.method === 'POST' ? { body: request.body } : {}) }));
    } catch (error) { return errorResponse(error); }
  },
};

/** One SQLite Durable Object per hashed opaque visitor token. No global product state. */
export class VisitorSession {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK (id=1), state TEXT NOT NULL, meta TEXT NOT NULL)');
  }
  read() { return this.sql.exec('SELECT state, meta FROM session WHERE id=1').toArray()[0]; }
  write(state, meta) { this.sql.exec('INSERT INTO session(id,state,meta) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,meta=excluded.meta', JSON.stringify(state), JSON.stringify(meta)); }
  response(state, meta, extra = {}) { return json({ state: this.publicState(state), gates: gates(state), expiresAt: new Date(meta.expiresAt).toISOString(), ...extra }); }
  publicState(state) { const result = JSON.parse(JSON.stringify(state)); delete result.receipts; return result; }
  async fetch(request) {
    try {
      const path = new URL(request.url).pathname, now = Date.now();
      if (path === '/create') {
        const created = this.ctx.storage.transactionSync(() => {
          if (this.read()) raise('INVALID_TRANSITION', 'Session already exists.');
          const state = initialState(), meta = { createdAt: now, expiresAt: now + LIMITS.sessionTtlMs, requests: 0, minute: Math.floor(now / 60000), minuteRequests: 0, evaluations: 0, preview: null };
          this.write(state, meta); return { state, meta };
        });
        await this.ctx.storage.setAlarm(created.meta.expiresAt);
        return this.response(created.state, created.meta);
      }
      // Request accounting commits before parsing or workflow validation, including refusals.
      this.ctx.storage.transactionSync(() => {
        const row = this.read(); if (!row) raise('UNAUTHORIZED', 'Synthetic visitor session does not exist.');
        const state = JSON.parse(row.state), meta = JSON.parse(row.meta);
        if (now >= meta.expiresAt) raise('SESSION_EXPIRED', 'Synthetic visitor workspace expired. Create a fresh session.');
        const minute = Math.floor(now / 60000); if (minute !== meta.minute) { meta.minute = minute; meta.minuteRequests = 0; }
        if (meta.requests >= LIMITS.requestsPerSession || meta.minuteRequests >= LIMITS.requestsPerMinute) raise('RATE_LIMITED', 'Bounded visitor request limit reached.');
        meta.requests++; meta.minuteRequests++; this.write(state, meta);
      });
      const body = request.method === 'POST' ? await boundedJson(request) : undefined;
      let evaluated;
      const outcome = this.ctx.storage.transactionSync(() => {
        const row = this.read(); if (!row) raise('UNAUTHORIZED', 'Synthetic visitor session does not exist.');
        let state = JSON.parse(row.state), meta = JSON.parse(row.meta);
        if (now >= meta.expiresAt) raise('SESSION_EXPIRED', 'Synthetic visitor workspace expired. Create a fresh session.');
        let result;
        switch (path) {
          case '/api/state': this.write(state, meta); return { state, meta };
          case '/api/fixtures': this.write(state, meta); return { json: { SAMPLE_ROWS, FIXTURE_SETS, POLICY, extractionMode: 'recorded-simulation' } };
          case '/api/preview': {
            strictKeys(body, ['rows']); const preview = previewImport(body.rows, state);
            // Store complete preview content, never only a short preview digest.
            meta.preview = preview.canCommit ? { rows: canonical(body.rows), revision: state.revision, previewId: preview.previewId } : null;
            this.write(state, meta); return { json: { preview } };
          }
          case '/api/command': {
            strictKeys(body, ['type', 'payload', 'expectedRevision', 'idempotencyKey']);
            if (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 0 || typeof body.idempotencyKey !== 'string') raise('INVALID_SCHEMA', 'Commands require expectedRevision and idempotencyKey.');
            if (body.type === 'importRows' && !state.receipts.some(receipt => receipt.key === body.idempotencyKey)) {
              const preview = meta.preview;
              if (!preview || preview.revision !== state.revision || preview.previewId !== body.payload?.previewId || preview.rows !== canonical(body.payload?.rows)) raise('STALE_PREVIEW', 'Preview this exact batch at the current revision before committing it.');
            }
            const updated = transition(state, body); state = updated.state; result = updated.result; meta.preview = null;
            this.write(state, meta); return { state, meta, result };
          }
          case '/api/export': this.write(state, meta); return { json: safeExport(state), export: true };
          case '/api/eval': {
            strictKeys(body, []);
            if (meta.evaluations >= LIMITS.evaluationPerSession) raise('RATE_LIMITED', 'Bounded evaluation run limit reached.');
            meta.evaluations++; this.write(state, meta); evaluated = true; return { evaluation: true };
          }
          default: raise('NOT_FOUND', 'Unknown internal workspace route.');
        }
      });
      if (evaluated) return json(runDomainEvaluation());
      if (outcome.json) return json(outcome.json, 200, outcome.export ? { 'Content-Disposition': 'attachment; filename="synthetic-release-proof.json"' } : {});
      return this.response(outcome.state, outcome.meta, outcome.result ? { result: outcome.result } : {});
    } catch (error) { return errorResponse(error); }
  }
  async alarm() { this.sql.exec('DELETE FROM session'); }
}
