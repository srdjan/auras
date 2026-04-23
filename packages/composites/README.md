# Auras Composites

Canonical source for the optional Composites layer in Auras CSS.

`packages/composites/auras-composites.css` holds CSS-only app patterns built on
semantic HTML and Auras attributes. It adds stronger structure without adding
component-owned state or JavaScript requirements.

Source-of-truth rules:

- `auras-composites.css` is the canonical authoring file for this layer.
- Load `/packages/composites/auras-composites.css` in this repo for the live
  source.
- Run `deno task sync:public-packages` before shipping the standalone `public/`
  directory so `public/packages/composites/auras-composites.css` stays in sync.

Future composites should extend this stylesheet rather than create a second
competing entrypoint.
