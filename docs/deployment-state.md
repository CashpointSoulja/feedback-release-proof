# Deployment and recording state

**Ayo Ahmed - Independent concept**

No public Worker has been deployed and no public footage has been captured.

The exact deployment blockers are:

1. No explicitly approved Cloudflare account ID, new Worker destination and public HTTPS origin have been supplied.
2. No scoped Cloudflare account authentication is configured in the attached environment.
3. The current outbound policy does not list `api.cloudflare.com`, which deployment requires. Preserve the environment proxy and TLS verification; request destination configuration through the supported environment workflow when an account is approved.

I will use only a new Worker named `feedback-release-proof` in an explicitly approved account, with the reviewed SQLite Durable Object migration and session-creation abuse controls. The source config is deployment-blocked by default. I will not replace or delete existing resources, choose another hosting provider, enable a paid API, or claim a live deployment from a build dry run. Account free-tier eligibility and limits need checking in the approved account before deployment; no payment or card flow belongs in this concept.

When the destination is explicitly approved, store the non-secret review record at ignored `work/approved-destination.json`:

```json
{
  "explicitlyApproved": true,
  "workerName": "feedback-release-proof",
  "accountId": "approved 32-character Cloudflare account ID",
  "origin": "https://feedback-release-proof.APPROVED-SUBDOMAIN.workers.dev",
  "sessionCreationProtectionApproved": true
}
```

Use scoped authentication through the environment credential configuration, not the browser UI or committed files. The deployment script requires `CLOUDFLARE_ACCOUNT_ID` to match the approved account and `CLOUDFLARE_API_TOKEN` to be present without printing either secret. It creates a temporary deployment config and invokes the local Wrangler executable; it does not start interactive login. Review Worker/Durable Object permissions against the actual account, keep the token narrow, and do not grant destructive resource permissions.

The guarded script first performs a read-only API lookup and proceeds only when the approved destination is explicitly confirmed as a missing Worker. Any existing destination, authentication error or ambiguous response blocks deployment.

After approval and credential/network setup, run the local test/build checks, run `npm run deploy`, verify the real public HTTPS session flows with two isolated browsers, confirm deployed security headers/origins/rate caps and verify storage persistence. Only then use the capture script. A successful dry run does not complete these steps.

Recording blockers follow directly from the absent verified public HTTPS UI. See [video-storyboard.md](video-storyboard.md) for the complete 105s plan, free narration option, continuous interaction capture and CFR-first composition process. Scripts are preparation; syntax checks do not prove a completed capture, watch or listen.

## Executed preparation checks

The final source package passed 58 shared-domain scenarios (171 assertions), 31 HTTP/SQLite integration scenarios (83 assertions) and 19 real-browser scenarios (227 assertions). Three intentional broken controls produced four red assertions and were detected. The last browser run recorded 2026-10-13T09:04:27.944Z; it is local verification only.

The guarded deploy command refused the missing approval record. The capture command refused a local HTTP URL. Composition refused absent public capture/voice manifests. Recording scripts passed syntax checks, and pointer visibility above native dialogs passed a local non-recording smoke check. None of these checks establishes a public deployment, finished video, full watch or full listen.
