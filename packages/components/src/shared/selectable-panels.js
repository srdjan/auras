const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

let generatedIdSequence = 0;

export function normalizeActivation(value) {
  return value === "manual" ? "manual" : "auto";
}

export function getDirectionality(node) {
  if (node.closest('[dir="rtl"]') || document.documentElement.dir === "rtl") {
    return "rtl";
  }

  return "ltr";
}

export function ensureElementId(element, prefix) {
  if (element.id) {
    return element.id;
  }

  generatedIdSequence += 1;
  element.id = `${prefix}-${generatedIdSequence}`;
  return element.id;
}

export function upgradeProperty(node, name) {
  if (!Object.prototype.hasOwnProperty.call(node, name)) {
    return;
  }

  const value = node[name];
  delete node[name];
  node[name] = value;
}

export class AuraSelectablePanelsElement extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  constructor() {
    super();

    this._container = null;
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
      this._entries.find((entry) =>
        entry.trigger.hasAttribute("data-active")
      ) || this._entries[0];

    activeEntry?.trigger.focus();
  }

  _getContainerSelector() {
    return null;
  }

  _getPanelRootSelector() {
    return null;
  }

  _getPanelIdPrefix() {
    return "aura-panel";
  }

  _setContainerSemantics() {}

  _applyEntrySemantics() {}

  _applySelectionState() {}

  _getNextIndex() {
    return null;
  }

  _connect() {
    this._disconnect();

    const containerSelector = this._getContainerSelector();
    const panelRootSelector = this._getPanelRootSelector();
    const container = containerSelector
      ? this.querySelector(containerSelector)
      : null;
    const panelRoot = panelRootSelector
      ? this.querySelector(panelRootSelector)
      : this;

    if (!container || !panelRoot) {
      return;
    }

    const panelsByValue = new Map();
    for (const panel of panelRoot.querySelectorAll(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries = [];
    for (const trigger of container.querySelectorAll(TRIGGER_SELECTOR)) {
      const value = trigger.getAttribute("data-value");
      const panel = value ? panelsByValue.get(value) : null;

      if (!value || !panel) {
        continue;
      }

      const entry = { value, trigger, panel };

      trigger.setAttribute(
        "aria-controls",
        ensureElementId(panel, this._getPanelIdPrefix()),
      );
      this._applyEntrySemantics(entry);

      entries.push(entry);
    }

    if (entries.length === 0) {
      return;
    }

    this._container = container;
    this._entries = entries;

    this._setContainerSemantics(container);

    container.addEventListener("click", this._handleClick);
    container.addEventListener("keydown", this._handleKeydown);

    this._normalizeActivationAttribute();

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      this._select(entries[0].value, { dispatch: false, focus: false });
    }
  }

  _disconnect() {
    if (this._container) {
      this._container.removeEventListener("click", this._handleClick);
      this._container.removeEventListener("keydown", this._handleKeydown);
    }

    this._container = null;
    this._entries = [];
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

      currentEntry.trigger.tabIndex = isActive ? 0 : -1;
      currentEntry.trigger.toggleAttribute("data-active", isActive);
      currentEntry.panel.hidden = !isActive;
      currentEntry.panel.toggleAttribute("data-active", isActive);

      this._applySelectionState(currentEntry, isActive);
    }

    if (this.getAttribute("value") !== entry.value) {
      this._syncingValue = true;
      this.setAttribute("value", entry.value);
      this._syncingValue = false;
    }

    if (options.focus) {
      entry.trigger.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("aura-change", {
          detail: {
            value: entry.value,
            trigger: entry.trigger,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  _activateTrigger(trigger, options) {
    const value = trigger.getAttribute("data-value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  _isActivationKey(key) {
    return key === "Enter" || key === " ";
  }

  _handleClick(event) {
    const trigger = event.target.closest(TRIGGER_SELECTOR);
    if (!trigger || !this._container?.contains(trigger)) {
      return;
    }

    if (trigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    this._activateTrigger(trigger, { dispatch: true, focus: false });
  }

  _handleKeydown(event) {
    const trigger = event.target.closest(TRIGGER_SELECTOR);
    if (!trigger || !this._container?.contains(trigger)) {
      return;
    }

    const currentIndex = this._entries.findIndex(
      (entry) => entry.trigger === trigger,
    );
    if (currentIndex < 0) {
      return;
    }

    if (this._isActivationKey(event.key)) {
      if (this.activation === "manual") {
        event.preventDefault();
        this._activateTrigger(trigger, { dispatch: true, focus: false });
      }
      return;
    }

    const nextIndex = this._getNextIndex(currentIndex, event.key);
    if (nextIndex == null) {
      return;
    }

    event.preventDefault();

    const nextEntry = this._entries[nextIndex];
    if (!nextEntry) {
      return;
    }

    nextEntry.trigger.focus();

    if (this.activation === "auto") {
      this._select(nextEntry.value, { dispatch: true, focus: false });
    }
  }
}
