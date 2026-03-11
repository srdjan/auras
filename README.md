# Auras CSS

A headless-first CSS framework built on semantic HTML and `data-*` attributes.
No classes, no build step, no JavaScript required. One file gives you
typography, layout, forms, theming, accessibility, and print styles. Opt into a
brand pack when you want a visual identity.

## Quick start

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
```

That single line gives you a fully functional, classless foundation: readable
type scale, spacing tokens, dark mode that follows `prefers-color-scheme`,
accessible focus rings, responsive tables, and form validation states.

When you are ready for a branded look, add the brand pack and a data attribute:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/brands/auras-brand.css" />

<body data-brand="auras"></body>
```

When you want the optional higher layers, load them explicitly:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/diagram/browser.js"></script>
<script type="module" src="packages/components/browser.js"></script>
```

## Architecture

Auras uses CSS `@layer` ordering to keep specificity predictable:

```
reset > tokens > brands > defaults > layouts > components > utilities > print
```

**Elements layer** (`packages/elements/auras.css`) ships with near-neutral colors
(chroma 0.03), transparent bordered buttons, and no card shadows. It provides
structure without forcing a visual language.

**Brand packs** (e.g. `packages/brands/auras-brand.css`) live in the `brands`
layer and override token values when a `data-brand` attribute is present. This
keeps the core cacheable and lets you swap brands without touching the
framework.

## Packages

The framework is split into independent layers. The Elements layer is the
foundation; everything else is optional and additive.

| Package | Path | Purpose |
| --- | --- | --- |
| Elements | `packages/elements/auras.css` | Core stylesheet: reset, tokens, typography, layout, components, utilities, a11y, print |
| Composites | `packages/composites/auras-composites.css` | CSS-only app patterns (example, master-detail, tabs, combobox, splitter, tree, diagram) |
| Brands | `packages/brands/` | Token override packs scoped to `data-brand` |
| Components | `packages/components/` | Light-DOM custom elements for interactive behavior |
| Diagram | `packages/diagram/` | Standalone spatial selection component for diagrams |

Components ship as both a Deno-first module (`mod.ts`) and a browser-friendly
no-build entrypoint (`browser.js`). See
[Component Architecture](./docs/component-architecture.md) for the package
split and decision rules.

### Included components

- `auras-master-detail` - selection controller for master-detail views
- `auras-tabs` - tab controller with horizontal arrow-key navigation
- `auras-combobox` - local-option combobox with filtering and optional linked panels
- `auras-splitter` - two-pane splitter with keyboard and pointer resize
- `auras-tree` - hierarchical selection controller with expansion and optional panels
- `auras-diagram` - spatial node selection for interactive diagrams

## Design tokens

All visual values flow through CSS custom properties on `:root`. Override any
token to customize without fighting specificity.

### Spacing

| Token        | Value   |
| ------------ | ------- |
| `--space-1`  | 0.25rem |
| `--space-2`  | 0.5rem  |
| `--space-3`  | 0.75rem |
| `--space-4`  | 1rem    |
| `--space-6`  | 1.5rem  |
| `--space-8`  | 2rem    |
| `--space-10` | 2.5rem  |
| `--space-12` | 3rem    |
| `--space-16` | 4rem    |

### Type scale (fluid)

Each step uses `clamp()` with a `vw` component for smooth scaling:

| Token         | Range              |
| ------------- | ------------------ |
| `--text-xs`   | 0.75rem - 0.875rem |
| `--text-sm`   | 0.875rem - 1rem    |
| `--text-base` | 1rem - 1.125rem    |
| `--text-md`   | 1.125rem - 1.25rem |
| `--text-lg`   | 1.25rem - 1.5rem   |
| `--text-xl`   | 1.5rem - 1.875rem  |
| `--text-2xl`  | 1.875rem - 2.25rem |
| `--text-3xl`  | 2.25rem - 3rem     |

### Colors

Colors use OKLCH with configurable hue angles:

| Token                          | Purpose                       |
| ------------------------------ | ----------------------------- |
| `--hue-primary`                | Primary hue (default 260)     |
| `--hue-secondary`              | Secondary hue (default 200)   |
| `--hue-neutral`                | Gray hue rotation (default 0) |
| `--primary`                    | Primary color                 |
| `--secondary`                  | Secondary color               |
| `--gray-0` through `--gray-12` | Neutral scale (0 = lightest)  |

Semantic aliases like `--bg`, `--text`, `--surface`, `--border`, `--link`, and
`--focus-ring` are derived from the palette and swap automatically in dark mode.

### Component hooks

Buttons, fields, and cards expose their own token layer so you can restyle
components without rewriting selectors:

```css
:root {
  --button-bg: transparent;
  --button-color: var(--text);
  --button-border-color: var(--border);
  --button-radius: var(--radius-md);
  --button-solid-bg: var(--primary);
  --button-solid-color: var(--text-on-primary);
  --button-soft-bg: var(--primary-subtle);
  --button-soft-color: var(--text);

  --field-bg: var(--surface);
  --field-border-color: var(--border);
  --field-radius: var(--radius-sm);

  --card-bg: var(--surface);
  --card-border-color: var(--border);
  --card-padding: var(--space-6);
  --card-shadow: none;
}
```

## Layout

Layout is controlled through `data-layout` and orthogonal modifier attributes.

### Directions

```html
<div data-layout="row">...</div>
<!-- horizontal flex -->
<div data-layout="col">...</div>
<!-- vertical flex -->
<div data-layout="stack">...</div>
<!-- alias for col -->
<div data-layout="cluster">...</div>
<!-- alias for row -->
<div data-layout="grid">...</div>
<!-- auto-fit grid -->
<div data-layout="container">...</div>
<!-- centered max-width block -->
```

### Alignment, justification, and gap

These work on any `data-layout` element:

```html
<div
  data-layout="row"
  data-align="center"
  data-justify="between"
  data-gap="4"
>
</div>
```

| Attribute      | Values                                                  |
| -------------- | ------------------------------------------------------- |
| `data-align`   | `start`, `center`, `end`, `stretch`                     |
| `data-justify` | `start`, `center`, `end`, `between`, `around`, `evenly` |
| `data-gap`     | `1`, `2`, `3`, `4`, `6`, `8` (maps to spacing tokens)   |

### Grid sizing

```html
<div data-layout="grid" data-grid-min="sm">
  <!-- 150px min columns -->
  <div data-layout="grid" data-grid-min="md">
    <!-- 250px min columns -->
    <div data-layout="grid" data-grid-min="lg"><!-- 350px min columns --></div>
  </div>
</div>
```

Or set the column minimum directly:

```html
<div data-layout="grid" style="--grid-min: 200px"></div>
```

### Responsive stacking

```html
<div data-layout="row" data-stack="mobile">
  <!-- row on desktop, column below 640px -->
</div>
```

## Theming

Theme axes are independent and composable via data attributes on `<html>`:

```html
<html data-theme="dark" data-contrast="more" data-motion="reduce"></html>
```

| Attribute       | Values   | Effect                    |
| --------------- | -------- | ------------------------- |
| `data-theme`    | `dark`   | Dark color scheme         |
| `data-contrast` | `more`   | Stronger borders and text |
| `data-motion`   | `reduce` | Disables transitions      |

When no attributes are set, Auras respects `prefers-color-scheme` and
`prefers-reduced-motion` from the operating system.

## Components

### Buttons

Buttons default to a transparent bordered style. Use `data-variant` for
alternatives:

```html
<button>Default</button>
<button data-variant="solid">Solid</button>
<button data-variant="soft">Soft</button>
<button data-variant="ghost">Ghost</button>
<a href="#" role="button">Link button</a>
```

### Cards

```html
<div data-surface="card">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

### Notices

```html
<aside data-surface="notice" data-status="warning" role="alert">
  <strong>Heads up</strong>
  <p>This message uses Auras' status tokens without introducing classes.</p>
</aside>
```

### Accordions

```html
<section data-ui="accordion">
  <details name="faq" open>
    <summary>What is Auras?</summary>
    <p>Auras is a headless-first CSS framework for semantic HTML.</p>
  </details>
</section>
```

### Example composite

Use `data-ui="example"` for documentation blocks that pair a live preview with
source code. Part of the Composites layer.

```html
<article data-ui="example">
  <header data-part="header">
    <strong>Tabs</strong>
    <span data-part="meta">Live preview</span>
  </header>
  <div data-part="preview">
    <!-- live demo here -->
  </div>
  <pre data-part="code"><code>&lt;auras-tabs&gt;...&lt;/auras-tabs&gt;</code></pre>
</article>
```

The header is optional. Token hooks: `--example-border-color`,
`--example-radius`, `--example-preview-padding`, `--example-code-bg`,
`--example-code-padding`, `--example-code-font-size`.

### Syntax highlighting

The Elements layer ships lightweight syntax tokens for code blocks. Wrap spans
in `data-syntax` attributes:

```html
<pre><code><span data-syntax="tag">&lt;div</span>
  <span data-syntax="attr">data-layout</span>=<span data-syntax="value">"stack"</span><span data-syntax="tag">&gt;</span>
  <span data-syntax="comment">&lt;!-- content --&gt;</span>
<span data-syntax="tag">&lt;/div&gt;</span></code></pre>
```

Available values: `tag`, `attr`, `value`, `comment`, `keyword`, `function`.
Colors derive from `--hue-primary` and `--hue-secondary`, so they shift
automatically with brand packs. Dark mode bumps lightness by 15%.

### Block code tokens

`<pre>` blocks are styled with customizable tokens:

| Token | Default |
| --- | --- |
| `--code-block-bg` | `var(--surface-raised)` |
| `--code-block-border-color` | `var(--border)` |
| `--code-block-padding` | `var(--space-3)` |
| `--code-block-radius` | `var(--radius-lg)` |
| `--code-block-font-size` | `var(--text-sm)` |

### Diagram composite

```html
<figure data-ui="diagram" style="--diagram-columns: 11">
  <figcaption>Order flow</figcaption>

  <div data-part="canvas">
    <article
      data-part="node"
      data-kind="input"
      style="--diagram-column: 1 / span 3; --diagram-row: 1"
    >
      <h3>Order received</h3>
      <p>Incoming payload from checkout.</p>
    </article>

    <div
      data-part="connector"
      aria-hidden="true"
      style="--diagram-column: 4; --diagram-row: 1"
    >
      <svg viewBox="0 0 120 40" preserveAspectRatio="none">
        <path d="M4 20 H108" />
        <path data-marker="arrow" d="M108 12 L116 20 L108 28 Z" />
      </svg>
    </div>
  </div>
</figure>
```

Use this for static flow or architecture diagrams where placement is explicit in
the markup. Keep connectors decorative with `aria-hidden="true"` unless they
carry meaning.

### Diagram component

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/diagram/browser.js"></script>

<auras-diagram value="received" activation="manual" aria-label="Order flow">
  <p data-part="caption">Interactive flow</p>

  <div data-part="canvas">
    <button
      type="button"
      data-part="node"
      data-value="received"
      style="--diagram-column: 1 / span 3; --diagram-row: 1"
    >
      Received
    </button>
    <button
      type="button"
      data-part="node"
      data-value="validate"
      style="--diagram-column: 5 / span 3; --diagram-row: 1"
    >
      Validate
    </button>
  </div>

  <section data-part="panels">
    <article data-part="panel" data-value="received">...</article>
    <article data-part="panel" data-value="validate" hidden>...</article>
  </section>
</auras-diagram>
```

`auras-diagram` is a separate optional package on top of the CSS shell. It adds
active-node state, roving focus, spatial arrow-key movement, and optional linked
panels. It does not do auto-layout or edge routing.

### Master-detail

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-master-detail
  data-ui="master-detail"
  value="elements"
  activation="manual"
>
  <nav data-part="master" aria-label="Auras layers">
    <button type="button" data-part="trigger" data-value="elements">
      Elements
    </button>
    <button type="button" data-part="trigger" data-value="composites">
      Composites
    </button>
    <button type="button" data-part="trigger" data-value="components">
      Components
    </button>
  </nav>

  <section data-part="detail">
    <article data-part="panel" data-value="elements">...</article>
    <article data-part="panel" data-value="composites" hidden>...</article>
    <article data-part="panel" data-value="components" hidden>...</article>
  </section>
</auras-master-detail>
```

Use `activation="manual"` when arrow keys should move focus without changing the
open panel until the user presses `Enter` or `Space`.

### Combobox

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-combobox data-ui="combobox" value="elements" activation="manual">
  <label for="component-search">Search components</label>

  <div data-part="control">
    <input
      id="component-search"
      data-part="input"
      type="text"
      placeholder="Type to filter"
    />
    <button
      type="button"
      data-part="toggle"
      aria-label="Toggle component options"
    >
    </button>
    <input type="hidden" data-part="value" name="component" />
  </div>

  <ul data-part="listbox">
    <li data-part="option" data-value="elements">Elements</li>
    <li data-part="option" data-value="master-detail">Master-detail</li>
    <li data-part="option" data-value="tabs">Tabs</li>
  </ul>

  <p data-part="empty" hidden>No matching components.</p>

  <section data-part="panels">
    <article data-part="panel" data-value="elements">...</article>
    <article data-part="panel" data-value="master-detail" hidden>...</article>
    <article data-part="panel" data-value="tabs" hidden>...</article>
  </section>
</auras-combobox>
```

`auras-combobox` keeps the input, popup listbox, and authored options in light
DOM. It supports local filtering, single selection, `activation="manual"` when
arrow keys should move the active option before `Enter`, and optional linked
panels that follow the selected value.

### Splitter

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-splitter data-ui="splitter" value="42" min="30" max="70" step="5">
  <section data-part="pane" data-pane="primary">...</section>
  <button
    type="button"
    data-part="separator"
    aria-label="Resize panes"
  >
  </button>
  <section data-part="pane" data-pane="secondary">...</section>
</auras-splitter>
```

`auras-splitter` keeps both panes and the separator in authored light DOM. It
exposes the primary pane size through the host `value` attribute, supports
keyboard resize on the separator, supports pointer drag, and keeps layout
styling in the Composites layer.

### Tree

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-tree data-ui="tree" value="master-detail" activation="manual">
  <ul data-part="tree" aria-label="Auras components">
    <li data-part="item" data-value="elements">
      <button type="button" data-part="node">Elements</button>
    </li>

    <li data-part="item" data-value="components" data-expanded>
      <button
        type="button"
        data-part="toggle"
        aria-label="Toggle Components"
      >
      </button>
      <button type="button" data-part="node">Components</button>

      <ul data-part="group">
        <li data-part="item" data-value="master-detail">
          <button type="button" data-part="node">Master-detail</button>
        </li>
        <li data-part="item" data-value="tabs">
          <button type="button" data-part="node">Tabs</button>
        </li>
      </ul>
    </li>
  </ul>

  <section data-part="panels">
    <article data-part="panel" data-value="elements">...</article>
    <article data-part="panel" data-value="components" hidden>...</article>
    <article data-part="panel" data-value="master-detail" hidden>...</article>
    <article data-part="panel" data-value="tabs" hidden>...</article>
  </section>
</auras-tree>
```

`auras-tree` uses the same `value`, `activation`, `show(value)`,
`focusCurrent()`, and `auras-change` contract as the other Components, but adds
hierarchy and branch expansion. `Up` and `Down` move through visible nodes;
`Right` expands or enters a branch; `Left` collapses or moves back to the
parent.

### Tabs

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-tabs data-ui="tabs" value="overview" activation="manual">
  <nav data-part="tablist" aria-label="Release views">
    <button type="button" data-part="trigger" data-value="overview">
      Overview
    </button>
    <button type="button" data-part="trigger" data-value="tokens">
      Tokens
    </button>
    <button type="button" data-part="trigger" data-value="behavior">
      Behavior
    </button>
  </nav>

  <section data-part="panels">
    <article data-part="panel" data-value="overview">...</article>
    <article data-part="panel" data-value="tokens" hidden>...</article>
    <article data-part="panel" data-value="behavior" hidden>...</article>
  </section>
</auras-tabs>
```

`auras-tabs` uses the same `value`, `activation`, `show(value)`,
`focusCurrent()`, and `auras-change` contract as `auras-master-detail`, but with
tab semantics and horizontal arrow-key navigation.

### Prose

```html
<article data-ui="prose">
  <hgroup>
    <p>Long-form content</p>
    <h2>Readable measure and calmer spacing</h2>
    <p>Use this wrapper for articles, docs, and rich editorial copy.</p>
  </hgroup>
  <p>Auras keeps the global defaults restrained and lets prose be opt-in.</p>
</article>
```

### Site header

```html
<header data-ui="site-header">
  <p><strong>Site name</strong></p>
  <nav data-nav="inline">
    <ul>
      <li><a href="/" aria-current="page">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
```

### Inline navigation

```html
<nav data-nav="inline">
  <ul>
    <li><a href="#">Link</a></li>
  </ul>
</nav>
```

## Forms

Text inputs, single-select menus, and textareas are styled automatically. No
classes needed:

```html
<form>
  <fieldset>
    <legend>Profile</legend>
    <label for="name">Name</label>
    <input id="name" type="text" required />
    <button type="submit" data-variant="solid">Save</button>
  </fieldset>
</form>
```

Features included out of the box:

- Required field markers (`*` appended via CSS)
- `:user-invalid` and `aria-invalid="true"` border color
- Fieldset error borders when children are invalid
- Styled `role="switch"` checkboxes, `progress`, and `meter` elements
- Native chevrons for single-select menus and animated indeterminate progress
- `accent-color` on checkboxes, radios, and range inputs
- Disabled state styling

## Utilities

| Attribute                                     | Effect                                                           |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `data-sticky`                                 | `position: sticky; top: 0`. Override offset with `--sticky-top`. |
| `data-visually-hidden` / `data-sr-only`       | Screen-reader-only text                                          |
| `data-smooth`                                 | Smooth scroll with `overflow-y: auto`                            |
| `data-hide="mobile"`                          | Hidden below 640px                                               |
| `data-hide-print`                             | Hidden in print output                                           |
| `data-status="error\|warning\|success\|info"` | Semantic status color                                            |
| `data-aspect="16/9\|4/3\|1/1\|3/2\|21/9"`     | Aspect ratio                                                     |
| `data-fit="cover\|contain\|fill\|scale-down"` | Object fit                                                       |

## Accessibility

Auras includes several accessibility defaults:

- `:focus-visible` outline on all interactive elements
- `prefers-reduced-motion` respected when `data-motion` is not set
- `prefers-contrast: high` and `prefers-contrast: less` adaptations
- `forced-colors: active` support for Windows High Contrast Mode
- `color-scheme: light dark` declared on `:root`
- `aria-busy="true"` surfaces receive a lightweight spinner without extra markup
- `aria-current="page"` styling for navigation
- `aria-invalid="true"` as a fallback for `:user-invalid`

## Print

Print styles activate automatically via `@media print`:

- Colors reset to black on white
- Navigation and buttons hidden
- Links expanded to show their `href`
- Page breaks avoided inside sections and after headings
- `@page` margin and page counter set
- `data-hide-print` hides any element from print output

## Brand packs

A brand pack is a standalone CSS file that overrides tokens inside a
`@layer brands` block, scoped to a `data-brand` attribute:

```css
/* auras-brand-custom.css */
@layer brands {
  [data-brand="custom"] {
    --primary-l: 50%;
    --primary-c: 0.2;
    --hue-primary: 150;
    --card-shadow: var(--shadow-sm);
    --page-padding-block: var(--space-4);
  }
}
```

Load it alongside the core:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="auras-brand-custom.css" />
<body data-brand="custom"></body>
```

The included `packages/brands/auras-brand.css` stylesheet serves as both a
working brand and a template for creating your own.

## Development and deployment

Run the demo site locally:

```sh
deno task dev
# http://localhost:8000
```

Run checks and tests:

```sh
deno task check      # type-check all packages
deno task test       # unit tests (happy-dom)
deno task test:browser  # headless browser smoke tests
```

The `main.ts` entry point serves both `deno task dev` and Deno Deploy. It maps
`/` to `./public` and `/packages/` to `./packages/`.

### Static deployment

The `public/` directory is self-contained and can be deployed to any static host
(Netlify, Cloudflare Pages, S3, etc.) without a build step. It includes
collocated copies of all CSS and JS assets under `public/packages/` so that
every `<link>` and `<script>` reference in `index.html` resolves locally.

## Browser support

Auras targets modern evergreen browsers. Key features and their support:

- `@layer` - Chrome 99+, Firefox 97+, Safari 15.4+
- `oklch()` - Chrome 111+, Firefox 113+, Safari 15.4+
- `color-mix()` - Chrome 111+, Firefox 113+, Safari 16.2+
- `:user-invalid` - Chrome 119+, Firefox 88+, Safari 16.5+
- `text-wrap: balance` - Chrome 114+, Firefox 121+, Safari 17.5+
- `@property` - Chrome 85+, Firefox 128+, Safari 15.4+

## Files

| File                                       | Purpose                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `tests/auras-components.browser.test.js`    | Headless browser smoke test for the optional packages and keyboard flows |
| `tests/auras-combobox.test.js`              | Deno behavioral coverage for `auras-combobox`                             |
| `tests/auras-splitter.test.js`              | Deno behavioral coverage for `auras-splitter`                             |
| `tests/auras-diagram.test.js`               | Deno behavioral coverage for `auras-diagram`                              |
| `tests/auras-components.test.js`            | Deno behavioral coverage for the Components package                      |
| `tests/auras-tree.test.js`                  | Deno behavioral coverage for `auras-tree`                                 |
| `packages/elements/auras.css`               | Elements layer stylesheet source                                         |
| `packages/composites/auras-composites.css`  | Composites layer stylesheet source                                       |
| `packages/brands/auras-brand.css`           | Auras brand stylesheet source                                             |
| `packages/brands/auras-brand-editorial.css` | Editorial brand stylesheet source                                        |
| `packages/diagram/browser.js`              | Browser-friendly no-build diagram entrypoint                             |
| `packages/diagram/mod.ts`                  | Deno-first export surface for the diagram package                        |
| `packages/diagram/jsr.json`                | JSR package metadata for `@auras/diagram`                                 |
| `packages/diagram/README.md`               | Package-level usage notes for `@auras/diagram`                            |
| `packages/diagram/src/`                    | Diagram package runtime module                                           |
| `packages/components/browser.js`           | Browser-friendly no-build Components entrypoint                          |
| `packages/components/mod.ts`               | Deno-first export surface for the Components package                     |
| `packages/components/jsr.json`             | JSR package metadata for `@auras/components`                              |
| `packages/components/README.md`            | Package-level usage notes                                                |
| `packages/components/src/`                 | Shared logic plus per-component runtime modules                          |
| `packages/components/src/combobox.ts`      | Combobox runtime for `auras-combobox`                                     |
| `packages/components/src/splitter.ts`      | Splitter runtime for `auras-splitter`                                     |
| `packages/components/src/tree.ts`          | Tree runtime for `auras-tree`                                             |
| `public/`                                  | Self-contained demo site, deployable as a static folder                  |
| `main.ts`                                  | Deno Deploy entry point (static file server)                             |
| `deno.json`                                | Deno tasks for dev server, type checking, and tests                      |
| `deno.lock`                                | Locked JSR and npm test dependencies                                     |
| `docs/component-architecture.md`           | Architecture note and layer decision rules                               |
| `docs/user-guide.md`                       | User guide with patterns, verification steps, and file map               |

## License

MIT
