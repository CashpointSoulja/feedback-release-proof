#!/usr/bin/env node
/** Capture a continuous real public HTTPS UI. No local fallback or API mutations. */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.CAPTURE_DIR || path.join(root, 'work/recording/capture'));
const hash = data => createHash('sha256').update(data).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
const story = await fs.readFile(path.join(root, 'docs/video-storyboard.md'), 'utf8');
const block = story.split('<!-- recording-plan:start -->')[1]?.split('<!-- recording-plan:end -->')[0];
const plan = JSON.parse(block.match(/```json\s*([\s\S]*?)\s*```/)[1]);

function isPublicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (net.isIP(address) === 6) {
    const normalized = address.toLowerCase();
    // Restrict to global unicast 2000::/3; exclude documentation and special 2001::/23.
    const first = parseInt(normalized.split(':')[0], 16);
    const second = parseInt(normalized.split(':')[1] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 && !normalized.startsWith('2001:db8:') && !(first === 0x2001 && second < 0x0200);
  }
  return false;
}

async function verifyPublicUrl(value) {
  if (!value) throw new Error('PUBLIC_URL is required. Capture is blocked until the real public HTTPS app is deployed.');
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.port && url.port !== '443')) {
    throw new Error('PUBLIC_URL must be the clean public HTTPS app origin, without credentials, query, fragment or path.');
  }
  if (!host.includes('.') && net.isIP(host) !== 6 || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) || host.endsWith('.example.com')) {
    throw new Error('Local, private and placeholder hostnames are forbidden.');
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) throw new Error('Public origin DNS includes a local/private/reserved address.');
  return { url, addresses: [...new Set(addresses.map(entry => entry.address))] };
}

const verified = await verifyPublicUrl(process.env.PUBLIC_URL);
const origin = verified.url.origin;
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
try { await fs.access(path.join(out, 'capture-manifest.json')); throw new Error(`Capture directory already has a manifest: ${out}. Use a new CAPTURE_DIR to preserve the prior attempt.`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(path.join(out, 'frames'), { recursive: true });
await fs.mkdir(path.join(out, 'inspection'), { recursive: true });
await fs.mkdir(path.join(out, 'downloads'), { recursive: true });

const manifest = { status: 'in-progress', public_url: origin, public_dns_addresses: verified.addresses, started_at: new Date().toISOString(),
  storyboard_sha256: hash(story), width: plan.width, height: plan.height, duration: plan.duration, fps: plan.fps,
  continuous: true, actions: [], scenes: [], preparation: [], pointer: 'overlay driven by actual trusted pointer events',
  browser: 'Chromium real public app', direct_mutation_api_calls: 0, human_review: 'pending' };
let browser, context, page, cdp, started, currentScene, writeChain = Promise.resolve(), frameFailure, networkFailure, recording = false;
const frames = [];
const apiResponses = [];
const responseTasks = [];
let firstFrameResolve;
const firstFrame = new Promise(resolve => { firstFrameResolve = resolve; });
const relative = () => started === undefined ? null : (performance.now() - started) / 1000;
function ensure(condition, message) { if (!condition) throw new Error(message); }
function logAction(action, detail = {}) {
  const entry = { action, at: relative(), ...detail };
  (recording ? manifest.actions : manifest.preparation).push(entry);
}
function checkDeadline() {
  if (networkFailure) throw networkFailure;
  if (frameFailure) throw frameFailure;
  if (currentScene && relative() > currentScene.end - .2) throw new Error(`Missed scene deadline: ${currentScene.id}; do not alter the footage to hide it.`);
}
async function control(testid) {
  checkDeadline();
  const locator = page.getByTestId(testid);
  await locator.waitFor({ state: 'visible', timeout: 2500 });
  await locator.scrollIntoViewIfNeeded({ timeout: 2500 });
  const box = await locator.boundingBox();
  ensure(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= plan.width + 1 && box.y + box.height <= plan.height + 1,
    `Control ${testid} is not entirely inside the vertical viewport.`);
  return { locator, box };
}
async function click(testid) {
  const { locator, box } = await control(testid);
  ensure(await locator.isEnabled(), `Control ${testid} is disabled.`);
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 5 });
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
  logAction('click', { testid });
  await pause(100);
  checkDeadline();
}
async function inspect(locator, label, expected) {
  checkDeadline();
  await locator.waitFor({ state: 'visible', timeout: 2500 });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  ensure(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= plan.width + 1 && box.y + box.height <= plan.height + 1, `${label} is outside the vertical frame.`);
  await page.mouse.move(Math.min(box.x + box.width/2, plan.width-12), Math.min(box.y + box.height/2, plan.height-12), { steps: 4 });
  const text = await locator.innerText();
  ensure(expected.test(text), `${label} does not show the required result.`);
  logAction('inspect-visible', { label, text });
  return text;
}
async function triggerResponse(testid, pathname) {
  const pending = page.waitForResponse(response => new URL(response.url()).origin === origin && new URL(response.url()).pathname === pathname, { timeout: 4000 });
  await click(testid);
  const response = await pending;
  const body = await response.json();
  logAction('actual-api-result', { testid, path: pathname, status: response.status(), body });
  checkDeadline();
  return { response, body };
}
async function closeDialog() {
  await page.keyboard.press('Escape');
  logAction('key', { key: 'Escape', purpose: 'close real native dialog' });
  await page.locator('#editor-dialog').waitFor({ state: 'hidden', timeout: 2500 });
  checkDeadline();
}
async function fill(testid, value) {
  const { box } = await control(testid);
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 4 });
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(String(value));
  logAction('type', { testid, value: String(value) });
  checkDeadline();
}
async function setBooleanControl(testid, checked) {
  const { locator } = await control(testid);
  const tag = await locator.evaluate(element => element.tagName);
  if (tag === 'SELECT') {
    // Real native select interaction, including an explicit pass declaration.
    await click(testid);
    await page.keyboard.press(checked ? 'End' : 'Home');
    await page.keyboard.press('Enter');
    await click(testid);
    await page.keyboard.press(checked ? 'Home' : 'End');
    await page.keyboard.press('Enter');
    ensure(await locator.inputValue() === String(checked), `Select ${testid} did not reach its declared value.`);
  } else {
    ensure(await locator.getAttribute('type') === 'checkbox', `Unknown boolean control: ${testid}`);
    if (await locator.isChecked() === checked) await click(testid);
    await click(testid);
    ensure(await locator.isChecked() === checked, `Checkbox ${testid} did not reach the declared value.`);
  }
  logAction('explicit-rehearsal-declaration', { testid, passed: checked });
}
async function visible(testid, expected) {
  const { locator } = await control(testid);
  const text = await locator.innerText();
  ensure(expected.test(text), `Expected ${expected} in ${testid}, received ${JSON.stringify(text)}.`);
  logAction('visible-result', { testid, text });
  return text;
}
async function stateCheck(label, predicate) {
  // Read-only, same-origin state inspection. All state-changing actions use UI controls.
  const response = await context.request.get(`${origin}/api/state`);
  ensure(response.ok(), `Read-only state request failed: ${response.status()}`);
  const snapshot = await response.json();
  ensure(predicate(snapshot), `Server assertion failed: ${label}`);
  logAction('server-assertion', { label, revision: snapshot.state.revision, release: snapshot.state.release, gates: snapshot.gates });
  return snapshot;
}
async function until(second) {
  ensure(relative() <= second + .05, `Timeline overrun at ${second}s.`);
  await pause((second - relative()) * 1000);
  checkDeadline();
}
async function scene(index, action) {
  currentScene = null;
  await until(plan.scenes[index].start);
  currentScene = plan.scenes[index];
  ensure(new URL(page.url()).origin === origin, 'Browser left the verified public origin.');
  await action();
  checkDeadline();
  await page.screenshot({ path: path.join(out, 'inspection', `${currentScene.id}-result.png`) });
  manifest.scenes.push({ id: currentScene.id, start: currentScene.start, end: currentScene.end, assertions_passed_at: relative() });
  currentScene = null;
}
async function saveForm(kind, fields, opener = `evidence-edit-${kind}`) {
  await click(opener);
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === 'boolean') await setBooleanControl(`field-${name}`, value);
    else await fill(`field-${name}`, value);
  }
  const submitted = await triggerResponse(`form-save-${kind}`, '/api/command');
  ensure(submitted.response.ok(), `${kind} form failed: ${JSON.stringify(submitted.body)}`);
  await page.locator('#editor-dialog').waitFor({ state: 'hidden', timeout: 3000 });
  checkDeadline();
}

try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  context = await browser.newContext({ viewport: { width: plan.width, height: plan.height }, deviceScaleFactor: 1, acceptDownloads: true,
    reducedMotion: 'no-preference', ignoreHTTPSErrors: false, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const requested = new URL(route.request().url());
    if (requested.origin !== origin) {
      networkFailure = new Error(`Off-origin request refused: ${requested.origin}. Public footage must remain on the verified app origin.`);
      return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const install = () => {
      const pointer = document.createElement('div');
      pointer.id = 'capture-pointer';
      pointer.setAttribute('aria-hidden','true');
      pointer.style.cssText = 'position:fixed;left:0;top:0;width:18px;height:18px;border:2px solid #ffffff;border-radius:50%;background:#172c29;box-shadow:0 0 0 2px #172c29;z-index:2147483647;pointer-events:none;transform:translate(350px,30px);';
      document.body.append(pointer);
      // Native dialogs occupy the browser top layer, above every body z-index.
      // Keep this same event-driven pointer in the active top-layer dialog.
      // Also watch child replacement: opening a different form replaces its HTML.
      const placePointer = () => {
        const target = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
        if (pointer.parentElement !== target) target.append(pointer);
      };
      const observer = new MutationObserver(placePointer);
      observer.observe(document.body, { attributes: true, attributeFilter: ['open'], childList: true, subtree: true });
      placePointer();
      document.addEventListener('pointermove', event => {
        if (event.isTrusted) pointer.style.transform = `translate(${event.clientX-9}px,${event.clientY-9}px)`;
      }, true);
      document.addEventListener('pointerdown', event => { if (event.isTrusted) pointer.style.background = '#c7efdd'; }, true);
      document.addEventListener('pointerup', event => { if (event.isTrusted) pointer.style.background = '#172c29'; }, true);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
  });
  page = await context.newPage();
  page.on('response', response => {
    if (new URL(response.url()).origin !== origin) networkFailure = new Error('Response was received from an unverified origin.');
    if (response.status() >= 500) networkFailure = new Error(`Server failure during recording: ${response.status()} ${response.url()}`);
    if (/\/api\/(preview|command|eval|export)(?:\?|$)/.test(response.url())) {
      const pending = response.json().then(body => apiResponses.push({ url: response.url(), status: response.status(), at: relative(), body })).catch(() => {});
      responseTasks.push(pending);
    }
  });
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 30000 });
  ensure(new URL(page.url()).origin === origin, 'App redirected away from the verified origin.');
  await page.getByTestId('nav-overview').waitFor({ timeout: 15000 });
  ensure((await page.locator('body').innerText()).replace(/\s+/g, ' ').includes('Ayo Ahmed - Independent concept'), 'Independent attribution is absent.');
  ensure((await page.locator('body').innerText()).includes('Synthetic'), 'Synthetic label is absent.');
  manifest.application_assets = {};
  for (const file of ['app.mjs', 'styles.css']) {
    const deployed = await context.request.get(`${origin}/${file}`);
    ensure(deployed.ok(), `Public asset missing: ${file}`);
    const bytes = await deployed.body();
    const expected = await fs.readFile(path.join(root, 'public', file));
    ensure(hash(bytes) === hash(expected), `Public ${file} differs from this script's verified UI contract. Deploy the current package or update the capture contract.`);
    manifest.application_assets[file] = hash(bytes);
  }
  await prepareUi();
  await click('nav-overview');
  const prepared = await stateCheck('Prepared valid beta/reviews/handoff, unresolved rollback and signature', s =>
    s.gates.beta.ready && s.state.beta.approval && s.state.release.security && s.state.release.privacy && s.state.release.gtm &&
    !s.state.release.rollback && !s.state.release.signoff && s.state.release.status === 'draft');
  manifest.app_version = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version;
  manifest.app_schema_version = prepared.state.schemaVersion;
  manifest.initial_revision = prepared.state.revision;
  const cursor = await page.locator('#capture-pointer').boundingBox();
  ensure(cursor && cursor.width === 18 && cursor.height === 18 && cursor.x >= 0 && cursor.y >= 0 && cursor.x + 18 <= plan.width && cursor.y + 18 <= plan.height, 'The actual pointer overlay is not visibly inside the vertical frame.');
  cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', event => {
    const received = performance.now();
    if (started === undefined) { started = received; manifest.first_browser_timestamp = event.metadata.timestamp; firstFrameResolve(); }
    const timestamp = event.metadata.timestamp - manifest.first_browser_timestamp;
    const file = `frames/${String(frames.length).padStart(6, '0')}.jpg`;
    const bytes = Buffer.from(event.data, 'base64');
    if (!Number.isFinite(timestamp) || timestamp < 0 || (frames.length && timestamp < frames.at(-1).timestamp)) frameFailure = new Error('Browser source timestamps are missing or non-monotonic.');
    frames.push({ file, timestamp, sha256: hash(bytes) });
    writeChain = writeChain.then(() => fs.writeFile(path.join(out, file), bytes)).catch(error => { frameFailure = error; });
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(error => { frameFailure = error; });
  });
  recording = true;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: plan.width, maxHeight: plan.height, everyNthFrame: 1 });
  await Promise.race([firstFrame, pause(5000).then(() => { throw new Error('No real browser screencast frame received.'); })]);
  await recordUi();
  currentScene = null;
  await until(105);
  await page.mouse.move(700, 1240, { steps: 3 });
  await pause(300);
  manifest.source_duration = relative();
  await cdp.send('Page.stopScreencast');
  recording = false;
  await writeChain;
  await Promise.all(responseTasks);
  checkDeadline();
  ensure(frames.length >= 2, 'Insufficient continuous browser frames.');
  const end = Math.max(manifest.source_duration, frames.at(-1).timestamp + 1/30);
  const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
  const concat = 'ffconcat version 1.0\n' + frames.map((frame, index) => {
    const next = frames[index+1]?.timestamp ?? end;
    const hold = Math.max(1/1000000, next - frame.timestamp);
    return `file ${quote(frame.file)}\nduration ${hold.toFixed(9)}\n`;
  }).join('') + `file ${quote(frames.at(-1).file)}\n`;
  await fs.writeFile(path.join(out, 'raw.ffconcat'), concat);
  await fs.writeFile(path.join(out, 'frames.json'), JSON.stringify(frames, null, 2) + '\n');
  const responseEvidence = JSON.stringify(apiResponses, null, 2) + '\n';
  await fs.writeFile(path.join(out, 'api-responses.json'), responseEvidence);
  const finalDns = await verifyPublicUrl(origin);
  manifest.public_dns_addresses_at_end = finalDns.addresses;
  manifest.raw_concat_sha256 = hash(concat);
  manifest.api_responses_sha256 = hash(responseEvidence);
  manifest.frames_manifest_sha256 = hash(await fs.readFile(path.join(out, 'frames.json')));
  manifest.frame_count_sparse = frames.length;
  manifest.finished_at = new Date().toISOString();
  manifest.status = 'passed';
  await fs.writeFile(path.join(out, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Continuous public capture completed: ${out}. Composition and Ayo's full watch/listen review remain pending.`);
} catch (error) {
  manifest.status = 'failed'; manifest.failure = error.message; manifest.finished_at = new Date().toISOString();
  await writeChain;
  await fs.writeFile(path.join(out, 'capture-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.error(`CAPTURE FAILED: ${error.message}\nNo passing recording is available. Do not substitute local footage or patch the result.`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}

async function prepareUi() {
  await stateCheck('Fresh isolated synthetic session', s => s.state.revision === 0 && s.state.sources.length === 0);
  await click('nav-feedback');
  await click('import-open');
  await click('import-preset-happy');
  const preview = await triggerResponse('import-preview', '/api/preview');
  ensure(preview.response.ok() && preview.body.preview.canCommit && preview.body.preview.evidence.length === 4, 'Synthetic supporting fixture did not pass its real preview.');
  const imported = await triggerResponse('import-commit', '/api/command');
  ensure(imported.response.ok(), 'Verified public UI import failed.');
  await page.locator('#editor-dialog').waitFor({ state: 'hidden', timeout: 3000 });
  await saveForm('priority', { owner: 'Synthetic Product owner', rationale: 'Prioritise reminder setup clarity from independent synthetic sources. Keep ambiguous scope separate; no production impact claimed.' }, 'prioritize-opportunity');
  await click('nav-release');
  await saveForm('beta', {
    sampleSize: 40, observedDays: 7, completionPercent: 95, errorPercent: 0,
    observations: 'Synthetic cohort: 38 of 40 attempted reminder setups completed over seven full days. Zero observed operational errors in this invented sample.',
    riskNotes: 'Small synthetic cohort, no production baseline, no causal gain claim. Monitor repeated setup failures and status confusion.',
    adverseEvents: '', adverseEscalation: 'Synthetic Engineering owner pauses the simulated rollout and records owned rollback evidence.'
  });
  await saveForm('approveBeta', { owner: 'Synthetic Product owner' }, 'approve-beta');
  await saveForm('security', { owner: 'Synthetic Security reviewer', notes: 'Synthetic-only operational review: exact-origin commands, strict JSON intake, isolated sessions, bounded requests and escaped rendering. No certification claim.' });
  await saveForm('privacy', { owner: 'Synthetic Privacy reviewer', notes: 'Synthetic-only operational data; sensitive input refused, rejected raw content not retained, isolated visitor sessions and safe export. No real personal data or certification claim.' });
  await saveForm('gtm', {
    owner: 'Synthetic GTM owner', audience: 'Internal synthetic beta teams', message: 'Reminder setup clarity experiment. Invented operational scope with no production connection.',
    supportPlan: 'Synthetic Support owner traces setup failures to exact sources and escalates repeated failures to the Synthetic Engineering owner.'
  });
}

async function recordUi() {
  let signatureBefore, handoffBefore;
  await scene(0, async () => {
    await visible('next-decision', /Keep the release on hold/);
    await inspect(page.locator('.brand-name'), 'Independent credit', /Ayo Ahmed\s*-\s*Independent concept/);
    await inspect(page.locator('.pill').filter({ hasText: 'Private synthetic session' }), 'Synthetic workspace label', /synthetic/);
    await inspect(page.locator('.disclaimer'), 'Plain disclaimer', /Unofficial\. Synthetic operational data only/);
    await click('nav-overview');
    await stateCheck('Synthetic overview remains blocked with version-matched draft evidence', s => s.state.project.credit === 'Ayo Ahmed - Independent concept' && !s.gates.release.ready);
  });
  await scene(1, async () => {
    await click('nav-feedback');
    await click('import-open');
    await click('import-preset-injected');
    const result = await triggerResponse('import-preview', '/api/preview');
    ensure(result.response.ok() && !result.body.preview.canCommit && result.body.preview.rejected.some(r => r.code === 'INJECTED_INSTRUCTIONS'), 'Injected extraction was not rejected by the actual public server.');
    await visible('import-preview-results', /Batch refused[\s\S]*INJECTED_INSTRUCTIONS/);
    ensure(await page.getByTestId('import-commit').isDisabled(), 'Rejected import incorrectly has an enabled commit control.');
    await stateCheck('Rejected preview did not change accepted sources', s => s.state.sources.length === 4);
  });
  await scene(2, async () => {
    await closeDialog();
    await click('nav-feedback');
    await inspect(page.getByTestId('source-snippet').first(), 'Exact accepted synthetic source', /Synthetic team A: reminder setup takes too many steps/);
    const panel = page.getByRole('heading', { name: 'Opportunity → outcome' }).locator('xpath=ancestor::section[1]');
    await inspect(panel, 'Traced opportunity and measurable outcome', /Simpler reminder setup[\s\S]*Synthetic Product owner[\s\S]*Successful reminder setup rate[\s\S]*All attempted reminder setups/);
    await stateCheck('Opportunity retains source evidence and human priority', s => s.state.opportunities.length === 1 && s.state.features[0].priority && s.state.evidence.length === 4);
  });
  await scene(3, async () => {
    await click('nav-release');
    const before = await stateCheck('Missing rollback and signature block release', s => s.gates.release.blockers.some(b => b.code === 'MISSING_ROLLBACK') && s.gates.release.blockers.some(b => b.code === 'RELEASE_SIGNATURE'));
    await click('release-attempt');
    const attempted = await triggerResponse('form-save-release', '/api/command');
    ensure(attempted.response.status() === 409 && attempted.body.error?.code === 'GATE_BLOCKED', 'Release attempt did not return the real blocked result.');
    await inspect(page.locator('#form-error'), 'Actual blocked release reasons', /GATE_BLOCKED[\s\S]*rollback/i);
    await stateCheck('Blocked release wrote no rollout or revision', s => s.state.revision === before.state.revision && s.state.release.status === 'draft');
  });
  await scene(4, async () => {
    await closeDialog();
    await saveForm('rollback', { owner: 'Synthetic Engineering owner', testEvidence: 'Synthetic rehearsal: restored the prior reminder setup flow; checked event queue for duplicate processing; repeated setup attempts recovered. Bounded fixture only.', successful: true });
    await saveForm('signRelease', { owner: 'Synthetic Product owner', rationale: 'Reviewed this exact synthetic beta, scoped reviews, successful rollback evidence and handoff. Approve the current bound fingerprint; no production deployment.' });
    const signed = await stateCheck('Owned successful rehearsal and current signature bind exact evidence versions', s => s.gates.release.ready && s.state.release.rollback.successful === true && s.state.release.rollback.contentVersion === s.state.features[0].contentVersion && s.state.release.signoff.binding.rollbackVersion === s.state.release.rollback.version && s.state.release.signoff.binding.gtmVersion === s.state.release.gtm.version);
    signatureBefore = signed.state.release.signoff;
    handoffBefore = signed.state.release.gtm.version;
    await visible('release-signature', /Current signature/);
  });
  await scene(5, async () => {
    await saveForm('gtm', { supportPlan: 'Revised synthetic handoff: Synthetic Support owner checks every repeated setup failure, links the exact source, and escalates to the Synthetic Engineering owner before any new scoped release.' });
    await stateCheck('Handoff edit invalidates the old release signature', s => !s.state.release.signoff && s.state.release.gtm.version === handoffBefore + 1 && s.gates.release.blockers.some(b => b.code === 'RELEASE_SIGNATURE') && s.state.beta.approval && s.state.release.security && s.state.release.privacy && s.state.release.rollback);
    await visible('stale-signoff-notice', /Previous signature invalidated/);
    await visible('release-signature', /Signature required/);
    // Keep the actual stale result on screen long enough to be inspected.
    await pause(900);
    await saveForm('signRelease', { owner: 'Synthetic Product owner', rationale: 'Reviewed the changed synthetic support handoff. Approve the new current fingerprint with its revised handoff version.' });
    await stateCheck('New signature binds changed handoff rather than prior fingerprint', s => s.gates.release.ready && s.state.release.signoff.binding.gtmVersion === handoffBefore + 1 && JSON.stringify(s.state.release.signoff.binding) !== JSON.stringify(signatureBefore.binding));
    await click('release-attempt');
    const released = await triggerResponse('form-save-release', '/api/command');
    ensure(released.response.ok(), 'Newly signed simulated release failed.');
    await page.locator('#editor-dialog').waitFor({ state: 'hidden', timeout: 2500 });
    await visible('release-status', /released/);
  });
  await scene(6, async () => {
    await click('nav-evaluation');
    const evaluated = await triggerResponse('run-evaluation', '/api/eval');
    const report = evaluated.body.report || evaluated.body;
    ensure(evaluated.response.ok() && report.baseline.failed === 0 && report.baseline.passed === report.baseline.scenarioCount && report.injectedFaults.detected === 3 && report.injectedFaults.missed === 0, 'The actual server failure suite did not meet its expected results.');
    await visible('evaluation-summary', /baseline scenarios passed[\s\S]*deliberately broken rules detected/);
    await inspect(page.locator('.notice').filter({ hasText: 'Executed now on the server' }), 'Suite executed now on public server', /Executed now on the server/);
    manifest.evaluation = report;
    await pause(650);
    await click('nav-health');
    await saveForm('failed', { owner: 'Synthetic Engineering owner', note: 'Synthetic health probe found repeated reminder setup failure. Pause the simulated rollout; restore the prior setup flow.' }, 'health-fail');
    await visible('health-state', /Failed health check\. Rollback required/);
    await stateCheck('Failed health creates owned rollback and clears signature', s => s.state.release.status === 'paused' && !s.state.release.signoff && s.state.release.rollbackAction.status === 'required' && s.state.release.rollbackAction.owner === 'Synthetic Engineering owner');
    await pause(650);
    await saveForm('resolveRollback', { owner: 'Synthetic Engineering owner', evidence: 'Synthetic rollback resolved: prior setup flow restored, event queue checked for duplicate processing, repeated setup attempts recover. Complete post-review before a new scope.' }, 'rollback-complete');
    await visible('health-state', /Simulated rollback resolved/);
    await stateCheck('Owned rollback resolution retained', s => s.state.release.status === 'rolled-back' && s.state.release.rollbackAction.status === 'resolved' && s.state.release.rollbackAction.owner === 'Synthetic Engineering owner');
    const downloading = page.waitForEvent('download', { timeout: 4000 });
    await click('export-snapshot');
    const download = await downloading;
    const exportPath = path.join(out, 'downloads', 'synthetic-release-proof.json');
    await download.saveAs(exportPath);
    const exported = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    ensure(exported.format === 'feedback-release-proof-synthetic-v1' && exported.consistency.consistent && exported.snapshot.release.status === 'rolled-back' && exported.privacy.sessionIdentifiersIncluded === false && exported.privacy.externalNotificationsSent === 0, 'Downloaded export does not match the real safe rolled-back state.');
    manifest.export = { filename: path.basename(exportPath), sha256: hash(await fs.readFile(exportPath)), revision: exported.consistency.revision, audit_entries: exported.consistency.auditEntries };
    logAction('actual-download-verified', manifest.export);
  });
}
