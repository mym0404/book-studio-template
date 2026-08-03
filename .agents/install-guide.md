# Install Book Studio

Use this guide when a user asks you to install or set up Book Studio. Own the setup from the repository root. Ask the user only for result-changing choices, permission for external changes, secrets that cannot be accessed securely, and browser gestures that require a person.

## 1. Confirm the target

1. Read `AGENTS.md`, `mise.toml`, `package.json`, `.env.example`, and `db/migrations/001_initial.sql` in full.
2. Inspect the working tree and preserve unrelated changes.
3. Determine whether the user wants local setup only or local setup plus production deployment.
4. Determine whether to reuse authorized GitHub, Neon, and Vercel resources or create new ones. Get explicit permission before creating or changing external resources, repository visibility, secrets, commits, pushes, or deployments.
5. Recommend a private repository before importing copyrighted, confidential, or personal PDFs. A passkey protects the deployed app, not generated MDX and images committed to Git.

## 2. Install the local toolchain

1. Detect the operating system and check whether `mise` is available.
2. If `mise` is missing, install it with an available package manager or the current official mise installation method. Ask the user only if the install requires administrator approval or a terminal restart.
3. Review `mise.toml`, then run:

   ```sh
   mise trust
   mise install
   mise exec -- pnpm install --frozen-lockfile
   ```

`mise` installs the pinned Node.js, pnpm, Python, uv, and gitleaks versions. Do not install Poppler or other PDF packages; the import tooling uses `pypdfium2`.

## 3. Configure Neon

1. Use an existing Neon database only when the user identifies it and confirms that applying this repository's schema is safe. Otherwise, get permission to create a fresh Neon project and database.
2. Prefer an available Neon integration or authenticated browser session so the user does not have to perform the setup manually.
3. Apply the complete `db/migrations/001_initial.sql` file once to the fresh database.
4. Do not apply the migration to an existing Book Studio database or print its connection string.

If no secure Neon access is available, ask the user to create the database and run the migration in the Neon SQL Editor. Give only the exact action they must take, then continue when it is complete.

## 4. Configure the environment

1. Create `.env.local` from `.env.example` if it does not exist. Preserve an existing `.env.local` and never overwrite it without confirmation.
2. Populate these values without printing them or asking the user to paste secrets into chat:

   - `DATABASE_URL`: the pooled Neon connection string.
   - `SITE_URL`: the final HTTPS production origin with no path, query, or fragment. For local-only setup, use the planned production origin.
   - `OWNER_SETUP_TOKEN`: a cryptographically random base64url value containing at least 32 bytes of entropy.

3. If a value cannot be obtained securely, ask the user to enter it directly in `.env.local` and confirm only that it is present.
4. Confirm that `.env.local` remains ignored by Git. Never print, commit, or expose its values in logs, patches, chat, or reports.

## 5. Verify the local installation

Run the repository checks:

```sh
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm types:check
mise exec -- pnpm build
```

Then start the app with `mise exec -- pnpm dev`, verify that `http://localhost:3000` loads, and stop the development server. Development mode skips passkey authentication, but database-backed reading progress and annotations still use Neon.

Fix only failures caused by the installation. Report pre-existing failures separately and do not change application logic without the user's approval.

## 6. Deploy when requested

Skip this section for local-only setup.

1. Confirm explicit permission before committing, pushing, creating or changing a GitHub repository, or deploying to Vercel.
2. Use a private GitHub repository when the user may import material they cannot publish.
3. Import the authorized repository into Vercel and configure `DATABASE_URL`, `SITE_URL`, and `OWNER_SETUP_TOKEN` without exposing their values.
4. Set `SITE_URL` to the exact final HTTPS production origin and deploy. If the production origin changes, update `SITE_URL`, redeploy, and register the passkey again after owner recovery.
5. Open `/sign-in` on the production site. Ask the user to enter the setup token and complete the passkey prompt because these are private, user-presence actions.
6. After registration succeeds, remove `OWNER_SETUP_TOKEN` from Vercel or replace it with a new unused value.
7. Verify that the owner can sign in and open a protected `/docs` page.

## 7. Import a book when requested

1. Keep source PDFs under the ignored `books/` directory.
2. Read `.agents/skills/import-book/SKILL.md` in full and follow it.
3. Use `examples/sample-book.pdf` when the user wants to verify the workflow without private material.
4. Report which generated MDX and image directories are tracked by Git before publishing them.

## Owner recovery

Recovery deletes the registered passkey and all active owner sessions. Get explicit confirmation, set a new `OWNER_SETUP_TOKEN` in Vercel, redeploy, and run this transaction against the correct Neon database:

```sql
BEGIN;
DELETE FROM auth_challenges;
DELETE FROM owner_auth WHERE id = 1;
COMMIT;
```

Then open `/sign-in` and ask the user to register a new passkey.

## Completion report

Report the configured scope, external resources changed, verification commands and results, remaining user actions, and any blockers. Never include secret values.
