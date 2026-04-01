# Auras Component Architecture

This note defines the next iteration of Auras beyond the current element-level
CSS library.

Related docs:

- [User Guide](./user-guide.md)
- [Components package README](../packages/components/README.md)
- [Diagram package README](../packages/diagram/README.md)
- [Audit package README](../packages/audit/README.md)

## Goal

Keep Auras' current identity intact:

- semantic HTML first
- token-driven styling
- classless or attribute-first APIs
- optional JavaScript
- easy theming and debugging

Add a higher layer for common app patterns without turning Auras into a
framework-sized UI system.

## Layer Model

Auras should evolve as three explicit layers:

### 1. Elements

`packages/elements/auras.css`

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

`packages/composites/auras-composites.css`

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
- containment is internal-only and should live on the composite root, not as a
  generic author utility
- only use containment when the composite is already a bounded box with no
  required overflow or overlay behavior

### 3. Components

`jsr:@auras/components`, `jsr:@auras/diagram`

Responsibility:

- behavior-heavy widgets that need keyboard models, selection state, focus
  management, or DOM orchestration

Examples:

- diagram controller
- master-detail controller
- light data grid
- splitter
- tree
- tabs
- sections (tabs/accordion morph)
- combobox / command palette

Rules:

- custom elements use light DOM only
- no shadow DOM
- authored HTML remains inspectable and styleable
- internal structure must not be a hidden contract
- containment must not break authored overflow, popovers, anchor-positioned UI,
  or sticky/fixed descendants

## Containment Rule

Use CSS containment in Auras as a structural optimization, not a styling API.

- Do not add a public containment attribute or token.
- Do not apply containment broadly in the Elements layer.
- Prefer `contain: content` on composite or component roots whose authored
  contract already reads as a self-contained box.
- Use `contain: inline-size` only when the component already has an explicit
  inline sizing or scrolling contract.
- Avoid `contain: strict` as a framework default.
- Treat query containers and contained roots as one review surface so we do not
  stack isolation features accidentally.

Good candidates:

- documentation examples
- bounded tiles or cards in repeated composite layouts
- diagram-like shells with explicit width and overflow behavior

Use with care:

- tabs, master-detail, tree, and sections roots
- anything that may later host overlays or intentional overflow

Probably avoid:

- generic layout primitives
- anything with popovers, anchored overlays, `position: fixed`, or visible
  overflow as part of the contract

## Package Split

Recommended package boundaries:

```text
/packages/elements/auras.css
/packages/composites/auras-composites.css
/packages/brands/auras-brand.css
/packages/brands/auras-brand-editorial.css
/packages/diagram/browser.js
/packages/diagram/jsr.json
/packages/diagram/README.md
/packages/diagram/mod.ts
/packages/diagram/src/auras-diagram.ts
/packages/components/browser.js
/packages/components/jsr.json
/packages/components/README.md
/packages/components/mod.ts
/packages/components/src/shared/selectable-panels.ts
/packages/components/src/combobox.ts
/packages/components/src/master-detail.ts
/packages/components/src/splitter.ts
/packages/components/src/tree.ts
/packages/components/src/tabs.ts
/packages/audit/browser.js
/packages/audit/cli.ts
/packages/audit/contracts.js
/packages/audit/jsr.json
/packages/audit/README.md
/packages/audit/mod.ts

/docs/component-architecture.md
```

Recommended publishing shape:

- `@auras/elements`: Elements layer stylesheet
- `@auras/composites`: optional CSS-only higher-level patterns
- `jsr:@auras/diagram`: optional Deno-first interactive diagram package
- `jsr:@auras/components`: optional Deno-first light-DOM interactive components
- `jsr:@auras/audit`: contract validation for authored markup (browser, Deno, CLI)

Current repo structure:

- `packages/elements/auras.css` is the canonical Elements stylesheet source
- `packages/composites/auras-composites.css` is the canonical Composites
  stylesheet source
- `packages/brands/` contains the canonical brand stylesheet sources
- `packages/diagram/mod.ts` is the Deno-first TypeScript surface for the diagram
  package
- `packages/diagram/browser.js` is the browser-friendly no-build diagram
  entrypoint
- `packages/components/mod.ts` is the Deno-first TypeScript package surface
- `packages/components/browser.js` is the browser-friendly no-build Components
  entrypoint
- `packages/audit/mod.ts` is the Deno-first TypeScript surface for the audit
  package
- `packages/audit/browser.js` is the browser-friendly no-build audit entrypoint
- `packages/audit/cli.ts` is the CLI entrypoint for local or CI auditing
- `packages/audit/contracts.js` is the shared contract definition registry

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
- `splitter`: components
- `tree`: components
- `sections` (tabs/accordion morph): components

## Specialized Packages

Some interactions are still light-DOM components, but distinct enough to live
outside the general-purpose Components package.

`auras-diagram` v1 is one of those packages.

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

If Auras ships interactive components, their DOM contract must stay explicit.

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

The first behavioral pilot was `auras-master-detail`. The second is `auras-tabs`.
The third is `auras-tree`. The fourth is `auras-combobox`. The fifth is
`auras-splitter`. The sixth is `auras-sections`.

Why these first:

- common in real apps
- useful without becoming framework-sized
- accessibility is tractable
- lower complexity than grid or command palette
- works well with Auras' existing layout and card primitives

## `auras-master-detail` v1 Scope

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
<auras-master-detail value="ada">
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
</auras-master-detail>
```

Required parts:

- one host: `<auras-master-detail>`
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

- `auras-change`
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
- dispatch `auras-change` only when the selected value actually changes

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
  - `auras-master-detail`
  - `[value]`
  - `[activation]`
- descendants:
  - `[data-part="master"]`
  - `[data-part="trigger"]`
  - `[data-part="detail"]`
  - `[data-part="panel"]`
  - `[data-active]`

This lets `@auras/composites` provide a default shell without hard-coding the
components package into the CSS layer.

## Suggested CSS Pairing

The companion composite stylesheet should handle only layout and visual states:

```html
<link rel="stylesheet" href="packages/elements/auras.css" />
<link rel="stylesheet" href="packages/composites/auras-composites.css" />
<script type="module" src="packages/components/browser.js"></script>
```

Example responsibility split:

- `packages/composites/auras-composites.css`
  - 2-column master/detail layout
  - mobile stack behavior
  - selected trigger visuals
  - panel spacing and surface styles
- `auras-master-detail`
  - selected value
  - keyboard model
  - focus model
  - panel visibility

## `auras-tabs` v1 Scope

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
<auras-tabs value="overview">
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
</auras-tabs>
```

Required parts:

- one host: `<auras-tabs>`
- one tablist container: `[data-part="tablist"]`
- one or more tab triggers: `[data-part="trigger"][data-value]`
- one panel container: `[data-part="panels"]`
- one or more panels: `[data-part="panel"][data-value]`

Host API:

- `value`
- `activation="auto|manual"`
- `show(value: string): void`
- `focusCurrent(): void`
- `auras-change`

Accessibility contract:

- set `role="tablist"` on the list container
- set `role="tab"` plus `aria-selected` on triggers
- set `role="tabpanel"` plus `aria-labelledby` on panels
- use Left and Right for navigation, respecting document direction
- keep inactive panels `hidden`

## `auras-tree` v1 Scope

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
<auras-tree value="master-detail">
  <ul data-part="tree" aria-label="Auras components">
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
</auras-tree>
```

Required parts:

- one host: `<auras-tree>`
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
- `auras-change`

## `auras-combobox` v1 Scope

The fourth pilot should do exactly this:

- coordinate one selected value in an authored local option list
- filter visible options from the current input text
- manage one active option for keyboard navigation
- support Up, Down, Enter, Escape, click selection, and popup toggle
- optionally reveal a matching linked panel

It should not do this in v1:

- async loading
- remote data sources
- fuzzy ranking
- multi-select
- creatable entries
- command-palette actions

Suggested authoring model:

```html
<auras-combobox value="elements" activation="manual">
  <label for="component-search">Search components</label>

  <div data-part="control">
    <input id="component-search" data-part="input" type="text" />
    <button
      type="button"
      data-part="toggle"
      aria-label="Toggle component options"
    >
    </button>
    <input type="hidden" data-part="value" name="component" />
  </div>

  <ul data-part="listbox">
    <li data-part="option" data-value="elements">Elements</li>
    <li data-part="option" data-value="master-detail">Master-detail</li>
    <li data-part="option" data-value="tabs">Tabs</li>
  </ul>

  <p data-part="empty" hidden>No matching components.</p>

  <section data-part="panels">
    <article data-part="panel" data-value="elements">...</article>
    <article data-part="panel" data-value="master-detail" hidden>...</article>
    <article data-part="panel" data-value="tabs" hidden>...</article>
  </section>
</auras-combobox>
```

Required parts:

- one host: `<auras-combobox>`
- one text input: `[data-part="input"]`
- one popup listbox: `[data-part="listbox"]`
- one or more options: `[data-part="option"][data-value]`
- optional toggle button: `[data-part="toggle"]`
- optional hidden value input: `input[data-part="value"]`
- optional empty-state note: `[data-part="empty"]`
- optional linked panels: `[data-part="panel"][data-value]`

Host API:

- `value`
- `activation="auto|manual"`
- `open`
- `show(value: string): void`
- `focusCurrent(): void`
- `openListbox(): boolean`
- `closeListbox(): boolean`
- `toggleListbox(): boolean`
- `auras-change`

## `auras-splitter` v1 Scope

The fifth pilot should do exactly this:

- coordinate a percent-based split between two authored panes
- expose one keyboard-focusable separator with resize semantics
- support mouse drag on the separator
- support Left and Right or Up and Down depending on orientation
- support Home and End to jump to min and max

It should not do this in v1:

- more than two panes
- nested splitters owned by one host
- persistence beyond initial host attributes
- snap points beyond min, max, and step
- collapse buttons or hidden-pane modes

Suggested authoring model:

```html
<auras-splitter value="42" min="30" max="70" step="5">
  <section data-part="pane" data-pane="primary">...</section>
  <button
    type="button"
    data-part="separator"
    aria-label="Resize panes"
  >
  </button>
  <section data-part="pane" data-pane="secondary">...</section>
</auras-splitter>
```

Required parts:

- one host: `<auras-splitter>`
- one primary pane: `[data-part="pane"][data-pane="primary"]`
- one separator: `[data-part="separator"]`
- one secondary pane: `[data-part="pane"][data-pane="secondary"]`

Host API:

- `value`
- `orientation="horizontal|vertical"`
- `min`
- `max`
- `step`
- `setPosition(value: number): boolean`
- `focusHandle(): void`
- `auras-change`

## `auras-sections` v1 Scope

The sixth pilot should do exactly this:

- present one authored structure as tabs or accordion, with an auto mode that
  switches between them at a container-width breakpoint
- coordinate one selected/expanded value across sections
- manage roving focus between section triggers
- apply the correct ARIA semantics for each mode (tablist for tabs, aria-expanded
  for accordion)

It should not do this in v1:

- nested sections
- lazy rendering
- async panel loading
- drag-to-reorder sections
- persistence beyond initial host attributes

Suggested authoring model:

```html
<auras-sections mode="auto" morph-at="500" value="html">
  <section data-part="section" data-value="html">
    <button type="button" data-part="trigger">HTML</button>
    <div data-part="panel">
      <p>Semantic markup with data attributes.</p>
    </div>
  </section>
  <section data-part="section" data-value="css">
    <button type="button" data-part="trigger">CSS</button>
    <div data-part="panel">
      <p>OKLCH colors, cascade layers, and container-aware layouts.</p>
    </div>
  </section>
</auras-sections>
```

Required parts:

- one host: `<auras-sections>`
- one or more sections: `[data-part="section"][data-value]`
- one trigger per section: `[data-part="trigger"]` (direct child of section)
- one panel per section: `[data-part="panel"]` (direct child of section)

Host API:

- `value`
- `mode="tabs|accordion|auto"`
- `morph-at` (pixel breakpoint for auto mode)
- `activation="auto|manual"`
- `exclusive` (accordion-only: close other sections on open)
- `show(value: string): boolean`
- `expand(value: string): boolean`
- `collapse(value: string): boolean`
- `toggle(value: string): boolean`
- `focusCurrent(): void`
- `auras-change`

## `@auras/audit` Scope

The audit package validates authored markup against the contract definitions in
`packages/audit/contracts.js`. It checks required parts, duplicate data-value
collisions, orphaned trigger/panel pairings, and accessibility gaps.

Three entry points exist: `packages/audit/browser.js` for the Contract Lab and
browser console, `packages/audit/mod.ts` as a typed Deno import, and
`packages/audit/cli.ts` for local or CI runs via HappyDOM.

Each contract definition includes `requiredParts`, `optionalParts`,
`accessibilityRules`, and `exampleMarkup`.

Adding a new component to the audit requires:

1. Add the contract definition to `packages/audit/contracts.js`.
2. Add the `AurasContractTagName` union member in `packages/audit/mod.ts`.
3. Add a validator function to both `packages/audit/browser.js` and
   `packages/audit/mod.ts`.
4. Add tests in `tests/auras-audit.test.ts`.

## Build Order

Recommended order for implementation:

1. Extract `packages/composites/auras-composites.css` as a separate optional
   layer.
2. Add one visual composite for master-detail shell with no JavaScript.
3. Implement `auras-master-detail` in `jsr:@auras/components` against the
   documented markup contract.
4. Validate the shared host API with `auras-tabs`.
5. Extend the same package with hierarchical selection and expansion in
   `auras-tree`.
6. Extend the same package with local filtering and popup state in
   `auras-combobox`.
7. Extend the same package with two-pane resize behavior in `auras-splitter`.
8. Add container-adaptive sections with `auras-sections`.
9. Add contract validation with `@auras/audit` (browser, Deno, CLI).
10. Only then move on to listbox or grid.

## Follow-On Components

After the pilot is stable:

- `auras-data-grid`
- `auras-listbox`

Only add them if they preserve the same rules:

- light DOM
- authored HTML remains visible
- stable `data-part` hooks
- CSS and behavior remain separable

## Progressive Enhancement and Hydration

Content works before JavaScript loads. Semantic HTML and CSS carry the
structure; components upgrade in place when the script runs.

### Component Taxonomy

Elena defines three component types. Auras maps them as follows:

- Elena "composite" (light DOM enhancer) = Auras Components layer. All current
  `auras-*` elements follow this model: add keyboard behavior, selection state,
  ARIA semantics, and focus management to authored HTML.
- Elena "primitive" (self-rendering) = not adopted. Reserved as a future separate
  package only if a real use case cannot be expressed with the controller model.
- Elena "declarative" (DSDOM pre-render) = not applicable. Authored HTML already
  fills this role.

### The `hydrated` Attribute

Every `auras-*` custom element sets a `hydrated` attribute on its host after
successful initialization. The `AurasElement` base class manages this
automatically: `onConnect` returning normally sets it; returning `false`
(initialization failed) skips it; `disconnectedCallback` removes it.

Example pre-hydration CSS:

```css
/* Hide toggle buttons that need JS to function */
auras-combobox:not([hydrated]) [data-part="toggle"] { display: none; }
auras-tree:not([hydrated]) [data-part="toggle"] { opacity: 0.4; pointer-events: none; }

/* Fade panels in after hydration */
auras-tabs[hydrated] [data-part="panel"] { animation: fade-in 150ms ease; }
```

For imperative calls made before registration, use `customElements.whenDefined`
to wait for the element to become available:

```js
await customElements.whenDefined("auras-tabs");
const tabs = document.querySelector("auras-tabs");
tabs.show("tokens");
```

### What Auras Does Not Adopt

- Elena's `html` tagged template rendering model.
- Elena's SSR expansion or bundler.
- pnpm/Rollup distribution (Auras stays on Deno/JSR).
- Self-rendering components that generate their own DOM.

## Authoring Checklist for New Components

Verify each new `auras-*` custom element follows these rules:

- Light DOM only. No Shadow DOM.
- Authored HTML stays inspectable. No hidden wrapper generation.
- All public state reflected as host attributes so CSS can react.
- ARIA semantics applied on connect (roles, labels, expanded, controls).
- Extend `AurasElement` from `packages/shared/`. Hydration is automatic.
- Stable `data-part` names as public API. Do not rename without a major version.
- Use `auras-change` with a `detail` object for selection events.
- Document keyboard behavior.
- Safe to call after `customElements.whenDefined()` resolves.

## Imperative API Reference

Methods exposed on each host element.

### Shared across selection components

| Method | Signature | Description |
|---|---|---|
| `show` | `show(value: string): boolean` | Select the item with the given value. Returns false if not found. |
| `focusCurrent` | `focusCurrent(): void` | Focus the currently active trigger or input. |

### `auras-tree` additions

| Method | Signature | Description |
|---|---|---|
| `expand` | `expand(value: string): boolean` | Expand the branch with the given value. |
| `collapse` | `collapse(value: string): boolean` | Collapse the branch with the given value. |
| `toggle` | `toggle(value: string): boolean` | Toggle expansion of the branch with the given value. |

### `auras-combobox` additions

| Method | Signature | Description |
|---|---|---|
| `openListbox` | `openListbox(): boolean` | Open the listbox popup. |
| `closeListbox` | `closeListbox(): boolean` | Close the listbox popup. |
| `toggleListbox` | `toggleListbox(): boolean` | Toggle the listbox popup. |

### `auras-sections` additions

| Method | Signature | Description |
|---|---|---|
| `expand` | `expand(value: string): boolean` | Expand the section with the given value (accordion mode). |
| `collapse` | `collapse(value: string): boolean` | Collapse the section with the given value (accordion mode). |
| `toggle` | `toggle(value: string): boolean` | Toggle expansion of the section with the given value (accordion mode). |

### `auras-splitter` methods

| Method | Signature | Description |
|---|---|---|
| `setPosition` | `setPosition(value: number): boolean` | Set the split position as a percentage. Clamped to min/max. |
| `focusHandle` | `focusHandle(): void` | Focus the separator handle. |

## Framework Integration

Auras components are standard custom elements. They work in any framework.

### Plain HTML

```html
<link rel="stylesheet" href="packages/elements/auras.css">
<link rel="stylesheet" href="packages/composites/auras-composites.css">
<script type="module" src="packages/components/browser.js"></script>
<script type="module" src="packages/diagram/browser.js"></script>
```

### Deno / TypeScript modules

```ts
import { registerAurasComponents } from "jsr:@auras/components";
import { registerAurasDiagram } from "jsr:@auras/diagram";

registerAurasComponents();
registerAurasDiagram();
```

### React

Custom elements work in React 19+ with no wrapper. For React 18, use a thin
ref-based wrapper or `@lit/react`:

```jsx
function TabsWrapper({ value, onAurasChange, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => onAurasChange?.(e.detail);
    el.addEventListener("auras-change", handler);
    return () => el.removeEventListener("auras-change", handler);
  }, [onAurasChange]);

  return <auras-tabs ref={ref} value={value}>{children}</auras-tabs>;
}
```

### Vue, Svelte, Angular

These frameworks handle custom elements natively. Use the standard HTML tag
names and listen to `auras-change` events. No bundler, manifest, or adapter
needed.
