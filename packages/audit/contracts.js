/**
 * @typedef {{
 *   selector: string;
 *   min: number;
 *   max?: number;
 *   description: string;
 * }} AurasPartRule
 */

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   tagName: string;
 *   summary: string;
 *   requiredParts: ReadonlyArray<AurasPartRule>;
 *   optionalParts: ReadonlyArray<AurasPartRule>;
 *   accessibilityRules: ReadonlyArray<string>;
 *   exampleMarkup: string;
 * }} AurasContractDefinition
 */

/** @type {ReadonlyArray<AurasContractDefinition>} */
export const AURAS_CONTRACTS = [
  {
    id: "tabs",
    label: "Tabs",
    tagName: "auras-tabs",
    summary: "Tab controller with explicit tablist, triggers, and panels.",
    requiredParts: [
      {
        selector: '[data-part="tablist"]',
        min: 1,
        max: 1,
        description: "One tablist container",
      },
      {
        selector: '[data-part="panels"]',
        min: 1,
        max: 1,
        description: "One panels container",
      },
      {
        selector: '[data-part="trigger"][data-value]',
        min: 1,
        description: "One or more tab triggers with data-value",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 1,
        description: "One or more panels with data-value",
      },
    ],
    optionalParts: [],
    accessibilityRules: [
      "Give the tablist an accessible name with aria-label or aria-labelledby.",
      "Keep each trigger focusable and each inactive panel hidden.",
    ],
    exampleMarkup: `<auras-tabs data-ui="tabs" value="overview" activation="manual">
  <nav data-part="tablist" aria-label="Release views">
    <button type="button" data-part="trigger" data-value="overview">Overview</button>
    <button type="button" data-part="trigger" data-value="tokens">Tokens</button>
    <button type="button" data-part="trigger" data-value="behavior">Behavior</button>
  </nav>
  <section data-part="panels">
    <article data-part="panel" data-value="overview" data-surface="card">Overview panel</article>
    <article data-part="panel" data-value="tokens" data-surface="card" hidden>Tokens panel</article>
    <article data-part="panel" data-value="behavior" data-surface="card" hidden>Behavior panel</article>
  </section>
</auras-tabs>`,
  },
  {
    id: "master-detail",
    label: "Master-detail",
    tagName: "auras-master-detail",
    summary: "Selection controller for a master list and detail panels.",
    requiredParts: [
      {
        selector: '[data-part="master"]',
        min: 1,
        max: 1,
        description: "One master container",
      },
      {
        selector: '[data-part="detail"]',
        min: 1,
        max: 1,
        description: "One detail container",
      },
      {
        selector: '[data-part="trigger"][data-value]',
        min: 1,
        description: "One or more triggers with data-value",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 1,
        description: "One or more panels with data-value",
      },
    ],
    optionalParts: [],
    accessibilityRules: [
      "Give the master container an accessible name with aria-label or aria-labelledby.",
      "Keep inactive panels hidden until selected.",
    ],
    exampleMarkup: `<auras-master-detail data-ui="master-detail" value="elements">
  <nav data-part="master" aria-label="Auras layers">
    <button type="button" data-part="trigger" data-value="elements">Elements</button>
    <button type="button" data-part="trigger" data-value="composites">Composites</button>
    <button type="button" data-part="trigger" data-value="components">Components</button>
  </nav>
  <section data-part="detail">
    <article data-part="panel" data-value="elements" data-surface="card">Elements panel</article>
    <article data-part="panel" data-value="composites" data-surface="card" hidden>Composites panel</article>
    <article data-part="panel" data-value="components" data-surface="card" hidden>Components panel</article>
  </section>
</auras-master-detail>`,
  },
  {
    id: "combobox",
    label: "Combobox",
    tagName: "auras-combobox",
    summary: "Combobox with authored input, local options, and optional panels.",
    requiredParts: [
      {
        selector: '[data-part="input"]',
        min: 1,
        max: 1,
        description: "One text input",
      },
      {
        selector: '[data-part="listbox"]',
        min: 1,
        max: 1,
        description: "One listbox container",
      },
      {
        selector: '[data-part="option"][data-value]',
        min: 1,
        description: "One or more options with data-value",
      },
    ],
    optionalParts: [
      {
        selector: '[data-part="toggle"]',
        min: 0,
        max: 1,
        description: "Optional popup toggle button",
      },
      {
        selector: '[data-part="value"]',
        min: 0,
        max: 1,
        description: "Optional hidden value input",
      },
      {
        selector: '[data-part="empty"]',
        min: 0,
        max: 1,
        description: "Optional empty-state note",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 0,
        description: "Optional linked detail panels",
      },
    ],
    accessibilityRules: [
      "Give the toggle button an accessible name when one is present.",
      "Keep option values unique and pair any linked panels by matching data-value.",
    ],
    exampleMarkup: `<auras-combobox data-ui="combobox" value="tabs" activation="manual">
  <label for="lab-search">Component</label>
  <div data-part="control">
    <input id="lab-search" data-part="input" type="text" placeholder="Search components" />
    <button type="button" data-part="toggle" aria-label="Toggle options"></button>
    <input type="hidden" data-part="value" name="component" />
  </div>
  <ul data-part="listbox">
    <li data-part="option" data-value="tabs">Tabs</li>
    <li data-part="option" data-value="tree">Tree</li>
    <li data-part="option" data-value="diagram">Diagram</li>
  </ul>
  <p data-part="empty" hidden>No matches.</p>
  <section data-part="panels">
    <article data-part="panel" data-value="tabs" data-surface="card">Tabs panel</article>
    <article data-part="panel" data-value="tree" data-surface="card" hidden>Tree panel</article>
    <article data-part="panel" data-value="diagram" data-surface="card" hidden>Diagram panel</article>
  </section>
</auras-combobox>`,
  },
  {
    id: "tree",
    label: "Tree",
    tagName: "auras-tree",
    summary: "Tree controller for hierarchical selection and expansion.",
    requiredParts: [
      {
        selector: '[data-part="tree"]',
        min: 1,
        max: 1,
        description: "One tree container",
      },
      {
        selector: '[data-part="item"][data-value]',
        min: 1,
        description: "One or more items with data-value",
      },
    ],
    optionalParts: [
      {
        selector: '[data-part="toggle"]',
        min: 0,
        description: "Optional branch toggles",
      },
      {
        selector: '[data-part="group"]',
        min: 0,
        description: "Optional nested groups",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 0,
        description: "Optional linked detail panels",
      },
    ],
    accessibilityRules: [
      "Give the tree container an accessible name with aria-label or aria-labelledby.",
      "Give each toggle an accessible name when one is present.",
    ],
    exampleMarkup: `<auras-tree data-ui="tree" value="master-detail">
  <ul data-part="tree" aria-label="Auras components">
    <li data-part="item" data-value="elements">
      <button type="button" data-part="node">Elements</button>
    </li>
    <li data-part="item" data-value="components" data-expanded>
      <button type="button" data-part="toggle" aria-label="Toggle Components"></button>
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
    <article data-part="panel" data-value="elements" data-surface="card">Elements panel</article>
    <article data-part="panel" data-value="components" data-surface="card" hidden>Components panel</article>
    <article data-part="panel" data-value="master-detail" data-surface="card" hidden>Master-detail panel</article>
    <article data-part="panel" data-value="tabs" data-surface="card" hidden>Tabs panel</article>
  </section>
</auras-tree>`,
  },
  {
    id: "splitter",
    label: "Splitter",
    tagName: "auras-splitter",
    summary: "Two-pane splitter with explicit panes and separator.",
    requiredParts: [
      {
        selector: '[data-part="pane"][data-pane="primary"]',
        min: 1,
        max: 1,
        description: "One primary pane",
      },
      {
        selector: '[data-part="separator"]',
        min: 1,
        max: 1,
        description: "One separator",
      },
      {
        selector: '[data-part="pane"][data-pane="secondary"]',
        min: 1,
        max: 1,
        description: "One secondary pane",
      },
    ],
    optionalParts: [],
    accessibilityRules: [
      "Give the separator an accessible name with aria-label or aria-labelledby.",
    ],
    exampleMarkup: `<auras-splitter data-ui="splitter" value="42" min="30" max="70" step="5">
  <section data-part="pane" data-pane="primary" data-surface="card">Primary pane</section>
  <button type="button" data-part="separator" aria-label="Resize panes"></button>
  <section data-part="pane" data-pane="secondary" data-surface="card">Secondary pane</section>
</auras-splitter>`,
  },
  {
    id: "diagram",
    label: "Diagram",
    tagName: "auras-diagram",
    summary: "Spatial diagram controller with authored nodes and optional panels.",
    requiredParts: [
      {
        selector: '[data-part="canvas"]',
        min: 1,
        max: 1,
        description: "One canvas container",
      },
      {
        selector: '[data-part="node"][data-value]',
        min: 1,
        description: "One or more nodes with data-value",
      },
    ],
    optionalParts: [
      {
        selector: '[data-part="panel"][data-value]',
        min: 0,
        description: "Optional linked detail panels",
      },
    ],
    accessibilityRules: [
      "Keep node values unique and pair any linked panels by matching data-value.",
    ],
    exampleMarkup: `<auras-diagram value="received" activation="manual" aria-label="Order flow" style="--diagram-columns: 7">
  <div data-part="canvas">
    <button type="button" data-part="node" data-kind="input" data-value="received" style="--diagram-column: 1 / span 2; --diagram-row: 1">
      Received
    </button>
    <div data-part="connector" aria-hidden="true" style="--diagram-column: 3; --diagram-row: 1">
      <svg viewBox="0 0 120 40" preserveAspectRatio="none">
        <path d="M4 20 H108" />
        <path data-marker="arrow" d="M108 12 L116 20 L108 28 Z" />
      </svg>
    </div>
    <button type="button" data-part="node" data-kind="process" data-value="validate" style="--diagram-column: 4 / span 2; --diagram-row: 1">
      Validate
    </button>
    <button type="button" data-part="node" data-kind="output" data-value="fulfill" style="--diagram-column: 7; --diagram-row: 1">
      Fulfill
    </button>
  </div>
  <section data-part="panels">
    <article data-part="panel" data-value="received" data-surface="card">Received panel</article>
    <article data-part="panel" data-value="validate" data-surface="card" hidden>Validate panel</article>
    <article data-part="panel" data-value="fulfill" data-surface="card" hidden>Fulfill panel</article>
  </section>
</auras-diagram>`,
  },
  {
    id: "sections",
    label: "Sections",
    tagName: "auras-sections",
    summary:
      "Responsive section controller that presents one authored structure as tabs or accordion.",
    requiredParts: [
      {
        selector: '[data-part="section"][data-value]',
        min: 1,
        description: "One or more sections with data-value",
      },
      {
        selector: '[data-part="trigger"]',
        min: 1,
        description: "One trigger per section",
      },
      {
        selector: '[data-part="panel"]',
        min: 1,
        description: "One panel per section",
      },
    ],
    optionalParts: [],
    accessibilityRules: [
      "Keep one direct child trigger and one direct child panel inside each section.",
      "Use mode=\"tabs\", mode=\"accordion\", or mode=\"auto\" depending on the presentation you want.",
    ],
    exampleMarkup: `<auras-sections mode="auto" morph-at="500" value="html">
  <section data-part="section" data-value="html">
    <button type="button" data-part="trigger">HTML</button>
    <div data-part="panel">
      <p>Semantic markup with data attributes. No classes to memorize.</p>
    </div>
  </section>
  <section data-part="section" data-value="css">
    <button type="button" data-part="trigger">CSS</button>
    <div data-part="panel">
      <p>OKLCH colors, cascade layers, and container-aware layouts.</p>
    </div>
  </section>
  <section data-part="section" data-value="js">
    <button type="button" data-part="trigger">JS</button>
    <div data-part="panel">
      <p>Optional light-DOM behavior with a single authored structure.</p>
    </div>
  </section>
</auras-sections>`,
  },
];

export const AURAS_CONTRACT_TAG_NAMES = AURAS_CONTRACTS.map((contract) =>
  contract.tagName
);

export const AURAS_CONTRACTS_BY_TAG = Object.fromEntries(
  AURAS_CONTRACTS.map((contract) => [contract.tagName, contract]),
);
