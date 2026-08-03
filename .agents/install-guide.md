# Install Book Studio

Use this guide when a user asks an AI coding agent to install Book Studio. Own the setup from the repository root and continue until the requested local or production outcome is verified.

The default production path is:

`Vercel project → Vercel Marketplace Neon → database schema → environment → production deployment → owner passkey`

Do not ask the user to create a separate Neon account, copy a database URL, install a CLI, or edit an env file on the happy path. Use a standalone Neon setup only after the Vercel Marketplace path is unavailable and the user approves that fallback.

## User actions only

Ask the user only when a person or a result-changing decision is required:

- Approve Vercel, Git provider, or Marketplace authentication and terms.
- Choose between multiple plausible Vercel teams, projects, or existing databases.
- Approve any paid plan. Prefer a no-cost plan when one is available.
- Complete custom-domain DNS when they explicitly want a custom domain.
- Complete the passkey prompt on their device.

Keep CLI processes alive while the user completes a browser approval, then resume automatically.

## 1. Establish authority and defaults

1. Read `AGENTS.md`, its relevant routed knowledge documents, `mise.toml`, `package.json`, and `.env.example` in full.
2. Determine whether the request is local-only or includes production. For an unqualified install request, propose the full production path and ask once for permission to create or connect the Vercel project, connect its Git repository, provision a no-cost Neon Marketplace database, set environment variables, and deploy.
3. Use these defaults unless the user already chose otherwise:

   - Reuse the current Git remote and an exactly matching Vercel project.
   - Create missing resources under the user's current Vercel scope.
   - Use Vercel-managed Neon from the Vercel Marketplace.
   - Use a no-cost Neon plan and a database region close to the Vercel Functions region.
   - Connect the database to Production and Development. Do not connect Preview by default.
   - Use the assigned Vercel production domain. Configure a custom domain only when requested.

4. Recommend a private repository before importing copyrighted, confidential, or personal PDFs. A passkey protects the deployed app, not generated MDX and images committed to Git.

## 2. Install the local toolchain

1. Detect the operating system and check whether `mise` is available.
2. If `mise` is missing, install it with an available package manager or the current official mise installation method. Perform the install yourself; involve the user only for an administrator prompt or required terminal restart.
3. Review `mise.toml`, then run:

   ```sh
   mise trust
   mise install
   ```

4. Inspect the working tree and preserve unrelated changes.
5. Run `mise exec -- pnpm install --frozen-lockfile`. If it fails because the lockfile is stale, report the repository mismatch instead of silently running an unlocked install.

`mise` supplies the pinned Node.js, pnpm, Python, uv, and gitleaks versions. Do not install Poppler or other PDF packages; the import tooling uses `pypdfium2`.

## 3. Resolve Vercel capabilities

Use the first available path that can complete the action:

1. Inspect the current agent, including Codex, Claude Code, or Cursor, for the official Vercel plugin, Vercel skills, Vercel MCP server, and Vercel account tools.
2. Load installed official Vercel guidance first. Use account tools when they expose the required project, Marketplace, environment, deployment, and log actions.
3. Otherwise, use an authenticated installed Vercel CLI.
4. If the CLI is absent, run the current official CLI ephemerally with pinned pnpm, such as `mise exec -- pnpm dlx vercel@latest <command>`. Do not require a global install.
5. If terminal automation cannot finish a browser-only step, use an authenticated browser session. Ask the user to click only the exact approval that the agent cannot complete.

A guidance plugin does not prove that account actions are available. Confirm the actual tools before relying on them. Do not install or replace an agent plugin unless the user asks.

## 4. Link the Vercel project and Git repository

1. Inspect the Git remote, any ignored `.vercel` link, and Vercel projects connected to the same repository before creating anything.
2. Reuse one exact match. If there are multiple matches, different scopes, or a link to another repository, ask the user to choose before relinking.
3. If authentication is missing, start the Vercel login or OAuth flow and ask the user only to approve it.
4. Create a Vercel project only when no exact match exists, then link the repository root to it.
5. Connect the current Git remote to the Vercel project so later pushes deploy through Vercel Git integration.
6. Confirm the linked Vercel scope, project ID, repository, framework, and root directory without exposing credentials.

Use Vercel account tools when available. The CLI fallback is `vercel link` followed by `vercel git connect`; inspect each command's current `--help` instead of assuming flags.

## 5. Provision Neon through Vercel Marketplace

1. List Neon Marketplace resources already installed for the linked project and team. Reuse an existing resource only when its ownership and target database are unambiguous.
2. Discover the current Neon product, plan, and metadata options before provisioning. Agent-detected Vercel CLI sessions may be non-interactive, so inspect `vercel integration add neon --help` and pass every required plan or region value explicitly.
3. Provision the official `neon` integration in **Create New Neon Account** mode. Keep the resource Vercel-managed; linking an independent Neon account is a different fallback.
4. Use a no-cost plan when offered. Stop for approval before any paid plan or when the free quota is exhausted.
5. Match the database region to the Vercel Functions region when possible.
6. Connect the resource to Production and Development without an env prefix. This app reads the exact name `DATABASE_URL`.
7. Let the integration inject environment variables. If `.env.local` does not exist, allow its automatic env pull. If the file exists, disable the automatic pull and merge later so no user values are overwritten.
8. Verify by variable name, never value, that the linked project has `DATABASE_URL` for Production and Development. The Marketplace value should be a pooled Neon connection string; do not replace it manually.

The CLI path starts with `vercel integration list`, `vercel integration discover`, and `vercel integration add neon`. Use the dashboard path `Marketplace → Neon → Install → Connect Project` when CLI provisioning is unavailable.

If Marketplace terms or account approval opens in a browser, keep the provisioning process alive and resume after the user approves. If `DATABASE_URL` is missing, check the resource-to-project connection and selected environments, reconnect the same resource, and pull env again. Do not create a second database as the first retry. If `.env.local` already contains a different `DATABASE_URL`, identify its source and do not replace it without resolving which database is authoritative.

## 6. Apply and verify the database schema

Marketplace provisioning creates the database and credentials, but it does not apply the application schema owned by the Database knowledge document.

1. Confirm that the target is the newly provisioned empty database. For a reused database, follow the Database knowledge document before changing it.
2. Execute the complete migration owned by the Database knowledge document against the exact Marketplace database using the first secure capability available:

   - An authenticated database query tool exposed by Vercel or the installed agent.
   - A one-off Node.js process using the already installed `postgres` client, with Development `DATABASE_URL` supplied by `vercel env run` or a protected env file.
   - Vercel Dashboard `Storage → database → Browser → Query` through an agent-controlled authenticated browser.
   - An already installed `psql` client.
   - Neon SQL Editor opened from the Marketplace resource.

3. If none of those paths is available, ask the user for one action: open the Vercel database Query screen, paste the full migration file, and select **Run**. Do not ask them to create another database or copy credentials.
4. Query the schema and confirm every table required by the Database knowledge document exists.
5. If Production and Development point to different databases, apply and verify the migration once in each new database. Compare resource identifiers or hostnames without printing connection strings.

Apply the Database knowledge document's runtime verification boundary before continuing.

## 7. Configure the canonical origin and setup token

1. Obtain the actual assigned production origin from the linked Vercel project. Do not guess it from the project name and do not use a commit-specific Preview URL.
2. If the final origin is unavailable before deployment, make one bootstrap production deployment, read its stable production alias, then continue. Do not start passkey setup on that incomplete deployment.
3. Set `SITE_URL` in Production to the exact HTTPS origin with no path, query, or fragment.
4. Generate `OWNER_SETUP_TOKEN` as a cryptographically random base64url value with at least 32 bytes of entropy. Store it as a sensitive Production variable and keep a private local handoff copy without printing it in tools, logs, patches, chat, or reports.
5. Pull Development variables into `.env.local` only after Marketplace provisioning. For a fresh file, use `vercel env pull .env.local`. If `.env.local` already exists, pull into a temporary ignored file and merge only the required keys; never use an overwrite flag on unknown user content.
6. Confirm that `.env.local` remains ignored by Git and contains `DATABASE_URL`. `SITE_URL` and the active setup token are required in Production, not for development auth bypass. Never print their values.

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

1. Confirm all required Production variable names are present, then create a new production deployment. Environment changes do not affect older deployments.
2. Wait until the deployment is Ready and confirm its canonical alias exactly matches `SITE_URL`.
3. Request `GET <SITE_URL>/api/auth/passkey`. Before owner registration it must return HTTP `200` with `{"mode":"setup"}`.
4. If Vercel Deployment Protection returns a platform `401` or `403`, repeat the check through an authenticated browser, Vercel account tool, or `vercel curl`; do not confuse that response with the app's auth API.
5. If the app returns `503`, inspect `DATABASE_URL`, database reachability, and the `owner_auth` schema before retrying. If setup POST returns `401`, check the exact request origin and setup token. Do not regenerate resources blindly.
6. Open `<SITE_URL>/sign-in`. If the agent controls a compatible browser, fill the setup token through a secret-preserving path and ask the user only to complete the passkey gesture. Otherwise, ask the user to open the exact URL in their normal browser and copy the token directly from the private local handoff location, never through chat.
7. Confirm registration redirects to `/docs`, the protected page renders, and the database contains exactly one owner row.
8. Remove `OWNER_SETUP_TOKEN` from Vercel Production and delete the local handoff copy. Redeploy so the running production deployment no longer has the token.
9. Confirm `GET <SITE_URL>/api/auth/passkey` now returns HTTP `200` with `{"mode":"authentication"}` and that the registered passkey still opens `/docs`.

## 10. Import a book when requested

1. Keep source PDFs under the ignored `books/` directory.
2. Read `.agents/skills/import-book/SKILL.md` in full and follow it.
3. Use `examples/sample-book.pdf` when the user wants to verify the workflow without private material.
4. Report which generated MDX and image directories are tracked by Git before publishing them.

## Failure routing

| Failure | Agent action | User action |
| --- | --- | --- |
| Vercel plugin, MCP, or CLI is absent | Use `mise exec -- pnpm dlx vercel@latest` | None |
| Vercel or Git provider is unauthenticated | Start the exact OAuth flow and resume afterward | Approve login or GitHub App access |
| Multiple Vercel scopes or matching projects exist | Present only the plausible matches | Choose one |
| Marketplace terms block provisioning | Open the exact approval page and keep the CLI alive | Review and accept terms |
| A paid plan is required or free quota is exhausted | Stop before provisioning another resource | Approve cost or choose an existing resource |
| A Neon resource already exists | Verify ownership, project connection, and env source before reuse | Choose only if multiple matches remain |
| `DATABASE_URL` was not injected | Reconnect the existing resource, select Production and Development, then pull again | None unless team permission is missing |
| Env pull would overwrite `.env.local` | Pull to an ignored temporary file and merge required keys | None |
| No automated SQL executor is available | Open Vercel's database Query screen with the migration ready | Paste the file and select **Run** |
| Build passes but auth API returns `503` | Diagnose DB connectivity and the schema owned by the Database knowledge document | None |
| Deployment Protection returns `401` or `403` | Retry with an authenticated Vercel request before diagnosing app auth | Approve Vercel access if required |
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

Report the configured scope, Vercel project and canonical URL, Marketplace resource name, environments connected, schema verification, deployment status, checks run, user actions completed, and remaining blockers. Never include secret values or database connection strings.

## Official references

- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Vercel Marketplace integration CLI](https://vercel.com/docs/cli/integration)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Git connection](https://vercel.com/docs/cli/git)
- [Vercel Marketplace database browser](https://vercel.com/changelog/query-and-manage-marketplace-databases-from-the-dashboard)
- [Neon on Vercel Marketplace](https://vercel.com/marketplace/neon)
