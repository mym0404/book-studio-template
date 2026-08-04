# Install Book Studio

Use this guide when a user asks an AI coding agent to install or deploy Book Studio. This document owns deployment-path selection only. The selected path document owns the actual installation.

## Select the installation path

1. Read `AGENTS.md`, `.agents/knowledge/db.md`, `package.json`, and `.env.example` before asking a question.
2. If the user already selected a path, do not ask them to choose it again.
3. If the request is local development only, follow `CONTRIBUTION.md` and stop after local verification.
4. Otherwise, explain these production paths in plain language and ask the user to choose one:

   - **Vercel with Neon:** The lowest-operations path. Vercel runs Next.js and provisions Neon through its Marketplace, but the installation is tied to those services.
   - **Docker with managed PostgreSQL:** The portable path. The same image runs on a managed container host, while a managed PostgreSQL provider owns backups and database availability. After preflight, recommend one viable host-and-database combination for the user to approve.

5. After the user chooses, read the selected document in full and follow it together with the shared contracts below:

   - Vercel with Neon: `.agents/install-guides/vercel.md`
   - Docker with managed PostgreSQL: `.agents/install-guides/docker.md`

Do not combine steps from the other provider guide or silently choose a production path. Kubernetes, a Docker-capable VPS, a direct Node.js server, and platform adapters are compatible but operator-managed paths, not guided installations. If the user explicitly requests one, explain that boundary and confirm whether to continue with a platform-specific plan or select a guided path. Before every external write, show the exact target and get authorization as required by `AGENTS.md`.

## Shared decision contract

Before asking the user to choose an external resource, explain four points briefly:

1. What the resource controls.
2. The recommended default for this single-owner application.
3. The operational or cost tradeoff.
4. The exact external action that follows approval.

Ask only decisions that change the result. Do not turn provider terminology into user-facing choices when the selected guide can resolve it safely.

Recommend one default after read-only preflight. Show alternatives only when they materially change cost, control, or operational responsibility, and do not ask the same decision again unless the target or price changes.

## Shared product constraints

- Production requires an HTTPS origin because `SITE_URL` defines the WebAuthn origin and relying-party ID.
- Production requires a reachable PostgreSQL database with the schema defined by `db/migrations/001_initial.sql` present.
- Never configure `AUTH_MODE=bypass` in production.
- Generated MDX and book images are built into the deployment and may expose source material through repository or image access. Recommend a private repository for copyrighted, confidential, or personal books.
- Importing or changing a book requires a new build and deployment. Runtime containers do not modify book files.
