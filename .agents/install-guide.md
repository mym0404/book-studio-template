# Install Book Studio

Use this guide when a user asks an AI coding agent to install Book Studio. Own the setup from the repository root and continue until the requested local or production outcome is verified.

Do not ask the user to create a separate Neon account, copy a database URL, install a CLI, or edit an env file on the happy path. Use a standalone Neon setup only after the Vercel Marketplace path is unavailable and the user approves that fallback.

## Interaction contract

### Announce the flow before acting

Before any setup work, send a short notice adapted from this template:

```text
I’ll install Book Studio in this order: read-only preflight → local toolchain → Vercel project and Git link → Neon through Vercel Marketplace → database schema → environment → local verification → production deployment → owner passkey → setup-token removal and final verification.

I’ll continue automatically between checkpoints. I’ll pause only for account approvals, the exact Vercel project or Neon resource name when one must be created or selected, the Neon region, any cost, changes to a reused database, a Vercel protection change that affects public links, and the passkey gesture. I won’t ask you to install CLIs, copy secrets, or edit env files.

I’ll start with read-only checks. Before creating or changing external resources, I’ll show you the exact target and ask for approval.
```

Start the read-only preflight immediately after this notice. Do not ask a generic “Should I begin?” question. Ask decisions just in time, combine choices needed for the same next action into one question, and continue automatically after the answer. Never ask the user to reconfirm an answered choice or choose a fallback before its failure occurs.

Keep CLI processes alive while the user completes a browser approval, then resume automatically.

## 1. Establish authority and defaults

1. Read `AGENTS.md`, its relevant routed knowledge documents, `mise.toml`, `package.json`, and `.env.example` in full.
2. Determine whether the request is local-only or includes production. For an unqualified install request, use the full production path, send the start notice, and begin read-only preflight without waiting for a reply.
3. Before the first external write, show the exact known targets and get authorization for the next external action. Ask later result-changing decisions only when they become necessary; do not turn the entire installation into one up-front questionnaire.
4. Use these defaults unless the user already chose otherwise:

   - Reuse the current Git remote.
   - Prefer an exactly matching Vercel project or Neon resource, but identify it by scope and name and confirm it before changing or attaching it.
   - For a new Vercel project, propose the repository name. For a new Neon resource, propose `<vercel-project>-db`. Require the user to confirm or replace each exact name before creation.
   - Use the only available Vercel scope. Ask the user to choose only when multiple plausible scopes remain.
   - Use Vercel-managed Neon from the Vercel Marketplace.
   - Propose a no-cost Neon plan and a database region close to the Vercel Functions region. Confirm the region in the same question as a new Neon resource name.
   - Connect the database to Production and Development. Do not connect Preview by default.
   - Use the assigned Vercel production domain. Configure a custom domain only when requested.

5. Recommend a private repository before importing copyrighted, confidential, or personal PDFs. A passkey protects the deployed app, not generated MDX and images committed to Git.

## 2. Install the local toolchain

1. Detect the operating system and check whether `mise` is available.
2. If `mise` is missing, install it with an available package manager or the current official mise installation method. Perform the install yourself; involve the user only for an administrator prompt or required terminal restart.
3. Review `mise.toml`, then run:

   ```sh
   mise trust
   mise install
   ```

4. Inspect the working tree and preserve unrelated changes.
5. Run `mise exec -- pnpm install --frozen-lockfile`. If it fails because the lockfile is stale, report the repository mismatch instead of silently running an unlocked install. If `ENOTFOUND`, `EAI_AGAIN`, or an isolated-network error starts a long retry loop, stop that process once the network cause is clear, obtain the required network access, and retry the same frozen install once. Do not change pnpm retry settings or the lockfile to work around a network failure.

`mise` supplies the pinned Node.js, pnpm, Python, uv, and gitleaks versions. Do not install Poppler or other PDF packages; the import tooling uses `pypdfium2`.

## 3. Resolve Vercel capabilities

Use the first available path that can complete the action:

1. Inspect the current agent, including Codex, Claude Code, or Cursor, for the official Vercel plugin, Vercel skills, Vercel MCP server, and Vercel account tools.
2. Load installed official Vercel guidance first. Use account tools when they expose the required project, Marketplace, environment, deployment, and log actions.
3. Otherwise, use an authenticated installed Vercel CLI.
4. If the CLI is absent, resolve the current official version once with pinned pnpm, such as `mise exec -- pnpm dlx vercel@latest --version`, then reuse `mise exec -- pnpm dlx vercel@<resolved-version> <command>` for the rest of this installation. Do not require a global install.
5. If terminal automation cannot finish a browser-only step, use an authenticated browser session. Ask the user to click only the exact approval that the agent cannot complete.

A guidance plugin does not prove that account actions are available. Confirm the actual tools before relying on them. Do not install or replace an agent plugin unless the user asks.

Treat this document as the primary runbook and load only the official guidance that owns the current step. Record the CLI version and inspect the relevant command's `--help` before relying on flags. Keep one CLI version for the installation, but do not pin a new exact version unless a required capability is missing or a known regression requires it. Prefer non-interactive, structured output when available, parse only the fields needed for the current gate, and do not return full project, deployment, environment, tool-catalog, log, or browser DOM payloads to the conversation.

Record `git status --short` immediately before and after `vercel link`, `vercel git connect`, `vercel env pull`, `vercel integration add`, and any Marketplace or plugin command that can write locally. Preserve every pre-existing change. Remove only files that the current command created and that Book Studio does not use, then confirm the working tree matches the recorded baseline apart from intended installation output.

## 4. Link the Vercel project and Git repository

1. Inspect the Git remote and any ignored `.vercel` link before creating anything.
2. If authentication is missing, start the Vercel login or OAuth flow and ask the user only to approve it.
3. List plausible Vercel scopes and projects connected to the same repository.
4. If there is one exact match, show its scope and project name and ask once to use it for linking, Git connection, environment changes, and deployment. If there are multiple matches or a link to another repository, present only the plausible choices and ask the user to select one.
5. If no exact match exists, propose the repository name as the Vercel project name. Ask for the exact project name, ask for the target scope only when multiple scopes are plausible, and include permission to create the project, connect the current Git remote, configure it, and deploy. Do not create a project until the user answers.
6. Create or link only the confirmed project, then connect the current Git remote so later pushes deploy through Vercel Git integration.
7. Confirm the linked Vercel scope and project ID without exposing credentials, then enforce every deployment metadata gate below:

   - The connected Git repository exactly matches the current Git remote after normalizing both to provider, owner, and repository identity; do not compare SSH and HTTPS URL strings literally.
   - The Framework Preset is exactly `nextjs`, not `null` or `Other`.
   - The Root Directory resolves to this repository root. Vercel may represent the repository root as `null`, empty, or `.`, so validate the resolved path rather than one serialized value.
   - The Vercel project Node.js version satisfies the repository's `24.x` engine.
   - When the current CLI supports it, `vercel deploy --dry --format=json` from the repository root detects Next.js. Inspect only the detected framework and deployment manifest; verify the Root Directory separately from linked project metadata. If dry run is unavailable, confirm that the repository build script invokes Next.js and keep every remote project gate above mandatory.

If any required project value is missing or mismatched, or a supported dry run does not detect Next.js, stop before every bootstrap or production deployment, correct the linked project setting, and query it again. An unavailable dry run does not block deployment when every remote project gate passes. A successful local build or a Vercel deployment marked `Ready` does not waive this gate, and remote framework auto-detection must not be assumed to repair a `null` preset.

Use Vercel account tools when available. The CLI fallback is `vercel link` followed by `vercel git connect`; inspect each command's current `--help` instead of assuming flags.

## 5. Provision Neon through Vercel Marketplace

1. List Neon Marketplace resources already installed for the linked project and team before provisioning anything.
2. Discover the current Neon product, plan, region, and metadata options before asking the user or provisioning. Agent-detected Vercel CLI sessions may be non-interactive, so inspect `vercel integration add neon --help` and pass every required plan or region value explicitly.
3. If one resource is an exact match, show its name, ownership, target database, region, plan, and project connection and ask once to reuse it. If multiple plausible resources remain, present only those matches and ask the user to choose.
4. If no exact match exists, propose `<vercel-project>-db`, a no-cost plan, and the region closest to the Vercel Functions region. In one question, ask for the exact Neon Marketplace resource name and confirmation of the proposed region. If the current Marketplace flow exposes a separate database-name field, ask for that name in the same question; otherwise do not invent another naming decision. Include plan and cost approval in this question when no no-cost plan is available.
5. Provision the official `neon` integration in **Create New Neon Account** mode using the confirmed name. Keep the resource Vercel-managed; linking an independent Neon account is a different fallback.
6. Use the confirmed plan and region. Stop again if provisioning presents a different price, plan, or region from the values the user confirmed.
7. Connect the resource to Production and Development without an env prefix. This app reads the exact name `DATABASE_URL`.
8. Let the integration inject environment variables. If `.env.local` does not exist, allow its automatic env pull. If the file exists, disable the automatic pull and merge later so no user values are overwritten.
9. Verify by variable name, never value, that the linked project has `DATABASE_URL` for Production and Development. The Marketplace value should be a pooled Neon connection string; do not replace it manually.

The CLI path starts with `vercel integration list`, `vercel integration discover`, and `vercel integration add neon`. Use the dashboard path `Marketplace → Neon → Install → Connect Project` when CLI provisioning is unavailable.

Marketplace provisioning may also create product skills under `.agents/skills` and a `skills-lock.json`; the current CLI does not guarantee a flag that suppresses those writes. Use the recorded Git baseline to identify files created by this installation. Keep them only when Book Studio will use them, otherwise remove only those newly created files. If local repository writes are prohibited, use the Vercel Dashboard Marketplace path instead of CLI provisioning.

If Marketplace terms or account approval opens in a browser, keep the provisioning process alive and resume after the user approves. If `DATABASE_URL` is missing, check the resource-to-project connection and selected environments, reconnect the same resource, and pull env again. Do not create a second database as the first retry. If `.env.local` already contains a different `DATABASE_URL`, identify its source and do not replace it without resolving which database is authoritative.

## 6. Apply and verify the database schema

Marketplace provisioning creates the database and credentials, but it does not apply the application schema owned by the Database knowledge document.

1. Confirm that the target is the newly provisioned empty database. For a reused database, inspect its schema, present the findings, and get explicit approval before applying SQL, as required by the Database knowledge document.
2. Execute the complete migration owned by the Database knowledge document against the exact Marketplace database using the first secure capability available:

   - An authenticated database query tool exposed by Vercel or the installed agent.
   - A one-off Node.js process using the already installed `postgres` client, with Development `DATABASE_URL` supplied by `vercel env run` or a protected env file.
   - Vercel Dashboard `Storage → database → Browser → Query` through an agent-controlled authenticated browser.
   - An already installed `psql` client.
   - Neon SQL Editor opened from the Marketplace resource.

3. Before using `vercel env run` or another unfamiliar wrapper, inspect its current `--help` and verify the selected environment. Pass `db/migrations/001_initial.sql` as a file or read it inside the one-off process; do not embed the migration or verification query in a shell-quoted inline SQL string. Remove any temporary ignored runner created for this step.
4. If none of those paths is available, ask the user for one action: open the Vercel database Query screen, paste the full migration file, and select **Run**. Do not ask them to create another database or copy credentials.
5. Query the schema and confirm every table required by the Database knowledge document exists.
6. If Production and Development point to different databases, apply and verify the migration once in each new database. Compare resource identifiers or hostnames without printing connection strings.

Apply the Database knowledge document's runtime verification boundary before continuing.

## 7. Configure the canonical origin and setup token

1. Inspect the current Vercel Deployment Protection method, scope, and domain coverage before the first production request. Use an account tool or API when available, otherwise inspect the authenticated Vercel project settings in the browser. Book Studio protects private routes with its owner passkey, while `/public/...` and its signed assets are intentionally reachable without an owner session.
2. If Vercel Authentication protects the canonical Production domain, explain these choices and ask once before changing the policy:

   - **Recommended:** allow anonymous requests to reach the canonical Production domain, rely on Book Studio's passkey for private routes, and keep generated and Preview deployments protected when desired, such as with Standard Protection. Public page links work.
   - Keep Vercel Authentication on the canonical Production domain for a second authentication layer. Public page links will not be anonymously accessible.

   Do not weaken Vercel protection without approval, claim that public sharing works through Vercel Authentication, or use a shareable bypass URL or automation secret as a public link. If the recorded choice cannot be applied because of permissions, plan limits, or domain coverage, stop and offer the exact administrator action or retain protection with public links reported as unavailable; do not silently choose for the user.
3. Obtain the actual assigned production origin from the linked Vercel project. Do not guess it from the project name and do not use a commit-specific Preview URL.
4. If the final origin is unavailable before deployment, re-run the deployment metadata gate, make one bootstrap production deployment, read its stable production alias, then continue. Do not start passkey setup on that incomplete deployment.
5. Set `SITE_URL` in Production to the exact HTTPS origin with no path, query, or fragment.
6. Generate `OWNER_SETUP_TOKEN` as a cryptographically random base64url value with at least 32 bytes of entropy. Store it as a sensitive Production variable and keep a private local handoff copy without printing it in tools, logs, patches, chat, or reports.
7. Pull Development variables into `.env.local` only after Marketplace provisioning. For a fresh file, use `vercel env pull .env.local`. If `.env.local` already exists, pull into a temporary ignored file and merge only the required keys; never use an overwrite flag on unknown user content.
8. Confirm that `.env.local` remains ignored by Git and contains `DATABASE_URL`. `SITE_URL` and the active setup token are required in Production, not for development auth bypass. Never print their values.

`SITE_URL` is the WebAuthn origin and relying-party source. Preview deployments have different origins, so this single-owner template supports passkey registration and authenticated writes only on the canonical production origin. Supporting Preview authentication requires a separate fixed-domain and credential design; do not imply that Preview is ready.

## 8. Verify locally

Run:

```sh
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm types:check
mise exec -- pnpm build
```

Then start `mise exec -- pnpm dev`, verify that `http://localhost:3000/docs` renders, exercise one database-backed read, and stop the server. Development mode bypasses authentication and redirects `/sign-in`, so local success does not verify passkeys or production authorization.

Fix only failures caused by installation. Report pre-existing failures separately and do not change application logic without the user's approval.

## 9. Deploy and register the owner

1. Re-run the deployment metadata gate, confirm the chosen Deployment Protection policy, and confirm all required Production variable names are present. Environment changes do not affect older deployments.
2. Create a non-interactive production deployment. When structured output is available, retain only the deployment ID or URL, status, framework, and canonical alias. Do not use a TTY spinner or stream full build logs into the conversation.
3. Wait for completion with `vercel inspect <deployment-id-or-url> --wait --timeout 10m`. Use structured output only when the inspected command's current `--help`, an account tool, or the Vercel API supports it. Read the relevant build or runtime logs only when the deployment is `Error` or a later health check fails.
4. A `Ready` state confirms deployment completion, not route health. Confirm the canonical alias exactly matches `SITE_URL`, then request `GET <SITE_URL>/api/auth/passkey`. Before owner registration it must return HTTP `200` with `{"mode":"setup"}`.
5. Treat any redirect whose `Location` points to Vercel Authentication, or a platform `401` or `403`, as Deployment Protection rather than an app response. Follow the policy chosen in section 7. Use an authenticated browser, Vercel account tool, or `vercel curl` only to diagnose the app behind retained protection.
6. Before `vercel curl` or another diagnostic that may create an automation bypass secret, record the existing credential IDs through an account tool, API, or project settings without exposing their values. If none exists, get authorization before running a command that may create one. After the diagnostic, remove only IDs added by this installation and confirm none remain. If credentials cannot be enumerated safely, use an authenticated browser or account tool that does not create one. Treat cleanup failure as a blocker. A bypassed request does not verify anonymous public access.
7. If a `Ready` deployment returns Vercel's platform `404 NOT_FOUND`, stop repeated requests and re-check Framework Preset, resolved Root Directory, connected repository, and deployment output before inspecting application routes. If the app returns `503`, inspect `DATABASE_URL`, database reachability, and the `owner_auth` schema before retrying. If setup POST returns `401`, check the exact request origin and setup token. Do not regenerate resources blindly.
8. Open `<SITE_URL>/sign-in`. If the agent controls a compatible browser, fill the setup token through a secret-preserving path and ask the user only to complete the passkey gesture. Otherwise, ask the user to open the exact URL in their normal browser and copy the token directly from the private local handoff location, never through chat.
9. Confirm registration redirects to `/docs`, the protected page renders, and the database contains exactly one owner row.
10. Remove `OWNER_SETUP_TOKEN` from Vercel Production and delete the local handoff copy. Redeploy so the running production deployment no longer has the token.
11. Confirm `GET <SITE_URL>/api/auth/passkey` now returns HTTP `200` with `{"mode":"authentication"}` and that the registered passkey still opens `/docs`.
12. If anonymous public sharing was selected, request an unpublished `/public/<slug>` without Vercel credentials and confirm it reaches Book Studio's `404` instead of redirecting to Vercel login or returning Vercel's platform `NOT_FOUND`. If the user retained Vercel Authentication on the canonical Production domain, report that public links require Vercel access and are not anonymously public.

Diagnose in this order: deployment metadata → deployment status and alias → Vercel protection response → one authenticated route-health request → app authentication and database. Finish each layer before moving to the next, and do not repeat the same failing request through multiple tools without new evidence.

## 10. Import a book when requested

1. Keep source PDFs under the ignored `books/` directory.
2. Read `.agents/skills/import-book/SKILL.md` in full and follow it.
3. Use `examples/sample-book.pdf` when the user wants to verify the workflow without private material.
4. Report which generated MDX and image directories are tracked by Git before publishing them.

## Failure routing

| Failure | Agent action | User action |
| --- | --- | --- |
| Vercel plugin, MCP, or CLI is absent | Resolve the current CLI version once, then reuse that exact ephemeral version | None |
| Package install reports `ENOTFOUND`, `EAI_AGAIN`, or an isolated-network error | Stop the retry loop, obtain network access, and retry the frozen install once | Approve network access only when the environment requires it |
| Vercel or Git provider is unauthenticated | Start the exact OAuth flow and resume afterward | Approve login or GitHub App access |
| Multiple Vercel scopes or matching projects exist | Present only the plausible matches | Choose one |
| Framework is `null`, `Other`, or the dry run does not detect Next.js | Correct Framework Preset, Root Directory, or project link and repeat the metadata gate; do not deploy | None unless project permission is missing |
| Marketplace terms block provisioning | Open the exact approval page and keep the CLI alive | Review and accept terms |
| A paid plan is required or free quota is exhausted | Stop before provisioning another resource | Approve cost or choose an existing resource |
| A Neon resource already exists | Verify ownership, project connection, and env source before reuse | Confirm reuse, or choose if multiple matches remain |
| `DATABASE_URL` was not injected | Reconnect the existing resource, select Production and Development, then pull again | None unless team permission is missing |
| Env pull would overwrite `.env.local` | Pull to an ignored temporary file and merge required keys | None |
| A Vercel or Marketplace command creates repository files | Compare with the recorded baseline and remove only newly generated files that Book Studio does not use | None |
| No automated SQL executor is available | Open Vercel's database Query screen with the migration ready | Paste the file and select **Run** |
| Build passes but auth API returns `503` | Diagnose DB connectivity and the schema owned by the Database knowledge document | None |
| Deployment Protection redirects to Vercel login or returns `401` or `403` | Apply the recorded section 7 choice; ask again only when no choice was recorded or the actual policy differs | Choose only when a decision is missing, or approve access needed to apply the recorded choice |
| A temporary automation bypass credential cannot be removed | Stop completion and report the exact credential ID without its secret value | Grant cleanup permission or remove that credential |
| Deployment is `Ready` but returns Vercel's platform `404 NOT_FOUND` | Re-run the metadata gate and inspect deployment output before application code | None |
| Production alias differs from `SITE_URL` | Update `SITE_URL`, redeploy, and test only the canonical origin | Complete DNS only for a requested custom domain |
| Agent browser cannot create a passkey | Hand off the exact production URL and private local token location | Enter the token and complete the passkey prompt |
| Marketplace itself is unavailable | Stop and offer retry or an explicitly approved standalone Neon fallback | Choose whether to leave the Marketplace path |

## Owner recovery

Recovery deletes the registered passkey and every active owner session. Get explicit confirmation, create a new setup token, set it in Vercel Production, and redeploy. Then run this transaction against the verified production database:

```sql
BEGIN;
DELETE FROM auth_challenges;
DELETE FROM owner_auth WHERE id = 1;
COMMIT;
```

Open the canonical `/sign-in`, register the new passkey, remove the setup token, and redeploy again.

## Completion report

Report the configured scope, Vercel project and canonical URL, verified framework and resolved root, Marketplace resource name, environments connected, schema verification, Deployment Protection choice and public-link availability, deployment and route-health status, temporary bypass credential cleanup, repository side effects, checks run, user actions completed, and remaining blockers. Never include secret values or database connection strings.

## Official references

- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Vercel Marketplace integration CLI](https://vercel.com/docs/cli/integration)
- [Vercel dry-run deployments](https://vercel.com/changelog/dry-run-deployments-with-vercel-cli)
- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)
- [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Git connection](https://vercel.com/docs/cli/git)
- [Vercel Marketplace database browser](https://vercel.com/changelog/query-and-manage-marketplace-databases-from-the-dashboard)
- [Neon on Vercel Marketplace](https://vercel.com/marketplace/neon)
