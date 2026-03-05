# Aura CSS User Guide

Aura CSS is a headless-first CSS framework for semantic HTML. This guide covers
the current repository as it exists today: a static core stylesheet, two sample
brand packs, and a demo page you can use to verify behavior without a build
step.

## Quick Start

1. Run a local static server from the repo root:

```sh
cd /Users/srdjans/Code/metador.aura
python3 -m http.server 8000
```

2. Open `http://localhost:8000/index.html`.

3. Add the core stylesheet to any HTML page:

```html
<link rel="stylesheet" href="aura-css.css">
```

4. When you want a branded look, load a brand pack and set `data-brand`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-contrast="more">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="aura-css.css">
    <link rel="stylesheet" href="aura-brand.css">
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

## Mental Model

- `aura-css.css` is the headless core. It gives you reset, tokens, typography,
  layout primitives, components, utilities, accessibility defaults, and print
  styles.
- Start with semantic HTML. Add `data-*` attributes only when you want layout,
  surface, variant, or utility behavior.
- Keep branding separate from structure. The core stays neutral; brand packs
  only override tokens inside `@layer brands`.
- Theme controls are composable:
  - `data-brand` goes on `<body>` in the current examples.
  - `data-theme="dark"`, `data-contrast="more"`, and `data-motion="reduce"` go
    on `<html>`.
- The framework does not require JavaScript. The JS in `index.html` exists only
  to let the demo switch brands and theme states live.

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

### Forms

Native elements are styled automatically:

```html
<form data-layout="stack" data-gap="4">
  <fieldset data-layout="stack" data-gap="3">
    <legend>Profile</legend>

    <label for="name">Name</label>
    <input id="name" type="text" required>

    <label for="email">Email</label>
    <input id="email" type="email" required>

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
- Styled fieldsets, selects, textareas, checkboxes, radios, range inputs, and
  progress bars
- Disabled state styling

### Utilities

Aura also exposes small, semantic helpers:

```html
<p data-status="success">Saved successfully.</p>

<figure>
  <div data-aspect="16/9">
    <img src="/hero.jpg" alt="Hero image" data-fit="cover">
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
- Card surfaces and button variants
- Dialog and disclosure styling
- Form validation states
- Status colors
- Aspect ratios and object fit
- Sticky regions and smooth scrolling
- Print behavior

## File Map

| File                       | Purpose                     |
| -------------------------- | --------------------------- |
| `aura-css.css`             | Headless core framework     |
| `aura-brand.css`           | Sample Aura brand pack      |
| `aura-brand-editorial.css` | Sample editorial brand pack |
| `index.html`               | Interactive demo page       |
| `docs/user-guide.md`       | This user guide             |

## Verification

Run these checks after changes:

```sh
cd /Users/srdjans/Code/metador.aura
python3 -m http.server 8000
```

Then verify:

1. Open `http://localhost:8000/index.html`.
2. Switch between `Headless core`, `Aura pack`, and `Editorial pack`.
3. Toggle dark mode, high contrast, and reduced motion.
4. Submit the form with empty required fields and confirm validation styles.
5. Open the dialog and test the smooth-scroll buttons.
6. Open print preview and confirm buttons/nav are hidden and print-only rules
   apply.
