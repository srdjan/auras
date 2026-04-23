# Auras Brand Packs

Canonical source for the brand-pack stylesheets used by Auras CSS.

This directory currently ships:

- `auras-brand.css` for the default Auras brand pack
- `auras-brand-editorial.css` for the editorial variant

Source-of-truth rules:

- Each `.css` file in this directory is authored here first.
- Load `/packages/brands/*.css` in this repo for the live source.
- Run `deno task sync:public-packages` before shipping the standalone `public/`
  directory so `public/packages/brands/` stays aligned with the canonical
  stylesheets.

Future brand packs should keep the same token-override contract under
`@layer brands` and `data-brand`.
