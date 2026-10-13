# Feedback → Release Proof

**Ayo Ahmed - Independent concept**

Independent concept for Semble

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

I built this internal product-operations work sample around one fictional reminder-workflow opportunity: synthetic feedback → validated evidence → human priority decision → controlled beta exit → version-bound release decision → post-release review. It demonstrates an operating model, not an EHR or a diagnosis of Semble's current product.

The extraction outputs are recorded simulations using deterministic structured fixtures. No live model, paid API, patient data, real notifications or external integrations are involved. Gate approvals are simulated human reviews under prototype policy; they are not certifications.

## Read the rationale

Start with the [business sources](docs/source-evidence.md) and [brand guide](docs/brand-guide.md), committed before implementation. Continue with the [PRD](docs/prd.md), [PM package](docs/pm-package.md), [operating playbook](docs/operating-playbook.md), [measurement and pilot plan](docs/measurement-pilot.md), [priority and roadmap](docs/priority-roadmap.md), [release runbook](docs/release-runbook.md), [architecture](docs/architecture.md), [API and schema](docs/api-schema.md), [threat/privacy model](docs/threat-privacy.md), and [executed evaluation report](docs/test-eval-report.md) and [actual browser screenshots/checks](docs/browser-verification.md).

## Run locally

Requires Node.js 22 or later and npm. Dependencies are development/build tools; runtime uses a Cloudflare Worker and SQLite Durable Object.

```sh
npm ci --cache work/npm-cache
npm run dev
npm test
npm run test:integration
npm run test:browser
npm run build
```

`build` is a deployment dry run only. Local browser evidence is labelled local verification and cannot be used as public footage. Sessions isolate visitor state and persist through reloads. Imports and transitions use server-authoritative rules with audit records, revision checks and idempotency receipts.

## Public deployment and recording

**No public deployment has been made.** A Cloudflare account/Worker destination and public origin have not been explicitly approved; scoped account authentication is absent. The configured destination policy also omits `api.cloudflare.com`. Sources and guarded deployment scripts are prepared for an approved free destination; no existing deployment or resource is changed.

The [105-second narration/storyboard](docs/video-storyboard.md) and reproducible recording/composition scripts are provided. Recording must use the actual public HTTPS workbench, then be watched and listened to in full by Ayo before anything is sent. No public footage or finished cut is claimed.
