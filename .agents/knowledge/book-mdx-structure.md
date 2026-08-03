# Book MDX Structure and Page Tree

This document owns the repository rules for source and rendered-content boundaries, book asset storage and URL paths, book MDX layout, page slugs, folder metadata, and Fumadocs page-tree ordering. It separates the Book Studio authoring contract from optional Fumadocs syntax.

General Markdown and MDX component syntax are outside this document. Use the Markdown Syntax knowledge document for Fumadocs-specific components and compiler extensions. Language requirements and verification commands remain owned by the root `AGENTS.md`.

## Content Boundaries

- `books/` stores original book files. This document does not prescribe its internal directory structure.
- `content/docs/` is the only source of MDX pages and navigation metadata rendered by the documentation site.
- `content-assets/books/` stores images referenced by rendered book MDX.
- `source.config.ts` registers `content/docs` as the Fumadocs MDX content directory.
- `lib/source.ts` loads that content at the `/docs` base URL and resolves icon names through `lucideIconsPlugin()`.
- Keep original files separate from rendered MDX and its assets. Do not render files from `books/` directly.

## Required Book Layout

Use one top-level directory per book and keep every chapter directly inside it. Standalone documentation pages may live at the content root, but they are not part of a book directory:

```text
content/docs/
├── meta.json
├── <standalone-page>.mdx
└── <book-slug>/
    ├── meta.json
    ├── index.mdx
    ├── <chapter-slug>.mdx
    └── <chapter-slug>.mdx
```

The layout contract is:

- `<book-slug>` is a stable, descriptive, lowercase kebab-case identifier.
- Each book directory represents one independent book area.
- A root-level standalone MDX file represents a cross-book or utility page and does not use the book metadata contract.
- `index.mdx` is the book landing page. Use it for the book overview and reading guidance, not as the first chapter.
- Each chapter is one `.mdx` file directly under the book directory.
- `<chapter-slug>` is descriptive lowercase kebab-case without a numeric ordering prefix.
- Do not create chapter or grouping subdirectories. The project intentionally uses a flat book structure.
- Reorder chapters through `meta.json.pages`; do not rename files merely to change their order.

## Book Assets

Store published book images under the same stable book slug used by the MDX directory:

```text
content-assets/books/
└── <book-slug>/
    └── <section-or-purpose>/
        └── <image-name>.png
```

Reference those files from MDX with `/books/<book-slug>/<section-or-purpose>/<image-name>.png`. The authenticated `app/books/[...path]` route resolves that URL beneath `content-assets/books/` and currently serves PNG files only. Do not use repository-relative filesystem paths in MDX.

## Root Content Metadata

`content/docs/meta.json` controls which top-level book areas and standalone pages appear and their order:

```json
{
  "pages": [
    "book-slug",
    "standalone-page"
  ]
}
```

List every published book directory and intentionally published standalone page exactly once. When `pages` is present, Fumadocs omits unlisted files and folders from the page tree.

## Book Metadata

Every book directory requires a `meta.json` with this shape:

```json
{
  "title": "Book Title",
  "description": "Short description of the book",
  "icon": "BookOpen",
  "root": true,
  "pages": [
    "index",
    "introduction",
    "reducing-complexity"
  ]
}
```

The Book Studio contract requires:

| Field | Required value or behavior |
| --- | --- |
| `title` | Human-readable book title shown in navigation |
| `description` | Short English summary of the book area |
| `icon` | Valid Lucide icon name resolved by `lucideIconsPlugin()` |
| `root` | Always `true` so the book has an independent page tree and layout tab |
| `pages` | Explicit ordered list beginning with `index`, followed by every published chapter slug |

Use page identifiers without `.mdx` extensions. Every identifier in `pages` must resolve to exactly one file or folder, and every chapter intended for navigation must be listed.

## Page Frontmatter

Every book MDX page requires `title` and `description`. `icon` is optional for individual pages.

```mdx
---
title: Page Title
description: Short page description
icon: BookOpen
---
```

Fumadocs uses these properties when constructing page information:

| Field | Project rule | Page-tree behavior |
| --- | --- | --- |
| `title` | Required | Supplies the page title |
| `description` | Required | Supplies the page summary and metadata description |
| `icon` | Optional | Supplies an icon name for the runtime icon resolver |

Use an icon name exported by Lucide. The configured `lucideIconsPlugin()` converts the string name into the rendered icon.

## Slug Generation

Page slugs come from paths relative to `content/docs`. The application prefixes the generated slug with `/docs`.

| Content path | Generated slug array | Site URL |
| --- | --- | --- |
| `dir/page.mdx` | `['dir', 'page']` | `/docs/dir/page` |
| `dir/index.mdx` | `['dir']` | `/docs/dir` |
| `<book-slug>/<chapter-slug>.mdx` | `['<book-slug>', '<chapter-slug>']` | `/docs/<book-slug>/<chapter-slug>` |

Renaming a directory or MDX file changes its URL. Do not rename a page to reorder navigation; edit the containing `meta.json.pages` array instead. When a rename is intentional, update the corresponding `pages` entry and every internal link to the previous URL.

Fumadocs also supports folder groups. A directory name wrapped in parentheses does not contribute a slug segment:

| Content path | Generated slug array |
| --- | --- |
| `(group-name)/page.mdx` | `['page']` |

Folder groups are framework syntax only. Do not use them inside Book Studio book directories because the project requires a flat chapter layout.

## Root Folders

Setting `root: true` in a folder's `meta.json` marks it as an independent root folder. While a page inside that root is open, other root folders are hidden from its sidebar and related navigation. Fumadocs UI exposes root folders as layout tabs, allowing readers to switch between books.

Every book directory must set `root: true`. Do not set it on individual chapter pages.

## Complete `meta.json` Field Reference

Fumadocs supports the following folder metadata fields:

| Field | Type | Framework behavior | Book Studio usage |
| --- | --- | --- | --- |
| `title` | `string` | Sets the folder display name | Required for book folders |
| `description` | `string` | Describes the folder or root area | Required for book folders |
| `icon` | `string` | Supplies a name to the configured icon resolver | Required for book folders |
| `root` | `boolean` | Creates an independent page-tree root | Required and always `true` for book folders |
| `defaultOpen` | `boolean` | Opens a non-root folder by default | Framework reference only |
| `collapsible` | `boolean` | Controls whether a folder can collapse; defaults to `true` | Framework reference only |
| `pages` | `string[]` | Selects and orders folder items | Required and explicit for root content and book folders |
| `pagesIndex` | `string` | Overrides the page or link opened by the folder item | Framework reference only; use `index.mdx` for books |

The standard Book Studio book layout uses only `title`, `description`, `icon`, `root`, and `pages`. Do not add optional folder fields unless a requested navigation design requires them.

## `pages` Ordering Syntax

Without `pages`, Fumadocs sorts folder items alphabetically. When `pages` exists, it includes only the entries named by the array and renders them in array order.

Fumadocs recognizes these entry forms:

| Kind | Syntax | Effect |
| --- | --- | --- |
| Page or folder | `"index"`, `"chapter-name"` | Includes an item from the current folder |
| Relative path | `"./path/to/page"` | Includes a page or folder at a relative path |
| Separator | `"---Label---"` | Inserts a labeled separator |
| Icon separator | `"---[Icon]Label---"` | Inserts a labeled separator with an icon name |
| Link | `"[Text](url)"` | Inserts a link item |
| Icon link | `"[Icon][Text](url)"` | Inserts a link item with an icon name |
| External link | `"external:[Text](url)"` | Inserts a link marked as external |
| Rest | `"..."` | Includes remaining unlisted items in alphabetical order |
| Reversed rest | `"z...a"` | Includes remaining unlisted items in reverse alphabetical order |
| Extract | `"...folder"` | Inserts the child items of a folder at the current level |
| Except | `"!item"` | Excludes an item from a rest or reversed-rest expansion |

For book directories, explicitly list `index` and every chapter using direct page identifiers. Separators, links, rest, reversed rest, extract, and except are supported framework syntax, but use them only when the requested content design cannot be expressed by the standard explicit list.

Example of supported extended syntax:

```json
{
  "pages": [
    "index",
    "---Concepts---",
    "introduction",
    "...appendices",
    "...",
    "!draft",
    "external:[Project](url)"
  ]
}
```

Do not copy this extended example into a standard book `meta.json`; it exists to explain files encountered in Fumadocs projects.

## Folder Index

A folder with an index item is clickable. By default, Fumadocs uses `index.mdx` in that folder. `pagesIndex` can override the target with a relative page path or a Markdown-style link:

```json
{
  "pagesIndex": "overview"
}
```

```json
{
  "pagesIndex": "[Overview](/docs/overview)"
}
```

Book Studio always uses `index.mdx` as the book folder index. Do not set `pagesIndex` for a book unless an explicit navigation requirement replaces that convention.

## Page-Tree Integrity

Each page URL and page-tree item must be unique across the entire page tree. Fumadocs relies on the current pathname to locate the active item, so the same destination must not appear more than once.

Before adding or changing a page-tree entry:

- Resolve the slug produced by its content path.
- Confirm no existing page produces the same slug.
- Confirm the containing `pages` array does not include the same item twice.
- Check extracted folders and inserted links for destinations already present elsewhere.
- When renaming or removing a page, update its `pages` entry and internal links in the same change.

## Agent Workflow

### Add a book

1. Choose a stable lowercase kebab-case book slug.
2. Create `content/docs/<book-slug>/` with `meta.json` and `index.mdx`.
3. Add chapter files directly under the book directory with descriptive slugs.
4. Give every MDX page `title` and `description` frontmatter.
5. List `index` and every chapter explicitly in the book's `meta.json.pages`.
6. Add the book slug once to `content/docs/meta.json.pages` at the intended display position among existing book and standalone-page entries.
7. Check the resulting slugs for duplicate URLs.

### Add or remove a chapter

1. Add or remove the chapter MDX file in the book directory.
2. Add or remove the matching extensionless slug in the book's `meta.json.pages`.
3. Update internal links that point to a removed or renamed slug.
4. Confirm every listed page exists and every published chapter is listed exactly once.

### Reorder chapters

Edit only the order of entries in the book's `meta.json.pages`. Preserve filenames and URLs.

## Agent Checklist

Before finishing a book-structure change:

- Keep original files in `books/`, rendered MDX in `content/docs/`, and published images in `content-assets/books/`.
- Keep one flat directory per book with `meta.json`, `index.mdx`, and direct chapter files.
- Use stable descriptive kebab-case slugs without numeric prefixes.
- Keep `root: true` and begin every book `pages` list with `index`.
- List every published chapter explicitly and exactly once.
- Require `title` and `description` on every book MDX page.
- Use only Lucide icon names supported by `lucideIconsPlugin()`.
- Check renamed, extracted, or linked items for duplicate URLs.
- Apply the language and verification requirements owned by root `AGENTS.md`.
