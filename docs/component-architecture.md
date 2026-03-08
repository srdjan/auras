# Aura Component Architecture

This note defines the next iteration of Aura beyond the current element-level
CSS library.

## Goal

Keep Aura's current identity intact:

- semantic HTML first
- token-driven styling
- classless or attribute-first APIs
- optional JavaScript
- easy theming and debugging

Add a higher layer for common app patterns without turning Aura into a
framework-sized UI system.

## Layer Model

Aura should evolve as three explicit layers:

### 1. Elements

`aura.css`

Responsibility:

- reset
- tokens
- themes and brand packs
- element defaults
- layout primitives
- simple semantic components
- utilities

Rules:

- no JavaScript required
- no opinionated app structure
- keep selectors broad and predictable

### 2. Composites

`aura-composites.css`

Responsibility:

- CSS-only patterns built from semantic HTML
- stronger structure for common app shells
- no component-owned state

Examples:

- card variants
- master-detail page shell
- app header / sidebar shell
- list treatments
- empty state layouts
- toolbar layouts
- stats panels

Rules:

- still no JavaScript requirement
- prefer `data-ui`, `data-layout`, `data-surface`, and `data-part`
- no hidden DOM generation

### 3. Components

`jsr:@aura/components`

Responsibility:

- behavior-heavy widgets that need keyboard models, selection state, focus
  management, or DOM orchestration

Examples:

- master-detail controller
- light data grid
- tree
- tabs
- combobox / command palette

Rules:

- custom elements use light DOM only
- no shadow DOM
- authored HTML remains inspectable and styleable
- internal structure must not be a hidden contract

## Package Split

Recommended package boundaries:

```text
/aura.css
/aura-brand.css
/aura-brand-editorial.css

/packages/composites/aura-composites.css
/packages/components/deno.json
/packages/components/mod.ts
/packages/components/src/shared.ts
/packages/components/src/master-detail.ts

/docs/component-architecture.md
```

Recommended publishing shape:

- `aura.css`: Elements layer stylesheet
- `@aura/composites`: optional CSS-only higher-level patterns
- `jsr:@aura/components`: optional Deno-first light-DOM interactive components

Current repo prototype:

- `aura-composites.css` stands in for the future `@aura/composites`
- `aura-components.js` stands in for the future `jsr:@aura/components`

## Decision Rule

Use this test before adding a component:

- If the problem is mostly visual composition, it belongs in composites.
- If the problem requires interaction state or non-trivial keyboard behavior, it
  belongs in components.

Examples:

- `card`: composites
- `notice`: composites
- `master-detail` layout shell: composites
- `master-detail` selection controller: components
- `data-grid`: components
- `tree`: components

## Light DOM Contract

If Aura ships interactive components, their DOM contract must stay explicit.

Rules:

- Enhance user-authored HTML instead of replacing it.
- Do not inject wrapper nodes unless there is no reasonable alternative.
- Expose stable styling hooks with `data-part`.
- Use standard attributes where possible: `hidden`, `disabled`, `aria-selected`,
  `aria-current`, `aria-expanded`, `aria-controls`.
- Reflect component state onto attributes on the host so CSS can react.

Required styling contract:

- `data-part` names are public API.
- Host attributes are public API.
- Event names are public API.
- Keyboard behavior is public API.

Implementation detail that should stay private:

- helper functions
- internal observers
- internal maps and indexes

## Pilot Component

The first behavioral pilot should be `aura-master-detail`.

Why this first:

- common in real apps
- useful without becoming framework-sized
- accessibility is tractable
- lower complexity than grid or tree
- works well with Aura's existing layout and card primitives

## `aura-master-detail` v1 Scope

The pilot should do exactly this:

- coordinate one selected item in a master list
- reveal the matching detail panel
- manage roving focus in the master list
- support arrow key navigation between triggers
- support Home and End
- support click and keyboard activation
- expose selection state to CSS through attributes

It should not do this in v1:

- virtualization
- async data fetching
- drag and drop
- nested trees
- column sorting
- URL routing
- persistence beyond initial host attribute state

## Markup Contract

Suggested authoring model:

```html
<aura-master-detail value="ada">
  <nav data-part="master" aria-label="People">
    <button type="button" data-part="trigger" data-value="ada">Ada</button>
    <button type="button" data-part="trigger" data-value="grace">Grace</button>
    <button type="button" data-part="trigger" data-value="margaret">
      Margaret
    </button>
  </nav>

  <section data-part="detail">
    <article data-part="panel" data-value="ada">Ada detail</article>
    <article data-part="panel" data-value="grace" hidden>Grace detail</article>
    <article data-part="panel" data-value="margaret" hidden>
      Margaret detail
    </article>
  </section>
</aura-master-detail>
```

Required parts:

- one host: `<aura-master-detail>`
- one master container: `[data-part="master"]`
- one or more triggers: `[data-part="trigger"][data-value]`
- one detail container: `[data-part="detail"]`
- one or more panels: `[data-part="panel"][data-value]`

Matching rule:

- a trigger controls the panel with the same `data-value`

## Host API

Attributes:

- `value`
  - current selected value
- `activation="auto|manual"`
  - `auto` default
  - `manual` means arrow keys move focus only; Enter or Space activates

Properties:

- `value: string | null`
- `activation: "auto" | "manual"`

Methods:

- `show(value: string): void`
- `focusCurrent(): void`

Events:

- `aura-change`
  - detail: `{ value: string, trigger: HTMLElement, panel: HTMLElement }`

## Runtime Behavior

On upgrade:

- index triggers and panels by `data-value`
- if host `value` exists and is valid, use it
- otherwise select the first valid trigger
- set `hidden` on inactive panels
- set `tabindex="0"` on the active trigger and `tabindex="-1"` on the rest
- set `aria-current="true"` on the active trigger and remove it from the rest
- set `aria-expanded="true"` on the active trigger and `"false"` on the rest
- set `data-active` on the active trigger and panel

On selection change:

- update host `value`
- update trigger attributes
- update panel visibility
- dispatch `aura-change` only when the selected value actually changes

## Accessibility

Minimum accessibility rules for v1:

- master container gets `role="tablist"` only if the keyboard behavior matches
  tabs closely enough
- otherwise keep semantic `nav` plus buttons and do not fake tab semantics
- triggers must be focusable controls
- inactive panels use `hidden`
- activation must work with pointer, Enter, and Space
- arrow key behavior must respect document direction where relevant

Recommendation:

- do not use ARIA `tab` / `tabpanel` in v1
- keep the first version semantically honest as a selection controller, not a
  fake tabs implementation

## CSS Hooks

Public styling hooks for the pilot:

- host:
  - `aura-master-detail`
  - `[value]`
  - `[activation]`
- descendants:
  - `[data-part="master"]`
  - `[data-part="trigger"]`
  - `[data-part="detail"]`
  - `[data-part="panel"]`
  - `[data-active]`

This lets `@aura/composites` provide a default shell without hard-coding the
components package into the CSS layer.

## Suggested CSS Pairing

The companion composite stylesheet should handle only layout and visual states:

```html
<link rel="stylesheet" href="aura.css" />
<link rel="stylesheet" href="aura-composites.css" />
<script type="module" src="aura-components.js"></script>
```

Example responsibility split:

- `aura-composites.css`
  - 2-column master/detail layout
  - mobile stack behavior
  - selected trigger visuals
  - panel spacing and surface styles
- `aura-master-detail`
  - selected value
  - keyboard model
  - focus model
  - panel visibility

## Build Order

Recommended order for implementation:

1. Extract `aura-composites.css` as a separate optional layer.
2. Add one visual composite for master-detail shell with no JavaScript.
3. Implement `aura-master-detail` in `jsr:@aura/components` against the
   documented markup contract.
4. Validate the public contract before building grid or tree.

## Follow-On Components

After the pilot is stable:

- `aura-data-grid`
- `aura-tree`
- `aura-tabs`

Only add them if they preserve the same rules:

- light DOM
- authored HTML remains visible
- stable `data-part` hooks
- CSS and behavior remain separable
