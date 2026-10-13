import { SIMULATION_TIME, POLICY, RECORDED_EXTRACTIONS } from './fixtures.mjs';
export { SIMULATION_TIME, POLICY };
export class DomainError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'DomainError'; this.code = code; this.details = details; }
}
const clone = value => JSON.parse(JSON.stringify(value));
export function validateJsonBounds(value) {
  const queue = [{ value, depth: 0 }]; let nodes = 0;
  while (queue.length) {
    const item = queue.pop(); if (++nodes > 2000 || item.depth > 12) throw new DomainError('INVALID_SCHEMA', 'JSON nesting or field count exceeds the bounded schema.');
    if (typeof item.value === 'string' && item.value.length > 4096) throw new DomainError('INVALID_SCHEMA', 'JSON text field exceeds the bounded schema.');
    if (item.value && typeof item.value === 'object') for (const child of Object.values(item.value)) queue.push({ value: child, depth: item.depth + 1 });
  }
}
const fail = (code, message, details) => { throw new DomainError(code, message, details); };
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
function object(value, allowed, required = allowed, label = 'object') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('INVALID_SCHEMA', `${label} must be a plain object.`);
  if (Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !own(value, key))) fail('INVALID_SCHEMA', `${label} has missing or unrecognised fields.`);
  return value;
}
const sensitive = /\b(patient|patients|dob|date of birth|nhs|diagnos(?:is|es|ed)|medical history|medication|passport|national insurance)\b|\b\d{3}[- ]?\d{3}[- ]?\d{4}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const injection = /ignore\s+(?:all\s+|the\s+)?(?:previous|prior|system)\s+instructions|(?:system|assistant)\s*:|bypass\s+(?:the\s+)?(?:gate|rules|review)|reveal\s+(?:the\s+)?(?:secret|prompt)|<\/?(?:script|iframe)|javascript:|\b(?:override|disregard)\s+(?:the\s+)?(?:policy|instructions|rules)/i;
function str(value, label, max = 1000, required = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail('INVALID_SCHEMA', `${label} must be bounded plain text.`);
  if (required && !value.trim()) fail('INVALID_SCHEMA', `${label} is required.`);
  if (sensitive.test(value)) fail('SENSITIVE_DATA', 'Patient-shaped or identifying sensitive data is forbidden. Use the synthetic fixture.');
  if (injection.test(value)) fail('INJECTED_INSTRUCTIONS', 'Embedded instructions are not evidence and are refused.');
  return value.trim();
}
function num(value, label, min = 0, max = 10000, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail('INVALID_SCHEMA', `${label} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`);
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
// Stable identity for previews only; content-bound receipts retain the complete canonical command.
function digest(value) { let h = 2166136261; for (const c of canonical(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
function stamp(revision) { return new Date(Date.parse(SIMULATION_TIME) + revision * 60000).toISOString(); }
export function initialState() {
  return {
    schemaVersion: 1, revision: 0, simulationTime: SIMULATION_TIME,
    project: { name: 'Feedback → Release Proof', credit: 'Ayo Ahmed - Independent concept', context: 'Independent concept for Semble', disclaimer: 'Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.' },
    features: [{ id: 'reminder', title: 'Simpler reminder setup', owner: 'Synthetic Product owner', hypothesis: 'A clearer setup flow will reduce administrative effort for synthetic teams.', metric: 'Successful reminder setup rate', denominator: 'All attempted reminder setups in the synthetic beta cohort', target: 'At least 90% completion; at most 1% operational errors', observationWindow: 'Seven full synthetic days after cohort enrolment', contentVersion: 1, priority: null }],
    opportunities: [], sources: [], evidence: [], ambiguous: [],
    rejections: [ { sourceId: 'syn-recorded-injection', code: 'INJECTED_INSTRUCTIONS', reason: 'Recorded refusal: embedded instructions are not evidence.', recorded: true }, { sourceId: 'syn-recorded-sensitive', code: 'SENSITIVE_DATA', reason: 'Recorded refusal: patient-shaped sensitive data is forbidden.', recorded: true }, { sourceId: 'syn-recorded-hallucination', code: 'UNSUPPORTED_ASSERTION', reason: 'Recorded refusal: an assertion was absent from the extraction fixture.', recorded: true } ],
    beta: { version: 0, sampleSize: 0, completionCount: 0, errorCount: 0, observedDays: 0, completionRate: 0, errorRate: 0, observations: '', riskNotes: '', adverseEvents: [], adverseEscalation: '', approval: null },
    release: { version: 1, status: 'draft', security: null, privacy: null, rollback: null, gtm: null, signoff: null, health: null, rollbackAction: null },
    postReview: null, weeklyReview: null, outbox: [],
    audit: [{ revision: 0, at: SIMULATION_TIME, type: 'simulation-initialized', outcome: 'Synthetic workspace created; recorded refusals contain metadata only.' }], receipts: [],
  };
}
function feature(state, id = 'reminder') { const found = state.features.find(f => f.id === id); if (!found) fail('UNKNOWN_FEATURE', 'Feature does not exist.'); return found; }
function validateRow(row) {
  object(row, ['sourceId', 'kind', 'synthetic', 'text', 'extraction'], undefined, 'row');
  const sourceId = str(row.sourceId, 'sourceId', 64, true);
  if (!/^syn-[a-z0-9-]+$/.test(sourceId)) fail('INVALID_SCHEMA', 'sourceId must use a syn- synthetic identifier.');
  if (!['support', 'interview', 'sales', 'usage'].includes(row.kind) || row.synthetic !== true) fail('INVALID_SCHEMA', 'Only labelled synthetic support, interview, sales or usage records are allowed.');
  str(row.text, 'text', 2000, true);
  object(row.extraction, ['theme', 'featureId', 'quote', 'start', 'end', 'assertion', 'confidence'], undefined, 'extraction');
  const x = row.extraction;
  if (!['workflow', 'reliability', 'accessibility', 'adoption'].includes(x.theme)) fail('UNKNOWN_TAXONOMY', 'Extraction theme is outside the fixed taxonomy.');
  if (x.featureId !== 'reminder') fail('UNKNOWN_FEATURE', 'Extraction references a nonexistent feature.');
  str(x.quote, 'quote', 500, true); str(x.assertion, 'assertion', 100, true);
  num(x.start, 'start', 0, 2000, true); num(x.end, 'end', 0, 2000, true); num(x.confidence, 'confidence', 0, 1);
  if (x.end <= x.start || row.text.slice(x.start, x.end) !== x.quote) fail('QUOTE_MISMATCH', 'Quote span must match source text exactly.');
  const response = RECORDED_EXTRACTIONS.find(f => f.text === row.text && f.quote === x.quote && f.theme === x.theme && f.assertion === x.assertion);
  if (!response || response.kind !== row.kind || response.confidence !== x.confidence) fail('UNSUPPORTED_ASSERTION', 'Extraction fields must match a recorded synthetic response, including kind and confidence.');
  return clone(row);
}
export function previewImport(rows, state = initialState()) {
  validateJsonBounds(rows);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > POLICY.maxImportRows) fail('INVALID_SCHEMA', `Import must contain 1–${POLICY.maxImportRows} synthetic JSON rows.`);
  if (canonical(rows).length > 48000) fail('BODY_TOO_LARGE', 'Import exceeds the bounded JSON limit.');
  const accepted = [], evidence = [], ambiguous = [], rejected = [], duplicates = [];
  const seen = new Map(state.sources.map(s => [s.sourceId, canonical(s)]));
  const provenance = new Map(state.sources.map(s => [s.text, s.sourceId]));
  rows.forEach((raw, index) => {
    try {
      const row = validateRow(raw), fingerprint = canonical(row);
      if (seen.has(row.sourceId)) {
        if (seen.get(row.sourceId) !== fingerprint) fail('SOURCE_CONFLICT', 'The same source identity has different content.');
        duplicates.push({ index, sourceId: row.sourceId, reason: 'Same source identity counts once.' }); return;
      }
      if (provenance.has(row.text)) { duplicates.push({ index, sourceId: row.sourceId, originalSourceId: provenance.get(row.text), reason: 'This recorded source provenance already exists; relabelling does not create independent evidence.' }); return; }
      seen.set(row.sourceId, fingerprint); provenance.set(row.text, row.sourceId); accepted.push(row);
      const item = { id: `evidence-${row.sourceId}`, sourceId: row.sourceId, provenanceKey: `recorded-source-${RECORDED_EXTRACTIONS.findIndex(f => f.text === row.text) + 1}`, featureId: row.extraction.featureId, kind: row.kind, theme: row.extraction.theme, quote: row.extraction.quote, start: row.extraction.start, end: row.extraction.end, assertion: row.extraction.assertion, confidence: row.extraction.confidence, extractionMode: 'recorded-simulation', synthetic: true };
      if (item.confidence < 0.7 || item.assertion === 'unclear-reminder-scope') ambiguous.push({ ...item, status: 'ambiguous', reason: 'Human clarification required; excluded from supporting evidence.' });
      else evidence.push({ ...item, status: 'supported' });
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      const sourceId = typeof raw?.sourceId === 'string' && /^syn-[a-z0-9-]{1,60}$/.test(raw.sourceId) ? raw.sourceId : `row-${index + 1}`;
      rejected.push({ index, sourceId, code: error.code, reason: error.message });
    }
  });
  if (state.sources.length + accepted.length > POLICY.maxSources) rejected.push({ index: null, sourceId: 'batch', code: 'STATE_LIMIT', reason: 'Session source capacity reached; start a new synthetic session.' });
  return { accepted, evidence, ambiguous, rejected, duplicates, canCommit: rejected.length === 0 && (accepted.length > 0 || duplicates.length > 0), previewId: `preview-${state.revision}-${digest(rows)}`, revision: state.revision, atomic: true };
}
const blocker = (code, label, owner, nextAction) => ({ code, label, owner: owner || 'Synthetic Product owner', nextAction });
function binding(state) {
  const f = feature(state), r = state.release;
  return { contentVersion: f.contentVersion, betaVersion: state.beta.version, releaseVersion: r.version, securityVersion: r.security?.version || 0, privacyVersion: r.privacy?.version || 0, rollbackVersion: r.rollback?.version || 0, gtmVersion: r.gtm?.version || 0 };
}
export function gates(state) {
  const f = feature(state), b = state.beta, r = state.release, beta = [];
  for (const [field, label] of [['owner', 'Owner'], ['hypothesis', 'Hypothesis'], ['metric', 'Success metric'], ['denominator', 'Metric denominator'], ['target', 'Success target'], ['observationWindow', 'Observation window']]) {
    if (!f[field]?.trim()) beta.push(blocker(`MISSING_${field.toUpperCase()}`, `${label} is missing.`, f.owner, `Record an explicit ${label.toLowerCase()} for this feature version.`));
  }
  const support = new Set(state.evidence.filter(e => e.featureId === f.id && e.status === 'supported').map(e => e.provenanceKey || e.sourceId)).size;
  if (support < POLICY.minIndependentSources) beta.push(blocker('INSUFFICIENT_EVIDENCE', `Only ${support} independent supporting sources; ${POLICY.minIndependentSources} required.`, f.owner, 'Import verified synthetic evidence from independent source identities.'));
  if (!f.priority || f.priority.contentVersion !== f.contentVersion) beta.push(blocker('HUMAN_PRIORITY_REQUIRED', 'Human priority decision is missing for this version.', f.owner, 'Review evidence and record an owner with priority rationale.'));
  if (b.sampleSize < POLICY.minSampleSize) beta.push(blocker('BETA_SAMPLE', `Beta sample is ${b.sampleSize}; at least ${POLICY.minSampleSize} required.`, f.owner, 'Record the synthetic sample size and observations.'));
  if (b.observedDays < POLICY.minObservedDays) beta.push(blocker('BETA_WINDOW', `${b.observedDays} full observation days; ${POLICY.minObservedDays} required.`, f.owner, 'Complete and record the full synthetic observation window.'));
  if (b.completionRate < POLICY.minCompletionRate) beta.push(blocker('BETA_COMPLETION', 'Completion is below the prototype 90% threshold.', f.owner, 'Inspect failure evidence and record a passing synthetic observation.'));
  if (b.errorRate > POLICY.maxErrorRate) beta.push(blocker('BETA_ERRORS', 'Operational errors exceed the prototype 1% threshold.', f.owner, 'Investigate errors and repeat the bounded synthetic beta.'));
  if (!b.observations.trim()) beta.push(blocker('BETA_OBSERVATIONS', 'Beta observations are missing.', f.owner, 'Record the measured outcome and limitations.'));
  if (!b.riskNotes.trim()) beta.push(blocker('BETA_RISK', 'Operational risk notes are missing.', f.owner, 'Record risks and owner actions even if no risks were observed.'));
  if (!b.adverseEscalation.trim()) beta.push(blocker('ADVERSE_ESCALATION', 'Adverse-event escalation ownership is missing.', f.owner, 'Name the pause/escalation owner and action.'));
  if (b.adverseEvents.length > 0) beta.push(blocker('ADVERSE_EVENTS', 'Adverse events require a human pause and resolution.', f.owner, 'Investigate and document resolution before replacing beta evidence.'));
  const release = [...beta];
  if (!b.approval || b.approval.contentVersion !== f.contentVersion || b.approval.betaVersion !== b.version) release.push(blocker('BETA_APPROVAL', 'Beta exit has no version-matched human approval.', f.owner, 'Review passing beta evidence and sign the simulated beta exit.'));
  for (const [kind, owner, action] of [['security', 'Synthetic Security reviewer', 'Record a scoped simulated security review.'], ['privacy', 'Synthetic Privacy reviewer', 'Record a scoped simulated privacy review.'], ['rollback', 'Synthetic Engineering owner', 'Record a rollback test with evidence.'], ['gtm', 'Synthetic GTM owner', 'Record audience, message and support handoff.']]) {
    if (!r[kind] || r[kind].contentVersion !== f.contentVersion) release.push(blocker(`MISSING_${kind.toUpperCase()}`, `Version-matched ${kind === 'gtm' ? 'GTM handoff' : kind + ' evidence'} is missing.`, owner, action));
  }
  if (r.rollback && r.rollback.successful !== true) release.push(blocker('ROLLBACK_FAILED', 'The simulated rollback rehearsal did not pass.', r.rollback.owner, 'Investigate the failed rehearsal and record successful rollback test evidence.'));
  if (!r.signoff || canonical(r.signoff.binding) !== canonical(binding(state))) release.push(blocker('RELEASE_SIGNATURE', 'Release decision has no current simulated human signature.', f.owner, 'Review all gate evidence and sign this exact release version.'));
  if (r.status === 'paused') release.push(blocker('ROLLOUT_PAUSED', 'The simulated rollout is paused.', r.rollbackAction?.owner, 'Resolve the owned rollback, then review the observed outcome.'));
  if (['released', 'rolled-back'].includes(r.status)) release.push(blocker(state.postReview ? 'NEW_SCOPE_REQUIRED' : 'ROLLOUT_REVIEW_REQUIRED', state.postReview ? 'This rollout outcome is reviewed; a new scoped version is required for another release.' : 'This rollout requires health and post-review before new release work.', f.owner, state.postReview ? 'Review baseline gaps and record a new scoped feature or beta decision.' : 'Record rollout health and complete the post-review.'));
  const post = [];
  if (!['released', 'rolled-back', 'paused'].includes(r.status)) post.push(blocker('NO_ROLLOUT_OUTCOME', 'No simulated release or rollback outcome is available.', f.owner, 'Resolve release gates, run the simulation and record its health.'));
  if (!r.health) post.push(blocker('HEALTH_REQUIRED', 'A rollout health observation is missing.', 'Synthetic Engineering owner', 'Record the synthetic health check result and owner.'));
  if (r.rollbackAction?.status === 'required') post.push(blocker('ROLLBACK_REQUIRED', 'Failed health check requires an owned rollback.', r.rollbackAction.owner, 'Record rollback resolution evidence.'));
  let nextPhase, nextView, nextAction, nextDecision;
  const guide = (phase, view, action, owner, instruction) => { nextPhase = phase; nextView = view; nextAction = action; nextDecision = `${owner || f.owner || 'Synthetic Product owner'}: ${instruction}`; };
  if (r.status === 'paused') guide('rollback', 'health', 'resolveRollback', r.rollbackAction?.owner, 'Resolve the owned failed-health rollback and retain its verification evidence.');
  else if (r.status === 'released' && !r.health) guide('health', 'health', 'recordHealth', 'Synthetic Engineering owner', 'Record the simulated rollout health observation before reviewing its outcome.');
  else if (['released', 'rolled-back'].includes(r.status) && !state.postReview) guide('post-review', 'review', 'postReview', f.owner, 'Record the observed outcome, denominator, window and baseline gaps in the post-review.');
  else if (['released', 'rolled-back'].includes(r.status) && state.postReview) guide('outcome-review', 'review', 'weeklyReview', f.owner, 'Review the observed outcome and baseline gaps, then record a new scoped feature or beta decision.');
  else if (beta.length) {
    const first = beta[0];
    const action = first.code === 'INSUFFICIENT_EVIDENCE' ? 'importRows' : first.code === 'HUMAN_PRIORITY_REQUIRED' ? 'prioritize' : first.code.startsWith('MISSING_') ? 'updateFeature' : 'recordBeta';
    guide(action === 'importRows' || action === 'prioritize' ? 'feedback' : 'beta', action === 'importRows' || action === 'prioritize' ? 'feedback' : 'release', action, first.owner, first.nextAction);
  } else if (!b.approval || b.approval.contentVersion !== f.contentVersion || b.approval.betaVersion !== b.version) guide('beta-approval', 'release', 'approveBeta', f.owner, 'Review the passing evidence and sign the simulated beta exit for this exact version.');
  else {
    const missing = release.find(item => item.code !== 'RELEASE_SIGNATURE');
    if (missing) guide('release-evidence', 'release', missing.code === 'MISSING_GTM' ? 'recordGtm' : ['MISSING_ROLLBACK', 'ROLLBACK_FAILED'].includes(missing.code) ? 'recordRollback' : 'recordReview', missing.owner, missing.nextAction);
    else if (release.length) guide('release-signature', 'release', 'signRelease', f.owner, 'Review all scoped gate evidence and sign this exact release version.');
    else guide('release', 'release', 'simulateRelease', f.owner, 'Current signed version is ready for a simulated rollout; record its health afterward.');
  }
  return { beta: { ready: beta.length === 0, blockers: beta }, release: { ready: release.length === 0, blockers: release }, postReview: { ready: post.length === 0, blockers: post }, nextDecision, nextPhase, nextView, nextAction, policy: POLICY, synthetic: true };
}
function refreshOpportunities(state) {
  state.opportunities = state.features.map(f => {
    const evidence = state.evidence.filter(e => e.featureId === f.id), sourceCount = new Set(evidence.map(e => e.provenanceKey || e.sourceId)).size;
    return { id: `opp-${f.id}`, featureId: f.id, title: f.title, sourceCount, evidenceIds: evidence.map(e => e.id), ambiguityCount: state.ambiguous.filter(e => e.featureId === f.id).length, score: Math.min(100, sourceCount * 20), scoreExplanation: '20 points per independent supporting source, capped at 100; a human owns priority.', decision: f.priority ? 'human-prioritized' : 'needs-human-priority', synthetic: true };
  }).filter(o => o.sourceCount > 0 || o.ambiguityCount > 0);
}
function invalidateRelease(state, all = false) {
  const reviewedOutcome = Boolean(state.postReview);
  state.release.signoff = null; state.postReview = null;
  if (all) { for (const k of ['security', 'privacy', 'rollback', 'gtm']) state.release[k] = null; state.beta.approval = null; }
  state.release.version++;
  if (state.release.status !== 'paused' && (state.release.status !== 'rolled-back' || reviewedOutcome)) { state.release.status = 'draft'; state.release.health = null; state.release.rollbackAction = null; }
}
function currentSignature(state, owner, extra = {}) { return { owner: str(owner, 'owner', 120, true), contentVersion: feature(state).contentVersion, at: stamp(state.revision + 1), simulated: true, ...extra }; }
function requireGate(state, name, withoutSignature = false) {
  const check = gates(state)[name], blocked = withoutSignature ? check.blockers.filter(b => b.code !== 'RELEASE_SIGNATURE') : check.blockers;
  if (blocked.length) fail('GATE_BLOCKED', `${name === 'beta' ? 'Beta exit' : name === 'release' ? 'Release' : 'Post-review'} is blocked.`, { gate: name, blockers: blocked });
}
const PAYLOADS = {
  importRows: ['rows', 'previewId'], updateFeature: ['featureId', 'patch'], prioritize: ['featureId', 'owner', 'rationale'],
  recordBeta: ['sampleSize', 'observedDays', 'completionRate', 'errorRate', 'observations', 'riskNotes', 'adverseEvents', 'adverseEscalation'], approveBeta: ['owner'],
  recordReview: ['kind', 'owner', 'notes'], recordRollback: ['owner', 'testEvidence', 'successful'], recordGtm: ['owner', 'audience', 'message', 'supportPlan'], signRelease: ['owner', 'rationale'], simulateRelease: [], recordHealth: ['healthy', 'owner', 'note'], resolveRollback: ['owner', 'evidence'],
  postReview: ['owner', 'observedOutcome', 'baseline', 'measured', 'denominator', 'window', 'notes'], weeklyReview: ['owner', 'decision', 'nextAction', 'baseline', 'observed'], enqueueNotification: ['event', 'audience', 'message'], dispatchOutbox: [], reset: [],
};
export function transition(inputState, command) {
  validateJsonBounds(command);
  object(command, ['type', 'payload', 'expectedRevision', 'idempotencyKey'], ['type', 'payload'], 'command');
  if (!own(PAYLOADS, command.type)) fail('UNKNOWN_COMMAND', 'Command is outside the bounded workflow.');
  object(command.payload, PAYLOADS[command.type], undefined, 'payload');
  const original = canonical({ type: command.type, payload: command.payload, expectedRevision: command.expectedRevision ?? inputState.revision });
  const key = command.idempotencyKey;
  if (key !== undefined && (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))) fail('INVALID_SCHEMA', 'Idempotency key must contain 8–100 safe identifier characters.');
  const receipt = key && inputState.receipts.find(r => r.key === key);
  if (receipt) {
    if (receipt.command !== original) fail('IDEMPOTENCY_CONFLICT', 'This idempotency key is already bound to different command content.');
    return { state: clone(inputState), result: { ...clone(receipt.result), replay: true, originalRevision: receipt.revision } };
  }
  if (command.expectedRevision !== undefined && command.expectedRevision !== inputState.revision) fail('STALE_REVISION', 'This workspace changed. Reload before applying the command.', { expectedRevision: command.expectedRevision, actualRevision: inputState.revision });
  if (inputState.audit.length >= POLICY.maxAuditEntries || (key && inputState.receipts.length >= POLICY.maxReceipts)) fail('SESSION_CAPACITY', 'Bounded session capacity reached. Create a fresh synthetic session.');
  if (inputState.release.status === 'paused' && !['recordHealth', 'resolveRollback', 'weeklyReview', 'enqueueNotification', 'dispatchOutbox'].includes(command.type)) fail('ROLLBACK_REQUIRED', 'Resolve the owned failed-health rollback before changing release evidence.');
  if (['released', 'rolled-back'].includes(inputState.release.status) && !inputState.postReview && !['recordHealth', 'postReview', 'weeklyReview', 'enqueueNotification', 'dispatchOutbox'].includes(command.type)) fail('POST_REVIEW_REQUIRED', 'Record rollout health and complete post-review before changing release evidence.');
  let state = clone(inputState), result = { status: 'recorded', type: command.type };
  const p = command.payload, f = feature(state), b = state.beta, r = state.release;
  switch (command.type) {
    case 'importRows': {
      const preview = previewImport(p.rows, state);
      if (typeof p.previewId !== 'string' || p.previewId !== preview.previewId) fail('STALE_PREVIEW', 'Import preview does not match this batch and revision. Re-preview first.');
      if (!preview.canCommit) fail('IMPORT_REJECTED', 'Entire batch refused. Fix every rejected row before commit; no rows were written.', { preview });
      state.sources.push(...preview.accepted); state.evidence.push(...preview.evidence); state.ambiguous.push(...preview.ambiguous);
      refreshOpportunities(state); result = { status: 'committed', accepted: preview.accepted.length, ambiguous: preview.ambiguous.length, duplicates: preview.duplicates.length, rejected: 0, atomic: true }; break;
    }
    case 'updateFeature': {
      const selected = feature(state, p.featureId);
      object(p.patch, ['title', 'owner', 'hypothesis', 'metric', 'denominator', 'target', 'observationWindow'], [], 'patch');
      if (!Object.keys(p.patch).length) fail('INVALID_SCHEMA', 'Feature patch is empty.');
      for (const [field, value] of Object.entries(p.patch)) selected[field] = str(value, field, 1000);
      selected.contentVersion++; selected.priority = null;
      if (state.release.status === 'rolled-back') { state.release.status = 'draft'; state.release.health = null; state.release.rollbackAction = null; }
      invalidateRelease(state, true); refreshOpportunities(state);
      result = { status: 'updated', contentVersion: selected.contentVersion, invalidated: ['human priority', 'beta approval', 'security', 'privacy', 'rollback', 'GTM', 'release signature'] }; break;
    }
    case 'prioritize': {
      const selected = feature(state, p.featureId);
      const evidenceIds = state.evidence.filter(e => e.featureId === selected.id).map(e => e.id);
      if (!evidenceIds.length) fail('NO_EVIDENCE', 'A human priority decision requires supporting source evidence.');
      selected.priority = currentSignature(state, p.owner, { rationale: str(p.rationale, 'rationale', 1000, true), evidenceIds }); refreshOpportunities(state); state.release.signoff = null; break;
    }
    case 'recordBeta': {
      if (!Array.isArray(p.adverseEvents) || p.adverseEvents.length > 10) fail('INVALID_SCHEMA', 'adverseEvents must be a bounded array of plain summaries.');
      const evidence = { sampleSize: num(p.sampleSize, 'sampleSize', 0, 10000, true), observedDays: num(p.observedDays, 'observedDays', 0, 365, true), completionRate: num(p.completionRate, 'completionRate', 0, 1), errorRate: num(p.errorRate, 'errorRate', 0, 1), observations: str(p.observations, 'observations', 1000), riskNotes: str(p.riskNotes, 'riskNotes', 1000), adverseEvents: p.adverseEvents.map(a => str(a, 'adverse summary', 300, true)), adverseEscalation: str(p.adverseEscalation, 'adverseEscalation', 1000) };
      const completionCount = evidence.sampleSize * evidence.completionRate, errorCount = evidence.sampleSize * evidence.errorRate;
      if (Math.abs(completionCount - Math.round(completionCount)) > 1e-8 || Math.abs(errorCount - Math.round(errorCount)) > 1e-8) fail('INCONSISTENT_METRICS', 'Beta rates must represent whole completion and error counts within the declared sample.');
      state.beta = { ...evidence, completionCount: Math.round(completionCount), errorCount: Math.round(errorCount), version: b.version + 1, approval: null }; invalidateRelease(state); break;
    }
    case 'approveBeta': requireGate(state, 'beta'); b.approval = currentSignature(state, p.owner, { betaVersion: b.version }); r.signoff = null; break;
    case 'recordReview': {
      if (!['security', 'privacy'].includes(p.kind)) fail('INVALID_SCHEMA', 'Review kind must be security or privacy.');
      r[p.kind] = currentSignature(state, p.owner, { version: (r[p.kind]?.version || 0) + 1, notes: str(p.notes, 'notes', 2000, true), scope: 'Synthetic operational prototype only; this is not certification.' }); r.signoff = null; break;
    }
    case 'recordRollback': if (typeof p.successful !== 'boolean') fail('INVALID_SCHEMA', 'Rollback rehearsal successful must be boolean.'); r.rollback = currentSignature(state, p.owner, { version: (r.rollback?.version || 0) + 1, testEvidence: str(p.testEvidence, 'testEvidence', 2000, true), successful: p.successful }); r.signoff = null; break;
    case 'recordGtm': r.gtm = currentSignature(state, p.owner, { version: (r.gtm?.version || 0) + 1, audience: str(p.audience, 'audience', 300, true), message: str(p.message, 'message', 1000, true), supportPlan: str(p.supportPlan, 'supportPlan', 1000, true) }); r.signoff = null; break;
    case 'signRelease': if (['released', 'rolled-back'].includes(r.status)) fail('INVALID_TRANSITION', 'Record a new scoped feature or beta version before signing another release.'); requireGate(state, 'release', true); r.signoff = currentSignature(state, p.owner, { rationale: str(p.rationale, 'rationale', 1000, true), binding: binding(state) }); r.status = 'ready'; break;
    case 'simulateRelease': requireGate(state, 'release'); if (r.status !== 'ready') fail('INVALID_TRANSITION', 'Sign a ready release before simulating rollout.'); r.status = 'released'; r.health = null; result = { status: 'simulated-release', deployment: 'none', contentVersion: f.contentVersion }; break;
    case 'recordHealth': {
      if (r.status !== 'released' && r.status !== 'paused') fail('INVALID_TRANSITION', 'A health result requires a simulated rollout.');
      if (typeof p.healthy !== 'boolean') fail('INVALID_SCHEMA', 'healthy must be boolean.');
      const owner = str(p.owner, 'owner', 120, true), note = str(p.note, 'note', 1000, true);
      if (r.status === 'paused' && p.healthy) fail('ROLLBACK_REQUIRED', 'A later healthy check cannot clear an owned failed-health rollback.');
      r.health = { healthy: p.healthy, owner, note, at: stamp(state.revision + 1), simulated: true };
      if (!p.healthy) { r.status = 'paused'; r.signoff = null; r.rollbackAction = { status: 'required', owner, nextAction: 'Pause simulated rollout and record tested rollback resolution.', evidence: null }; result = { status: 'paused', owner, nextAction: r.rollbackAction.nextAction, deployment: 'none' }; } break;
    }
    case 'resolveRollback': {
      if (r.status !== 'paused' || r.rollbackAction?.status !== 'required') fail('INVALID_TRANSITION', 'No owned rollback is pending.');
      r.rollbackAction = { status: 'resolved', owner: str(p.owner, 'owner', 120, true), nextAction: 'Complete post-review before considering a new scoped release.', evidence: str(p.evidence, 'evidence', 2000, true), at: stamp(state.revision + 1) }; r.status = 'rolled-back'; result = { status: 'simulated-rollback', deployment: 'none' }; break;
    }
    case 'postReview': {
      requireGate(state, 'postReview');
      const measuredCount = num(p.measured, 'measured'), denominatorCount = num(p.denominator, 'denominator', 1, 10000, true);
      if (measuredCount > denominatorCount) fail('INCONSISTENT_METRICS', 'Measured outcome count cannot exceed its denominator.');
      state.postReview = { owner: str(p.owner, 'owner', 120, true), observedOutcome: str(p.observedOutcome, 'observedOutcome', 1000, true), baseline: p.baseline === null ? null : num(p.baseline, 'baseline'), measured: num(p.measured, 'measured'), denominator: num(p.denominator, 'denominator', 1, 10000, true), window: str(p.window, 'window', 300, true), notes: str(p.notes, 'notes', 1000, true), contentVersion: f.contentVersion, at: stamp(state.revision + 1), impact: p.baseline === null ? 'Baseline missing: no impact improvement claim can be made.' : 'Synthetic observed outcome; causality and production impact are unproven.', synthetic: true }; break;
    }
    case 'weeklyReview': state.weeklyReview = { owner: str(p.owner, 'owner', 120, true), decision: str(p.decision, 'decision', 1000, true), nextAction: str(p.nextAction, 'nextAction', 1000, true), baseline: p.baseline === null ? null : num(p.baseline, 'baseline'), observed: num(p.observed, 'observed'), supportingSources: new Set(state.evidence.map(e => e.provenanceKey || e.sourceId)).size, baselineStatus: p.baseline === null ? 'missing' : 'recorded', at: stamp(state.revision + 1), synthetic: true }; break;
    case 'enqueueNotification': {
      if (!['beta-approved', 'release-ready', 'rollback', 'weekly-review'].includes(p.event) || !['internal-synthetic', 'synthetic-opt-out'].includes(p.audience)) fail('INVALID_SCHEMA', 'Only the fixed synthetic outbox events and audiences are allowed.');
      const message = str(p.message, 'message', 1000, true), dedupeKey = canonical([p.event, p.audience, f.contentVersion, b.version]);
      const existing = state.outbox.find(item => item.dedupeKey === dedupeKey);
      if (existing) { result = { status: 'deduplicated', id: existing.id }; break; }
      if (state.outbox.length >= POLICY.maxOutbox) fail('OUTBOX_CAPACITY', 'Synthetic outbox capacity reached.');
      const suppressed = p.audience === 'synthetic-opt-out';
      const item = { id: `outbox-${state.revision + 1}`, event: p.event, audience: p.audience, message, dedupeKey, contentVersion: f.contentVersion, betaVersion: b.version, status: suppressed ? 'suppressed' : 'queued', reason: suppressed ? 'Synthetic audience opted out.' : 'Awaiting simulated dispatch.', createdAt: stamp(state.revision + 1), delivery: 'simulation-only' };
      state.outbox.push(item); result = { status: item.status, id: item.id }; break;
    }
    case 'dispatchOutbox': {
      let dispatched = state.outbox.filter(item => item.status === 'sent-simulated').length, sent = 0, rateLimited = 0;
      for (const item of state.outbox.filter(item => ['queued', 'rate-limited'].includes(item.status))) {
        if (dispatched >= POLICY.maxDispatchPerWindow) { item.status = 'rate-limited'; item.reason = 'Synthetic fixed-window dispatch limit reached.'; rateLimited++; }
        else { item.status = 'sent-simulated'; item.reason = 'No notification was sent; delivery is simulated.'; item.dispatchedAt = stamp(state.revision + 1); dispatched++; sent++; }
      }
      result = { status: 'simulated', sent, rateLimited, externalMessages: 0 }; break;
    }
    case 'reset': state = initialState(); state.audit = clone(inputState.audit); state.receipts = clone(inputState.receipts); result = { status: 'reset', capacityReset: false }; break;
  }
  state.revision = inputState.revision + 1;
  const actor = typeof p.owner === 'string' && p.owner.length <= 120 ? p.owner : f.owner;
  state.audit.push({ revision: state.revision, at: stamp(state.revision), type: command.type, owner: actor, outcome: result.status, contentVersion: feature(state).contentVersion });
  if (key) state.receipts.push({ key, command: original, revision: state.revision, result: { ...clone(result), revision: state.revision } });
  if (canonical(state).length > 400000) fail('STATE_LIMIT', 'Synthetic session state size limit reached.');
  return { state, result: { ...result, revision: state.revision } };
}
export function safeExport(state) {
  const snapshot = clone(state); delete snapshot.receipts;
  return { format: 'feedback-release-proof-synthetic-v1', exportedAt: stamp(state.revision), attribution: state.project, snapshot, gates: gates(state), consistency: { revision: state.revision, auditEntries: state.audit.length, lastAuditRevision: state.audit.at(-1)?.revision ?? null, consistent: state.audit.at(-1)?.revision === state.revision }, privacy: { data: 'synthetic-only', credentialsIncluded: false, sessionIdentifiersIncluded: false, externalNotificationsSent: 0 } };
}
