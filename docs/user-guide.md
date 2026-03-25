# Auras CSS User Guide

Auras CSS is a headless-first CSS framework for semantic HTML. This guide covers
the current repository as it exists today: a static core stylesheet, two sample
brand packs, and a demo page you can use to verify behavior without a build
step.

Related docs:

- [Component Architecture](./component-architecture.md)
- [Components package README](../packages/components/README.md)
- [Diagram package README](../packages/diagram/README.md)
- [Theme Studio](/studio.html) - interactive brand pack builder

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

- `data-layout="row" | "col" | "stack" | "cluster" | "grid" | "container"`
- `data-align="start" | "center" | "end" | "stretch"`
- `data-justify="start" | "center" | "end" | "between" | "around" | "evenly"`
- `data-gap="1" | "2" | "3" | "4" | "6" | "8"`
- `data-grid-min="sm" | "md" | "lg"`
- `data-stack="mobile"` to collapse a row into a column on small screens

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

`auras-master-detail` pairs with the Composites stylesheet for a selection-driven
layout:

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

`auras-tabs` uses the same host contract as `auras-master-detail`, but with honest
tab semantics:

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
- Master-detail and tabs composites plus the matching Components
- Button variants, busy states, and dialog styling
- Form validation states
- Switch, progress, and meter styling
- Status colors
- Aspect ratios and object fit
- Sticky regions and smooth scrolling
- Print behavior

## File Map

| File                                       | Purpose                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `tests/auras-components.browser.test.js`    | Browser smoke coverage for the optional packages |
| `tests/auras-combobox.test.js`              | Deno behavioral coverage for `auras-combobox`     |
| `tests/auras-splitter.test.js`              | Deno behavioral coverage for `auras-splitter`     |
| `tests/auras-diagram.test.js`               | Deno behavioral coverage for `auras-diagram`      |
| `tests/auras-components.test.js`            | Deno behavioral coverage for Components          |
| `tests/auras-tree.test.js`                  | Deno behavioral coverage for `auras-tree`         |
| `packages/elements/auras.css`               | Elements layer stylesheet source                 |
| `packages/composites/auras-composites.css`  | Composites layer stylesheet source               |
| `packages/brands/auras-brand.css`           | Auras brand stylesheet source                     |
| `packages/brands/auras-brand-editorial.css` | Editorial brand stylesheet source                |
| `packages/diagram/browser.js`              | Browser-friendly no-build diagram entrypoint     |
| `packages/diagram/mod.ts`                  | Deno-first diagram package surface               |
| `packages/diagram/jsr.json`                | JSR package metadata for `@auras/diagram`         |
| `packages/diagram/README.md`               | Package-level usage note for `@auras/diagram`     |
| `packages/diagram/src/`                    | Diagram package runtime module                   |
| `packages/components/browser.js`           | Browser-friendly no-build Components entrypoint  |
| `packages/components/mod.ts`               | Deno-first Components package surface            |
| `packages/components/jsr.json`             | JSR package metadata                             |
| `packages/components/README.md`            | Package-level usage note                         |
| `packages/components/src/`                 | Shared logic plus per-component modules          |
| `packages/components/src/combobox.ts`      | `auras-combobox` runtime module                   |
| `packages/components/src/splitter.ts`      | `auras-splitter` runtime module                   |
| `packages/components/src/tree.ts`          | `auras-tree` runtime module                       |
| `deno.json`                                | Deno tasks for dev server, checking, and tests   |
| `deno.lock`                                | Locked JSR and npm test dependencies             |
| `main.ts`                                  | Deno Deploy entry point (static file server)     |
| `public/index.html`                        | Interactive demo page                            |
| `public/studio.html`                       | Theme Studio for visual brand pack creation      |
| `docs/component-architecture.md`           | Architecture note for the layer split            |
| `docs/user-guide.md`                       | This user guide                                  |

## Verification

Run these checks after changes:

```sh
cd /Users/srdjans/Code/MetadorHome/metador.auras
deno task check
deno task test
deno task test:browser
deno task publish:diagram:dry-run
deno task publish:components:dry-run
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
16. Navigate to `/studio.html` and drag the primary hue slider; confirm the
    preview updates in real time.
17. Toggle "Dark mode" in the preview header and confirm tokens adapt.
18. Click "Export Brand Pack", enter a name, and confirm a valid CSS file
    downloads.
19. Copy the Studio URL, open it in a new tab, and confirm the theme restores.
