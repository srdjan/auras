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
- static flow / architecture diagrams
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

`jsr:@aura/components`, `jsr:@aura/diagram`

Responsibility:

- behavior-heavy widgets that need keyboard models, selection state, focus
  management, or DOM orchestration

Examples:

- diagram controller
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
/packages/diagram/jsr.json
/packages/diagram/README.md
/packages/diagram/mod.ts
/packages/diagram/src/aura-diagram.ts
/packages/components/jsr.json
/packages/components/README.md
/packages/components/mod.ts
/packages/components/src/shared/selectable-panels.ts
/packages/components/src/master-detail.ts
/packages/components/src/tree.ts
/packages/components/src/tabs.ts

/docs/component-architecture.md
```

Recommended publishing shape:

- `aura.css`: Elements layer stylesheet
- `@aura/composites`: optional CSS-only higher-level patterns
- `jsr:@aura/diagram`: optional Deno-first interactive diagram package
- `jsr:@aura/components`: optional Deno-first light-DOM interactive components

Current repo structure:

- `aura-composites.css` still stands in for the future `@aura/composites`
- `packages/diagram/mod.ts` is the Deno-first TypeScript surface for the diagram
  package
- `aura-diagram.js` is a browser-friendly no-build entrypoint for the demo and
  plain browser usage
- `packages/components/mod.ts` is the Deno-first TypeScript package surface
- `aura-components.js` is a browser-friendly no-build entrypoint for the demo
  and plain browser usage

## Decision Rule

Use this test before adding a component:

- If the problem is mostly visual composition, it belongs in composites.
- If the problem requires interaction state or non-trivial keyboard behavior, it
  belongs in components.

Examples:

- `card`: composites
- `notice`: composites
- `diagram` layout shell: composites
- `diagram` interaction controller: specialized package
- `master-detail` layout shell: composites
- `master-detail` selection controller: components
- `data-grid`: components
- `tree`: components

## Specialized Packages

Some interactions are still light-DOM components, but distinct enough to live
outside the general-purpose Components package.

`aura-diagram` v1 is one of those packages.

It should do exactly this:

- coordinate one active diagram node
- expose that active value through a host attribute
- support spatial arrow-key navigation between nodes
- support manual or auto activation
- optionally reveal a linked detail panel

It should not do this in v1:

- auto-layout
- edge routing
- zooming or panning
- drag and drop editing
- canvas rendering
- graph data fetching

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

## Pilot Components

The first behavioral pilot was `aura-master-detail`. The second is `aura-tabs`.
The third is `aura-tree`.

Why these first:

- common in real apps
- useful without becoming framework-sized
- accessibility is tractable
- lower complexity than grid or combobox
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

## `aura-tabs` v1 Scope

The second pilot should do exactly this:

- coordinate one selected tab in a tablist
- reveal the matching panel
- manage roving focus between tabs
- support Left, Right, Home, and End
- support click and keyboard activation
- expose selection state to CSS through attributes

It should not do this in v1:

- nested tabsets
- overflow menus
- async panel loading
- lazy rendering
- persistence beyond initial host attribute state

Suggested authoring model:

```html
<aura-tabs value="overview">
  <nav data-part="tablist" aria-label="Release views">
    <button type="button" data-part="trigger" data-value="overview">
      Overview
    </button>
    <button type="button" data-part="trigger" data-value="tokens">
      Tokens
    </button>
    <button type="button" data-part="trigger" data-value="behavior">
      Behavior
    </button>
  </nav>

  <section data-part="panels">
    <article data-part="panel" data-value="overview">Overview panel</article>
    <article data-part="panel" data-value="tokens" hidden>Tokens panel</article>
    <article data-part="panel" data-value="behavior" hidden>
      Behavior panel
    </article>
  </section>
</aura-tabs>
```

Required parts:

- one host: `<aura-tabs>`
- one tablist container: `[data-part="tablist"]`
- one or more tab triggers: `[data-part="trigger"][data-value]`
- one panel container: `[data-part="panels"]`
- one or more panels: `[data-part="panel"][data-value]`

Host API:

- `value`
- `activation="auto|manual"`
- `show(value: string): void`
- `focusCurrent(): void`
- `aura-change`

Accessibility contract:

- set `role="tablist"` on the list container
- set `role="tab"` plus `aria-selected` on triggers
- set `role="tabpanel"` plus `aria-labelledby` on panels
- use Left and Right for navigation, respecting document direction
- keep inactive panels `hidden`

## `aura-tree` v1 Scope

The third pilot should do exactly this:

- coordinate one selected node in an authored nested tree
- manage roving focus across visible nodes
- support branch expansion and collapse
- support Up, Down, Left, Right, Home, and End
- support click and keyboard activation
- optionally reveal a matching linked panel

It should not do this in v1:

- multi-select
- typeahead
- async loading
- drag and drop
- virtualization
- reorderable nodes

Suggested authoring model:

```html
<aura-tree value="master-detail">
  <ul data-part="tree" aria-label="Aura components">
    <li data-part="item" data-value="elements">
      <button type="button" data-part="node">Elements</button>
    </li>

    <li data-part="item" data-value="components" data-expanded>
      <button
        type="button"
        data-part="toggle"
        aria-label="Toggle Components"
      >
      </button>
      <button type="button" data-part="node">Components</button>

      <ul data-part="group">
        <li data-part="item" data-value="master-detail">
          <button type="button" data-part="node">Master-detail</button>
        </li>
        <li data-part="item" data-value="tabs">
          <button type="button" data-part="node">Tabs</button>
        </li>
      </ul>
    </li>
  </ul>

  <section data-part="panels">
    <article data-part="panel" data-value="elements">...</article>
    <article data-part="panel" data-value="components" hidden>...</article>
    <article data-part="panel" data-value="master-detail" hidden>...</article>
    <article data-part="panel" data-value="tabs" hidden>...</article>
  </section>
</aura-tree>
```

Required parts:

- one host: `<aura-tree>`
- one tree container: `[data-part="tree"]`
- one or more items: `[data-part="item"][data-value]`
- one node per item: `[data-part="node"]`
- optional branch toggle: `[data-part="toggle"]`
- optional child group: `[data-part="group"]`
- optional linked panels: `[data-part="panel"][data-value]`

Host API:

- `value`
- `activation="auto|manual"`
- `show(value: string): void`
- `focusCurrent(): void`
- `expand(value: string): boolean`
- `collapse(value: string): boolean`
- `toggle(value: string): boolean`
- `aura-change`

## Build Order

Recommended order for implementation:

1. Extract `aura-composites.css` as a separate optional layer.
2. Add one visual composite for master-detail shell with no JavaScript.
3. Implement `aura-master-detail` in `jsr:@aura/components` against the
   documented markup contract.
4. Validate the shared host API with `aura-tabs`.
5. Extend the same package with hierarchical selection and expansion in
   `aura-tree`.
6. Only then move on to combobox or grid.

## Follow-On Components

After the pilot is stable:

- `aura-data-grid`
- `aura-combobox`

Only add them if they preserve the same rules:

- light DOM
- authored HTML remains visible
- stable `data-part` hooks
- CSS and behavior remain separable
