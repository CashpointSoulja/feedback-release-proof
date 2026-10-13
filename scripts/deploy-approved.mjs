import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const fail = message => { console.error(`Deployment blocked: ${message}`); process.exit(1); };
let approval;
try { approval = JSON.parse(await readFile('work/approved-destination.json', 'utf8')); }
catch { fail('No explicit approved Cloudflare account, Worker destination and public origin recorded in work/approved-destination.json.'); }
if (approval.workerName !== 'feedback-release-proof' || !/^[a-f0-9]{32}$/.test(approval.accountId ?? '') || approval.explicitlyApproved !== true) fail('Destination approval must name this new Worker and account explicitly.');
let origin;
try { origin = new URL(approval.origin); } catch { fail('Approved public HTTPS origin missing.'); }
if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.workers.dev') || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) fail('Expected an approved public workers.dev HTTPS origin.');
if (!process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_ACCOUNT_ID !== approval.accountId) fail('Scoped Cloudflare authentication for the approved account is absent.');
if (approval.sessionCreationProtectionApproved !== true) fail('Session-creation abuse protection and free quotas must be reviewed before deployment.');
// Read-only existence check. Never overwrite an existing Worker in the approved account.
const authorization = JSON.stringify(`Authorization: Bearer ${process.env.CLOUDFLARE_API_TOKEN}`);
const probe = spawnSync('curl', ['--silent','--show-error','--max-time','20','--write-out','\\n%{http_code}','--config','-',`https://api.cloudflare.com/client/v4/accounts/${approval.accountId}/workers/scripts/${approval.workerName}`], {
  input:`header = ${authorization}\n`, encoding:'utf8', env:process.env,
});
if (probe.status !== 0) fail('Read-only destination existence check failed; no deployment attempted.');
const rawProbe = probe.stdout.trim();
const probeStatus = Number(rawProbe.slice(rawProbe.lastIndexOf('\n')+1));
if (probeStatus !== 404) fail(probeStatus === 200 ? 'A Worker already exists at this destination. Existing deployments must not be changed.' : `Destination absence could not be verified (HTTP ${probeStatus}); no deployment attempted.`);
let probeBody;
try { probeBody = JSON.parse(rawProbe.slice(0,rawProbe.lastIndexOf('\n'))); } catch { fail('Destination absence response was not valid JSON.'); }
if (!Array.isArray(probeBody.errors) || !probeBody.errors.some(e => e.code === 10007)) fail('The API did not confirm a missing Worker; no deployment attempted.');
const config = JSON.parse(await readFile('wrangler.jsonc','utf8'));
if (config.name !== approval.workerName) fail('Worker config does not match approval.');
config.account_id = approval.accountId;
config.vars = { ...config.vars, APP_ORIGIN: origin.origin, LOCAL_DEV: 'false' };
// Generate a deployment-specific config without changing the reviewed source config.
const { writeFile } = await import('node:fs/promises');
await writeFile('wrangler.approved.json', JSON.stringify(config, null, 2));
const result = spawnSync('npx', ['--no-install','wrangler','deploy','--config','wrangler.approved.json'], { stdio: 'inherit', env:{...process.env, WRANGLER_SEND_METRICS:"false", XDG_CONFIG_HOME:"work/tool-config", WRANGLER_LOG_PATH:"work/logs"} });
const { unlink } = await import('node:fs/promises');
await unlink('wrangler.approved.json');
process.exit(result.status ?? 1);
