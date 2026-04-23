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
- orphaned trigger/panel pairings (a trigger with no matching panel, or vice
  versa)
- accessibility gaps defined by each contract (missing `aria-label`, unlabeled
  separators)

Covered components: `auras-tabs`, `auras-master-detail`, `auras-combobox`,
`auras-tree`, `auras-splitter`, `auras-diagram`, `auras-sections`.

## Usage

### Deno / TypeScript

```ts
import {
  auditAuras,
  getAurasContract,
  getAurasContracts,
  getAurasStarterMarkup,
  repairAuras,
} from "jsr:@auras/audit";

const diagnostics = auditAuras(document);
const repaired = repairAuras(document);
const contracts = getAurasContracts();
const sectionsContract = getAurasContract("auras-sections");
const starter = getAurasStarterMarkup("combobox");
```

### Browser

```html
<script type="module">
  import {
    auditAuras,
    getAurasStarterMarkup,
    repairAuras,
  } from "/packages/audit/browser.js";
  const diagnostics = auditAuras(document);
  const starter = getAurasStarterMarkup("tabs");
  const repaired = repairAuras(document);
</script>
```

### CLI

```sh
deno task audit public/index.html
deno task audit --fix public/index.html
deno task audit --write public/index.html
```

The CLI parses the file with HappyDOM, runs the same audit, and prints
diagnostics with exit code 1 when errors are found. Useful in CI or pre-commit
hooks. `--fix` prints repaired markup without touching the file. `--write`
applies deterministic structural fixes in place and then reports any remaining
diagnostics.

Authoring surface:

- `mod.ts` is the typed Deno and JSR surface.
- `contracts.js` holds the shared contract registry.
- `cli.ts` is the CLI entrypoint for local and CI use.
- `/packages/audit/browser.js` is the synced no-build browser entrypoint used by
  the Contract Lab and static export.

Pass `{ include: ["auras-tabs", "auras-sections"] }` when you want to audit a
subset of contracts.

`repairAuras(root)` applies only deterministic structural fixes: it can
annotate obvious parts, create canonical wrappers, and move authored nodes into
those wrappers when the correct structure is unambiguous. It does not invent
labels, user copy, or semantic content.

## Contract Registry

`getAurasContracts()` returns the full array of contract definitions. Each entry
includes `requiredParts`, `optionalParts`, `accessibilityRules`, and
`exampleMarkup`. The [Contract Lab](/lab.html) uses this registry to populate
its preset picker and render live audit results.

`getAurasContract(tagName)` returns a single contract by tag name, or `null`.
`getAurasStarterMarkup(identifier)` returns the canonical starter snippet for a
contract id or tag name.
