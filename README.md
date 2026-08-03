# Book Studio

Book Studio turns a PDF into a private reading site with searchable chapters, reading progress, highlights, and notes. An AI coding agent handles the PDF import, while Next.js and Fumadocs render the result. Neon stores private reading state and owner sessions, and Vercel hosts the site.

The deployed site is designed for one owner. Production access uses one passkey. There is no password, logout screen, or recovery screen. Local development skips authentication.

## Before you start

Book Studio keeps source PDFs out of Git, but it commits generated MDX and images because Vercel needs them at build time. A passkey protects the deployed app. It does not protect files in a public GitHub repository.

Use a private repository for copyrighted, confidential, or personal material. The included `examples/sample-book.pdf` and generated `sample-book` content are public examples covered by this repository's license.

You need:

- a GitHub account
- a Neon account and database
- a Vercel account
- a passkey supported by your browser and device
- [mise](https://mise.jdx.dev/getting-started.html) on macOS, Linux, or Windows

## Install it yourself

### 1. Create your repository

Open [mym0404/book-studio-template](https://github.com/mym0404/book-studio-template), select **Use this template**, and create a repository in your account. Choose private visibility if you plan to import material that you cannot publish.

Clone the repository you created:

```sh
git clone https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Install the toolchain

Install mise with one of these commands, or use another method from the [mise installation guide](https://mise.jdx.dev/installing-mise.html).

macOS with Homebrew:

```sh
brew install mise
```

Linux:

```sh
curl https://mise.run | sh
```

Windows with WinGet:

```powershell
winget install jdx.mise
```

Restart the terminal if the installer asks you to. Review `mise.toml`, trust it, install the pinned versions, and install the JavaScript packages:

```sh
mise trust
mise install
mise exec -- pnpm install --frozen-lockfile
```

mise provides Node.js, pnpm, Python, uv, and gitleaks. The PDF tools use `pypdfium2`, so Poppler and OS-specific PDF packages are not required.

### 3. Create the Neon database

Create a Neon project and copy its pooled connection string. Open the Neon SQL Editor, copy the full contents of `db/migrations/001_initial.sql`, and run it once against the new database.

Do not run the migration against a database that already contains Book Studio tables. The template migration describes a fresh installation.

### 4. Configure local environment variables

Copy the example file:

macOS or Linux:

```sh
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in all three values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
SITE_URL=https://YOUR_PRODUCTION_DOMAIN
OWNER_SETUP_TOKEN=GENERATED_RANDOM_VALUE
```

Generate the setup token with this command:

```sh
mise exec -- node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

`SITE_URL` must be one HTTPS origin with no path, query, or fragment. Passkeys are bound to this origin. You can use the planned Vercel production URL while developing locally because development mode skips authentication.

Never commit `.env.local` or paste its values into an issue, chat, or agent prompt.

### 5. Run Book Studio locally

```sh
mise exec -- pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Local development does not ask for a passkey, but database-backed reading progress and annotations still use your Neon database.

Before deploying, run the repository checks:

```sh
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm types:check
mise exec -- pnpm build
```

### 6. Deploy to Vercel

Commit and push your setup to GitHub. In Vercel, import the repository as a new project and add the same three environment variables. Set `SITE_URL` to the final production origin, such as `https://books.example.com`, and deploy.

If Vercel first gives you a generated production URL, set `SITE_URL` to that exact HTTPS origin and redeploy. Changing the production domain later also requires changing `SITE_URL` and registering the passkey again after the recovery procedure below.

### 7. Register the owner passkey

Open `/sign-in` on the production site. Enter `OWNER_SETUP_TOKEN`, then register one passkey when the browser prompts you. The app stores the credential and hashed session records in Neon.

After registration, remove `OWNER_SETUP_TOKEN` from Vercel or replace it before a future recovery. The registered owner can sign in with the passkey only. The app has no password fallback, logout endpoint, or recovery UI.

### 8. Import a PDF

Place your source PDF under `books/`. That directory is ignored by Git. Then ask a supported local AI agent to use the included `import-book` skill. For example:

```text
Use the import-book skill to import /absolute/path/to/books/my-book.pdf into this repository.
```

On Windows, pass a full path such as `C:\Books\my-book.pdf`. The agent writes published pages to `content/docs/<book-slug>` and images to `content-assets/books/<book-slug>`. Review the result, run the repository checks, and commit those generated directories.

To try the workflow without private material, import `examples/sample-book.pdf` as `sample-book`.

## Install with an AI agent

Project skills are stored in `.agents/skills`. Codex, Cursor, and GitHub Copilot can read that directory. Claude Code uses the small wrappers under `.claude/skills`, which point to the same canonical instructions without relying on symlinks.

Use this prompt from the repository root:

```text
Set up this Book Studio repository for local development.

1. Read AGENTS.md and follow its repository rules.
2. Confirm that mise is available. If it is missing, show me the official install command for my operating system and wait for me to run it.
3. Review mise.toml, run mise trust and mise install, then run mise exec -- pnpm install --frozen-lockfile.
4. Check that db/migrations/001_initial.sql exists. Ask me to create a Neon database and run that SQL in the Neon SQL Editor. Do not create or change external resources without my confirmation.
5. Ask me to create .env.local from .env.example. Never ask me to paste secrets into chat, and never print secret values.
6. Run mise exec -- pnpm lint, mise exec -- pnpm test, mise exec -- pnpm types:check, and mise exec -- pnpm build.
7. Report each result and stop. Do not change GitHub visibility, create GitHub, Neon, or Vercel resources, add external secrets, commit, push, or deploy without my explicit confirmation.
```

After setup, invoke the PDF import for your agent:

| Agent | Invocation |
| --- | --- |
| Codex | `$import-book /absolute/path/to/book.pdf` |
| Claude Code | `/import-book /absolute/path/to/book.pdf` |
| Cursor | `/import-book /absolute/path/to/book.pdf` |
| GitHub Copilot | `Use the import-book skill to import /absolute/path/to/book.pdf.` |

Use a local IDE or CLI agent for files on your computer. A cloud agent cannot read a local PDF unless you upload it to that environment.

Agents may install the local toolchain, verify the repository, and import PDFs. They must stop for confirmation before they create or change GitHub, Neon, or Vercel resources, change repository visibility, store external secrets, or deploy the site.

## Owner recovery

Recovery removes the registered passkey and every active owner session. Generate a new `OWNER_SETUP_TOKEN`, set it in Vercel, and redeploy. Then run this transaction in the Neon SQL Editor:

```sql
BEGIN;
DELETE FROM auth_challenges;
DELETE FROM owner_auth WHERE id = 1;
COMMIT;
```

Open `/sign-in`, enter the new setup token, and register a passkey. The foreign key on `auth_sessions` deletes old sessions when the owner row is removed.

## Optional public sharing

The **Share** action on a book page creates a stable `/public/<book-slug>[/<chapter-slug>]` link. Anyone with that link can read the full page, its current highlights and comments, and updates made while the page remains public. Use **Unpublish** to revoke the page and its page-bound image links.

Public sharing applies to one page at a time. The rest of the library still requires the owner passkey.

## License

The source code, sample PDF, and sample generated content are available under the [MIT License](LICENSE). Imported books remain subject to their original copyright and license terms.
