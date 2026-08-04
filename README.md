<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logo.png">
    <source media="(prefers-color-scheme: light)" srcset="./app/icon.png">
    <img src="./app/icon.png" alt="Book Studio logo" width="120">
  </picture>
</p>

<h1 align="center">Book Studio</h1>

<p align="center">
  <strong>Turn your ugly PDFs into a polished Fumadocs reading experience that only you can access.</strong>
</p>

<p align="center">
  A private, single-owner bookshelf with search, highlights, notes, reading progress, and controlled page sharing.
</p>

<p align="center">
  <a href="https://book-studio-sample.vercel.app">View sample</a>
</p>

<p align="center">
  <a href="https://github.com/mym0404/book-studio-template/generate">
    <img src="https://img.shields.io/badge/Use_this_template-181717?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Use this template">
  </a>
  <a href=".agents/install-guide.md">
    <img src="https://img.shields.io/badge/Install_with_AI-5B5BD6?style=for-the-badge" alt="Install with an AI agent">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=flat-square&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/Fumadocs-111827?style=flat-square" alt="Fumadocs">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&amp;logo=postgresql&amp;logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&amp;logo=docker&amp;logoColor=white" alt="Docker">
</p>

---

## Screenshots

| | Light | Dark |
| --- | --- | --- |
| **Desktop** | <img src="./public/screenshots/light-desktop-comment.jpg" alt="Light desktop view of Modules Should Be Deep with a highlighted passage and open comment" width="640"> | <img src="./public/screenshots/dark-desktop-reader-settings.jpg" alt="Dark desktop view of The Four Fundamental Subspaces with reader settings open beside rendered equations" width="640"> |
| **Mobile** | <img src="./public/screenshots/light-mobile-comment.jpg" alt="Light mobile view of Bad Smells in Code with a highlighted passage and open comment" width="320"> | <img src="./public/screenshots/dark-mobile-library.jpg" alt="Dark mobile view of the book switcher listing all three sample books" width="320"> |

> [!IMPORTANT]
> Generated MDX and images are committed to Git. Use a private repository for copyrighted, confidential, or personal material.

## Features

| Feature | What you get |
| --- | --- |
| **Private Bookshelf** | Keep a single-owner library protected by a passkey. |
| **Ready-to-Use PDF Import Skill** | Turn a PDF into a structured, source-checked book with `$import-book`. |
| **Highlights & Comments** | Highlight passages and attach comments while you read. |
| **Continue Reading** | Resume from your latest reading position. |
| **Page Sharing** | Publish one specific page at a time with a stable public link. |

## Deployment

Book Studio requires an HTTPS origin, a server-capable Next.js runtime, and PostgreSQL. The installation guide asks which supported path to use before changing external infrastructure.

| Path | Support | Notes |
| --- | --- | --- |
| **Vercel + Neon** | Guided | Lowest operations; provisions Neon through Vercel Marketplace. |
| **Docker + managed PostgreSQL** | Guided | Portable across managed hosts that build the repository Dockerfile, such as Cloud Run, Fly.io, Railway, and Render. |
| **Docker on Kubernetes or a VPS** | Compatible | Operator-managed; you own ingress, TLS, rollouts, logs, and host maintenance. |
| **Node.js server + PostgreSQL** | Compatible | Run `pnpm build` and `pnpm start`; infrastructure setup is manual. |
| **Platform-specific Next.js adapter** | Provider-dependent | Confirm Next.js 16, Node.js APIs, filesystem assets, streaming, and route-handler support with the provider. |
| **Static export** | Not supported | Passkey authentication, private assets, API routes, and database-backed state require a server. |

## Get Started

1. **Create your repository.** Open [Book Studio](https://github.com/mym0404/book-studio-template), select **Use this template**, and create your repository.
2. **Clone it.**

   ```sh
   git clone https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
   cd YOUR_REPOSITORY
   ```

3. **Open it.** Open the cloned project in your favorite AI coding agent.
4. **Use your AI agent.** Ask it to follow the [agent installation guide](.agents/install-guide.md):

   ```text
   Read .agents/install-guide.md and install Book Studio.
   ```

## License

The source code, sample PDF, and sample generated content are available under the [MIT License](LICENSE). Imported books remain subject to their original copyright and license terms.
