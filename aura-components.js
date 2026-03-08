const MASTER_SELECTOR = '[data-part="master"]';
const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]';
const DETAIL_SELECTOR = '[data-part="detail"]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

let panelIdSequence = 0;

function normalizeActivation(value) {
  return value === "manual" ? "manual" : "auto";
}

function getDirectionality(node) {
  if (node.closest('[dir="rtl"]') || document.documentElement.dir === "rtl") {
    return "rtl";
  }

  return "ltr";
}

function ensurePanelId(panel) {
  if (panel.id) {
    return panel.id;
  }

  panelIdSequence += 1;
  panel.id = `aura-master-detail-panel-${panelIdSequence}`;
  return panel.id;
}

function upgradeProperty(node, name) {
  if (!Object.prototype.hasOwnProperty.call(node, name)) {
    return;
  }

  const value = node[name];
  delete node[name];
  node[name] = value;
}

class AuraMasterDetail extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  constructor() {
    super();

    this._entries = [];
    this._master = null;
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
      this._reflectActivation();
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

  _connect() {
    this._disconnect();

    const master = this.querySelector(MASTER_SELECTOR);
    const detail = this.querySelector(DETAIL_SELECTOR);

    if (!master || !detail) {
      return;
    }

    const panelsByValue = new Map();
    for (const panel of detail.querySelectorAll(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries = [];
    for (const trigger of master.querySelectorAll(TRIGGER_SELECTOR)) {
      const value = trigger.getAttribute("data-value");
      const panel = value ? panelsByValue.get(value) : null;

      if (!value || !panel) {
        continue;
      }

      trigger.setAttribute("aria-controls", ensurePanelId(panel));
      trigger.setAttribute("aria-expanded", "false");

      entries.push({ value, trigger, panel });
    }

    if (entries.length === 0) {
      return;
    }

    this._master = master;
    this._entries = entries;

    master.addEventListener("click", this._handleClick);
    master.addEventListener("keydown", this._handleKeydown);

    this._reflectActivation();

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      this._select(entries[0].value, { dispatch: false, focus: false });
    }
  }

  _disconnect() {
    if (this._master) {
      this._master.removeEventListener("click", this._handleClick);
      this._master.removeEventListener("keydown", this._handleKeydown);
    }

    this._master = null;
    this._entries = [];
  }

  _reflectActivation() {
    this.setAttribute("data-activation", this.activation);
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

    for (const currentEntry of this._entries) {
      const isActive = currentEntry === entry;

      currentEntry.trigger.tabIndex = isActive ? 0 : -1;
      currentEntry.trigger.toggleAttribute("data-active", isActive);
      currentEntry.trigger.setAttribute("aria-expanded", String(isActive));

      if (isActive) {
        currentEntry.trigger.setAttribute("aria-current", "true");
      } else {
        currentEntry.trigger.removeAttribute("aria-current");
      }

      currentEntry.panel.hidden = !isActive;
      currentEntry.panel.toggleAttribute("data-active", isActive);
    }

    if (this.getAttribute("value") !== entry.value) {
      this._syncingValue = true;
      this.setAttribute("value", entry.value);
      this._syncingValue = false;
    }

    if (options.focus) {
      entry.trigger.focus();
    }

    if (options.dispatch) {
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

  _handleClick(event) {
    const trigger = event.target.closest(TRIGGER_SELECTOR);
    if (!trigger || !this._master?.contains(trigger)) {
      return;
    }

    if (trigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    const value = trigger.getAttribute("data-value");
    if (!value) {
      return;
    }

    this._select(value, { dispatch: true, focus: false });
  }

  _handleKeydown(event) {
    const trigger = event.target.closest(TRIGGER_SELECTOR);
    if (!trigger || !this._master?.contains(trigger)) {
      return;
    }

    const currentIndex = this._entries.findIndex(
      (entry) => entry.trigger === trigger,
    );
    if (currentIndex < 0) {
      return;
    }

    const lastIndex = this._entries.length - 1;
    const directionality = getDirectionality(this);

    let nextIndex = null;

    switch (event.key) {
      case "ArrowDown":
        nextIndex = Math.min(lastIndex, currentIndex + 1);
        break;
      case "ArrowUp":
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case "ArrowRight":
        nextIndex = directionality === "rtl"
          ? Math.max(0, currentIndex - 1)
          : Math.min(lastIndex, currentIndex + 1);
        break;
      case "ArrowLeft":
        nextIndex = directionality === "rtl"
          ? Math.min(lastIndex, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      case "Enter":
      case " ":
        if (this.activation === "manual") {
          event.preventDefault();
          const value = trigger.getAttribute("data-value");
          if (value) {
            this._select(value, { dispatch: true, focus: false });
          }
        }
        return;
      default:
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

if (!customElements.get("aura-master-detail")) {
  customElements.define("aura-master-detail", AuraMasterDetail);
}

export { AuraMasterDetail };
