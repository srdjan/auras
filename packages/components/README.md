# @aura/components

Light-DOM interactive components for Aura.

Related docs:

- [Aura CSS User Guide](../../docs/user-guide.md)
- [Aura Component Architecture](../../docs/component-architecture.md)
- [@aura/diagram](../diagram/README.md)

Current exports:

- `AuraCombobox`
- `AuraMasterDetail`
- `AuraSplitter`
- `AuraTree`
- `AuraTabs`
- `registerAuraCombobox()`
- `registerAuraComponents()`
- `registerAuraMasterDetail()`
- `registerAuraSplitter()`
- `registerAuraTree()`
- `registerAuraTabs()`

Example:

```ts
import { registerAuraComponents } from "@aura/components";

registerAuraComponents();
```

For no-build browser usage in this repo, load `/packages/components/browser.js`.
