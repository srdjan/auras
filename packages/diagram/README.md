# `@auras/diagram`

Optional light-DOM diagram controller for Auras.

Related docs:

- [Auras CSS User Guide](../../docs/user-guide.md)
- [Auras Component Architecture](../../docs/component-architecture.md)
- [@auras/components](../components/README.md)

This package enhances the existing CSS diagram shell with:

- active node selection
- roving focus
- spatial arrow-key navigation
- optional linked detail panels

It does not do auto-layout, routing, zoom, or drag and drop.

```ts
import { registerAurasDiagram } from "jsr:@auras/diagram";

registerAurasDiagram();
```

Load `/packages/composites/auras-composites.css` for the visual diagram shell.

Authoring surface:

- `mod.ts` is the typed Deno and JSR surface.
- `src/` contains the diagram runtime module.
- `/packages/diagram/browser.js` is the synced no-build browser entrypoint used
  by the demos and static export.
