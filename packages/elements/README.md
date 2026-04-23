# Auras Elements

Canonical source for the Elements layer in Auras CSS.

`packages/elements/auras.css` is the neutral foundation stylesheet. It owns the
reset, tokens, element defaults, layout primitives, utilities, accessibility
defaults, and print styles.

Source-of-truth rules:

- `auras.css` is the canonical authoring file for the Elements layer.
- Load `/packages/elements/auras.css` in this repo for the live source.
- Run `deno task sync:public-packages` before shipping the standalone `public/`
  directory so `public/packages/elements/auras.css` stays in sync.

Future contents can grow around the same public stylesheet without changing its
path.
