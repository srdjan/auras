# Auras CSS User Guide

Auras CSS is a headless-first CSS framework for semantic HTML. This guide covers
the current repository as it exists today: a static core stylesheet, two sample
brand packs, and a demo page you can use to verify behavior without a build
step.

Related docs:

- [Component Architecture](./component-architecture.md)
- [Components package README](../packages/components/README.md)
- [Diagram package README](../packages/diagram/README.md)
- [Audit package README](../packages/audit/README.md)
- [Theme Studio](/studio.html) - interactive brand pack builder
- [Contract Lab](/lab.html) - live markup auditing

## Quick Start

1. Run a local static server from the repo root:

```sh
deno task dev
```

2. Open `http://localhost:8008`.

3. Add the core stylesheet to any HTML page:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
```

4. When you want a branded look, load a brand pack and set `data-brand`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-contrast="more">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="packages/elements/auras.css" />
    <link rel="stylesheet" href="packages/brands/auras-brand.css" />
    <title>Auras Example</title>
  </head>
  <body data-brand="auras">
    <main data-layout="container">
      <section data-surface="card">
        <h1>Hello Auras</h1>
        <p>Semantic HTML first. Attributes only where they add behavior.</p>
      </section>
    </main>
  </body>
</html>
```

5. When you want the optional higher layers, load them explicitly:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/diagram/browser.js"></script>
<script type="module" src="packages/components/browser.js"></script>
```

## Mental Model

- `packages/elements/auras.css` is the Elements layer. It gives you reset,
  tokens, typography, layout primitives, components, utilities, accessibility
  defaults, and print styles.
- Start with semantic HTML. Add `data-*` attributes only when you want layout,
  surface, variant, or utility behavior.
- Keep branding separate from structure. The Elements layer stays neutral; brand
  packs only override tokens inside `@layer brands`.
- Theme controls are composable:
  - `data-brand` goes on `<body>` in the current examples.
  - `data-theme="dark"`, `data-contrast="more"`, and `data-motion="reduce"` go
    on `<html>`.
- The framework does not require JavaScript. The JS in `public/index.html` only
  powers the optional interactive layer and the demo controls. The package and
  browser sources live under `packages/diagram` and `packages/components`.
- All custom elements extend `AurasElement` from `packages/shared/`, which
  handles property/attribute sync, lifecycle hooks, auto-binding, and the
  `hydrated` host attribute.
- The Elements and Composites layers use CSS `@scope` to keep selectors local.
  Button rules stay attached to button-like elements, and composite
  `[data-part]` rules stay attached to the matching root instead of leaking
  across nearby patterns.
- Every component sets `hydrated` on its host after successful initialization.
  Use `auras-*:not([hydrated])` in CSS to hide interactive affordances that need
  JavaScript, and `auras-*[hydrated]` to animate panels after upgrade.
- CSS containment is an internal optimization, not a general utility. Auras
  applies it only at bounded composite roots where the authored contract is
  already "this is a self-contained box".
- The framework does not expose a `data-contain` attribute or similar utility.
  If containment would clip popovers, anchored UI, sticky/fixed children, or
  intentional overflow, it is not an Auras default.

## Native Platform Features

Auras is not trying to out-abstract the platform. When modern HTML or CSS can
carry the behavior directly, Auras prefers to style and document that path
instead of introducing a new wrapper component.

### Floating UI

Use native `popover` plus CSS anchor positioning for dropdowns, menus, and other
non-modal overlays when authored HTML already describes the relationship.

- Keep the trigger and panel in the light DOM.
- Let CSS handle placement and sizing.
- Reserve JavaScript for state that the platform does not model on its own.

The current combobox pattern follows this rule: the listbox renders in the top
layer with `popover`, anchors to the authored control when the browser supports
anchor positioning, and falls back to the inline listbox contract when it does
not.

### Dialogs

Use native `<dialog>` for modal interactions.

- Auras styles the element and its `::backdrop`.
- Opening remains the standard `.showModal()` call.
- Focus trapping, escape handling, and page inertness stay native.

Auras intentionally does not ship an `auras-dialog` component because the
platform already covers the behavior well.

### Native Forms First

Prefer native form controls whenever the authored HTML already matches the
interaction.

- Standard choice inputs should stay on `<select>`.
- Auto-growing long-text input should stay on `<textarea>`.
- Auras upgrades these with `appearance: base-select` and
  `field-sizing: content` when the browser supports them.

Use `auras-combobox` only when you need search, active-option state, manual or
automatic activation, or linked-panel coordination. It complements native forms
instead of replacing them.

### Motion And Scroll

Motion features in Auras are optional enhancements, not structural dependencies.

- Use scroll-state queries for sticky affordances, scroll shadows, and snapped
  item treatment where CSS can derive the state directly.
- Use view transitions for panel swaps and route-level polish.
- Use scroll-driven animations only for decorative effects.

Guard these features with `@supports`, and keep reduced-motion behavior as the
default accessibility boundary.

## Containment

Use containment in Auras the same way you use stronger structure everywhere
else: sparingly, explicitly, and only where the boundary is obvious in the
authored HTML.

- Prefer `contain: content` on bounded composite shells whose children should
  stay inside the box anyway.
- Keep containment off generic Elements-layer primitives such as
  `data-layout="grid"` or `data-surface="card"`.
- Avoid `contain: paint`, `contain: size`, `contain: inline-size`, or
  `contain: strict` unless the component already has an explicit overflow and
  sizing contract.
- Review container-query roots and containment together. Query containers
  already introduce some isolation, so adding more containment should be
  deliberate.

Current examples in this repo:

- `data-ui="example"` uses `contain: content` because it is a bounded docs box
  with local preview and code regions.
- `data-ui="diagram"` keeps `contain: inline-size` because the component already
  defines a minimum inline size and horizontal scrolling contract.
- `auras-combobox` does not use containment on its root because the listbox may
  render in the top layer with `popover` and anchor positioning.

## Common Patterns

### Layout

Use `data-layout` for page structure:

```html
<main data-layout="container">
  <section data-layout="stack" data-gap="6">
    <header data-layout="row" data-justify="between" data-align="center">
      <h1>Dashboard</h1>
      <nav data-nav="inline">
        <ul>
          <li><a href="/" aria-current="page">Home</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </nav>
    </header>

    <div data-layout="grid" data-grid-min="md" data-gap="4">
      <article data-surface="card">...</article>
      <article data-surface="card">...</article>
      <article data-surface="card">...</article>
    </div>
  </section>
</main>
```

Useful values:

- `data-layout="row" | "col" | "stack" | "cluster" | "grid" | "subgrid" | "container"`
- `data-align="start" | "center" | "end" | "stretch"`
- `data-justify="start" | "center" | "end" | "between" | "around" | "evenly"`
- `data-gap="1" | "2" | "3" | "4" | "6" | "8"`
- `data-grid-min="sm" | "md" | "lg"` (or physical-object aliases `coin | note | card | page | wide`)
- `data-subgrid-span="2" | "3" | "4" | "5"`
- `data-stack="mobile"` to collapse a row into a column on small screens

The `data-stack="mobile"` and `data-hide="mobile"` breakpoints use
`40rem` rather than a fixed pixel value, so they shift proportionally
when a user increases system font size.

### Responsive primitives (optional)

Load the Breakpoints package when you want named breakpoint flags
without writing media queries inside component CSS:

```html
<link rel="stylesheet" href="packages/breakpoints/auras-breakpoints.css" />

<body data-bp="stage">
  <section data-bp="node" data-layout="stack" data-gap="4">
    <article data-surface="card">...</article>
  </section>
</body>
```

`data-bp="stage"` queries the viewport; `data-bp="node"` queries the
nearest container (the element establishes `container-type: inline-size`
automatically). A `data-bp="node"` root cannot react to its own size -
that would create a layout feedback loop - so flags are resolved on
the node's descendants. Style the children using the tokens; wrap
content in an inner element if you need the node itself to react.

Both scopes expose identical flag tokens:

| Token           | Value when active         |
| --------------- | ------------------------- |
| `--bp-gte-sm`   | `1` at or above `40rem`   |
| `--bp-gte-md`   | `1` at or above `64rem`   |
| `--bp-gte-lg`   | `1` at or above `80rem`   |
| `--bp-gte-xl`   | `1` at or above `96rem`   |
| `--bp-lt-sm`    | inverse of `--bp-gte-sm`  |
| `--bp-lt-md`    | inverse of `--bp-gte-md`  |
| `--bp-lt-lg`    | inverse of `--bp-gte-lg`  |
| `--bp-lt-xl`    | inverse of `--bp-gte-xl`  |

Compose with `calc()` to select values by breakpoint without writing
a media query:

```css
.hero {
  padding-block: calc(
    var(--space-6) + var(--bp-gte-md) * var(--space-4)
  );
  font-size: calc(
    var(--text-lg) * var(--bp-lt-md) +
    var(--text-2xl) * var(--bp-gte-md)
  );
}
```

Flags are `@property`-registered integers, so values derived through
`calc()` animate smoothly when a breakpoint crosses. The package is
entirely optional; Elements works without it.

### Subgrid

Use `data-layout="subgrid"` on children of a `data-layout="grid"` container when
their internal rows need to align across siblings. This is the solution for card
grids where titles, descriptions, and actions should line up regardless of
content length:

```html
<div data-layout="grid" data-grid-min="md" data-gap="4">
  <article data-layout="subgrid" data-surface="card">
    <h3>Short title</h3>
    <p>A longer description that wraps to multiple lines.</p>
    <footer><button>Action</button></footer>
  </article>
  <article data-layout="subgrid" data-surface="card">
    <h3>A much longer title that wraps</h3>
    <p>Short text.</p>
    <footer><button>Action</button></footer>
  </article>
</div>
```

Each subgrid child spans 3 parent rows by default (title + body + actions). The
parent's implicit auto rows size based on the tallest content in each row band
across all cards, producing consistent alignment.

Override the span count with `data-subgrid-span` or the `--subgrid-span` custom
property:

```html
<article data-layout="subgrid" data-subgrid-span="4">...</article>
<article data-layout="subgrid" style="--subgrid-span: 6">...</article>
```

All cards in the same row band must use the same span value. Gap is inherited
from the parent grid; add `data-gap` to the subgrid child to override.

For column subgrid (rarer, used in form or table alignment), apply the CSS
directly:

```html
<form
  style="display: grid; grid-template-columns: auto 1fr; gap: var(--space-3)"
>
  <fieldset
    style="display: grid; grid-template-columns: subgrid; grid-column: 1 / -1"
  >
    <label>Name</label>
    <input type="text">
  </fieldset>
</form>
```

### Surfaces and Actions

Opt into stronger component styling with attributes, not classes:

```html
<section data-surface="card" data-layout="stack" data-gap="3">
  <h2>Team Update</h2>
  <p>This surface stays token-driven and brandable.</p>
  <div data-layout="cluster" data-gap="2">
    <button type="button">Default</button>
    <button type="button" data-variant="solid">Primary</button>
    <button type="button" data-variant="soft">Secondary</button>
    <button type="button" data-variant="ghost">Ghost</button>
  </div>
</section>
```

Notices and accordions use the same headless pattern:

```html
<aside data-surface="notice" data-status="warning" role="alert">
  <strong>Heads up</strong>
  <p>This message is token-driven and brandable.</p>
</aside>

<section data-ui="accordion">
  <details name="faq" open>
    <summary>What changed?</summary>
    <p>Auras can now style grouped accordions without classes.</p>
  </details>
</section>
```

### Prose

Use `data-ui="prose"` when a section contains article-style content instead of
application chrome:

```html
<article data-ui="prose">
  <hgroup>
    <p>Documentation</p>
    <h2>Readable measure and stronger rhythm</h2>
    <p>Ideal for guides, release notes, and editorial content.</p>
  </hgroup>
  <p>Auras keeps this behavior opt-in so general UI stays restrained.</p>
</article>
```

### Example composite

Use `data-ui="example"` for documentation blocks that pair a live preview with
source code. Load `auras-composites.css` alongside the base stylesheet.

```html
<article data-ui="example">
  <header data-part="header">
    <strong>Tabs</strong>
    <span data-part="meta">Live preview</span>
  </header>
  <div data-part="preview">
    <!-- live demo -->
  </div>
  <pre
    data-part="code"
  ><code>&lt;auras-tabs&gt;...&lt;/auras-tabs&gt;</code></pre>
</article>
```

The header is optional. Token hooks: `--example-border-color`,
`--example-radius`, `--example-preview-padding`, `--example-code-bg`,
`--example-code-padding`, `--example-code-font-size`.

This composite is intentionally contained with `contain: content`: the preview
and code panes are meant to behave like a single bounded documentation card, so
changes inside it can stay local without exposing a new author-facing utility.

### Syntax highlighting

Wrap spans in `data-syntax` attributes for lightweight code coloring:

```html
<pre>
<code><span data-syntax="tag">&lt;div</span>
  <span data-syntax="attr">data-layout</span>=<span data-syntax="value">"stack"</span><span data-syntax="tag">&gt;</span>
<span data-syntax="tag">&lt;/div&gt;</span></code></pre>
```

Values: `tag`, `attr`, `value`, `comment`, `keyword`, `function`. Colors derive
from `--hue-primary` and `--hue-secondary` and adapt to brand packs and dark
mode automatically.

### Diagram composite

Use `data-ui="diagram"` for static flow or architecture diagrams that should
stay CSS-only:

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

Placement is explicit through custom properties on each node or connector, so
the pattern stays inspectable and easy to override.

### Diagram component

If the same diagram needs selection state and keyboard movement, add the
separate optional `auras-diagram` package:

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

`auras-diagram` keeps the authored diagram markup in light DOM and adds only:

- active node state
- roving focus
- spatial arrow-key navigation
- optional linked panels

### Master-detail

`auras-master-detail` pairs with the Composites stylesheet for a
selection-driven layout:

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

Use `activation="manual"` when focus movement and selection should be separate
actions.

### Combobox

`auras-combobox` keeps the authored input and listbox in light DOM while adding
filtering, active-option state, and optional linked panels:

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

Use `activation="manual"` when arrow keys should move the highlighted result
before `Enter` commits the selected value.

### Splitter

`auras-splitter` keeps both panes and the separator in authored light DOM while
adding keyboard resize, pointer drag, and percent-based primary pane state:

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

Focus the separator and use the arrow keys, or drag it with the pointer, to
change the split. `Home` and `End` jump to the configured min and max.

### Tree

`auras-tree` keeps the authored nested list in light DOM and adds hierarchy,
branch expansion, roving focus, and optional linked panels:

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

Use `activation="manual"` when `Up`/`Down`/`Left`/`Right` should move focus
through the visible hierarchy before `Enter` or `Space` commits the selection.

### Tabs

`auras-tabs` uses the same host contract as `auras-master-detail`, but with
honest tab semantics:

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

Use `activation="manual"` when horizontal arrow-key focus should move before the
panel changes.

### Sections

`auras-sections` presents one authored structure as tabs, accordion, or
container-adaptive mode that switches between them at a breakpoint:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>

<auras-sections mode="auto" morph-at="500" value="html">
  <section data-part="section" data-value="html">
    <button type="button" data-part="trigger">HTML</button>
    <div data-part="panel">
      <p>Semantic markup with data attributes.</p>
    </div>
  </section>
  <section data-part="section" data-value="css">
    <button type="button" data-part="trigger">CSS</button>
    <div data-part="panel">
      <p>OKLCH colors, cascade layers, and container-aware layouts.</p>
    </div>
  </section>
</auras-sections>
```

Each section contains exactly one trigger and one panel as direct children.
`mode="tabs"` uses tablist ARIA with horizontal arrow keys. `mode="accordion"`
uses `aria-expanded` with vertical arrow keys and allows multiple open sections.
`mode="auto"` starts as tabs and morphs to accordion when the container is
narrower than `morph-at` pixels.

### Auditing Markup

The `@auras/audit` package validates authored markup against the published
contracts. Run it in tests, the browser console, or as a CLI check:

```sh
deno task audit public/index.html
```

```ts
import {
  auditAuras,
  getAurasContract,
  getAurasContracts,
} from "jsr:@auras/audit";

const diagnostics = auditAuras(document);
const allContracts = getAurasContracts();
const sectionsContract = getAurasContract("auras-sections");
```

The [Contract Lab](/lab.html) provides a live editor where you can paste markup,
pick a component preset, and see audit diagnostics in real time.

### Forms

Native elements are styled automatically:

```html
<form data-layout="stack" data-gap="4">
  <fieldset data-layout="stack" data-gap="3">
    <legend>Profile</legend>

    <label for="name">Name</label>
    <input id="name" type="text" required />

    <label for="email">Email</label>
    <input id="email" type="email" required />

    <label for="country">Country</label>
    <select id="country" required>
      <option value="">Choose one</option>
      <option value="us">United States</option>
    </select>

    <button type="submit" data-variant="solid">Save</button>
  </fieldset>
</form>
```

Included behaviors:

- Required field markers
- Validation styling through `:user-invalid` and `aria-invalid="true"`
- Styled fieldsets, selects, textareas, checkboxes, radios, range inputs,
  switches, progress bars, and meter elements
- Native chevrons for single-select menus and animated indeterminate progress
- Disabled state styling

### Utilities

Auras also exposes small, semantic helpers:

```html
<p data-status="success">Saved successfully.</p>

<figure>
  <div data-aspect="16/9">
    <img src="/hero.jpg" alt="Hero image" data-fit="cover" />
  </div>
</figure>

<span data-visually-hidden>Screen-reader-only label</span>
<aside data-sticky style="--sticky-top: 1rem">Sticky note</aside>
<div data-smooth>Scrollable region</div>
<p data-hide-print>This content is removed from print output.</p>
```

## Working With Brand Packs

The repo currently ships with two sample packs:

- `packages/brands/auras-brand.css` activates when `data-brand="auras"`
- `packages/brands/auras-brand-editorial.css` activates when
  `data-brand="editorial"`

To make your own, create a new CSS file and override tokens in `@layer brands`:

```css
@layer brands {
  [data-brand="custom"] {
    --hue-primary: 150;
    --card-shadow: var(--shadow-sm);
    --button-radius: 999px;
  }
}
```

Then load it after the core stylesheet and set `data-brand="custom"` on
`<body>`.

## Demo Page Guide

`public/index.html` is the fastest way to validate the framework:

- `Headless core`: removes `data-brand`
- `Auras pack`: loads `packages/brands/auras-brand.css` and sets
  `data-brand="auras"`
- `Editorial pack`: loads `packages/brands/auras-brand-editorial.css` and sets
  `data-brand="editorial"`
- `Toggle dark`: toggles `data-theme="dark"` on `<html>`
- `Enable high contrast`: toggles `data-contrast="more"` on `<html>`
- `Use reduced motion`: toggles `data-motion="reduce"` on `<html>`
- `Reset`: clears brand, theme, contrast, and motion attributes

The demo also exercises:

- Layout primitives
- Long-form prose styling
- Static diagram composites for documentation flows
- Card, notice, and accordion surfaces
- Native `<dialog>` styling plus the Auras backdrop tokens
- Native `<select>` and auto-growing `<textarea>` enhancements
- Master-detail and tabs composites plus the matching Components
- Button variants and busy states
- Form validation states
- Switch, progress, and meter styling
- Status colors
- Aspect ratios and object fit
- Sticky regions, smooth scrolling, and scroll-state-driven affordances
- Print behavior

## File Map

| File                                        | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `tests/auras-element.test.ts`               | Unit tests for the `AurasElement` base class     |
| `tests/auras-components.browser.test.js`    | Browser smoke coverage for the optional packages |
| `tests/auras-combobox.test.js`              | Deno behavioral coverage for `auras-combobox`    |
| `tests/auras-splitter.test.js`              | Deno behavioral coverage for `auras-splitter`    |
| `tests/auras-diagram.test.js`               | Deno behavioral coverage for `auras-diagram`     |
| `tests/auras-components.test.js`            | Deno behavioral coverage for Components          |
| `tests/auras-sections.test.js`              | Deno behavioral coverage for `auras-sections`    |
| `tests/auras-tree.test.js`                  | Deno behavioral coverage for `auras-tree`        |
| `tests/auras-audit.test.ts`                 | Deno behavioral coverage for `@auras/audit`      |
| `tests/auras-audit-cli.test.ts`             | CLI test for `@auras/audit`                      |
| `tests/public-demo.test.js`                 | Static demo assertions for `public/index.html`   |
| `tests/site-seo.test.ts`                    | Docs route, sitemap, and SEO coverage            |
| `packages/elements/auras.css`               | Elements layer stylesheet source                 |
| `packages/composites/auras-composites.css`  | Composites layer stylesheet source               |
| `packages/brands/auras-brand.css`           | Auras brand stylesheet source                    |
| `packages/brands/auras-brand-editorial.css` | Editorial brand stylesheet source                |
| `packages/diagram/browser.js`               | Browser-friendly no-build diagram entrypoint     |
| `packages/diagram/mod.ts`                   | Deno-first diagram package surface               |
| `packages/diagram/jsr.json`                 | JSR package metadata for `@auras/diagram`        |
| `packages/diagram/README.md`                | Package-level usage note for `@auras/diagram`    |
| `packages/diagram/src/`                     | Diagram package runtime module                   |
| `packages/shared/auras-element.ts`          | `AurasElement` base class for custom elements    |
| `packages/shared/utilities.ts`              | Shared utilities (ID gen, activation, RTL)       |
| `packages/shared/mod.ts`                    | Shared package re-exports                        |
| `packages/components/browser.js`            | Browser-friendly no-build Components entrypoint  |
| `packages/components/mod.ts`                | Deno-first Components package surface            |
| `packages/components/jsr.json`              | JSR package metadata                             |
| `packages/components/README.md`             | Package-level usage note                         |
| `packages/components/src/`                  | Shared logic plus per-component modules          |
| `packages/components/src/combobox.ts`       | `auras-combobox` runtime module                  |
| `packages/components/src/master-detail.ts`  | `auras-master-detail` runtime module             |
| `packages/components/src/sections.ts`       | `auras-sections` runtime module                  |
| `packages/components/src/splitter.ts`       | `auras-splitter` runtime module                  |
| `packages/components/src/tabs.ts`           | `auras-tabs` runtime module                      |
| `packages/components/src/tree.ts`           | `auras-tree` runtime module                      |
| `packages/audit/mod.ts`                     | Deno-first audit package surface                 |
| `packages/audit/browser.js`                 | Browser-friendly no-build audit entrypoint       |
| `packages/audit/cli.ts`                     | CLI entrypoint for `@auras/audit`                |
| `packages/audit/contracts.js`               | Shared contract definitions                      |
| `packages/audit/jsr.json`                   | JSR package metadata for `@auras/audit`          |
| `packages/audit/README.md`                  | Package-level docs for `@auras/audit`            |
| `deno.json`                                 | Deno tasks for dev server, checking, and tests   |
| `deno.lock`                                 | Locked JSR and npm test dependencies             |
| `main.ts`                                   | Deno Deploy entry point (static file server)     |
| `site/docs.ts`                              | Docs route registry and markdown rendering       |
| `public/index.html`                         | Interactive demo page                            |
| `public/studio.html`                        | Theme Studio for visual brand pack creation      |
| `public/lab.html`                           | Contract Lab for live markup auditing            |
| `docs/component-architecture.md`            | Architecture note for the layer split            |
| `docs/user-guide.md`                        | This user guide                                  |

## Verification

Run these checks after changes:

```sh
cd /path/to/auras
deno task check
deno task test
deno task test:browser
deno task publish:diagram:dry-run
deno task publish:components:dry-run
deno task publish:audit:dry-run
deno task dev
```

If Chrome is not installed at the default macOS path, set
`AURA_BROWSER_EXECUTABLE` before running `deno task test:browser`.

Then verify:

1. Open `http://localhost:8008`.
2. Switch between `Headless core`, `Auras pack`, and `Editorial pack`.
3. Toggle dark mode, high contrast, and reduced motion.
4. Review the prose, static diagram, interactive diagram, combobox, splitter,
   tree, notice, accordion, master-detail, and tabs examples.
5. Use arrow keys inside the interactive diagram and confirm focus moves across
   the grid; in manual activation, `Enter` or `Space` should update the detail
   panel.
6. Use arrow keys inside the combobox and confirm the selected value stays in
   sync with the current panel; in manual mode, `Enter` should commit the
   highlighted result.
7. Focus the splitter handle and confirm arrow keys update the split value; drag
   the divider with the pointer and confirm the primary pane size changes.
8. Use arrow keys inside the tree and confirm the selected node and panel stay
   in sync while branch expansion and collapse follow the current focus.
9. Use arrow keys inside the auto-activation master-detail and confirm the
   detail panel follows the active trigger.
10. Use arrow keys inside the manual-activation master-detail and confirm focus
    moves first, then `Enter` or `Space` updates the detail panel.
11. Use arrow keys inside the auto-activation tabs and confirm the active tab
    and visible panel stay in sync.
12. Use arrow keys inside the manual-activation tabs and confirm focus moves
    first, then `Enter` or `Space` updates the panel.
13. Open the dialog and confirm the backdrop and page scroll lock.
14. Submit the form with empty required fields and confirm validation, busy
    states, select chevrons, progress, and meter styles.
15. Open print preview and confirm buttons/nav are hidden and print-only rules
    apply.
16. Navigate to `/lab.html`, pick a component preset, and confirm the audit runs
    with no errors on valid markup. Edit the markup to introduce an error (e.g.
    remove a required part) and confirm the diagnostics panel shows findings.
17. Navigate to `/studio.html` and drag the primary hue slider; confirm the
    preview updates in real time.
18. Toggle "Dark mode" in the preview header and confirm tokens adapt.
19. Click "Export Brand Pack", enter a name, and confirm a valid CSS file
    downloads.
20. Copy the Studio URL, open it in a new tab, and confirm the theme restores.
