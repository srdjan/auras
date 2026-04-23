# Auras Breakpoints

Optional responsive primitives for Auras. Load this package when a pattern needs
to adapt to its container or viewport without media queries in every component.

Position: **exceptions, not defaults.** Prefer fluid tokens and intrinsic
layouts from the Elements package first. Reach for the flag tokens here only
when a genuine structural shift is required.

## Load order

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/breakpoints/auras-breakpoints.css" />
```

## The responsive cascade (preferred order)

1. **Fluid scalars** - `clamp()` tokens for type (`--text-*`) and spacing
   (`--space-fluid-*`). Scale continuously, no jumps.
2. **Intrinsic layouts** - `data-layout="grid | sidebar | switcher | reel"`.
   Adapt by filling available space via `auto-fit` and flex intrinsics.
3. **Container units** - `data-fluid="type pad gap radius"`. Scale against the
   nearest container instead of the viewport (requires an ancestor with
   `data-bp="node"` or `container-type: inline-size`).
4. **Container queries** - the `--bp-*` flag tokens under `data-bp="node"`. Use
   only when a component must restructure (e.g. switch from stacked to
   side-by-side) beyond what intrinsic layouts achieve.
5. **Media queries** - viewport-scoped flags under `data-bp="stage"`, or native
   `@media` for capabilities (`hover`, `pointer`) and preferences
   (`prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`).

## Fluid primitives (container-driven)

```html
<section data-bp="node">
  <article data-surface="card" data-fluid="type pad gap radius">
    <h3>Adapts to its container</h3>
    <p>Font size, padding, gap, and radius all scale with container width.</p>
  </article>
</section>
```

| Token                | Scales                    |
| -------------------- | ------------------------- |
| `data-fluid~=type`   | `font-size` via `cqi`     |
| `data-fluid~=pad`    | `padding` via `cqi`       |
| `data-fluid~=gap`    | `gap` via `cqi`           |
| `data-fluid~=radius` | `border-radius` via `cqi` |

Any element inside a `data-bp="node"` (or any element whose ancestor sets
`container-type: inline-size`) can opt in.

## Flag tokens (for structural shifts)

Two scopes, both emit the same flags:

| Attribute         | Scope               |
| ----------------- | ------------------- |
| `data-bp="stage"` | Viewport, rem-aware |
| `data-bp="node"`  | Nearest container   |

| Token         | Value when active       |
| ------------- | ----------------------- |
| `--bp-gte-sm` | `1` at or above `40rem` |
| `--bp-gte-md` | `1` at or above `64rem` |
| `--bp-gte-lg` | `1` at or above `80rem` |
| `--bp-gte-xl` | `1` at or above `96rem` |
| `--bp-lt-*`   | Inverse of each flag    |

Compose values with `calc()`:

```css
.hero {
  padding-block: calc(var(--space-6) + var(--bp-gte-md) * var(--space-4));
  grid-template-columns: calc(var(--bp-gte-md) * 1fr) 2fr;
}
```

Flags are `@property`-registered integers, so transitions across a breakpoint
interpolate smoothly.

A `data-bp="node"` root cannot react to its own size - that would create a
layout feedback loop. Flags resolve on the node's descendants; wrap inner
content in a child element if the component itself needs to react.

## Source of truth

- `packages/breakpoints/auras-breakpoints.css` is the canonical authoring file.
- Run `deno task sync:public-packages` before shipping the standalone `public/`
  directory so `public/packages/breakpoints/auras-breakpoints.css` stays in
  sync.
- New responsive helpers extend this file rather than introducing a second
  entrypoint.
