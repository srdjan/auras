# `@auras/audit`

Audit authored Auras markup against the published light-DOM contracts.

Related docs:

- [Auras CSS User Guide](../../docs/user-guide.md)
- [Auras Component Architecture](../../docs/component-architecture.md)
- [Contract Lab](/lab.html)

This package is the contract-aware companion to the optional interactive
components. It helps you validate authored markup before runtime by checking:

- required parts
- duplicate `data-value` collisions
- orphaned trigger/panel pairings
- accessibility gaps called out by the published contracts

Current contract coverage:

- `auras-tabs`
- `auras-master-detail`
- `auras-combobox`
- `auras-tree`
- `auras-splitter`
- `auras-diagram`
- `auras-sections`

Module usage:

```ts
import { auditAuras, getAurasContracts } from "@auras/audit";

const diagnostics = auditAuras(document);
const contracts = getAurasContracts();
```

Browser usage:

```html
<script type="module">
  import { auditAuras } from "/packages/audit/browser.js";
  const diagnostics = auditAuras(document);
</script>
```

CLI usage:

```sh
deno task audit public/index.html
```
