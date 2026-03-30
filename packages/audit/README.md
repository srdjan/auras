# `@auras/audit`

Validate authored Auras markup against the published light-DOM contracts.

Related docs:

- [Auras CSS User Guide](../../docs/user-guide.md)
- [Auras Component Architecture](../../docs/component-architecture.md)
- [Contract Lab](/lab.html)

The audit package checks your markup for contract violations before components
upgrade. It catches:

- missing or extra required parts
- duplicate `data-value` attributes within a host
- orphaned trigger/panel pairings (a trigger with no matching panel, or vice versa)
- accessibility gaps defined by each contract (missing `aria-label`, unlabeled separators)

Covered components: `auras-tabs`, `auras-master-detail`, `auras-combobox`,
`auras-tree`, `auras-splitter`, `auras-diagram`, `auras-sections`.

## Usage

### Deno / TypeScript

```ts
import { auditAuras, getAurasContracts } from "@auras/audit";

const diagnostics = auditAuras(document);
const contracts = getAurasContracts();
```

### Browser

```html
<script type="module">
  import { auditAuras } from "/packages/audit/browser.js";
  const diagnostics = auditAuras(document);
</script>
```

### CLI

```sh
deno task audit public/index.html
```

The CLI parses the file with HappyDOM, runs the same audit, and prints
diagnostics with exit code 1 when errors are found. Useful in CI or pre-commit
hooks.

## Contract Registry

`getAurasContracts()` returns the full array of contract definitions. Each entry
includes `requiredParts`, `optionalParts`, `accessibilityRules`, and
`exampleMarkup`. The [Contract Lab](/lab.html) uses this registry to populate
its preset picker and render live audit results.

`getAurasContract(tagName)` returns a single contract by tag name, or `null`.
