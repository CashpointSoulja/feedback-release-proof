import { writeFile, mkdir } from 'node:fs/promises';

export async function writeEvaluationDoc(report) {
  const integration = report.integration;
  const row = c => `| ${c.id} | ${c.status} | ${c.assertionCount} | ${c.durationMs} |`;
  const md = `# Executed test and evaluation report

This report records executed assertions against the shared backend rules and visitor-isolated HTTP persistence. It does not demonstrate production quality, clinical safety, compliance certification, causal impact or operational time savings.

- Fixed simulation time: \`${report.simulationTime}\`.
- Recorded evaluation timestamp: \`${report.generatedAt}\`.
- Domain baseline: **${report.baseline.passed}/${report.baseline.scenarioCount} scenarios passed**, ${report.baseline.assertionCount} assertions, ${report.baseline.failed} failed scenarios; measured scenario execution ${report.baseline.durationMs} ms.
- Intentional faults: **${report.injectedFaults.detected}/${report.injectedFaults.scenarioCount} detected**, ${report.injectedFaults.assertionCount} assertions. Their failed assertions are deliberately red in the evaluation UI. They do not affect application commands.
${integration ? `- Recorded HTTP integration: **${integration.passed}/${integration.scenarioCount} scenarios passed**, ${integration.assertionCount} assertions, ${integration.failed} failed scenarios; measured scenario execution ${integration.durationMs} ms. Integration timestamp: \`${integration.generatedAt}\`.` : '- HTTP integration has not been included in this recorded run.'}

## What executes

\`src/evaluation.mjs\` exports \`runDomainEvaluation()\`. The command-line evaluator and authenticated \`POST /api/eval\` execute this same function. Each scenario starts from an isolated synthetic state and invokes the same \`previewImport\`, \`transition\`, \`gates\` and export functions used by the application. Live evaluation does not mutate the visitor workflow. \`tests/integration.mjs\` exercises the actual Worker request handler with isolated SQLite persistence.

Every result in [the recorded JSON](../public/eval-report.json) contains expected and actual assertion values, assertion count, status and measured duration. The simulation clock is fixed; runtime durations and generation timestamps are measured at execution and will vary. Durations sum scenario execution and exclude some harness startup and file-writing work.

## Covered protections

The domain cases exercise unknown schemas and taxonomy, nonexistent quotes, unsupported extraction assertions, embedded instructions, patient-shaped sensitive input, mixed-batch atomic refusal, duplicated and re-identified sources, recorded provenance and confidence tampering, ambiguous evidence, import limits, stale previews and mutations, denominator and whole-count consistency, inadequate beta samples and observation windows, owner and escalation requirements, adverse events, current security/privacy/GTM reviews, rollback evidence, stale approvals, idempotent receipts, outbox deduplication, suppression and rate limits, health failure, owned rollback and post-review obligations, authoritative phase/view/action guidance, missing baselines and audit/export consistency. The lifecycle guidance cases verify that a completed rollout requests health or review, a paused rollout requests its owned rollback, and a reviewed outcome requests baseline review and new scoped work. A complete synthetic lifecycle executes the passing path.

HTTP cases exercise exact origins, session cookies, visitor isolation and reload persistence, forged and duplicate cookies, method/query/body bounds, server-issued preview binding, atomic import refusal, content-bound idempotency, concurrent identical requests and concurrent revision conflicts, export privacy, security headers, live evaluation isolation and limits, valid and invalid request budgets, HTTPS cookie attributes and fail-closed public configuration without rate protection.

## Intentional broken-rule fixtures

These isolated adapters actually produce incorrect behavior and fail the evaluator's assertions. They are distinct from the baseline:

${report.injectedFaults.cases.map(c => `- \`${c.id}\`: ${c.injectedFault} Expected: ${c.expected} Actual: ${c.actual}`).join('\n')}

## Executed domain cases

| Scenario | Result | Assertions | Measured ms |
| --- | --- | ---: | ---: |
${report.baseline.cases.map(row).join('\n')}

${integration ? `## Recorded HTTP cases\n\n| Scenario | Result | Assertions | Measured ms |\n| --- | --- | ---: | ---: |\n${integration.cases.map(row).join('\n')}\n` : ''}
## Reproduction and limits

Run \`npm test\` for the domain evaluator and \`npm run test:integration\` for HTTP persistence checks. The HTTP harness needs local loopback networking. Test commands return failure for any baseline/integration failure or an undetected injected fault. \`public/eval-report.json\` and \`public/integration-report.json\` are recorded artifacts; the live UI evaluation reruns domain assertions and labels the HTTP integration as recorded.

All source text, extraction responses, beta observations and messages are invented. No external notification or deployment happens in these tests. Static header checks use an isolated asset fixture; actual app visual, accessibility and browser workflow checks are recorded separately. Rate-limit and HTTPS configuration checks run locally and do not establish production provisioning. There is no long-running production observation window or measured production improvement in this report.
`;
  await mkdir('docs', { recursive: true });
  await writeFile('docs/test-eval-report.md', md);
}
