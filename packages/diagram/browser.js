const CANVAS_SELECTOR = '[data-part="canvas"]';
const NODE_SELECTOR = '[data-part="node"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

let generatedIdSequence = 0;

function normalizeActivation(value) {
  return value === "manual" ? "manual" : "auto";
}

function getDirectionality(node) {
  if (node.closest('[dir="rtl"]') || document.documentElement.dir === "rtl") {
    return "rtl";
  }

  return "ltr";
}

function ensureElementId(element, prefix) {
  if (element.id) {
    return element.id;
  }

  generatedIdSequence += 1;
  element.id = `${prefix}-${generatedIdSequence}`;
  return element.id;
}

function upgradeProperty(node, name) {
  if (!Object.prototype.hasOwnProperty.call(node, name)) {
    return;
  }

  const value = node[name];
  delete node[name];
  node[name] = value;
}

function parseGridStartValue(value) {
  if (!value) {
    return null;
  }

  const startSegment = value.split("/")[0]?.trim();
  if (!startSegment) {
    return null;
  }

  const parsedValue = Number.parseInt(startSegment, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getEntryLayout(node, index) {
  return {
    columnStart:
      parseGridStartValue(node.style.getPropertyValue("--diagram-column")) ??
        index + 1,
    rowStart:
      parseGridStartValue(node.style.getPropertyValue("--diagram-row")) ?? 1,
    order: index,
  };
}

function getDirectionalScore(currentLayout, candidateLayout, direction) {
  const columnDelta = candidateLayout.columnStart - currentLayout.columnStart;
  const rowDelta = candidateLayout.rowStart - currentLayout.rowStart;

  switch (direction) {
    case "right":
      if (columnDelta <= 0) {
        return null;
      }
      return (
        columnDelta * 1000 +
        Math.abs(rowDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "left":
      if (columnDelta >= 0) {
        return null;
      }
      return (
        Math.abs(columnDelta) * 1000 +
        Math.abs(rowDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "down":
      if (rowDelta <= 0) {
        return null;
      }
      return (
        rowDelta * 1000 +
        Math.abs(columnDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "up":
      if (rowDelta >= 0) {
        return null;
      }
      return (
        Math.abs(rowDelta) * 1000 +
        Math.abs(columnDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    default:
      return null;
  }
}

function getDiagramDirection(key, directionality) {
  switch (key) {
    case "ArrowDown":
      return "down";
    case "ArrowUp":
      return "up";
    case "ArrowRight":
      return directionality === "rtl" ? "left" : "right";
    case "ArrowLeft":
      return directionality === "rtl" ? "right" : "left";
    default:
      return null;
  }
}

function getNextDiagramIndex(entries, currentIndex, key, directionality) {
  if (entries.length === 0) {
    return null;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return entries.length - 1;
  }

  const direction = getDiagramDirection(key, directionality);
  if (!direction) {
    return null;
  }

  const currentEntry = entries[currentIndex];
  if (!currentEntry) {
    return null;
  }

  let bestIndex = currentIndex;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const [index, entry] of entries.entries()) {
    if (index === currentIndex) {
      continue;
    }

    const score = getDirectionalScore(
      currentEntry.layout,
      entry.layout,
      direction,
    );

    if (score == null || score >= bestScore) {
      continue;
    }

    bestIndex = index;
    bestScore = score;
  }

  return bestIndex;
}

function isNativeInteractiveElement(node) {
  return (
    node instanceof HTMLButtonElement ||
    node instanceof HTMLAnchorElement ||
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

export const AURA_DIAGRAM_TAG_NAME = "aura-diagram";

export class AuraDiagram extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  constructor() {
    super();

    this._canvas = null;
    this._entries = [];
    this._syncingValue = false;

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  connectedCallback() {
    upgradeProperty(this, "value");
    upgradeProperty(this, "activation");
    this._connect();
  }

  disconnectedCallback() {
    this._disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (name === "activation") {
      this._normalizeActivationAttribute();
      return;
    }

    if (this._syncingValue) {
      return;
    }

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, { dispatch: false, focus: false });
      }
    }
  }

  get value() {
    return this.getAttribute("value");
  }

  set value(value) {
    if (value == null || value === "") {
      this.removeAttribute("value");
      return;
    }

    this.setAttribute("value", String(value));
  }

  get activation() {
    return normalizeActivation(this.getAttribute("activation"));
  }

  set activation(value) {
    const normalizedValue = normalizeActivation(value);
    if (normalizedValue === "auto") {
      this.removeAttribute("activation");
      return;
    }

    this.setAttribute("activation", normalizedValue);
  }

  show(value) {
    return this._select(value, { dispatch: true, focus: false });
  }

  focusCurrent() {
    const activeEntry =
      this._entries.find((entry) => entry.node.hasAttribute("data-active")) ??
        this._entries[0];

    activeEntry?.node.focus();
  }

  _connect() {
    this._disconnect();

    const canvas = this.querySelector(CANVAS_SELECTOR);
    if (!canvas) {
      return;
    }

    const panelsByValue = new Map();
    for (const panel of this.querySelectorAll(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries = [];
    let order = 0;
    for (const node of canvas.querySelectorAll(NODE_SELECTOR)) {
      const value = node.getAttribute("data-value");
      if (!value) {
        continue;
      }

      const panel = panelsByValue.get(value) ?? null;
      const entry = {
        value,
        node,
        panel,
        layout: getEntryLayout(node, order),
      };

      this._applyEntrySemantics(entry);
      entries.push(entry);
      order += 1;
    }

    if (entries.length === 0) {
      return;
    }

    this._canvas = canvas;
    this._entries = entries;

    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "group");
    }

    this.toggleAttribute(
      "data-has-panels",
      entries.some((entry) => entry.panel !== null),
    );

    canvas.addEventListener("click", this._handleClick);
    canvas.addEventListener("keydown", this._handleKeydown);

    this._normalizeActivationAttribute();

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      this._select(entries[0].value, { dispatch: false, focus: false });
    }
  }

  _disconnect() {
    if (this._canvas) {
      this._canvas.removeEventListener("click", this._handleClick);
      this._canvas.removeEventListener("keydown", this._handleKeydown);
    }

    this._canvas = null;
    this._entries = [];
    this.removeAttribute("data-has-panels");
  }

  _normalizeActivationAttribute() {
    if (this.activation === "manual") {
      this.setAttribute("activation", "manual");
      return;
    }

    this.removeAttribute("activation");
  }

  _selectFromAttribute(options) {
    const value = this.getAttribute("value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  _applyEntrySemantics(entry) {
    if (
      !isNativeInteractiveElement(entry.node) &&
      !entry.node.hasAttribute("role")
    ) {
      entry.node.setAttribute("role", "button");
    }

    entry.node.setAttribute("aria-current", "false");

    if (!entry.panel) {
      return;
    }

    entry.node.setAttribute(
      "aria-controls",
      ensureElementId(entry.panel, "aura-diagram-panel"),
    );
    entry.node.setAttribute("aria-expanded", "false");
    entry.panel.setAttribute("role", "region");
    entry.panel.setAttribute(
      "aria-labelledby",
      ensureElementId(entry.node, "aura-diagram-node"),
    );
  }

  _select(value, options) {
    const entry = this._entries.find(
      (currentEntry) => currentEntry.value === value,
    );
    if (!entry) {
      return false;
    }

    const previousValue = this.getAttribute("value");
    const didChange = previousValue !== entry.value;

    for (const currentEntry of this._entries) {
      const isActive = currentEntry === entry;

      currentEntry.node.tabIndex = isActive ? 0 : -1;
      currentEntry.node.toggleAttribute("data-active", isActive);
      currentEntry.node.setAttribute("aria-current", String(isActive));

      if (currentEntry.panel) {
        currentEntry.panel.hidden = !isActive;
        currentEntry.panel.toggleAttribute("data-active", isActive);
        currentEntry.node.setAttribute("aria-expanded", String(isActive));
      }
    }

    if (this.getAttribute("value") !== entry.value) {
      this._syncingValue = true;
      this.setAttribute("value", entry.value);
      this._syncingValue = false;
    }

    if (options.focus) {
      entry.node.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("aura-change", {
          detail: {
            value: entry.value,
            node: entry.node,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  _activateNode(node, options) {
    const value = node.getAttribute("data-value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  _isActivationKey(key) {
    return key === "Enter" || key === " ";
  }

  _handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const node = target.closest(NODE_SELECTOR);
    if (!(node instanceof HTMLElement) || !this._canvas?.contains(node)) {
      return;
    }

    if (node instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    this._activateNode(node, { dispatch: true, focus: false });
  }

  _handleKeydown(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const node = target.closest(NODE_SELECTOR);
    if (!(node instanceof HTMLElement) || !this._canvas?.contains(node)) {
      return;
    }

    const currentIndex = this._entries.findIndex(
      (entry) => entry.node === node,
    );
    if (currentIndex < 0) {
      return;
    }

    if (this._isActivationKey(event.key)) {
      if (this.activation === "manual") {
        event.preventDefault();
        this._activateNode(node, { dispatch: true, focus: false });
      }
      return;
    }

    const nextIndex = getNextDiagramIndex(
      this._entries,
      currentIndex,
      event.key,
      getDirectionality(this),
    );
    if (nextIndex == null) {
      return;
    }

    event.preventDefault();

    const nextEntry = this._entries[nextIndex];
    if (!nextEntry) {
      return;
    }

    nextEntry.node.focus();

    if (this.activation === "auto") {
      this._select(nextEntry.value, { dispatch: true, focus: false });
    }
  }
}

export function registerAuraDiagram() {
  if (!customElements.get(AURA_DIAGRAM_TAG_NAME)) {
    customElements.define(AURA_DIAGRAM_TAG_NAME, AuraDiagram);
  }

  return AuraDiagram;
}

registerAuraDiagram();
