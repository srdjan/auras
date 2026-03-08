# Aura CSS User Guide

Aura CSS is a headless-first CSS framework for semantic HTML. This guide covers
the current repository as it exists today: a static core stylesheet, two sample
brand packs, and a demo page you can use to verify behavior without a build
step.

## Quick Start

1. Run a local static server from the repo root:

```sh
cd /Users/srdjans/Code/MetadorHome/metador.aura
deno task dev
```

2. Open `http://127.0.0.1:8000/index.html`.

3. Add the core stylesheet to any HTML page:

```html
<link rel="stylesheet" href="aura.css" />
```

4. When you want a branded look, load a brand pack and set `data-brand`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-contrast="more">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="aura.css" />
    <link rel="stylesheet" href="aura-brand.css" />
    <title>Aura Example</title>
  </head>
  <body data-brand="aura">
    <main data-layout="container">
      <section data-surface="card">
        <h1>Hello Aura</h1>
        <p>Semantic HTML first. Attributes only where they add behavior.</p>
      </section>
    </main>
  </body>
</html>
```

5. When you want the optional higher layers, load them explicitly:

```html
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-composites.css" />
<script type="module" src="aura-components.js"></script>
```

## Mental Model

- `aura.css` is the Elements layer. It gives you reset, tokens, typography,
  layout primitives, components, utilities, accessibility defaults, and print
  styles.
- Start with semantic HTML. Add `data-*` attributes only when you want layout,
  surface, variant, or utility behavior.
- Keep branding separate from structure. The Elements layer stays neutral; brand
  packs only override tokens inside `@layer brands`.
- Theme controls are composable:
  - `data-brand` goes on `<body>` in the current examples.
  - `data-theme="dark"`, `data-contrast="more"`, and `data-motion="reduce"` go
    on `<html>`.
- The framework does not require JavaScript. The JS in `index.html` and
  `aura-components.js` only powers the optional interactive layer and the demo
  controls. The reusable package modules live under `packages/components`.

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
    <p>Aura can now style grouped accordions without classes.</p>
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
  <p>Aura keeps this behavior opt-in so general UI stays restrained.</p>
</article>
```

### Master-detail pilot

One optional Component is `aura-master-detail`, paired with the optional
Composites stylesheet:

```html
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-composites.css" />
<script type="module" src="aura-components.js"></script>

<aura-master-detail
  data-ui="master-detail"
  value="elements"
  activation="manual"
>
  <nav data-part="master" aria-label="Aura layers">
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
</aura-master-detail>
```

Use `activation="manual"` when focus movement and selection should be separate
actions.

### Tabs pilot

`aura-tabs` uses the same host contract as `aura-master-detail`, but with honest
tab semantics:

```html
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-composites.css" />
<script type="module" src="aura-components.js"></script>

<aura-tabs data-ui="tabs" value="overview" activation="manual">
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
</aura-tabs>
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

Aura also exposes small, semantic helpers:

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

- `aura-brand.css` activates when `data-brand="aura"`
- `aura-brand-editorial.css` activates when `data-brand="editorial"`

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

`index.html` is the fastest way to validate the framework:

- `Headless core`: removes `data-brand`
- `Aura pack`: loads `aura-brand.css` and sets `data-brand="aura"`
- `Editorial pack`: loads `aura-brand-editorial.css` and sets
  `data-brand="editorial"`
- `Toggle dark`: toggles `data-theme="dark"` on `<html>`
- `Enable high contrast`: toggles `data-contrast="more"` on `<html>`
- `Use reduced motion`: toggles `data-motion="reduce"` on `<html>`
- `Reset`: clears brand, theme, contrast, and motion attributes

The demo also exercises:

- Layout primitives
- Long-form prose styling
- Card, notice, and accordion surfaces
- Master-detail and tabs composites plus the matching Components pilots
- Button variants, busy states, and dialog styling
- Form validation states
- Switch, progress, and meter styling
- Status colors
- Aspect ratios and object fit
- Sticky regions and smooth scrolling
- Print behavior

## File Map

| File                             | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `aura.css`                       | Elements layer framework                |
| `aura-composites.css`            | Optional Composites layer               |
| `aura-components.js`             | Thin browser entrypoint for Components  |
| `packages/components/mod.ts`     | Deno-first Components package surface   |
| `packages/components/src/`       | Shared logic plus per-component modules |
| `aura-components.test.js`        | Deno behavioral coverage for Components |
| `aura-brand.css`                 | Sample Aura brand pack                  |
| `aura-brand-editorial.css`       | Sample editorial brand pack             |
| `deno.lock`                      | Locked JSR and npm test dependencies    |
| `index.html`                     | Interactive demo page                   |
| `docs/component-architecture.md` | Architecture note for the next layers   |
| `docs/user-guide.md`             | This user guide                         |

## Verification

Run these checks after changes:

```sh
cd /Users/srdjans/Code/MetadorHome/metador.aura
deno task check
deno task test
deno task dev
```

Then verify:

1. Open `http://127.0.0.1:8000/index.html`.
2. Switch between `Headless core`, `Aura pack`, and `Editorial pack`.
3. Toggle dark mode, high contrast, and reduced motion.
4. Review the prose, notice, accordion, master-detail, and tabs pilot examples.
5. Use arrow keys inside the auto-activation master-detail pilot and confirm the
   detail panel follows the active trigger.
6. Use arrow keys inside the manual-activation master-detail pilot and confirm
   focus moves first, then `Enter` or `Space` updates the detail panel.
7. Use arrow keys inside the auto-activation tabs pilot and confirm the active
   tab and visible panel stay in sync.
8. Use arrow keys inside the manual-activation tabs pilot and confirm focus
   moves first, then `Enter` or `Space` updates the panel.
9. Open the dialog and confirm the backdrop and page scroll lock.
10. Submit the form with empty required fields and confirm validation, busy
    states, select chevrons, progress, and meter styles.
11. Open print preview and confirm buttons/nav are hidden and print-only rules
    apply.
