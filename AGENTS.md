# Book Studio agent guide

## Repository knowledge

- This file owns durable repository facts and routes topic-specific authoring rules.
- [Book MDX Structure](.agents/knowledge/book-mdx-structure.md) owns source and rendered-content boundaries, asset paths, book layout, slugs, metadata contracts, and page ordering.
- [Markdown Syntax](.agents/knowledge/markdown-syntax.md) owns Fumadocs-specific MDX components, code block extensions, and compiler caveats.
- Read the relevant routed document in full before changing book content or authoring rules. Keep each durable fact in one owner.

## Project contract

- Book Studio is a private, single-owner reading library generated from PDFs.
- Use English for website UI, navigation, metadata, search, published summaries, and reading notes. Source quotations may preserve their original language.
- Build the app with the Next.js App Router, React, TypeScript, Tailwind CSS, Fumadocs MDX, and Fumadocs UI.
- Use Node.js 24 and pnpm through the versions pinned by mise and `package.json`.
- `lib/source.ts` supplies both the documentation pages and search index. `app/docs` renders its page tree.

## Setup and external actions

- Review and run `mise trust`, then run `mise install` before repository commands. Use `mise exec -- pnpm <command>` when the shell does not activate mise automatically.
- Do not create or change GitHub, Neon, or Vercel resources, change repository visibility, store external secrets, commit, push, or deploy without explicit user authorization.
- Never print or commit `.env.local`, `DATABASE_URL`, or `OWNER_SETUP_TOKEN`.
- Treat `db/migrations/001_initial.sql` as the schema for a fresh Neon database. Do not run it against an existing database without the user's confirmation.

## PDF import and generated content

- Read `.agents/skills/import-book/SKILL.md` in full before importing a PDF.
- Keep original PDFs under ignored `books/`. The tracked `examples/sample-book.pdf` is the public sample, not a storage convention for user books.
- Store rendered MDX only under `content/docs/` and published PNG assets under `content-assets/books/` according to the Book MDX Structure contract.
- Generated MDX and images are tracked by Git and can expose source material through repository visibility. State that risk before importing sensitive or copyrighted material into a public repository.
- Preserve the PDF import skill's fidelity and source-comparison gates. Do not treat Docling output as publish-ready content.

## Reading state and public pages

- Neon stores reading progress, annotations, one registered passkey, one-time WebAuthn challenges, and SHA-256 hashes of opaque sessions.
- Reading progress applies only to chapters. Annotations may apply to a book landing page or chapter and use an `exact`, `prefix`, and `suffix` text quote selector.
- `/docs/<book-slug>/saved` is a protected virtual view supplied by `lib/source.ts`. Do not author it under `content/docs`.
- A `public_pages` row publishes one page at `/public/<book-slug>[/<chapter-slug>]`. Public routes must return `404` without that row, and public image routes must repeat the publication check.

## Access control

- Development mode bypasses authentication. Production requires the one registered owner passkey and a stored database session.
- When no owner exists, `/sign-in` requires `OWNER_SETUP_TOKEN` before registering the passkey. There is no password, logout endpoint, or recovery UI.
- `proxy.ts` only performs a coarse cookie-presence redirect. Protected pages and route handlers must enforce authorization with `requireOwnerPage()` or `requireOwnerRequest()`.
- Private route responses must use `PRIVATE_NO_STORE_HEADERS` or `withPrivateNoStore()`.
- Keep `SITE_URL` as the single WebAuthn origin and relying-party source.

## Change discipline

- Make the smallest complete change and preserve unrelated work.
- Use existing helpers and project patterns before adding a dependency or abstraction.
- Keep TypeScript type checking intact. Avoid `any`, unsafe type assertions, and type-check suppression.
- Add comments only when the code cannot explain an essential constraint, and write new comments in English.
- Never add generated secrets, private book files, or personal domains to tracked files.

## Verification

- `mise exec -- pnpm test` runs `tests/**/*.test.ts` through `tsx` and Node's test runner.
- `mise exec -- pnpm lint` checks formatting, lint rules, and import ordering with Biome.
- `mise exec -- pnpm format` rewrites Biome-supported files and applies safe fixes. Use it only when edits are authorized.
- `mise exec -- pnpm types:check` generates Fumadocs and Next.js route types, then runs `tsc --noEmit`.
- `mise exec -- pnpm build` creates the production bundle and verifies static route generation.
- Run the smallest checks that cover the change. For a public release, run all four non-mutating checks: lint, test, types, and build.
