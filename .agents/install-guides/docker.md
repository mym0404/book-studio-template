# Install Book Studio with Docker and Managed PostgreSQL

Use this guide after the root installation guide selects Docker with managed PostgreSQL. Own the production setup from the repository root and continue until it is verified.

The deployment contract is intentionally provider-neutral:

- One immutable Docker image runs the Next.js server.
- One managed PostgreSQL database stores every mutable application record.
- One stable HTTPS origin supplies the WebAuthn origin and relying-party ID.
- The container needs outbound PostgreSQL access and does not need a persistent filesystem.
- Imported MDX and book images are built into the image, so content changes require a rebuild and deployment.

## Interaction contract

### Announce the flow before acting

Before setup work, send a two-sentence notice. Do not list implementation steps or checkpoints. Adapt this template:

```text
I’ll set up Book Studio with Docker and managed PostgreSQL. I’ll start with read-only checks and ask before creating or changing external resources.
```

Start the read-only preflight immediately after this notice. Never create a project, database, service, domain, registry, or deployment before the user approves the exact target.

## 1. Establish authority and inspect the target

1. Read `AGENTS.md`, `.agents/knowledge/db.md`, `.agents/knowledge/book-mdx-structure.md`, `mise.toml`, `package.json`, `.env.example`, `Dockerfile`, and `.dockerignore` in full.
2. Confirm that the root guide selected this production path.
3. Inspect the Git remote, working tree, available container tools, authenticated provider tools, existing projects, existing databases, and current domains without changing them.
4. Use an authenticated account tool first, then an already installed CLI, then an authenticated browser for provider actions. For a private Git repository, use the provider's OAuth or Git-app flow and ask the user only to approve access; never ask them to paste an access token into chat.
5. Preserve every pre-existing working-tree change.
6. Recommend a private repository before deploying copyrighted, confidential, or personal books.

## 2. Close the production decisions and authorize writes

After read-only preflight, recommend one viable container-host and database combination. Show alternatives only when they materially change cost, control, or operational responsibility. Ask the user to choose the combination once.

1. **Container host and service:** Prefer a managed container service that accepts a Dockerfile, supplies HTTPS, injects secrets, retains logs, and supports graceful restarts. Confirm the exact account, project, service name, and region.
2. **Managed PostgreSQL:** Prefer a provider and region close to the container service. Confirm the exact account, project, database name, region, plan, price, backup retention, and restore capability before creation or reuse.
3. **Canonical origin:** For a new installation, prefer the stable HTTPS production domain supplied by the host unless the user requests a custom domain. Record it as `host-assigned production domain` until the service allocates the exact value; do not ask the user to invent it. When migrating an existing owner, preserve the previous canonical hostname when possible because changing it requires owner recovery.
4. **Source and build path:** Prefer building directly from the confirmed Git repository when the host supports its Dockerfile. Use an image registry only when the selected host requires one, and keep that registry private with scoped pull access because the image contains book content.

Before any external write, show the exact known account, service, database, regions, plan, price, source revision, and actions that will follow. The host-assigned domain may remain unresolved until service creation or a bootstrap deployment. The first approval may cover those resource changes and one bootstrap deployment, but not the final origin-dependent configuration. Ask again only when the exact origin becomes known or another target, scope, or cost changes.

Explain that colocating the app and database reduces request latency and cross-region data-transfer risk. Explain that managed PostgreSQL reduces backup and recovery work but does not remove the need to verify retention, restore capability, and ownership.

## 3. Install the local toolchain and build the image

1. Review `mise.toml`, then run:

   ```sh
   mise trust
   mise install
   mise exec -- pnpm install --frozen-lockfile
   ```

2. Confirm Docker is installed and the Docker daemon is available. If it is missing, run `BOOK_STUDIO_OUTPUT=standalone mise exec -- pnpm build`, report that container execution remains unverified, and ask before installing system software.
3. Build the production Dockerfile locally:

   ```sh
   docker build -t book-studio:local .
   ```

4. Confirm the final image runs as a non-root user and contains `.next/static`, `public`, and `content-assets`.
5. Do not pass `DATABASE_URL`, `OWNER_SETUP_TOKEN`, or other secrets as build arguments. They are runtime values.
6. If the selected host requires a registry and its CPU architecture differs from the local machine, build for the host platform, push only to the approved private repository, and record the deployed image digest.

The Docker build sets `BOOK_STUDIO_OUTPUT=standalone` only while compiling. Non-Docker builds retain the standard Next.js output used by other deployment paths.

## 4. Provision or select managed PostgreSQL

1. List plausible existing databases before proposing a new one.
2. Create or reuse only the database approved in section 2. Stop if the provider presents a different owner, region, plan, price, retention policy, or restore capability.
3. Obtain the provider's TLS connection string through a secret-preserving account tool, CLI, or dashboard flow. Never print or return its value.
4. Record how to initiate a restore and who controls the database account. Do not perform a restore during installation.

Book Studio opens at most one PostgreSQL connection per running app instance. A single small instance is the default for this private, single-owner application. Do not add a connection pooler, Redis, Kubernetes, or multiple app replicas unless an observed limit requires them.

## 5. Apply and verify the schema

1. Confirm whether the selected database is new and empty.
2. For a reused database, inspect its schema and ownership. If the existing schema is compatible, verify it without reapplying the initial migration. If it is missing or incompatible, stop and obtain approval for a separate schema-change plan.
3. For a new empty database only, apply `db/migrations/001_initial.sql` as one trusted file through the first secure option available:

   - The managed provider's authenticated SQL tool.
   - An already installed `psql` client with the connection string supplied through a protected environment.
   - A one-off process inside the provider's private network.

4. Do not split the migration on semicolons and do not embed it in a shell-quoted command.
5. Confirm the required tables listed in `.agents/knowledge/db.md` exist.
6. Query whether the production `owner_auth` table contains its single owner row and record only `new owner` or `existing owner`. Never return credential data.

A successful image build does not verify database access because the database client connects lazily at runtime.

## 6. Configure the production runtime

1. Create or select the approved container service and connect the approved source. Keep automatic production deployment disabled until runtime variables are ready when the host supports that control.
2. Configure `DATABASE_URL` on the service.
3. Obtain the exact stable HTTPS origin. If the host allocates it only after a release, make one bootstrap deployment with `DATABASE_URL`, read the stable assigned origin, and do not begin passkey setup on that deployment.
4. Show the exact service, origin, runtime variable names, and source revision, then obtain authorization for the final configuration and deployment.
5. Configure `SITE_URL` with that exact origin.
6. For a new owner only, generate `OWNER_SETUP_TOKEN` as a cryptographically random base64url value with at least 32 bytes of entropy and store it through a secret-preserving path. For an existing owner, leave this variable unset.
7. For an existing owner, compare the new hostname with the previous canonical hostname from deployment metadata or one focused user answer. Preserve the old hostname or follow owner recovery only after explicit confirmation; do not assume a passkey works on a different hostname.

Use these runtime variables or provider secrets:

| Variable | Required value |
| --- | --- |
| `DATABASE_URL` | The selected managed PostgreSQL TLS connection string. |
| `SITE_URL` | The exact stable HTTPS origin with no path, query, or fragment. |
| `OWNER_SETUP_TOKEN` | New owner or confirmed recovery only; remove it after registration. |

Leave `AUTH_MODE` unset so production uses passkey authentication. Never set it to `bypass` outside local development.

The container listens on port `3000` by default and honors the platform's runtime `PORT` value. Terminate TLS at the container platform or its load balancer. Do not expose the Next.js process directly from a public VM without a reverse proxy that supplies HTTPS and request limits.

## 7. Deploy and verify route health

1. Build and deploy the repository Dockerfile through the selected host.
2. Confirm the deployment uses the expected image revision and runtime variable names without exposing their values.
3. Request `GET <SITE_URL>/api/auth/passkey`. It must return HTTP `200` with `{"mode":"setup"}` for a new owner or `{"mode":"authentication"}` for an existing owner. A mismatch means the deployment is using the wrong database or recorded owner state.
4. If the request returns `503`, check database reachability, TLS requirements, and schema presence before changing application code.
5. Request a protected page without a session and confirm it redirects to `/sign-in`.
6. Request an unpublished `/public/<slug>` and confirm Book Studio returns `404`.

Treat an image build, a running container, and an HTTP-ready platform status as separate checks. None proves the next one.

## 8. Complete owner authentication

1. If the API reports `setup`, open the canonical `/sign-in` URL, fill the setup token through a secret-preserving path, and ask the user only to complete the passkey gesture. If the agent cannot control the browser, provide only the path to a user-accessible private handoff file; when no such path exists, ask the user to generate one token and enter it directly in both the provider secret UI and `/sign-in`, never through chat.
2. After registration, remove `OWNER_SETUP_TOKEN` from the production service, delete every temporary copy, and restart or redeploy so the running container no longer receives it.
3. If the API reports `authentication`, do not create or configure a setup token. Ask the user to complete the existing passkey gesture. If the hostname changed or no passkey is available, stop and follow owner recovery only after explicit confirmation.
4. Confirm `/docs` renders, the database contains exactly one owner row, and `GET <SITE_URL>/api/auth/passkey` returns HTTP `200` with `{"mode":"authentication"}`.

## 9. Verify the portable deployment contract

Run the repository checks:

```sh
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm types:check
mise exec -- pnpm build
```

Then verify the production image or deployed container covers:

- Passkey setup and authentication on the canonical HTTPS origin.
- A private documentation page and private book image.
- One database-backed read and write.
- An unpublished public page returning `404`.
- A published page and its signed image loading without an owner session.

Fix only failures caused by installation. Report pre-existing failures separately and do not change application logic without approval.

## Failure routing

| Failure | Agent action | User action |
| --- | --- | --- |
| Docker is unavailable locally | Verify standalone output, report that container execution is unverified, and offer installation only with approval | Approve system software installation or accept provider-side build verification |
| The host cannot build the Dockerfile | Inspect its documented build contract; use a registry only if required | Approve the exact registry and image destination |
| No stable HTTPS domain is available | Stop passkey setup and configure the host's stable domain or an approved custom domain | Choose the domain when multiple options remain |
| Database creation has a cost | Stop before creation and show the plan and price | Approve the cost or select an existing database |
| A reused database is not empty | Inspect and report its schema without applying the migration | Approve the exact schema change or choose another database |
| The auth API returns `503` | Check runtime variables, network access, TLS, and schema in that order | Grant access only when account permission is missing |
| A protected page loops back to sign-in | Verify `SITE_URL`, cookie security, proxy HTTPS, and the stored session | Complete a new passkey gesture only after the cause is fixed |
| An existing passkey is unavailable on the new hostname | Preserve the previous canonical hostname or prepare the Database knowledge document's recovery transaction | Explicitly approve destructive owner recovery |
| Book images return `404` | Confirm `content-assets` exists in the final image and the deployment uses the expected revision | None unless a new deployment needs approval |

## Owner recovery

Recovery deletes the registered passkey and every active owner session. Get explicit confirmation, create a new temporary setup token, configure it on the exact production service, and restart or redeploy. Confirm the running container has the variable name without exposing its value, then run the recovery transaction from the Database knowledge document against the verified production database. Register the replacement passkey, remove the setup token, restart or redeploy, and verify authentication again.

## Completion report

Report only the selected host and database service, canonical URL, whether passkey sign-in and public sharing work, and any remaining user action or blocker. Summarize completed checks in one line. Never include secret values, connection strings, or internal gate-by-gate details.

## Official references

- [Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
