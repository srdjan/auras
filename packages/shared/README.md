# Auras Shared

Internal support modules for Auras custom elements.

This directory is not a supported public package surface. It exists to keep the
interactive packages aligned around the same base element and utility helpers.

Current contents:

- `auras-element.ts` for property and lifecycle coordination
- `utilities.ts` for shared ID, activation, and directionality helpers
- `mod.ts` for internal re-exports used by tests and package code

Import public behavior from `packages/components`, `packages/diagram`, or
`packages/audit` rather than depending on `packages/shared` directly.
