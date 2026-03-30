const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';
const MASTER_SELECTOR = '[data-part="master"]';
const DETAIL_SELECTOR = '[data-part="detail"]';
const TABLIST_SELECTOR = '[data-part="tablist"]';
const PANELS_SELECTOR = '[data-part="panels"]';
const INPUT_SELECTOR = '[data-part="input"]';
const TREE_SELECTOR = '[data-part="tree"]';
const LISTBOX_SELECTOR = '[data-part="listbox"]';
const OPTION_SELECTOR = '[data-part="option"][data-value]';
const PRIMARY_PANE_SELECTOR = '[data-part="pane"][data-pane="primary"]';
const ITEM_SELECTOR = '[data-part="item"][data-value]';
const EMPTY_SELECTOR = '[data-part="empty"]';
const NODE_SELECTOR = '[data-part="node"]';
const SECONDARY_PANE_SELECTOR = '[data-part="pane"][data-pane="secondary"]';
const SEPARATOR_SELECTOR = '[data-part="separator"]';
const TOGGLE_SELECTOR = '[data-part="toggle"]';
const GROUP_SELECTOR = '[data-part="group"]';
const VALUE_INPUT_SELECTOR = 'input[data-part="value"]';

const REDUCED_MOTION_QUERY =
  typeof matchMedia === "function"
    ? matchMedia("(prefers-reduced-motion: no-preference)")
    : null;

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

function getDirectChildElements(container, selector) {
  return Array.from(container.children).filter((child) =>
    child instanceof HTMLElement && child.matches(selector)
  );
}

function getDirectChildElement(container, selector) {
  return (
    Array.from(container.children).find((child) =>
      child instanceof HTMLElement && child.matches(selector)
    ) ?? null
  );
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

class AuraSelectablePanelsElement extends HTMLElement {
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
    return "auras-panel";
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

    this.setAttribute("hydrated", "");
  }

  _disconnect() {
    if (this._container) {
      this._container.removeEventListener("click", this._handleClick);
      this._container.removeEventListener("keydown", this._handleKeydown);
    }

    this._container = null;
    this._entries = [];
    this.removeAttribute("hydrated");
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

    const applySelection = () => {
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
    };

    const useViewTransition = didChange &&
      typeof document.startViewTransition === "function" &&
      (REDUCED_MOTION_QUERY?.matches ?? false);

    if (useViewTransition) {
      document.startViewTransition(applySelection);
    } else {
      applySelection();
    }

    if (options.focus) {
      entry.trigger.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
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
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest(TRIGGER_SELECTOR);
    if (
      !(trigger instanceof HTMLElement) || !this._container?.contains(trigger)
    ) {
      return;
    }

    if (trigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    this._activateTrigger(trigger, { dispatch: true, focus: false });
  }

  _handleKeydown(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest(TRIGGER_SELECTOR);
    if (
      !(trigger instanceof HTMLElement) || !this._container?.contains(trigger)
    ) {
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

class AurasCombobox extends HTMLElement {
  static observedAttributes = ["value", "activation", "open"];

  constructor() {
    super();

    this._input = null;
    this._toggle = null;
    this._listbox = null;
    this._emptyState = null;
    this._valueInput = null;
    this._entries = [];
    this._entriesByValue = new Map();
    this._activeValue = null;
    this._isQuerying = false;
    this._syncingValue = false;
    this._syncingOpen = false;

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleInput = this._handleInput.bind(this);
    this._handleFocusOut = this._handleFocusOut.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handlePopoverToggle = this._handlePopoverToggle.bind(this);
  }

  connectedCallback() {
    upgradeProperty(this, "value");
    upgradeProperty(this, "activation");
    upgradeProperty(this, "open");
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

    if (name === "open") {
      if (this._syncingOpen) {
        return;
      }

      this._applyOpenState(this.hasAttribute("open"), {
        restoreInput: !this.hasAttribute("open"),
      });
      return;
    }

    if (this._syncingValue) {
      return;
    }

    if (
      !this._selectFromAttribute({
        dispatch: false,
        closeListbox: false,
        focusInput: false,
        syncInput: true,
      })
    ) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, {
          dispatch: false,
          closeListbox: false,
          focusInput: false,
          syncInput: true,
        });
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

  get open() {
    return this.hasAttribute("open");
  }

  set open(value) {
    this.toggleAttribute("open", Boolean(value));
  }

  show(value) {
    return this._select(value, {
      dispatch: true,
      closeListbox: true,
      focusInput: false,
      syncInput: true,
    });
  }

  focusCurrent() {
    this._input?.focus();
  }

  openListbox() {
    if (!this._listbox || this.open) {
      return false;
    }

    this._applyOpenState(true, { restoreInput: false });
    this._syncOpenAttribute(true);
    return true;
  }

  closeListbox() {
    if (!this._listbox || !this.open) {
      return false;
    }

    this._applyOpenState(false, { restoreInput: true });
    this._syncOpenAttribute(false);
    return true;
  }

  toggleListbox() {
    return this.open ? this.closeListbox() : this.openListbox();
  }

  _connect() {
    this._disconnect();

    const input = this.querySelector(INPUT_SELECTOR);
    const listbox = this.querySelector(LISTBOX_SELECTOR);

    if (!(input instanceof HTMLInputElement) || !listbox) {
      return;
    }

    const toggle = this.querySelector(TOGGLE_SELECTOR);
    const emptyState = this.querySelector(EMPTY_SELECTOR);
    const valueInput = this.querySelector(VALUE_INPUT_SELECTOR);

    const panelsByValue = new Map();
    for (const panel of this.querySelectorAll(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries = [];
    const seenValues = new Set();
    for (const option of listbox.querySelectorAll(OPTION_SELECTOR)) {
      const value = option.getAttribute("data-value");
      if (!value || seenValues.has(value)) {
        continue;
      }
      seenValues.add(value);

      const label = option.getAttribute("data-label")?.trim() ||
        option.textContent?.trim() ||
        value;

      entries.push({
        value,
        label,
        searchText: label.toLocaleLowerCase(),
        option,
        panel: panelsByValue.get(value) ?? null,
      });
    }

    if (entries.length === 0) {
      return;
    }

    this._input = input;
    this._toggle = toggle;
    this._listbox = listbox;
    this._emptyState = emptyState;
    this._valueInput = valueInput instanceof HTMLInputElement
      ? valueInput
      : null;
    this._entries = entries;
    this._entriesByValue = new Map(
      entries.map((entry) => [entry.value, entry]),
    );
    this._activeValue = null;
    this._isQuerying = false;

    this._applySemantics();

    this._popoverSupported = listbox.popover !== undefined &&
      typeof listbox.showPopover === "function";

    this.addEventListener("click", this._handleClick);
    this.addEventListener("keydown", this._handleKeydown);
    this.addEventListener("input", this._handleInput);

    if (this._popoverSupported) {
      listbox.addEventListener("toggle", this._handlePopoverToggle);
    } else {
      this.addEventListener("focusout", this._handleFocusOut);
      this.addEventListener("mousedown", this._handleMouseDown);
    }

    this._normalizeActivationAttribute();

    if (
      !this._selectFromAttribute({
        dispatch: false,
        closeListbox: false,
        focusInput: false,
        syncInput: true,
      })
    ) {
      this._select(entries[0].value, {
        dispatch: false,
        closeListbox: false,
        focusInput: false,
        syncInput: true,
      });
    }

    this._applyOpenState(this.open, { restoreInput: !this.open });

    this.setAttribute("hydrated", "");
  }

  _disconnect() {
    this.removeEventListener("click", this._handleClick);
    this.removeEventListener("keydown", this._handleKeydown);
    this.removeEventListener("input", this._handleInput);

    if (this._popoverSupported && this._listbox) {
      this._listbox.removeEventListener("toggle", this._handlePopoverToggle);
    } else {
      this.removeEventListener("focusout", this._handleFocusOut);
      this.removeEventListener("mousedown", this._handleMouseDown);
    }

    this._input = null;
    this._toggle = null;
    this._listbox = null;
    this._emptyState = null;
    this._valueInput = null;
    this._entries = [];
    this._entriesByValue = new Map();
    this._activeValue = null;
    this._isQuerying = false;
    this.removeAttribute("hydrated");
  }

  _applySemantics() {
    if (!this._input || !this._listbox) {
      return;
    }

    const listboxId = ensureElementId(this._listbox, "auras-combobox-listbox");

    this._input.setAttribute("role", "combobox");
    this._input.setAttribute("aria-autocomplete", "list");
    this._input.setAttribute("aria-controls", listboxId);
    this._input.setAttribute("aria-expanded", "false");
    this._input.setAttribute("autocomplete", "off");

    this._listbox.setAttribute("role", "listbox");

    for (const entry of this._entries) {
      entry.option.setAttribute("role", "option");
      entry.option.setAttribute(
        "id",
        ensureElementId(entry.option, "auras-combobox-option"),
      );
      entry.option.setAttribute("aria-selected", "false");

      if (entry.panel) {
        entry.panel.setAttribute("role", "region");
        entry.panel.setAttribute("aria-labelledby", entry.option.id);
      }
    }

    if (this._toggle) {
      this._toggle.setAttribute("aria-controls", listboxId);
      this._toggle.setAttribute("aria-expanded", "false");
    }
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
    const entry = this._entriesByValue.get(value);
    if (!entry) {
      return false;
    }

    const previousValue = this.getAttribute("value");
    const didChange = previousValue !== entry.value;

    for (const currentEntry of this._entries) {
      const isSelected = currentEntry === entry;

      currentEntry.option.toggleAttribute("data-selected", isSelected);
      currentEntry.option.setAttribute("aria-selected", String(isSelected));

      if (currentEntry.panel) {
        currentEntry.panel.hidden = !isSelected;
        currentEntry.panel.toggleAttribute("data-active", isSelected);
      }
    }

    if (this.getAttribute("value") !== entry.value) {
      this._syncingValue = true;
      this.setAttribute("value", entry.value);
      this._syncingValue = false;
    }

    if (this._valueInput) {
      this._valueInput.value = entry.value;
    }

    if (options.syncInput) {
      this._commitSelectedLabel(entry);
    }

    if (
      !this._listbox?.hidden &&
      this._getVisibleEntries().some((currentEntry) => currentEntry === entry)
    ) {
      this._setActiveOption(entry.value);
    }

    if (options.closeListbox) {
      this.closeListbox();
    }

    if (options.focusInput) {
      this._input?.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
          detail: {
            value: entry.value,
            option: entry.option,
            input: this._input,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  _commitSelectedLabel(entry) {
    if (!this._input) {
      return;
    }

    this._input.value = entry.label;
    this._isQuerying = false;
  }

  _restoreSelectedLabel() {
    const selectedEntry = this.value
      ? this._entriesByValue.get(this.value)
      : null;
    if (selectedEntry) {
      this._commitSelectedLabel(selectedEntry);
      return;
    }

    if (this._input) {
      this._input.value = "";
    }
    this._isQuerying = false;
  }

  _syncOpenAttribute(open) {
    if (this.open === open) {
      return;
    }

    this._syncingOpen = true;
    this.toggleAttribute("open", open);
    this._syncingOpen = false;
  }

  _applyOpenState(open, options) {
    if (!this._input || !this._listbox) {
      return;
    }

    if (!open && options.restoreInput) {
      this._restoreSelectedLabel();
    }

    if (this._popoverSupported) {
      try {
        if (open) {
          this._listbox.showPopover();
        } else {
          this._listbox.hidePopover();
        }
      } catch (_) {
        /* already in target state */
      }
    } else {
      this._listbox.hidden = !open;
    }
    this._input.setAttribute("aria-expanded", String(open));

    if (this._toggle) {
      this._toggle.setAttribute("aria-expanded", String(open));
    }

    this._syncOptionVisibility();

    const visibleEntries = this._getVisibleEntries();
    const isEmpty = open && visibleEntries.length === 0;
    this.toggleAttribute("data-empty", isEmpty);

    if (this._emptyState) {
      this._emptyState.hidden = !isEmpty;
    }

    if (!open) {
      this._setActiveOption(null);
      return;
    }
    const activeEntry =
      visibleEntries.find((entry) => entry.value === this._activeValue) ||
      (this.value
        ? visibleEntries.find((entry) => entry.value === this.value)
        : null) ||
      visibleEntries[0] ||
      null;

    this._setActiveOption(activeEntry?.value ?? null);
  }

  _syncOptionVisibility() {
    const query = this._getQuery();
    for (const entry of this._entries) {
      entry.option.hidden = !this._isEntryVisible(entry, query);
    }
  }

  _syncEmptyState(open) {
    if (!this._emptyState) {
      return;
    }
    this._emptyState.hidden = !(open && this._getVisibleEntries().length === 0);
  }

  _getQuery() {
    if (!this.open) {
      return "";
    }
    if (!this._isQuerying) {
      return "";
    }
    return this._input?.value.trim().toLocaleLowerCase() ?? "";
  }

  _isEntryVisible(entry, query) {
    if (query === "") {
      return true;
    }
    return entry.searchText.includes(query);
  }

  _getVisibleEntries() {
    const query = this._getQuery();
    return this._entries.filter((entry) => this._isEntryVisible(entry, query));
  }

  _setActiveOption(value) {
    this._activeValue = value;

    for (const entry of this._entries) {
      entry.option.toggleAttribute("data-active", entry.value === value);
    }

    if (!this._input) {
      return;
    }

    if (!value) {
      this._input.removeAttribute("aria-activedescendant");
      return;
    }

    const entry = this._entriesByValue.get(value);
    if (!entry) {
      this._input.removeAttribute("aria-activedescendant");
      return;
    }

    this._input.setAttribute("aria-activedescendant", entry.option.id);
  }

  _moveActive(direction) {
    const visibleEntries = this._getVisibleEntries();
    if (visibleEntries.length === 0) {
      this._setActiveOption(null);
      this._syncEmptyState(this.open);
      return;
    }

    const currentIndex = visibleEntries.findIndex(
      (entry) => entry.value === this._activeValue,
    );
    const fallbackIndex = direction > 0 ? 0 : visibleEntries.length - 1;
    const nextIndex = currentIndex < 0 ? fallbackIndex : Math.max(
      0,
      Math.min(visibleEntries.length - 1, currentIndex + direction),
    );
    const nextEntry = visibleEntries[nextIndex];

    if (!nextEntry) {
      return;
    }

    this._setActiveOption(nextEntry.value);

    if (this.activation === "auto") {
      this._select(nextEntry.value, {
        dispatch: true,
        closeListbox: false,
        focusInput: false,
        syncInput: !this._isQuerying,
      });
    }
  }

  _handleMouseDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const option = target.closest(OPTION_SELECTOR);
    if (option instanceof HTMLElement && this.contains(option)) {
      event.preventDefault();
    }
  }

  _handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const toggle = target.closest(TOGGLE_SELECTOR);
    if (toggle instanceof HTMLElement && this.contains(toggle)) {
      event.preventDefault();
      this.toggleListbox();
      this._input?.focus();
      return;
    }

    const input = target.closest(INPUT_SELECTOR);
    if (input instanceof HTMLInputElement && this.contains(input)) {
      this.openListbox();
      return;
    }

    const option = target.closest(OPTION_SELECTOR);
    if (!(option instanceof HTMLElement) || !this.contains(option)) {
      return;
    }

    const value = option.getAttribute("data-value");
    if (!value || option.hidden) {
      return;
    }

    this._select(value, {
      dispatch: true,
      closeListbox: true,
      focusInput: true,
      syncInput: true,
    });
  }

  _handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target !== this._input) {
      return;
    }

    this._isQuerying = target.value.trim() !== "";
    this.openListbox();
    this._syncOptionVisibility();

    const visibleEntries = this._getVisibleEntries();
    if (this._emptyState) {
      this._emptyState.hidden = visibleEntries.length > 0;
    }
    const nextActive =
      visibleEntries.find((entry) => entry.value === this._activeValue) ||
      visibleEntries[0] ||
      null;

    this._setActiveOption(nextActive?.value ?? null);
  }

  _handleKeydown(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target !== this._input) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();

        if (!this.open) {
          this.openListbox();
          const visibleEntries = this._getVisibleEntries();
          const selectedEntry = this.value
            ? this._entriesByValue.get(this.value)
            : null;
          const nextEntry =
            (selectedEntry && visibleEntries.includes(selectedEntry)
              ? selectedEntry
              : null) || visibleEntries[0];
          this._setActiveOption(nextEntry?.value ?? null);
          return;
        }

        this._moveActive(1);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();

        if (!this.open) {
          this.openListbox();
          const visibleEntries = this._getVisibleEntries();
          const selectedEntry = this.value
            ? this._entriesByValue.get(this.value)
            : null;
          const nextEntry =
            (selectedEntry && visibleEntries.includes(selectedEntry)
              ? selectedEntry
              : null) || visibleEntries[visibleEntries.length - 1];
          this._setActiveOption(nextEntry?.value ?? null);
          return;
        }

        this._moveActive(-1);
        return;
      }
      case "Enter": {
        if (!this.open || !this._activeValue) {
          return;
        }

        event.preventDefault();
        this._select(this._activeValue, {
          dispatch: true,
          closeListbox: true,
          focusInput: true,
          syncInput: true,
        });
        return;
      }
      case "Escape": {
        if (!this.open) {
          return;
        }

        event.preventDefault();
        this.closeListbox();
        return;
      }
      default:
        return;
    }
  }

  _handlePopoverToggle(event) {
    if (event.newState === "closed" && this.open) {
      this._restoreSelectedLabel();
      this._syncOpenAttribute(false);
      this._input?.setAttribute("aria-expanded", "false");
      if (this._toggle) {
        this._toggle.setAttribute("aria-expanded", "false");
      }
      this._setActiveOption(null);
    }
  }

  _handleFocusOut() {
    queueMicrotask(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof Node && this.contains(activeElement)) {
        return;
      }

      this.closeListbox();
    });
  }
}

const AURAS_COMBOBOX_TAG_NAME = "auras-combobox";
const AURAS_MASTER_DETAIL_TAG_NAME = "auras-master-detail";
const AURAS_SPLITTER_TAG_NAME = "auras-splitter";
const AURAS_TREE_TAG_NAME = "auras-tree";
const AURAS_TABS_TAG_NAME = "auras-tabs";

class AurasMasterDetail extends AuraSelectablePanelsElement {
  _getContainerSelector() {
    return MASTER_SELECTOR;
  }

  _getPanelRootSelector() {
    return DETAIL_SELECTOR;
  }

  _getPanelIdPrefix() {
    return "auras-master-detail-panel";
  }

  _applyEntrySemantics(entry) {
    entry.trigger.setAttribute("aria-expanded", "false");
  }

  _applySelectionState(entry, isActive) {
    entry.trigger.setAttribute("aria-expanded", String(isActive));

    if (isActive) {
      entry.trigger.setAttribute("aria-current", "true");
    } else {
      entry.trigger.removeAttribute("aria-current");
    }
  }

  _getNextIndex(currentIndex, key) {
    const lastIndex = this._entries.length - 1;
    const directionality = getDirectionality(this);

    switch (key) {
      case "ArrowDown":
        return Math.min(lastIndex, currentIndex + 1);
      case "ArrowUp":
        return Math.max(0, currentIndex - 1);
      case "ArrowRight":
        return directionality === "rtl"
          ? Math.max(0, currentIndex - 1)
          : Math.min(lastIndex, currentIndex + 1);
      case "ArrowLeft":
        return directionality === "rtl"
          ? Math.min(lastIndex, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      case "Home":
        return 0;
      case "End":
        return lastIndex;
      default:
        return null;
    }
  }
}

class AurasTabs extends AuraSelectablePanelsElement {
  _getContainerSelector() {
    return TABLIST_SELECTOR;
  }

  _getPanelRootSelector() {
    return PANELS_SELECTOR;
  }

  _getPanelIdPrefix() {
    return "auras-tabs-panel";
  }

  _setContainerSemantics(container) {
    container.setAttribute("role", "tablist");
    container.setAttribute("aria-orientation", "horizontal");
  }

  _applyEntrySemantics(entry) {
    entry.trigger.setAttribute("role", "tab");
    entry.trigger.setAttribute("aria-selected", "false");
    entry.trigger.setAttribute(
      "id",
      ensureElementId(entry.trigger, "auras-tabs-trigger"),
    );
    entry.panel.setAttribute("role", "tabpanel");
    entry.panel.setAttribute("aria-labelledby", entry.trigger.id);
  }

  _applySelectionState(entry, isActive) {
    entry.trigger.setAttribute("aria-selected", String(isActive));
  }

  _getNextIndex(currentIndex, key) {
    const lastIndex = this._entries.length - 1;
    const directionality = getDirectionality(this);

    switch (key) {
      case "ArrowRight":
        return directionality === "rtl"
          ? Math.max(0, currentIndex - 1)
          : Math.min(lastIndex, currentIndex + 1);
      case "ArrowLeft":
        return directionality === "rtl"
          ? Math.min(lastIndex, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      case "Home":
        return 0;
      case "End":
        return lastIndex;
      default:
        return null;
    }
  }
}

class AurasTree extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  constructor() {
    super();

    this._tree = null;
    this._entries = [];
    this._entriesByValue = new Map();
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
      const firstEntry = this._getVisibleEntries()[0] ?? this._entries[0];
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
        this._getVisibleEntries()[0];

    activeEntry?.node.focus();
  }

  expand(value) {
    const entry = this._entriesByValue.get(value);
    if (!entry || !entry.group) {
      return false;
    }

    this._expandAncestors(entry);
    return this._setExpanded(entry, true, {
      dispatchSelection: false,
      focusNode: false,
    });
  }

  collapse(value) {
    const entry = this._entriesByValue.get(value);
    if (!entry || !entry.group) {
      return false;
    }

    return this._setExpanded(entry, false, {
      dispatchSelection: true,
      focusNode: false,
    });
  }

  toggle(value) {
    const entry = this._entriesByValue.get(value);
    if (!entry || !entry.group) {
      return false;
    }

    return this._setExpanded(entry, !this._isExpanded(entry), {
      dispatchSelection: true,
      focusNode: false,
    });
  }

  _connect() {
    this._disconnect();

    const tree = this.querySelector(TREE_SELECTOR);
    if (!tree) {
      return;
    }

    const panelsByValue = new Map();
    for (const panel of this.querySelectorAll(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries = this._collectEntries(tree, panelsByValue);
    if (entries.length === 0) {
      return;
    }

    this._tree = tree;
    this._entries = entries;
    this._entriesByValue = new Map(
      entries.map((entry) => [entry.value, entry]),
    );

    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "group");
    }

    tree.setAttribute("role", "tree");
    tree.setAttribute("aria-orientation", "vertical");
    this.toggleAttribute(
      "data-has-panels",
      entries.some((entry) => entry.panel !== null),
    );
    this.toggleAttribute(
      "data-has-branches",
      entries.some((entry) => entry.group !== null),
    );

    for (const entry of entries) {
      this._applyEntrySemantics(entry);
      this._syncExpandedState(entry, this._isExpanded(entry));
    }

    tree.addEventListener("click", this._handleClick);
    tree.addEventListener("keydown", this._handleKeydown);

    this._normalizeActivationAttribute();

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      const firstEntry = this._getVisibleEntries()[0] ?? entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, { dispatch: false, focus: false });
      }
    }

    this.setAttribute("hydrated", "");
  }

  _disconnect() {
    if (this._tree) {
      this._tree.removeEventListener("click", this._handleClick);
      this._tree.removeEventListener("keydown", this._handleKeydown);
    }

    this._tree = null;
    this._entries = [];
    this._entriesByValue = new Map();
    this.removeAttribute("data-has-panels");
    this.removeAttribute("data-has-branches");
    this.removeAttribute("hydrated");
  }

  _collectEntries(container, panelsByValue, parentValue = null, level = 1) {
    const entries = [];
    const directItems = getDirectChildElements(container, ITEM_SELECTOR);
    const setSize = directItems.length;

    for (const [index, item] of directItems.entries()) {
      const value = item.getAttribute("data-value");
      const node = getDirectChildElement(item, NODE_SELECTOR);
      if (!value || !node) {
        continue;
      }

      const group = getDirectChildElement(item, GROUP_SELECTOR);
      const directChildren = group
        ? getDirectChildElements(group, ITEM_SELECTOR)
        : [];
      const toggle = getDirectChildElement(item, TOGGLE_SELECTOR);

      const entry = {
        value,
        item,
        node,
        toggle,
        group,
        panel: panelsByValue.get(value) ?? null,
        parentValue,
        childValues: directChildren
          .map((child) => child.getAttribute("data-value"))
          .filter(Boolean),
        level,
        positionInSet: index + 1,
        setSize,
      };

      if (group) {
        item.setAttribute("data-branch", "");
      } else {
        item.removeAttribute("data-branch");
        item.removeAttribute("data-expanded");
      }

      entries.push(entry);

      if (group) {
        entries.push(
          ...this._collectEntries(group, panelsByValue, value, level + 1),
        );
      }
    }

    return entries;
  }

  _normalizeActivationAttribute() {
    if (this.activation === "manual") {
      this.setAttribute("activation", "manual");
      return;
    }

    this.removeAttribute("activation");
  }

  _applyEntrySemantics(entry) {
    entry.item.setAttribute("data-level", String(entry.level));
    entry.node.setAttribute("role", "treeitem");
    entry.node.setAttribute(
      "id",
      ensureElementId(entry.node, "auras-tree-node"),
    );
    entry.node.setAttribute("aria-level", String(entry.level));
    entry.node.setAttribute("aria-setsize", String(entry.setSize));
    entry.node.setAttribute("aria-posinset", String(entry.positionInSet));
    entry.node.setAttribute("aria-selected", "false");

    const controlIds = [];

    if (entry.group) {
      const groupId = ensureElementId(entry.group, "auras-tree-group");
      entry.group.setAttribute("role", "group");
      controlIds.push(groupId);

      entry.node.setAttribute("aria-expanded", "false");

      if (entry.toggle) {
        entry.toggle.setAttribute(
          "id",
          ensureElementId(entry.toggle, "auras-tree-toggle"),
        );
        entry.toggle.setAttribute("aria-controls", groupId);
        entry.toggle.setAttribute("aria-expanded", "false");
        entry.toggle.tabIndex = -1;
      }
    }

    if (entry.panel) {
      entry.panel.setAttribute("role", "region");
      entry.panel.setAttribute(
        "aria-labelledby",
        ensureElementId(entry.node, "auras-tree-node"),
      );
      controlIds.push(ensureElementId(entry.panel, "auras-tree-panel"));
    }

    if (controlIds.length > 0) {
      entry.node.setAttribute("aria-controls", controlIds.join(" "));
    }
  }

  _selectFromAttribute(options) {
    const value = this.getAttribute("value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  _select(value, options) {
    const entry = this._entriesByValue.get(value);
    if (!entry) {
      return false;
    }

    this._expandAncestors(entry);

    const previousValue = this.getAttribute("value");
    const didChange = previousValue !== entry.value;

    for (const currentEntry of this._entries) {
      const isActive = currentEntry === entry;

      currentEntry.node.tabIndex = isActive ? 0 : -1;
      currentEntry.node.toggleAttribute("data-active", isActive);
      currentEntry.item.toggleAttribute("data-active", isActive);
      currentEntry.node.setAttribute("aria-selected", String(isActive));

      if (currentEntry.panel) {
        currentEntry.panel.hidden = !isActive;
        currentEntry.panel.toggleAttribute("data-active", isActive);
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
        new CustomEvent("auras-change", {
          detail: {
            value: entry.value,
            item: entry.item,
            node: entry.node,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  _expandAncestors(entry) {
    let currentParentValue = entry.parentValue;

    while (currentParentValue) {
      const parentEntry = this._entriesByValue.get(currentParentValue);
      if (!parentEntry) {
        break;
      }

      this._syncExpandedState(parentEntry, true);
      currentParentValue = parentEntry.parentValue;
    }
  }

  _isExpanded(entry) {
    return entry.group ? entry.item.hasAttribute("data-expanded") : false;
  }

  _syncExpandedState(entry, expanded) {
    if (!entry.group) {
      return;
    }

    entry.item.toggleAttribute("data-expanded", expanded);
    entry.group.hidden = !expanded;
    entry.node.setAttribute("aria-expanded", String(expanded));

    if (entry.toggle) {
      entry.toggle.setAttribute("aria-expanded", String(expanded));
    }
  }

  _setExpanded(entry, expanded, options) {
    if (!entry.group || this._isExpanded(entry) === expanded) {
      return false;
    }

    this._syncExpandedState(entry, expanded);

    if (!expanded) {
      const currentValue = this.getAttribute("value");
      if (currentValue) {
        const activeEntry = this._entriesByValue.get(currentValue);
        if (activeEntry && this._isDescendantOf(activeEntry, entry)) {
          this._select(entry.value, {
            dispatch: options.dispatchSelection,
            focus: options.focusNode,
          });
          return true;
        }
      }
    }

    if (options.focusNode) {
      entry.node.focus();
    }

    return true;
  }

  _isDescendantOf(entry, ancestor) {
    let currentParentValue = entry.parentValue;

    while (currentParentValue) {
      if (currentParentValue === ancestor.value) {
        return true;
      }

      currentParentValue =
        this._entriesByValue.get(currentParentValue)?.parentValue ?? null;
    }

    return false;
  }

  _getVisibleEntries() {
    return this._entries.filter((entry) => {
      let currentParentValue = entry.parentValue;

      while (currentParentValue) {
        const parentEntry = this._entriesByValue.get(currentParentValue);
        if (!parentEntry) {
          return false;
        }

        if (parentEntry.group && !this._isExpanded(parentEntry)) {
          return false;
        }

        currentParentValue = parentEntry.parentValue;
      }

      return true;
    });
  }

  _moveFocus(entry) {
    entry.node.focus();

    if (this.activation === "auto") {
      this._select(entry.value, { dispatch: true, focus: false });
    }
  }

  _activateNode(node, options) {
    const entry = this._entries.find((currentEntry) =>
      currentEntry.node === node
    );
    if (!entry) {
      return false;
    }

    return this._select(entry.value, options);
  }

  _isActivationKey(key) {
    return key === "Enter" || key === " ";
  }

  _handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const toggle = target.closest(TOGGLE_SELECTOR);
    if (toggle instanceof HTMLElement && this._tree?.contains(toggle)) {
      if (toggle instanceof HTMLAnchorElement) {
        event.preventDefault();
      }

      const item = toggle.closest(ITEM_SELECTOR);
      const value = item instanceof HTMLElement
        ? item.getAttribute("data-value")
        : null;
      const entry = value ? this._entriesByValue.get(value) : null;
      if (!entry) {
        return;
      }

      this._setExpanded(entry, !this._isExpanded(entry), {
        dispatchSelection: true,
        focusNode: false,
      });
      entry.node.focus();
      return;
    }

    const node = target.closest(NODE_SELECTOR);
    if (!(node instanceof HTMLElement) || !this._tree?.contains(node)) {
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
    if (!(node instanceof HTMLElement) || !this._tree?.contains(node)) {
      return;
    }

    const entry = this._entries.find((currentEntry) =>
      currentEntry.node === node
    );
    if (!entry) {
      return;
    }

    if (this._isActivationKey(event.key)) {
      if (this.activation === "manual") {
        event.preventDefault();
        this._select(entry.value, { dispatch: true, focus: false });
      }
      return;
    }

    const visibleEntries = this._getVisibleEntries();
    const currentIndex = visibleEntries.findIndex(
      (currentEntry) => currentEntry.value === entry.value,
    );
    if (currentIndex < 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        const nextEntry =
          visibleEntries[Math.min(visibleEntries.length - 1, currentIndex + 1)];
        if (!nextEntry || nextEntry === entry) {
          return;
        }

        event.preventDefault();
        this._moveFocus(nextEntry);
        return;
      }
      case "ArrowUp": {
        const previousEntry = visibleEntries[Math.max(0, currentIndex - 1)];
        if (!previousEntry || previousEntry === entry) {
          return;
        }

        event.preventDefault();
        this._moveFocus(previousEntry);
        return;
      }
      case "Home": {
        const firstEntry = visibleEntries[0];
        if (!firstEntry || firstEntry === entry) {
          return;
        }

        event.preventDefault();
        this._moveFocus(firstEntry);
        return;
      }
      case "End": {
        const lastEntry = visibleEntries[visibleEntries.length - 1];
        if (!lastEntry || lastEntry === entry) {
          return;
        }

        event.preventDefault();
        this._moveFocus(lastEntry);
        return;
      }
      case "ArrowRight": {
        const directionality = getDirectionality(this);
        if (directionality === "rtl") {
          this._handleLeftArrow(entry, event);
        } else {
          this._handleRightArrow(entry, event);
        }
        return;
      }
      case "ArrowLeft": {
        const directionality = getDirectionality(this);
        if (directionality === "rtl") {
          this._handleRightArrow(entry, event);
        } else {
          this._handleLeftArrow(entry, event);
        }
      }
    }
  }

  _handleRightArrow(entry, event) {
    if (entry.group && !this._isExpanded(entry)) {
      event.preventDefault();
      this._setExpanded(entry, true, {
        dispatchSelection: false,
        focusNode: false,
      });
      return;
    }

    const firstChildValue = entry.childValues[0];
    const firstChildEntry = firstChildValue
      ? this._entriesByValue.get(firstChildValue)
      : null;
    if (!firstChildEntry) {
      return;
    }

    event.preventDefault();
    this._moveFocus(firstChildEntry);
  }

  _handleLeftArrow(entry, event) {
    if (entry.group && this._isExpanded(entry)) {
      event.preventDefault();
      this._setExpanded(entry, false, {
        dispatchSelection: true,
        focusNode: false,
      });
      return;
    }

    if (!entry.parentValue) {
      return;
    }

    const parentEntry = this._entriesByValue.get(entry.parentValue);
    if (!parentEntry) {
      return;
    }

    event.preventDefault();
    this._moveFocus(parentEntry);
  }
}

class AurasSplitter extends HTMLElement {
  static observedAttributes = ["value", "orientation", "min", "max", "step"];

  constructor() {
    super();

    this._primaryPane = null;
    this._secondaryPane = null;
    this._separator = null;
    this._value = 50;
    this._dragging = false;
    this._rafId = 0;
    this._syncingValue = false;
    this._syncingOrientation = false;

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  connectedCallback() {
    upgradeProperty(this, "value");
    upgradeProperty(this, "orientation");
    upgradeProperty(this, "min");
    upgradeProperty(this, "max");
    upgradeProperty(this, "step");
    this._connect();
  }

  disconnectedCallback() {
    this._disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (name === "orientation") {
      if (this._syncingOrientation) {
        return;
      }

      this._syncOrientationAttribute();
      this._applyState({ dispatch: false });
      return;
    }

    if (name === "value" && this._syncingValue) {
      return;
    }

    this._applyState({ dispatch: false });
  }

  get value() {
    return this._value;
  }

  set value(value) {
    if (value == null || value === "") {
      this.removeAttribute("value");
      return;
    }

    this.setAttribute("value", String(value));
  }

  get orientation() {
    return normalizeSplitterOrientation(this.getAttribute("orientation"));
  }

  set orientation(value) {
    if (normalizeSplitterOrientation(value) === "horizontal") {
      this.removeAttribute("orientation");
      return;
    }

    this.setAttribute("orientation", "vertical");
  }

  get min() {
    return this._getBounds().min;
  }

  get max() {
    return this._getBounds().max;
  }

  get step() {
    return this._getBounds().step;
  }

  setPosition(value) {
    return this._setValue(value, { dispatch: true });
  }

  focusHandle() {
    this._separator?.focus();
  }

  _connect() {
    this._disconnect();

    const primaryPane = this.querySelector(PRIMARY_PANE_SELECTOR);
    const secondaryPane = this.querySelector(SECONDARY_PANE_SELECTOR);
    const separator = this.querySelector(SEPARATOR_SELECTOR);

    if (!primaryPane || !secondaryPane || !separator) {
      return;
    }

    this._primaryPane = primaryPane;
    this._secondaryPane = secondaryPane;
    this._separator = separator;

    this._applySemantics();
    separator.addEventListener("mousedown", this._handleMouseDown);
    separator.addEventListener("keydown", this._handleKeydown);

    this._syncOrientationAttribute();
    this._applyState({ dispatch: false });

    this.setAttribute("hydrated", "");
  }

  _disconnect() {
    this._stopDragging();

    if (this._separator) {
      this._separator.removeEventListener("mousedown", this._handleMouseDown);
      this._separator.removeEventListener("keydown", this._handleKeydown);
    }

    this._primaryPane = null;
    this._secondaryPane = null;
    this._separator = null;
    this._dragging = false;
    this.removeAttribute("data-dragging");
    this.removeAttribute("hydrated");
  }

  _applySemantics() {
    if (!this._primaryPane || !this._secondaryPane || !this._separator) {
      return;
    }

    const primaryId = ensureElementId(this._primaryPane, "auras-splitter-pane");
    const secondaryId = ensureElementId(
      this._secondaryPane,
      "auras-splitter-pane",
    );

    this._separator.setAttribute("role", "separator");
    this._separator.setAttribute(
      "aria-controls",
      `${primaryId} ${secondaryId}`,
    );

    if (!this._separator.hasAttribute("tabindex")) {
      this._separator.tabIndex = 0;
    }
  }

  _syncOrientationAttribute() {
    const orientation = this.orientation;

    this._syncingOrientation = true;
    if (orientation === "horizontal") {
      this.removeAttribute("orientation");
    } else {
      this.setAttribute("orientation", "vertical");
    }
    this._syncingOrientation = false;
  }

  _applyState(options) {
    if (!this._separator) {
      return;
    }

    const nextValue = this._resolveValue();
    this._setValue(nextValue, options);

    this._separator.setAttribute("aria-orientation", this.orientation);
  }

  _resolveValue() {
    const bounds = this._getBounds();
    return clampSplitterPercent(
      parseSplitterNumber(this.getAttribute("value"), 50),
      bounds.min,
      bounds.max,
    );
  }

  _getBounds() {
    const min = clampSplitterPercent(
      parseSplitterNumber(this.getAttribute("min"), 20),
      0,
      95,
    );
    const max = clampSplitterPercent(
      parseSplitterNumber(this.getAttribute("max"), 80),
      min + 1,
      100,
    );
    const step = clampSplitterPercent(
      parseSplitterNumber(this.getAttribute("step"), 5),
      1,
      25,
    );

    return { min, max, step };
  }

  _setValue(nextValue, options) {
    if (!this._separator) {
      return false;
    }

    const bounds = this._getBounds();
    const normalizedValue = clampSplitterPercent(
      nextValue,
      bounds.min,
      bounds.max,
    );
    const didChange = normalizedValue !== this._value;

    this._value = normalizedValue;
    this.style.setProperty("--splitter-primary-size", `${normalizedValue}%`);

    const currentAttribute = this.getAttribute("value");
    const nextAttribute = String(normalizedValue);
    if (currentAttribute !== nextAttribute) {
      this._syncingValue = true;
      this.setAttribute("value", nextAttribute);
      this._syncingValue = false;
    }

    this._separator.setAttribute("aria-valuemin", String(bounds.min));
    this._separator.setAttribute("aria-valuemax", String(bounds.max));
    this._separator.setAttribute("aria-valuenow", nextAttribute);

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
          detail: {
            value: normalizedValue,
            separator: this._separator,
            primaryPane: this._primaryPane,
            secondaryPane: this._secondaryPane,
          },
          bubbles: true,
        }),
      );
    }

    return didChange;
  }

  _handleMouseDown(event) {
    if (!(event.currentTarget instanceof HTMLElement) || event.button !== 0) {
      return;
    }

    event.preventDefault();
    this._dragging = true;
    this.setAttribute("data-dragging", "");

    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
  }

  _handleMouseMove(event) {
    if (!this._dragging) {
      return;
    }

    const position = this._positionFromPointer(event);
    if (typeof requestAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        this._setValue(position, { dispatch: true });
      });
    } else {
      this._setValue(position, { dispatch: true });
    }
  }

  _handleMouseUp() {
    this._stopDragging();
  }

  _stopDragging() {
    if (!this._dragging) {
      return;
    }

    this._dragging = false;
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
    }
    this.removeAttribute("data-dragging");
    document.removeEventListener("mousemove", this._handleMouseMove);
    document.removeEventListener("mouseup", this._handleMouseUp);
  }

  _positionFromPointer(event) {
    const rect = this.getBoundingClientRect();

    if (this.orientation === "vertical") {
      const offset = event.clientY - rect.top;
      return (offset / rect.height) * 100;
    }

    const offset = event.clientX - rect.left;
    return (offset / rect.width) * 100;
  }

  _handleKeydown(event) {
    if (!(event.currentTarget instanceof HTMLElement) || !this._separator) {
      return;
    }

    const step = this.step;

    switch (event.key) {
      case "ArrowLeft":
        if (this.orientation !== "horizontal") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value - step, { dispatch: true });
        return;
      case "ArrowRight":
        if (this.orientation !== "horizontal") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value + step, { dispatch: true });
        return;
      case "ArrowUp":
        if (this.orientation !== "vertical") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value - step, { dispatch: true });
        return;
      case "ArrowDown":
        if (this.orientation !== "vertical") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value + step, { dispatch: true });
        return;
      case "Home":
        event.preventDefault();
        this._setValue(this.min, { dispatch: true });
        return;
      case "End":
        event.preventDefault();
        this._setValue(this.max, { dispatch: true });
        return;
      default:
        return;
    }
  }
}

function normalizeSplitterOrientation(value) {
  return value === "vertical" ? "vertical" : "horizontal";
}

function parseSplitterNumber(value, fallbackValue) {
  if (value == null || value === "") {
    return fallbackValue;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return parsedValue;
}

function clampSplitterPercent(value, min, max) {
  return Math.round(Math.min(max, Math.max(min, value)));
}

function registerAurasCombobox() {
  if (!customElements.get(AURAS_COMBOBOX_TAG_NAME)) {
    customElements.define(AURAS_COMBOBOX_TAG_NAME, AurasCombobox);
  }

  return AurasCombobox;
}

function registerAurasSplitter() {
  if (!customElements.get(AURAS_SPLITTER_TAG_NAME)) {
    customElements.define(AURAS_SPLITTER_TAG_NAME, AurasSplitter);
  }

  return AurasSplitter;
}

function registerAurasMasterDetail() {
  if (!customElements.get(AURAS_MASTER_DETAIL_TAG_NAME)) {
    customElements.define(AURAS_MASTER_DETAIL_TAG_NAME, AurasMasterDetail);
  }

  return AurasMasterDetail;
}

function registerAurasTabs() {
  if (!customElements.get(AURAS_TABS_TAG_NAME)) {
    customElements.define(AURAS_TABS_TAG_NAME, AurasTabs);
  }

  return AurasTabs;
}

function registerAurasTree() {
  if (!customElements.get(AURAS_TREE_TAG_NAME)) {
    customElements.define(AURAS_TREE_TAG_NAME, AurasTree);
  }

  return AurasTree;
}

function registerAurasComponents() {
  registerAurasCombobox();
  registerAurasMasterDetail();
  registerAurasSplitter();
  registerAurasTree();
  registerAurasTabs();
}

registerAurasComponents();

export {
  AURAS_COMBOBOX_TAG_NAME,
  AURAS_MASTER_DETAIL_TAG_NAME,
  AURAS_SPLITTER_TAG_NAME,
  AURAS_TABS_TAG_NAME,
  AURAS_TREE_TAG_NAME,
  AurasCombobox,
  AurasMasterDetail,
  AurasSplitter,
  AurasTabs,
  AurasTree,
  registerAurasCombobox,
  registerAurasComponents,
  registerAurasMasterDetail,
  registerAurasSplitter,
  registerAurasTabs,
  registerAurasTree,
};
