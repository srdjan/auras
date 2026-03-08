# Aura CSS

A headless-first CSS framework built on semantic HTML and `data-*` attributes.
No classes, no build step, no JavaScript required. One file gives you
typography, layout, forms, theming, accessibility, and print styles. Opt into a
brand pack when you want a visual identity.

## Quick start

```html
<link rel="stylesheet" href="aura.css" />
```

That single line gives you a fully functional, classless foundation: readable
type scale, spacing tokens, dark mode that follows `prefers-color-scheme`,
accessible focus rings, responsive tables, and form validation states.

When you are ready for a branded look, add the brand pack and a data attribute:

```html
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-brand.css" />

<body data-brand="aura"></body>
```

## Architecture

Aura uses CSS `@layer` ordering to keep specificity predictable:

```
reset > tokens > brands > defaults > layouts > components > utilities > print
```

**Headless core** (`aura.css`) ships with near-neutral colors (chroma 0.03),
transparent bordered buttons, and no card shadows. It provides structure without
forcing a visual language.

**Brand packs** (e.g. `aura-brand.css`) live in the `brands` layer and override
token values when a `data-brand` attribute is present. This keeps the core
cacheable and lets you swap brands without touching the framework.

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
| `--hue-accent`                 | Accent hue (default 20)       |
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
></div>
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

When no attributes are set, Aura respects `prefers-color-scheme` and
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
  <p>This message uses Aura's status tokens without introducing classes.</p>
</aside>
```

### Accordions

```html
<section data-ui="accordion">
  <details name="faq" open>
    <summary>What is Aura?</summary>
    <p>Aura is a headless-first CSS framework for semantic HTML.</p>
  </details>
</section>
```

### Prose

```html
<article data-ui="prose">
  <hgroup>
    <p>Long-form content</p>
    <h2>Readable measure and calmer spacing</h2>
    <p>Use this wrapper for articles, docs, and rich editorial copy.</p>
  </hgroup>
  <p>Aura keeps the global defaults restrained and lets prose be opt-in.</p>
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

Aura includes several accessibility defaults:

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
/* aura-brand-custom.css */
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
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-brand-custom.css" />
<body data-brand="custom"></body>
```

The included `aura-brand.css` serves as both a working brand and a template for
creating your own.

## Browser support

Aura targets modern evergreen browsers. Key features and their support:

- `@layer` - Chrome 99+, Firefox 97+, Safari 15.4+
- `oklch()` - Chrome 111+, Firefox 113+, Safari 15.4+
- `color-mix()` - Chrome 111+, Firefox 113+, Safari 16.2+
- `:user-invalid` - Chrome 119+, Firefox 88+, Safari 16.5+
- `text-wrap: balance` - Chrome 114+, Firefox 121+, Safari 17.5+
- `@property` - Chrome 85+, Firefox 128+, Safari 15.4+

## Files

| File             | Purpose                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `aura.css`       | Headless core: reset, tokens, defaults, layout, components, utilities, print |
| `aura-brand.css` | Sample brand pack that activates with `data-brand="aura"`                    |
| `index.html`     | Interactive demo exercising all features                                     |

## License

MIT
