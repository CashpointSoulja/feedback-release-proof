import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runDomainEvaluation } from '../src/evaluation.mjs';
import { writeEvaluationDoc } from '../tests/report.mjs';

const report = runDomainEvaluation();
// Preserve the independently timestamped HTTP run as recorded evidence. A
// domain rerun does not claim to rerun HTTP integration.
try { report.integration = JSON.parse(await readFile(new URL('../public/integration-report.json', import.meta.url), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/eval-report.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
await writeEvaluationDoc(report);
console.log(JSON.stringify({ simulationTime: report.simulationTime, baseline: { scenarios: report.baseline.scenarioCount, assertions: report.baseline.assertionCount, passed: report.baseline.passed, failed: report.baseline.failed, durationMs: report.baseline.durationMs }, injectedFaults: { scenarios: report.injectedFaults.scenarioCount, detected: report.injectedFaults.detected, missed: report.injectedFaults.missed } }, null, 2));
if (report.baseline.scenarioCount < 20 || report.baseline.failed || report.injectedFaults.missed || !report.injectedFaults.scenarioCount) process.exitCode = 1;
