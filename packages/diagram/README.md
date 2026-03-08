# `@aura/diagram`

Optional light-DOM diagram controller for Aura.

This package enhances the existing CSS diagram shell with:

- active node selection
- roving focus
- spatial arrow-key navigation
- optional linked detail panels

It does not do auto-layout, routing, zoom, or drag and drop.

```ts
import { registerAuraDiagram } from "jsr:@aura/diagram";

registerAuraDiagram();
```

Load `/packages/composites/aura-composites.css` for the visual diagram shell.

For no-build browser usage in this repo, load `/packages/diagram/browser.js`.
