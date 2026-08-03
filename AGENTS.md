# Book Studio agent guide

## Knowledge System

- This root `AGENTS.md` owns durable repository facts by default and is the only
  router to topic documents. Each routed document owns its assigned facts, and
  each durable fact appears in one owner.
- [Book MDX Structure](.agents/knowledge/book-mdx-structure.md) owns source and rendered-content boundaries, asset paths, book layout, slugs, metadata contracts, and page ordering.
- [Database](.agents/knowledge/db.md) owns PostgreSQL provider portability, connection configuration, persisted application state, schema application, and local database setup.
- [Markdown Syntax](.agents/knowledge/markdown-syntax.md) owns Fumadocs-specific MDX components, code block extensions, and compiler caveats.
- Read the relevant routed document in full before changing book content or authoring rules. Keep each durable fact in one owner.

## Project contract

- Book Studio is a private, single-owner reading library generated from PDFs.
- Use English for website UI, navigation, metadata, search, published summaries, and reading notes. Source quotations may preserve their original language.
- Build the app with the Next.js App Router, React, TypeScript, Tailwind CSS, Fumadocs MDX, and Fumadocs UI.
- Use Node.js 24 and pnpm through the versions pinned by mise and `package.json`.
- `feature/library/source.ts` supplies both the documentation pages and search index. `app/docs` renders its page tree.

## Setup and external actions

- Review and run `mise trust`, then run `mise install` before repository commands. Use `mise exec -- pnpm <command>` when the shell does not activate mise automatically.
- Do not create or change GitHub, Neon, or Vercel resources, change repository visibility, store external secrets, commit, push, or deploy without explicit user authorization.
- Never print or commit `.env.local`, `DATABASE_URL`, or `OWNER_SETUP_TOKEN`.

## PDF import and generated content

- Read `.agents/skills/import-book/SKILL.md` in full before importing a PDF.
- Generated MDX and images are tracked by Git and can expose source material through repository visibility. State that risk before importing sensitive or copyrighted material into a public repository.
- Preserve the PDF import skill's fidelity and source-comparison gates. Do not treat Docling output as publish-ready content.

## Reading state and public pages

- Reading progress applies only to chapters. Annotations may apply to a book landing page or chapter and use an `exact`, `prefix`, and `suffix` text quote selector.
- `/docs/<book-slug>/saved` is a protected virtual view supplied by `feature/library/source.ts`. Do not author it under `content/docs`.
- A `public_pages` row publishes one page at `/public/<book-slug>[/<chapter-slug>]`. Public routes must return `404` without that row, and public image routes must repeat the publication check.

## Access control

- `pnpm dev` sets `AUTH_MODE=bypass`. Unset `AUTH_MODE`, E2E, and production use passkey authentication, and production never bypasses authentication.
- When no owner exists, `/sign-in` requires `OWNER_SETUP_TOKEN` before registering the passkey. There is no password, logout endpoint, or recovery UI.
- `proxy.ts` only performs a coarse cookie-presence redirect. Protected pages and route handlers must enforce authorization with `requireOwnerPage()` or `requireOwnerRequest()`.
- Private route responses must use `PRIVATE_NO_STORE_HEADERS` or `withPrivateNoStore()`.
- Keep `SITE_URL` as the single WebAuthn origin and relying-party source. It accepts HTTPS origins and `http://localhost[:port]` for local passkey tests.

## Change discipline

- Make the smallest complete change and preserve unrelated work.
- Use existing helpers and project patterns before adding a dependency or abstraction.
- Keep TypeScript type checking intact. Avoid `any`, unsafe type assertions, and type-check suppression.
- Add comments only when the code cannot explain an essential constraint, and write new comments in English.
- Never add generated secrets, private book files, or personal domains to tracked files.

## Runtime schemas

- Define new runtime data contracts with Zod 4 in the feature that owns the boundary, and infer their TypeScript types from the schema.
- Use `safeParse()` for recoverable API, database, and storage inputs, and use `parse()` when invalid configuration must fail immediately.
- Keep policy predicates and compile-time-only types as ordinary TypeScript; do not add schema wrappers, shared schema barrels, or duplicate type declarations.

## Verification

- `mise exec -- pnpm test` runs `tests/**/*.test.ts` through `tsx` and Node's test runner.
- `mise exec -- pnpm test:e2e` runs the single local passkey flow against `http://localhost:3100` and the `book_studio_e2e` database.
- `mise exec -- pnpm lint` checks formatting, lint rules, and import ordering with Biome.
- `mise exec -- pnpm format` rewrites Biome-supported files and applies safe fixes. Use it only when edits are authorized.
- `mise exec -- pnpm types:check` generates Fumadocs and Next.js route types, then runs `tsc --noEmit`.
- `mise exec -- pnpm build` creates the production bundle and verifies static route generation.
- After a code or content change that can affect rendering, start `mise exec -- pnpm dev`, request an affected page, and confirm Next.js returns it without compile or runtime errors. Treat this as the default rendering smoke test.
- For UI changes, also use `browser:control-in-app-browser` to open the affected page and directly verify the rendered layout, visible content, and changed interactions.
- Run the smallest checks that cover the change. For a public release, run all four non-mutating checks: lint, test, types, and build.
