import { initialState, previewImport, transition, gates, safeExport, SIMULATION_TIME } from './domain.mjs';
import { SAMPLE_ROWS, FIXTURE_SETS } from './fixtures.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const clock = () => globalThis.performance?.now?.() ?? Date.now();
const serial = value => typeof value === 'string' ? value : JSON.stringify(value);

function executeCase(id, title, category, scenario, injectedFault = null) {
  const start = clock();
  const checks = [];
  const check = (label, expected, actual) => {
    checks.push({ label, expected: serial(expected), actual: serial(actual), passed: serial(expected) === serial(actual) });
  };
  try { scenario(check); } catch (error) {
    check('Scenario completes without unexpected exception', 'completed', `${error.code || error.name}: ${error.message}`);
  }
  return {
    id, title, category, status: checks.every(c => c.passed) ? 'passed' : 'failed',
    expected: checks.map(c => `${c.label}: ${c.expected}`).join('; '),
    actual: checks.map(c => `${c.label}: ${c.actual}`).join('; '),
    assertionCount: checks.length, assertions: checks,
    durationMs: Math.round((clock() - start) * 1000) / 1000,
    ...(injectedFault ? { injectedFault } : {}),
  };
}

function summarize(cases) {
  return {
    scenarioCount: cases.length,
    assertionCount: cases.reduce((sum, c) => sum + c.assertionCount, 0),
    passed: cases.filter(c => c.status === 'passed').length,
    failed: cases.filter(c => c.status === 'failed').length,
    durationMs: Math.round(cases.reduce((sum, c) => sum + c.durationMs, 0) * 1000) / 1000,
    cases,
  };
}

function session() {
  let state = initialState();
  let counter = 0;
  return {
    get state() { return state; },
    command(type, payload = {}, overrides = {}) {
      const command = { type, payload, expectedRevision: state.revision, idempotencyKey: `eval-case-${++counter}`, ...overrides };
      const response = transition(state, command);
      state = response.state;
      return response.result;
    },
    import(rows = SAMPLE_ROWS) {
      const preview = previewImport(rows, state);
      return this.command('importRows', { rows, previewId: preview.previewId });
    },
  };
}

function rejected(check, label, operation, expectedCode) {
  let actual = 'accepted';
  try { operation(); } catch (error) { actual = error.code || error.name; }
  check(label, expectedCode, actual);
}

const OWNER = 'Synthetic Product owner';
const BETA = { sampleSize: 100, observedDays: 7, completionRate: 0.94, errorRate: 0.01, observations: '94 of 100 synthetic setup attempts completed; one operational error observed.', riskNotes: 'Operational setup errors remain under review; synthetic scope only.', adverseEvents: [], adverseEscalation: 'Synthetic Engineering owner pauses rollout and reviews any adverse event.' };
const REVIEW = { owner: OWNER, observedOutcome: 'Synthetic completion observed after rollout.', baseline: null, measured: 94, denominator: 100, window: 'Seven synthetic days', notes: 'No baseline; no production improvement claim.' };
function betaSession(patch = {}) {
  const s = session(); s.import();
  s.command('prioritize', { featureId: 'reminder', owner: OWNER, rationale: 'Two independent synthetic sources support a bounded setup change.' });
  s.command('recordBeta', { ...clone(BETA), ...patch });
  return s;
}
function releaseSession(omit = []) {
  const s = betaSession(); s.command('approveBeta', { owner: OWNER });
  for (const kind of ['security', 'privacy']) if (!omit.includes(kind)) s.command('recordReview', { kind, owner: `Synthetic ${kind} reviewer`, notes: 'Scoped synthetic prototype review; no certification claimed.' });
  if (!omit.includes('rollback')) s.command('recordRollback', { owner: 'Synthetic Engineering owner', testEvidence: 'Synthetic rollback restored prior setup state in isolated rehearsal.', successful: true });
  if (!omit.includes('gtm')) s.command('recordGtm', { owner: 'Synthetic GTM owner', audience: 'Synthetic internal teams', message: 'Bounded reminder setup simulation ready for review.', supportPlan: 'Synthetic Support owner reviews setup issues and routes escalation.' });
  return s;
}
function launchedSession() {
  const s = releaseSession(); s.command('signRelease', { owner: OWNER, rationale: 'All current synthetic gate evidence has been reviewed.' }); s.command('simulateRelease'); return s;
}
function hasBlock(s, gate, code) { return gates(s.state)[gate].blockers.some(b => b.code === code); }

export function runDomainEvaluation() {
  const start = clock();
  const baseline = [];
  const injected = [];
  const add = (id, title, category, scenario) => baseline.push(executeCase(id, title, category, scenario));
  // Every case below executes the shared domain rules against a fresh isolated state.
  for (const [id, title, fixture, code] of [
    ['wrong-schema', 'Unknown row fields are rejected', 'malformed', 'INVALID_SCHEMA'],
    ['nonexistent-quote', 'A fabricated quote cannot become evidence', 'nonexistentQuote', 'QUOTE_MISMATCH'],
    ['embedded-instructions', 'Embedded source instructions are refused', 'injected', 'INJECTED_INSTRUCTIONS'],
    ['sensitive-patient-shaped', 'Patient-shaped input is refused', 'sensitive', 'SENSITIVE_DATA'],
    ['unknown-taxonomy', 'Unknown extraction taxonomy is refused', 'unknownTaxonomy', 'UNKNOWN_TAXONOMY'],
    ['unsupported-assertion', 'An invented extraction assertion is refused', 'hallucinated', 'UNSUPPORTED_ASSERTION'],
  ]) add(id, title, 'import safety', check => {
    const s = session(), rows = clone(FIXTURE_SETS[fixture]), before = serial(s.state), preview = previewImport(rows, s.state);
    check('Preview refusal', code, preview.rejected[0]?.code); check('Atomic commit permission', false, preview.canCommit);
    rejected(check, 'Commit refusal', () => s.import(rows), 'IMPORT_REJECTED'); check('State unchanged', true, before === serial(s.state));
  });
  add('partial-invalid-atomic', 'One invalid row refuses the entire mixed batch', 'transactionality', check => {
    const s = session(), rows = [clone(SAMPLE_ROWS[0]), ...clone(FIXTURE_SETS.malformed)], before = serial(s.state), preview = previewImport(rows, s.state);
    check('Valid rows remain visible in preview', 1, preview.accepted.length); check('Invalid rows remain visible in preview', 1, preview.rejected.length);
    rejected(check, 'Mixed commit refused', () => s.import(rows), 'IMPORT_REJECTED'); check('No partial state write', true, before === serial(s.state));
  });
  add('duplicate-source', 'Duplicate source identity counts once', 'evidence provenance', check => {
    const s = session(), result = s.import(FIXTURE_SETS.duplicate);
    check('Stored sources', 1, s.state.sources.length); check('Supporting evidence', 1, s.state.evidence.length); check('Duplicate count', 1, result.duplicates); check('Independent evidence gate blocked', true, hasBlock(s, 'beta', 'INSUFFICIENT_EVIDENCE'));
  });
  add('independent-sources', 'Different source identities count as independent evidence', 'evidence provenance', check => {
    const s = session(); s.import(FIXTURE_SETS.independent);
    check('Supporting source identities', 2, new Set(s.state.evidence.map(e => e.sourceId)).size); check('Independent evidence gate cleared', false, hasBlock(s, 'beta', 'INSUFFICIENT_EVIDENCE'));
  });
  add('relabelled-source-not-independent', 'Re-identifying identical source text cannot manufacture independent evidence', 'evidence provenance', check => {
    const s = session(), rows = [clone(SAMPLE_ROWS[0]), { ...clone(SAMPLE_ROWS[0]), sourceId: 'syn-relabeled-copy' }]; s.import(rows);
    check('Independent supporting content', 1, new Set(s.state.evidence.map(e => e.sourceId)).size); check('Evidence gate remains blocked', true, hasBlock(s, 'beta', 'INSUFFICIENT_EVIDENCE'));
  });
  for (const [id, title, altered] of [
    ['extraction-kind-tamper', 'Changing recorded source kind cannot relabel extraction provenance', { kind: 'sales' }],
    ['extraction-confidence-tamper', 'Changing recorded confidence cannot upgrade extraction certainty', { extraction: { ...clone(SAMPLE_ROWS[0].extraction), confidence: 0.99 } }],
  ]) add(id, title, 'evidence provenance', check => {
    const rows = [{ ...clone(SAMPLE_ROWS[0]), sourceId: `syn-${id}`, ...altered }], p = previewImport(rows);
    check('Tampered extraction cannot commit', false, p.canCommit); check('No tampered evidence accepted', 0, p.evidence.length); check('Tamper rejection is visible', 1, p.rejected.length);
  });
  add('source-conflict', 'Conflicting content cannot reuse a source identity', 'evidence provenance', check => {
    const rows = [clone(SAMPLE_ROWS[0]), { ...clone(SAMPLE_ROWS[1]), sourceId: SAMPLE_ROWS[0].sourceId }], p = previewImport(rows);
    check('Conflict refusal', 'SOURCE_CONFLICT', p.rejected[0]?.code); check('Batch cannot commit', false, p.canCommit);
  });
  add('ambiguous-source', 'Ambiguous evidence remains visible and cannot support beta exit', 'evidence provenance', check => {
    const s = session(); s.import(FIXTURE_SETS.ambiguous);
    check('Ambiguous rows preserved', 1, s.state.ambiguous.length); check('Supporting evidence excluded', 0, s.state.evidence.length); check('Evidence gate blocked', true, hasBlock(s, 'beta', 'INSUFFICIENT_EVIDENCE'));
  });
  add('import-row-bound', 'An oversized row batch is rejected before processing', 'bounds', check => rejected(check, 'Row limit refusal', () => previewImport(Array.from({ length: 21 }, () => clone(SAMPLE_ROWS[0]))), 'INVALID_SCHEMA'));
  add('stale-preview', 'A preview cannot commit against a later workspace revision', 'transactionality', check => {
    const s = session(), p = previewImport(SAMPLE_ROWS, s.state); s.command('weeklyReview', { owner: OWNER, decision: 'Review synthetic evidence', nextAction: 'Import bounded fixtures', baseline: null, observed: 0 });
    rejected(check, 'Old preview refusal', () => s.command('importRows', { rows: SAMPLE_ROWS, previewId: p.previewId }), 'STALE_PREVIEW'); check('No sources imported', 0, s.state.sources.length);
  });
  for (const [id, title, field, value, code] of [
    ['no-denominator', 'A missing metric denominator blocks beta approval', 'denominator', '', 'MISSING_DENOMINATOR'],
    ['no-owner', 'A feature without an owner blocks beta approval', 'owner', '', 'MISSING_OWNER'],
    ['no-observation-window', 'A missing observation window blocks beta approval', 'observationWindow', '', 'MISSING_OBSERVATIONWINDOW'],
  ]) add(id, title, 'beta gates', check => {
    const s = betaSession(); s.command('updateFeature', { featureId: 'reminder', patch: { [field]: value } });
    check('Specific gate blocker', true, hasBlock(s, 'beta', code)); rejected(check, 'Beta approval refusal', () => s.command('approveBeta', { owner: OWNER }), 'GATE_BLOCKED');
  });
  for (const [id, title, patch, code] of [
    ['insufficient-beta-sample', 'A sample below 30 blocks beta approval', { sampleSize: 29, completionRate: 1, errorRate: 0 }, 'BETA_SAMPLE'],
    ['incomplete-beta-window', 'Fewer than seven observed days blocks beta approval', { observedDays: 6 }, 'BETA_WINDOW'],
    ['low-beta-completion', 'Completion below the fixed target blocks beta approval', { completionRate: 0.89 }, 'BETA_COMPLETION'],
    ['high-beta-errors', 'Operational errors above the fixed target block beta approval', { errorRate: 0.02 }, 'BETA_ERRORS'],
    ['adverse-escalation', 'Missing escalation ownership blocks beta approval', { adverseEscalation: '' }, 'ADVERSE_ESCALATION'],
    ['adverse-event-pause', 'An adverse event blocks approval even with an escalation owner', { adverseEvents: ['Synthetic setup failure requires investigation.'] }, 'ADVERSE_EVENTS'],
  ]) add(id, title, 'beta gates', check => {
    const s = betaSession(patch); check('Specific gate blocker', true, hasBlock(s, 'beta', code)); rejected(check, 'Beta approval refusal', () => s.command('approveBeta', { owner: OWNER }), 'GATE_BLOCKED');
  });
  add('inconsistent-beta-counts', 'Rates that imply fractional observations are rejected', 'measurement honesty', check => {
    const s = session(); rejected(check, 'Fractional implied counts refused', () => s.command('recordBeta', { ...clone(BETA), sampleSize: 30, completionRate: 0.94, errorRate: 0.005 }), 'INCONSISTENT_METRICS'); check('Invalid beta evidence not stored', 0, s.state.beta.version);
  });
  for (const kind of ['security', 'privacy', 'rollback', 'gtm']) add(`missing-${kind}`, `Missing ${kind} evidence blocks release signing`, 'release gates', check => {
    const s = releaseSession([kind]); check('Specific gate blocker', true, hasBlock(s, 'release', `MISSING_${kind.toUpperCase()}`)); rejected(check, 'Release sign refusal', () => s.command('signRelease', { owner: OWNER, rationale: 'Attempt with missing review evidence.' }), 'GATE_BLOCKED');
  });
  add('failed-rollback-rehearsal', 'A recorded unsuccessful rollback rehearsal blocks release signing', 'release gates', check => {
    const s = releaseSession(['rollback']); s.command('recordRollback', { owner: 'Synthetic Engineering owner', testEvidence: 'Synthetic rehearsal failed to restore prior setup state.', successful: false });
    check('Failed rehearsal preserved', false, s.state.release.rollback.successful); check('Specific failure gate', true, hasBlock(s, 'release', 'ROLLBACK_FAILED')); rejected(check, 'Release refusal after failed rehearsal', () => s.command('signRelease', { owner: OWNER, rationale: 'Attempt with unsuccessful rollback rehearsal.' }), 'GATE_BLOCKED');
  });
  add('rollback-result-required', 'Rollback rehearsal requires an explicit successful result', 'release gates', check => {
    const s = session(); rejected(check, 'Missing rehearsal result refused', () => s.command('recordRollback', { owner: OWNER, testEvidence: 'Synthetic rehearsal evidence without a declared result.' }), 'INVALID_SCHEMA'); check('No inferred successful result', null, s.state.release.rollback);
  });
  add('stale-reviews-after-edit', 'A scope edit invalidates approvals and release reviews', 'version binding', check => {
    const s = releaseSession(); s.command('signRelease', { owner: OWNER, rationale: 'Reviewed exact current version.' }); s.command('updateFeature', { featureId: 'reminder', patch: { title: 'Revised synthetic setup scope' } });
    check('Beta approval cleared', null, s.state.beta.approval); check('Reviews and signature cleared', [null, null, null, null, null], ['security', 'privacy', 'rollback', 'gtm', 'signoff'].map(k => s.state.release[k])); rejected(check, 'Old approval cannot release edited scope', () => s.command('simulateRelease'), 'GATE_BLOCKED');
  });
  add('stale-beta-approval', 'New beta evidence invalidates beta and release signatures', 'version binding', check => {
    const s = releaseSession(); s.command('signRelease', { owner: OWNER, rationale: 'Reviewed exact current version.' }); s.command('recordBeta', clone(BETA));
    check('Beta approval cleared', null, s.state.beta.approval); check('Release signature cleared', null, s.state.release.signoff); rejected(check, 'Reapproval required', () => s.command('simulateRelease'), 'GATE_BLOCKED');
  });
  add('stale-mutation', 'A stale mutation fails without changing state', 'transactionality', check => {
    const s = betaSession(), before = serial(s.state); rejected(check, 'Stale revision refusal', () => s.command('approveBeta', { owner: OWNER }, { expectedRevision: s.state.revision - 1 }), 'STALE_REVISION'); check('State unchanged', true, before === serial(s.state));
  });
  add('approval-idempotency', 'Replaying identical approval returns its receipt without another audit write', 'idempotency', check => {
    const s = betaSession(), command = { type: 'approveBeta', payload: { owner: OWNER }, expectedRevision: s.state.revision, idempotencyKey: 'approval-eval-001' }, first = transition(s.state, command), second = transition(first.state, command);
    check('Replay receipt', true, second.result.replay); check('Revision unchanged', first.state.revision, second.state.revision); check('Audit count unchanged', first.state.audit.length, second.state.audit.length);
    rejected(check, 'Changed content cannot reuse key', () => transition(first.state, { ...command, payload: { owner: 'Synthetic second owner' } }), 'IDEMPOTENCY_CONFLICT');
  });
  add('duplicate-notification', 'Duplicate notification identity creates one outbox entry', 'outbox', check => {
    const s = session(), payload = { event: 'weekly-review', audience: 'internal-synthetic', message: 'Synthetic weekly review available.' }; s.command('enqueueNotification', payload); const result = s.command('enqueueNotification', payload);
    check('Duplicate status', 'deduplicated', result.status); check('Outbox entries', 1, s.state.outbox.length);
  });
  add('suppressed-notification', 'An opted-out audience remains suppressed during dispatch', 'outbox', check => {
    const s = session(); s.command('enqueueNotification', { event: 'weekly-review', audience: 'synthetic-opt-out', message: 'Synthetic suppressed message.' }); const result = s.command('dispatchOutbox');
    check('Suppression preserved', 'suppressed', s.state.outbox[0].status); check('Dispatch count', 0, result.sent); check('External messages', 0, result.externalMessages);
  });
  add('notification-rate-limit', 'The fourth distinct event is rate limited in the fixed window', 'outbox', check => {
    const s = session(); for (const event of ['beta-approved', 'release-ready', 'rollback', 'weekly-review']) s.command('enqueueNotification', { event, audience: 'internal-synthetic', message: 'Synthetic bounded notification.' }); const result = s.command('dispatchOutbox');
    check('Simulated sends', 3, result.sent); check('Rate limited entries', 1, result.rateLimited); check('External messages', 0, result.externalMessages); const repeat = s.command('dispatchOutbox'); check('Repeated dispatch cannot exceed window', 0, repeat.sent);
  });
  add('health-failure-rollback', 'Failed rollout health creates an owned rollback and blocks post-review', 'rollback', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: false, owner: 'Synthetic Engineering owner', note: 'Synthetic health threshold failed.' });
    check('Rollout paused', 'paused', s.state.release.status); check('Owned rollback required', 'required', s.state.release.rollbackAction.status); check('Post-review blocked', true, hasBlock(s, 'postReview', 'ROLLBACK_REQUIRED')); check('Paused next actions require recovery, not a new rollout', ['ROLLBACK_REQUIRED'], gates(s.state).postReview.blockers.map(b=>b.code));
    rejected(check, 'Later healthy check cannot bypass rollback', () => s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic later healthy observation.' }), 'ROLLBACK_REQUIRED');
    rejected(check, 'Post-review before resolution refused', () => s.command('postReview', REVIEW), 'ROLLBACK_REQUIRED'); s.command('resolveRollback', { owner: 'Synthetic Engineering owner', evidence: 'Synthetic rollback rehearsal restored prior version.' }); check('Rollback resolved', 'rolled-back', s.state.release.status); s.command('postReview', REVIEW); check('Post-review recorded after resolution', true, !!s.state.postReview);
  });
  add('post-review-denominator', 'A post-review denominator of zero cannot be recorded', 'measurement honesty', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health check passed.' }); rejected(check, 'Zero denominator refusal', () => s.command('postReview', { ...REVIEW, denominator: 0 }), 'INVALID_SCHEMA'); check('No invalid post-review stored', null, s.state.postReview);
  });
  add('post-review-numerator', 'Post-review completions cannot exceed attempted setups', 'measurement honesty', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health check passed.' }); rejected(check, 'Numerator above denominator refused', () => s.command('postReview', { ...REVIEW, measured: 101, denominator: 100 }), 'INCONSISTENT_METRICS'); check('No impossible post-review stored', null, s.state.postReview);
  });
  for (const [id, title, type, payload] of [
    ['paused-feature-edit', 'Editing feature scope cannot erase a failed-health rollback', 'updateFeature', { featureId: 'reminder', patch: { title: 'Revised scope during paused rollout' } }],
    ['paused-beta-edit', 'Replacing beta evidence cannot erase a failed-health rollback', 'recordBeta', clone(BETA)],
    ['paused-review-edit', 'Recording another review cannot erase a failed-health rollback', 'recordReview', { kind: 'security', owner: OWNER, notes: 'Additional scoped synthetic review.' }],
  ]) add(id, title, 'rollback obligation', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: false, owner: 'Synthetic Engineering owner', note: 'Synthetic failed health requires owned rollback.' });
    try { s.command(type, payload); } catch (error) { if (!error.code) throw error; }
    check('Rollback remains required', 'required', s.state.release.rollbackAction?.status ?? 'missing'); check('Rollout remains paused', 'paused', s.state.release.status); check('Post-review remains blocked', true, hasBlock(s, 'postReview', 'ROLLBACK_REQUIRED'));
  });
  add('rollback-postreview-obligation', 'A resolved rollback requires post-review before new scoped release work', 'rollback obligation', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: false, owner: 'Synthetic Engineering owner', note: 'Synthetic failed health.' }); s.command('resolveRollback', { owner: 'Synthetic Engineering owner', evidence: 'Synthetic prior state restored in rehearsal.' }); const before = s.state.revision;
    try { s.command('updateFeature', { featureId: 'reminder', patch: { title: 'New scope before rollback review' } }); } catch (error) { if (!error.code) throw error; }
    check('Scope edit cannot skip rollback review', before, s.state.revision); check('Rollback outcome preserved', 'rolled-back', s.state.release.status);
  });
  add('released-postreview-obligation', 'A released rollout cannot lose its outcome before post-review', 'rollback obligation', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health passed.' }); const before = s.state.revision;
    rejected(check, 'Beta replacement requires review first', () => s.command('recordBeta', clone(BETA)), 'POST_REVIEW_REQUIRED'); check('Revision unchanged', before, s.state.revision); check('Rollout outcome preserved', 'released', s.state.release.status); check('Health observation preserved', true, s.state.release.health.healthy);
  });
  add('reviewed-new-cycle', 'A reviewed outcome can start a newly scoped synthetic release cycle', 'happy path', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health passed.' }); s.command('postReview', REVIEW); const priorVersion = s.state.beta.version, priorAuditCount = s.state.audit.length; s.command('recordBeta', clone(BETA));
    check('New beta evidence version', priorVersion + 1, s.state.beta.version); check('Fresh release draft', 'draft', s.state.release.status); check('Historical review remains in audit', true, s.state.audit.some(entry => entry.type === 'postReview')); check('Exactly one new audit write', priorAuditCount + 1, s.state.audit.length);
  });
  add('happy-lifecycle', 'Verified evidence proceeds through beta, release, health and review', 'happy path', check => {
    const s = launchedSession(); check('Simulated rollout recorded', 'released', s.state.release.status); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health observation passed.' }); s.command('postReview', REVIEW); s.command('weeklyReview', { owner: OWNER, decision: 'Keep bounded scope and gather baseline', nextAction: 'Record a synthetic baseline before any impact claim', baseline: null, observed: 94 });
    check('Post-review retained', true, !!s.state.postReview); check('Missing baseline is explicit', 'missing', s.state.weeklyReview.baselineStatus); check('Impact claim withheld', true, s.state.postReview.impact.includes('no impact improvement claim')); check('No notification delivered externally', true, s.state.outbox.every(x => x.delivery === 'simulation-only'));
  });
  add('export-audit-consistency', 'Export preserves audit consistency and omits private receipts', 'audit', check => {
    const s = betaSession(), output = safeExport(s.state); check('Export revision matches state', s.state.revision, output.consistency.revision); check('Last audit revision matches state', s.state.revision, output.consistency.lastAuditRevision); check('Audit entry count', s.state.audit.length, output.consistency.auditEntries); check('Audit consistency', true, output.consistency.consistent); check('Private receipts omitted', false, Object.hasOwn(output.snapshot, 'receipts')); check('Session identifiers omitted', false, output.privacy.sessionIdentifiersIncluded);
  });
  const guidance = (check, s, expected) => { const g = gates(s.state); check('Authoritative phase, view and action', expected, [g.nextPhase, g.nextView, g.nextAction]); return g; };
  add('guidance-initial-feedback', 'A fresh workspace routes to feedback import', 'lifecycle guidance', check => {
    const g = guidance(check, session(), ['feedback', 'feedback', 'importRows']); check('Next decision requests independent evidence', true, /independent source/i.test(g.nextDecision));
  });
  add('guidance-beta-approval', 'Passing beta evidence routes to current-version approval', 'lifecycle guidance', check => {
    const g = guidance(check, betaSession(), ['beta-approval', 'release', 'approveBeta']); check('Beta thresholds ready', true, g.beta.ready); check('Release still requires approval', false, g.release.ready);
  });
  add('guidance-signed-release', 'Signed current evidence routes to simulated rollout', 'lifecycle guidance', check => {
    const s = releaseSession(); s.command('signRelease', { owner: OWNER, rationale: 'All current scoped evidence reviewed.' }); const g = guidance(check, s, ['release', 'release', 'simulateRelease']); check('Current release is ready', true, g.release.ready);
  });
  add('guidance-awaiting-health', 'A completed rollout routes to health instead of repeating release', 'lifecycle guidance', check => {
    const s = launchedSession(), g = guidance(check, s, ['health', 'health', 'recordHealth']); check('Completed rollout cannot release again', false, g.release.ready); check('Rollout review requirement visible', true, hasBlock(s, 'release', 'ROLLOUT_REVIEW_REQUIRED')); check('Next decision requests health', true, /health observation/i.test(g.nextDecision));
  });
  add('guidance-healthy-postreview', 'A healthy rollout routes to outcome review', 'lifecycle guidance', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health passed.' }); const g = guidance(check, s, ['post-review', 'review', 'postReview']); check('Outcome review is available', true, g.postReview.ready); check('Completed rollout cannot release again', false, g.release.ready); rejected(check, 'Repeat rollout refused', () => s.command('simulateRelease'), 'POST_REVIEW_REQUIRED');
  });
  add('guidance-owned-rollback', 'Failed health routes to the named rollback owner', 'lifecycle guidance', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: false, owner: 'Synthetic Engineering owner', note: 'Synthetic failed health observation.' }); const g = guidance(check, s, ['rollback', 'health', 'resolveRollback']); check('Rollback owner leads next decision', true, g.nextDecision.startsWith('Synthetic Engineering owner:')); check('Decision requests owned rollback', true, /owned failed-health rollback/i.test(g.nextDecision));
  });
  add('guidance-resolved-rollback', 'A resolved rollback routes to post-review before new scope', 'lifecycle guidance', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: false, owner: 'Synthetic Engineering owner', note: 'Synthetic failed health observation.' }); s.command('resolveRollback', { owner: 'Synthetic Engineering owner', evidence: 'Synthetic prior setup restored in rehearsal.' }); const g = guidance(check, s, ['post-review', 'review', 'postReview']); check('Outcome review is available', true, g.postReview.ready); check('Old rollout cannot be retried', false, g.release.ready);
  });
  add('guidance-reviewed-next-cycle', 'A reviewed outcome requests baseline review and new scoped work', 'lifecycle guidance', check => {
    const s = launchedSession(); s.command('recordHealth', { healthy: true, owner: OWNER, note: 'Synthetic health passed.' }); s.command('postReview', REVIEW); const g = guidance(check, s, ['outcome-review', 'review', 'weeklyReview']); check('New scope requirement visible', true, hasBlock(s, 'release', 'NEW_SCOPE_REQUIRED')); check('Old release remains unavailable', false, g.release.ready); check('Next decision requests new scoped work', true, /new scoped feature or beta decision/i.test(g.nextDecision));
  });
  // Deliberate injected rule adapters run the same assertions but override one
  // guard result. Their red assertions demonstrate that the evaluator detects
  // broken behavior; these adapters are never used by application commands.
  injected.push(executeCase('fault-missing-privacy', 'Injected missing-privacy release bypass is detected', 'intentional rule fault', check => {
    const s = releaseSession(['privacy']); let output;
    const brokenSignRelease = () => { try { return s.command('signRelease', { owner: OWNER, rationale: 'Fault fixture attempts missing-privacy sign.' }); } catch (error) { if (error.code !== 'GATE_BLOCKED') throw error; return { status: 'ready' }; } };
    output = brokenSignRelease(); check('Missing privacy must refuse signing', 'GATE_BLOCKED', output.status);
  }, 'Catch GATE_BLOCKED and force a ready result for missing privacy.'));
  injected.push(executeCase('fault-fabricated-quote', 'Injected quote-validation bypass is detected', 'intentional rule fault', check => {
    const actualPreview = previewImport(FIXTURE_SETS.nonexistentQuote); const brokenPreview = { ...actualPreview, rejected: [], accepted: clone(FIXTURE_SETS.nonexistentQuote), canCommit: true };
    check('Fabricated quote must be rejected', 'QUOTE_MISMATCH', brokenPreview.rejected[0]?.code ?? 'accepted'); check('Invalid batch cannot commit', false, brokenPreview.canCommit);
  }, 'Replace failed quote validation with acceptance in an isolated preview adapter.'));
  injected.push(executeCase('fault-duplicate-outbox', 'Injected notification-dedupe bypass is detected', 'intentional rule fault', check => {
    const s = session(), payload = { event: 'weekly-review', audience: 'internal-synthetic', message: 'Synthetic duplicate fault.' }; s.command('enqueueNotification', payload); s.command('enqueueNotification', payload);
    const brokenState = clone(s.state); brokenState.outbox.push({ ...clone(brokenState.outbox[0]), id: 'injected-duplicate' }); check('Duplicate identity must retain one entry', 1, brokenState.outbox.length);
  }, 'Append a duplicate outbox record after the shared dedupe rule executes.'));
  return {
    schemaVersion: 1,
    simulationTime: SIMULATION_TIME,
    generatedAt: new Date().toISOString(),
    measurement: 'Measured local scenario execution time. Fixed simulation timestamps are synthetic and do not measure production savings.',
    baseline: summarize(baseline),
    injectedFaults: { ...summarize(injected), detected: injected.filter(c => c.status === 'failed').length, missed: injected.filter(c => c.status === 'passed').length },
    durationMs: Math.round((clock() - start) * 1000) / 1000,
  };
}
