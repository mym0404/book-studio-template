# Fumadocs-Specific MDX Syntax

This document contains only the Fumadocs-specific components and compiler extensions supported by this repository. Standard Markdown syntax is intentionally omitted.

## Component Availability

The repository merges the `fumadocs-ui/mdx` component map into every MDX document.

These author-facing components are globally available and need no import:

| Component | Purpose |
| --- | --- |
| `Callout` | Compact semantic callout |
| `CalloutContainer` | Lower-level callout composition |
| `CalloutTitle` | Title inside a composed callout |
| `CalloutDescription` | Body inside a composed callout |
| `Cards` | Responsive card grid |
| `Card` | Informational or navigational card |

These components require an explicit import in each MDX document that uses them:

```mdx
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import {
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs';
```

Import only the components used by the document. An unknown uppercase JSX name fails MDX compilation unless it is imported or added to the global component map.

When block content appears inside a Fumadocs component, preserve blank lines around nested headings, lists, paragraphs, and code fences. Self-close only components that have no children.

## Callout

`Callout` is globally available. Use it for most semantic notices.

```mdx
<Callout title="Information">
  Context that helps the reader continue.
</Callout>

<Callout type="success" title="Success">
  A confirmed successful outcome.
</Callout>

<Callout type="idea" title="Idea">
  A useful alternative or design thought.
</Callout>

<Callout type="warn" title="Warning">
  A condition the reader must notice before continuing.
</Callout>

<Callout type="error" title="Error">
  A failure condition or unsafe outcome.
</Callout>
```

### Callout props

| Prop | Type | Required | Behavior |
| --- | --- | --- | --- |
| `type` | `'info' \| 'warn' \| 'warning' \| 'error' \| 'success' \| 'idea'` | No | Chooses the semantic color and icon; defaults to `info` |
| `title` | `ReactNode` | No | Renders a title above the body |
| `icon` | `ReactNode` | No | Replaces the default icon |
| `children` | `ReactNode` | No | Renders the callout body |

`warn` and `warning` are aliases. Prefer `warn` for consistency with existing content.

### Compound callout

The compound API is also globally available. Use it only when the compact `Callout` API cannot express the desired title/body structure.

```mdx
<CalloutContainer type="idea">
  <CalloutTitle>Design note</CalloutTitle>
  <CalloutDescription>
    Keep the public contract smaller than the implementation surface.
  </CalloutDescription>
</CalloutContainer>
```

`CalloutContainer` accepts the same `type` and `icon` props as `Callout` plus ordinary `div` props. `CalloutTitle` accepts paragraph props, and `CalloutDescription` accepts paragraph props.

## Cards and Card

`Cards` and `Card` are globally available.

```mdx
<Cards>
  <Card
    title="Code blocks"
    description="Titles, line numbers, annotations, and tabs"
    href="#code-block-extensions"
  />
  <Card
    title="Component reference"
    description="Props and composition examples"
    href="#components-that-require-imports"
  />
</Cards>
```

`Cards` renders a responsive two-column grid. Cards collapse to one column when the content area is narrow.

### Card props

| Prop | Type | Required | Behavior |
| --- | --- | --- | --- |
| `title` | `ReactNode` | Yes | Renders the card heading |
| `description` | `ReactNode` | No | Renders short supporting text |
| `href` | `string` | No | Makes the card navigational |
| `external` | `boolean` | No | Marks the destination as external |
| `icon` | `ReactNode` | No | Renders an icon above the heading |
| `variant` | `'default' \| 'warning' \| 'error'` | No | Applies Book Studio's default, warning, or error card styling; defaults to `default` |
| `children` | `ReactNode` | No | Renders additional structured content |

When `href` is absent, `Card` renders as a non-navigational container. Prefer `description` for a short summary and children only when additional structure is necessary.

## Components That Require Imports

### Tabs and Tab: simple mode

Use simple mode when tab labels are a fixed ordered list. Keep `Tab` children in the same order as `items`.

```mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={['Preview', 'Source', 'Checklist']} defaultIndex={0}>
  <Tab>
    The rendered result.
  </Tab>
  <Tab>
    The source representation.
  </Tab>
  <Tab>
    The review criteria.
  </Tab>
</Tabs>
```

Simple-mode props:

| Prop | Component | Type | Behavior |
| --- | --- | --- | --- |
| `items` | `Tabs` | `string[]` | Defines ordered labels and values |
| `defaultIndex` | `Tabs` | `number` | Chooses the initially active item; defaults to `0` |
| `label` | `Tabs` | `ReactNode` | Adds a label before the tab triggers |
| `value` | `Tab` | `string` | Overrides the value inferred from child order |

If the number or order of `Tab` children does not match `items`, inferred values can select the wrong content. Use explicit `value` props when inference would be unclear.

### Tabs: advanced mode

Use the advanced API only when trigger layout or values must be controlled explicitly.

```mdx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs';

<Tabs defaultValue="preview">
  <TabsList>
    <TabsTrigger value="preview">Preview</TabsTrigger>
    <TabsTrigger value="source">Source</TabsTrigger>
  </TabsList>
  <TabsContent value="preview">
    The rendered result.
  </TabsContent>
  <TabsContent value="source">
    The source representation.
  </TabsContent>
</Tabs>
```

Every `TabsTrigger` value must have a matching `TabsContent` value. Do not combine the simple `items` API with manually authored triggers.

Content tabs and fenced-code tabs are different features. Content tabs require the imports above. Fenced-code tabs use code-fence metadata and require no import.

### Steps and Step

```mdx
import { Step, Steps } from 'fumadocs-ui/components/steps';

<Steps>
  <Step>
    ### Prepare input

    Gather the required values.
  </Step>
  <Step>
    ### Render output

    Confirm the resulting structure.
  </Step>
</Steps>
```

`Steps` and `Step` accept children. Put a concise heading near the start of each `Step` so the sequence remains scannable. Preserve blank lines around block content inside each step.

### Accordions and Accordion

```mdx
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

<Accordions defaultValue={['rendering']}>
  <Accordion
    title="What does this verify?"
    value="rendering"
    id="accordion-rendering"
  >
    It verifies component rendering and interaction.
  </Accordion>
  <Accordion
    title="What remains manual?"
    value="manual-review"
    id="accordion-manual-review"
  >
    Visual judgment and content quality remain manual.
  </Accordion>
</Accordions>
```

Accordion props:

| Prop | Component | Type | Required | Behavior |
| --- | --- | --- | --- | --- |
| `defaultValue` | `Accordions` | `string[]` | No | Defines items expanded on initial render |
| `title` | `Accordion` | `string \| ReactNode` | Yes | Renders the trigger content |
| `value` | `Accordion` | `string` | No | Provides stable state identity; defaults to `String(title)` |
| `id` | `Accordion` | `string` | No | Creates a fragment target and enables the copy-link control |
| `children` | `Accordion` | `ReactNode` | No | Renders collapsible content |

Use a stable explicit `value` when titles may change. Values must be unique within one `Accordions` container. Use a unique `id` only when the item needs a shareable fragment link.

## Code-Block Extensions

The active Fumadocs compiler transforms fenced code blocks with Shiki and supports the metadata and annotations below.

### Title

````mdx
```ts title="renderer.ts"
const render = () => 'ready';
```
````

`title` renders a visible filename or label in the code-block header.

### Line numbers

````mdx
```ts lineNumbers
const first = 1;
const second = 2;
```

```ts lineNumbers=4
const fourth = 4;
const fifth = 5;
```
````

`lineNumbers` starts numbering at `1`. `lineNumbers=N` starts at numeric line `N`.

### Disable copying

````mdx
```text noCopy
This block intentionally has no copy action.
```
````

`noCopy` removes the code-block copy action.

### Shiki annotations

Put annotations in a comment form valid for the fenced language. The transformer removes the annotation comment and applies a visual state.

````mdx
```ts
const highlighted = true; // [!code highlight]
const alias = true; // [!code hl]
const focused = true; // [!code focus]
const oldValue = 'before'; // [!code --]
const newValue = 'after'; // [!code ++]
const render = () => 'ready'; // [!code word:render]
```
````

Annotation behavior:

| Annotation | Effect |
| --- | --- |
| `[!code highlight]` | Highlights the annotated line |
| `[!code hl]` | Alias for line highlighting |
| `[!code focus]` | Focuses the line and visually mutes surrounding lines |
| `[!code --]` | Marks the line as removed |
| `[!code ++]` | Marks the line as added |
| `[!code word:value]` | Highlights matching `value` tokens |

Line, focus, and diff annotations accept an optional `:N` suffix to apply the state to `N` lines beginning at the annotation:

````mdx
```ts
const first = true; // [!code highlight:3]
const second = true;
const third = true;
```
````

Word annotations also accept `:N`; the transformer searches only the annotated line and the following `N - 1` lines.

### Automatic code tabs

Give uninterrupted adjacent code fences a `tab` label. Fumadocs groups them automatically. Do not import `Tabs` for this feature.

````mdx
```bash tab="pnpm"
pnpm types:check
```

```bash tab="npm"
npm run types:check
```

```bash tab="bun"
bun run types:check
```
````

Grouping rules:

- Every fence in the group needs a string `tab` value.
- Fences must remain adjacent.
- A paragraph, heading, component, or non-tabbed fence ends the group.
- Reusing a `tab` value in the same group combines those fences in one tab panel.

### Persistent code-tab selection

Use `tab-group` on the first fence when multiple groups should share their selected tab. Reuse the same stable group ID.

````mdx
```bash tab="pnpm" tab-group="package-manager"
pnpm install
```

```bash tab="npm"
npm install
```
````

Only the first fence needs `tab-group`. Other fences in the same group inherit it.

MDX inside code-tab labels is disabled by the active compiler configuration. Keep `tab` values plain text.

## Math

The active compiler runs `remark-math` followed by `rehype-katex`. KaTeX emits visual HTML together with accessibility MathML, and the root layout loads the KaTeX stylesheet.

Use a fenced `math` block for display equations:

````mdx
```math
C = \sum_p c_p t_p
```
````

Use double-dollar delimiters for a formula inside a sentence:

```mdx
The complexity of part $$p$$ is $$c_p$$.
```

Keep TeX commands inside math syntax. Do not put equation prose or captions inside the math fence.

## Compiler Caveats

- Mermaid fences remain ordinary code blocks because no Mermaid renderer is configured.
- Directive syntax such as `:::warning` is not the callout contract; use `<Callout>`.
- Jekyll classes, Liquid tags, and custom notice syntax are not Fumadocs MDX features.
- Unknown uppercase JSX names fail compilation unless imported or globally registered.

If one of these capabilities is added, update the compiler configuration, renderer, styles, and this document together.

## Troubleshooting

### A component is undefined during MDX compilation

- Check whether it appears in the globally available component list above.
- Otherwise import it from the exact `fumadocs-ui/components/...` path shown above.
- Check singular/plural pairs such as `Accordion`/`Accordions`.

### Nested content renders as plain text

- Put blank lines between the component tag and nested block content.
- Put blank lines around nested headings, lists, and code fences.
- Use paired tags when the component requires children.

### Simple tabs show the wrong content

- Keep `Tab` children in the same order as `Tabs.items`.
- Confirm the number of `Tab` children matches the number of item labels.
- Add explicit `Tab.value` props when order inference is unsuitable.

### Advanced tabs show no content

- Give every `TabsTrigger` a `value`.
- Give every `TabsContent` a matching `value`.
- Ensure `Tabs.defaultValue` matches one of those values.

### An accordion does not open by default

- Use an array for `Accordions.defaultValue`.
- Confirm each entry exactly matches an `Accordion.value`.
- Confirm values are unique within the container.

### Code fences do not form one tab group

- Give every fence a string `tab` value.
- Remove prose or unrelated nodes between the fences.
- Put `tab-group` on the first fence only when persistence is needed.

### A code annotation remains visible

- Match the exact `[!code ...]` spelling and casing.
- Use a comment syntax valid for the fenced language.
- Confirm the fence language uses the same comment syntax as the annotation line.

## Agent Checklist

Before finishing Fumadocs-specific MDX content:

- Use only the global components listed here or an explicit import shown here.
- Keep imports limited to components actually used.
- Preserve blank lines around block content nested in components.
- Keep simple tab labels and children aligned.
- Keep accordion values unique and stable.
- Keep automatic code-tab fences adjacent.
- Use only code metadata and annotations documented here.
- Use fenced `math` blocks and double-dollar inline math for equations.
- Treat Mermaid, directives, Jekyll syntax, and Liquid syntax as unsupported until the compiler contract changes.
- Apply the verification requirements owned by root `AGENTS.md`.
