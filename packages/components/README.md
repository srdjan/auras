# @auras/components

Light-DOM interactive components for Auras, including shared selectable-panel
patterns and container-adaptive sections.

Related docs:

- [Auras CSS User Guide](../../docs/user-guide.md)
- [Auras Component Architecture](../../docs/component-architecture.md)
- [@auras/diagram](../diagram/README.md)

Current exports:

- tag name constants, element classes, and register helpers for
  `auras-combobox`, `auras-master-detail`, `auras-sections`, `auras-splitter`,
  `auras-tabs`, and `auras-tree`
- `registerAurasComponents()` to register the full set in one call

Example:

```ts
import { registerAurasComponents } from "jsr:@auras/components";

registerAurasComponents();
```

For no-build browser usage in this repo, load `/packages/components/browser.js`.
