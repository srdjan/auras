# @auras/components

Light-DOM interactive components for Auras.

Related docs:

- [Auras CSS User Guide](../../docs/user-guide.md)
- [Auras Component Architecture](../../docs/component-architecture.md)
- [@auras/diagram](../diagram/README.md)

Current exports:

- `AurasCombobox`
- `AurasMasterDetail`
- `AurasSplitter`
- `AurasTree`
- `AurasTabs`
- `registerAurasCombobox()`
- `registerAurasComponents()`
- `registerAurasMasterDetail()`
- `registerAurasSplitter()`
- `registerAurasTree()`
- `registerAurasTabs()`

Example:

```ts
import { registerAurasComponents } from "@auras/components";

registerAurasComponents();
```

For no-build browser usage in this repo, load `/packages/components/browser.js`.
