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

**Elements layer** (`packages/elements/auras.css`) ships with near-neutral
colors (chroma 0.03), transparent bordered buttons, and no card shadows. It
provides structure without forcing a visual language.

**Brand packs** (e.g. `packages/brands/auras-brand.css`) live in the `brands`
layer and override token values when a `data-brand` attribute is present. This
keeps the core cacheable and lets you swap brands without touching the
framework.

## Packages

The framework is split into independent layers. The Elements layer is the
foundation; everything else is optional and additive.

| Package     | Path                                         | Purpose                                                                                 |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Elements    | `packages/elements/auras.css`                | Core stylesheet: reset, tokens, typography, layout, components, utilities, a11y, print  |
| Composites  | `packages/composites/auras-composites.css`   | CSS-only app patterns (example, master-detail, tabs, combobox, splitter, tree, diagram) |
| Breakpoints | `packages/breakpoints/auras-breakpoints.css` | Optional responsive flag tokens for `data-bp="stage\|node"`                             |
| Brands      | `packages/brands/`                           | Token override packs scoped to `data-brand`                                             |
| Shared      | `packages/shared/`                           | Internal base class (`AurasElement`) and utilities shared by the interactive packages   |
| Components  | `packages/components/`                       | Light-DOM custom elements for interactive behavior                                      |
| Diagram     | `packages/diagram/`                          | Standalone spatial selection component for diagrams                                     |
| Audit       | `packages/audit/`                            | Markup contract validation and authoring helpers for browser, Deno, and CLI workflows   |

CSS packages treat their stylesheet file as the canonical authoring surface.
TypeScript packages use `mod.ts` as the public Deno surface and `src/` for
runtime modules. `browser.js` files are no-build browser entrypoints used by the
demos and static export. All custom elements extend `AurasElement` from the
internal Shared package, which handles property/attribute sync, lifecycle hooks,
and the `hydrated` host attribute. See
[Component Architecture](./docs/component-architecture.md) for the package
split, decision rules, and progressive enhancement contracts.

The Elements and Composites layers also use CSS `@scope` to keep selector reach
local. Button styles are scoped to button-like elements, and composite
`[data-part]` rules are scoped to each pattern root so nested markup does not
pick up styles from an adjacent component.

### Included components

- `auras-master-detail` - selection controller for master-detail views
- `auras-tabs` - tab controller with horizontal arrow-key navigation
- `auras-combobox` - local-option combobox with filtering and optional linked
  panels
- `auras-sections` - tabs, accordion, or container-adaptive sections from one
  authored structure
- `auras-splitter` - two-pane splitter with keyboard and pointer resize
- `auras-tree` - hierarchical selection controller with expansion and optional
  panels
- `auras-diagram` - spatial node selection for interactive diagrams

### Progressive enhancement

Every component sets a `hydrated` attribute on its host after successful
initialization. CSS can target `auras-*:not([hydrated])` to hide or dim
interactive affordances that require JavaScript, and `auras-*[hydrated]` to fade
in or animate panels after upgrade. Content remains accessible through semantic
HTML before any script runs.

### Native platform first

Auras prefers platform primitives over custom abstractions when the browser
already solves the problem:

- Floating UI should start with `popover` and CSS anchor positioning. The
  combobox pattern already uses this for top-layer listboxes without portals or
  geometry code.
- Modal UI should start with native `<dialog>`. Auras styles it, but does not
  wrap it in an `auras-dialog` component.
- Plain form choice should stay on native `<select>`, with
  `appearance: base-select` and `field-sizing: content` applied as progressively
  enhanced upgrades.
- `auras-combobox` is for filtering, active-option state, and linked-panel
  coordination, not as a blanket replacement for every select input.
- View transitions, scroll-driven animations, and scroll-state queries are
  treated as motion-safe polish, never as required behavior.

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
<div data-layout="subgrid">...</div>
<!-- row-subgrid (inherits parent grid rows) -->
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

Physical-object aliases are available when a component-scale vocabulary reads
more clearly than abstract sizes:

| Alias  | `--grid-min` |
| ------ | ------------ |
| `coin` | 120px        |
| `note` | 240px        |
| `card` | 384px        |
| `page` | 600px        |
| `wide` | 970px        |

### Subgrid (cross-item alignment)

When cards or repeated items in a grid need their internal rows to align across
items, use `data-layout="subgrid"` instead of `data-layout="stack"`:

```html
<div data-layout="grid" data-grid-min="md" data-gap="4">
  <article data-layout="subgrid" data-surface="card">
    <h3>Short title</h3>
    <p>Description...</p>
    <footer><button>Action</button></footer>
  </article>
  <article data-layout="subgrid" data-surface="card">
    <h3>A much longer title that wraps to two lines</h3>
    <p>Shorter text.</p>
    <footer><button>Action</button></footer>
  </article>
</div>
```

The default spans 3 rows (title + body + actions). Override with
`data-subgrid-span` or the `--subgrid-span` property:

```html
<article data-layout="subgrid" data-subgrid-span="4">...</article>
<article data-layout="subgrid" style="--subgrid-span: 5">...</article>
```

| Attribute           | Values             | Default |
| ------------------- | ------------------ | ------- |
| `data-subgrid-span` | `2`, `3`, `4`, `5` | `3`     |

All cards in the same row band must use the same span value for alignment to
work correctly. Gap is inherited from the parent grid; override with `data-gap`
on the subgrid child if needed.

### Responsive stacking

```html
<div data-layout="row" data-stack="mobile">
  <!-- row on desktop, column below 40rem (~640px, scales with user font size) -->
</div>
```

### Responsive primitives (optional)

Load `packages/breakpoints/auras-breakpoints.css` when you want named breakpoint
flags without writing media queries inside component CSS. Authors compose values
with `calc()` against 0/1 integer flags:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/breakpoints/auras-breakpoints.css" />

<body data-bp="stage">
  <section data-bp="node">
    <article data-surface="card">...</article>
  </section>
</body>
```

```css
.hero {
  padding-block: calc(var(--space-6) + var(--bp-gte-md) * var(--space-4));
  font-size: calc(
    var(--text-lg) * var(--bp-lt-md) + var(--text-2xl) * var(--bp-gte-md)
  );
}
```

| Attribute         | Queries           | Notes                                                                          |
| ----------------- | ----------------- | ------------------------------------------------------------------------------ |
| `data-bp="stage"` | Viewport          | rem-based, respects user font size. Flags resolved on the stage root.          |
| `data-bp="node"`  | Nearest container | Establishes `container-type: inline-size`. Flags resolved on node descendants. |

| Token         | Value when active        |
| ------------- | ------------------------ |
| `--bp-gte-sm` | `1` at or above `40rem`  |
| `--bp-gte-md` | `1` at or above `64rem`  |
| `--bp-gte-lg` | `1` at or above `80rem`  |
| `--bp-gte-xl` | `1` at or above `96rem`  |
| `--bp-lt-sm`  | inverse of `--bp-gte-sm` |
| `--bp-lt-md`  | inverse of `--bp-gte-md` |
| `--bp-lt-lg`  | inverse of `--bp-gte-lg` |
| `--bp-lt-xl`  | inverse of `--bp-gte-xl` |

The flags are registered with `@property`, so values derived through `calc()`
animate smoothly when a breakpoint crosses. This package is optional; the
Elements layer works without it.

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
  <pre
    data-part="code"
  ><code>&lt;auras-tabs&gt;...&lt;/auras-tabs&gt;</code></pre>
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

| Token                       | Default                 |
| --------------------------- | ----------------------- |
| `--code-block-bg`           | `var(--surface-raised)` |
| `--code-block-border-color` | `var(--border)`         |
| `--code-block-padding`      | `var(--space-3)`        |
| `--code-block-radius`       | `var(--radius-lg)`      |
| `--code-block-font-size`    | `var(--text-sm)`        |

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

The included `packages/brands/auras-brand.css` stylesheet works as both a usable
brand and a template for creating your own.

### Theme Studio

The interactive Theme Studio at `/studio.html` lets you build brand packs
visually. Customize primary and secondary colors (OKLCH hue, lightness, chroma),
typography, border radius, shadows, card styling, and gray tinting through live
controls. Changes apply instantly to a preview panel showing representative
content across all component types.

When you are happy with the result, export a production-ready brand pack CSS
file or share your theme via URL. The URL encodes all token values in the hash
fragment, so every link is a complete, restorable theme.

```
/studio.html#hp=150&pl=55&pc=0.15&hs=280&sl=50&sc=0.1&rm=0.75&sh=1&gt=1
```

## Development and deployment

Run the demo site locally:

```sh
deno task dev
# http://localhost:8008
```

Run checks and tests:

```sh
deno task sync:public-packages
deno task check
deno task test
deno task test:browser
```

The `main.ts` entry point serves both `deno task dev` and Deno Deploy. It maps
`/` to `./public` and `/packages/` to `./packages/`.

### Static deployment

The `public/` directory is self-contained and can be deployed to any static host
(Netlify, Cloudflare Pages, S3, etc.) without a build step. Run
`deno task sync:public-packages` before deploying it. That task mirrors the
canonical CSS and browser entrypoints from `packages/` into `public/packages/`
so every `<link>` and `<script>` reference in `index.html` resolves locally.

## Browser support

Auras targets modern evergreen browsers. Key features and their support:

- `@layer` - Chrome 99+, Firefox 97+, Safari 15.4+
- `oklch()` - Chrome 111+, Firefox 113+, Safari 15.4+
- `color-mix()` - Chrome 111+, Firefox 113+, Safari 16.2+
- `:user-invalid` - Chrome 119+, Firefox 88+, Safari 16.5+
- `text-wrap: balance` - Chrome 114+, Firefox 121+, Safari 17.5+
- `@property` - Chrome 85+, Firefox 128+, Safari 15.4+

Newer platform features are layered in as progressive enhancements. Unsupported
browsers keep the semantic HTML and base styling:

- `popover` and `<dialog>` are part of the native overlay story.
- Anchor positioning powers floating listboxes where available.
- `appearance: base-select` and `field-sizing: content` upgrade native forms.
- Scroll-state queries, view transitions, and scroll-driven animations are
  guarded with `@supports` and reduced-motion checks.
- Masonry layout is enhancement-only and falls back to regular grid behavior.

## Files

| File                                         | Purpose                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `tests/auras-element.test.ts`                | Deno unit tests for the `AurasElement` base class                        |
| `tests/auras-components.browser.test.js`     | Headless browser smoke test for the optional packages and keyboard flows |
| `tests/auras-combobox.test.js`               | Deno behavioral coverage for `auras-combobox`                            |
| `tests/auras-splitter.test.js`               | Deno behavioral coverage for `auras-splitter`                            |
| `tests/auras-diagram.test.js`                | Deno behavioral coverage for `auras-diagram`                             |
| `tests/auras-components.test.js`             | Deno behavioral coverage for the Components package                      |
| `tests/auras-sections.test.js`               | Deno behavioral coverage for `auras-sections`                            |
| `tests/auras-tree.test.js`                   | Deno behavioral coverage for `auras-tree`                                |
| `tests/auras-audit.test.ts`                  | Deno behavioral coverage for `@auras/audit`                              |
| `tests/auras-audit-cli.test.ts`              | CLI coverage for `@auras/audit`                                          |
| `tests/public-demo.test.js`                  | Static demo assertions for `public/index.html`                           |
| `tests/site-seo.test.ts`                     | Documentation route, sitemap, and SEO coverage                           |
| `tests/sync-public-packages.test.ts`         | Sync-task coverage for the static `public/packages/` mirror              |
| `packages/elements/auras.css`                | Elements layer stylesheet source                                         |
| `packages/elements/README.md`                | Package notes for the canonical Elements stylesheet                      |
| `packages/composites/auras-composites.css`   | Composites layer stylesheet source                                       |
| `packages/composites/README.md`              | Package notes for the canonical Composites stylesheet                    |
| `packages/breakpoints/auras-breakpoints.css` | Optional responsive flag tokens for `data-bp="stage\|node"`              |
| `packages/breakpoints/README.md`             | Package notes for the breakpoint helper stylesheet                       |
| `packages/brands/auras-brand.css`            | Auras brand stylesheet source                                            |
| `packages/brands/auras-brand-editorial.css`  | Editorial brand stylesheet source                                        |
| `packages/brands/README.md`                  | Package notes for brand-pack source files                                |
| `packages/diagram/browser.js`                | Browser-friendly no-build diagram entrypoint                             |
| `packages/diagram/mod.ts`                    | Deno-first export surface for the diagram package                        |
| `packages/diagram/jsr.json`                  | JSR package metadata for `@auras/diagram`                                |
| `packages/diagram/README.md`                 | Package-level usage notes for `@auras/diagram`                           |
| `packages/diagram/src/`                      | Diagram package runtime module                                           |
| `packages/shared/auras-element.ts`           | `AurasElement` base class for all custom elements                        |
| `packages/shared/utilities.ts`               | Shared utility functions (ID generation, activation, directionality)     |
| `packages/shared/mod.ts`                     | Internal re-exports for the Shared package                               |
| `packages/shared/README.md`                  | Internal-only note for the Shared support modules                        |
| `packages/components/browser.js`             | Browser-friendly no-build Components entrypoint                          |
| `packages/components/mod.ts`                 | Deno-first export surface for the Components package                     |
| `packages/components/jsr.json`               | JSR package metadata for `@auras/components`                             |
| `packages/components/README.md`              | Package-level usage notes                                                |
| `packages/components/src/`                   | Shared logic plus per-component runtime modules                          |
| `packages/components/src/combobox.ts`        | Combobox runtime for `auras-combobox`                                    |
| `packages/components/src/master-detail.ts`   | Master-detail runtime for `auras-master-detail`                          |
| `packages/components/src/sections.ts`        | Morphing sections runtime for `auras-sections`                           |
| `packages/components/src/splitter.ts`        | Splitter runtime for `auras-splitter`                                    |
| `packages/components/src/tabs.ts`            | Tabs runtime for `auras-tabs`                                            |
| `packages/components/src/tree.ts`            | Tree runtime for `auras-tree`                                            |
| `packages/audit/browser.js`                  | Browser-friendly no-build audit entrypoint                               |
| `packages/audit/cli.ts`                      | CLI entrypoint for `@auras/audit`                                        |
| `packages/audit/core.js`                     | Shared audit and repair implementation used by all audit entrypoints     |
| `packages/audit/contracts.js`                | Shared contract definitions                                              |
| `packages/audit/mod.ts`                      | Deno-first export surface for `@auras/audit`                             |
| `packages/audit/jsr.json`                    | JSR package metadata for `@auras/audit`                                  |
| `packages/audit/README.md`                   | Package-level usage notes for `@auras/audit`                             |
| `public/`                                    | Self-contained demo site, deployable as a static folder                  |
| `public/index.html`                          | Interactive demo page                                                    |
| `public/lab.html`                            | Contract Lab for live markup generation, repair, and auditing            |
| `public/studio.html`                         | Interactive Theme Studio for visual brand pack creation                  |
| `scripts/sync-public-packages.ts`            | Syncs canonical package assets into `public/packages/`                   |
| `main.ts`                                    | Deno Deploy entry point (static file server)                             |
| `site/docs.ts`                               | Docs route registry, markdown rendering, and sitemap helpers             |
| `deno.json`                                  | Deno tasks for dev server, type checking, and tests                      |
| `deno.lock`                                  | Locked JSR and npm test dependencies                                     |
| `docs/component-architecture.md`             | Architecture note and layer decision rules                               |
| `docs/user-guide.md`                         | User guide with patterns, verification steps, and file map               |

## License

MIT
