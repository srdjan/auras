const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

type AuraActivation = "auto" | "manual";
type SelectionOptions = {
  dispatch: boolean;
  focus: boolean;
};

export type AuraSelectableEntry = {
  value: string;
  trigger: HTMLElement;
  panel: HTMLElement;
};

let generatedIdSequence = 0;

export function normalizeActivation(
  value: string | null | undefined,
): AuraActivation {
  return value === "manual" ? "manual" : "auto";
}

export function getDirectionality(node: Element): "ltr" | "rtl" {
  if (node.closest('[dir="rtl"]') || document.documentElement.dir === "rtl") {
    return "rtl";
  }

  return "ltr";
}

export function ensureElementId(element: HTMLElement, prefix: string): string {
  if (element.id) {
    return element.id;
  }

  generatedIdSequence += 1;
  element.id = `${prefix}-${generatedIdSequence}`;
  return element.id;
}

export function upgradeProperty<T extends object, K extends keyof T>(
  node: T,
  name: K,
): void {
  if (!Object.prototype.hasOwnProperty.call(node, name)) {
    return;
  }

  const value = node[name];
  delete node[name];
  node[name] = value;
}

export class AuraSelectablePanelsElement extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  protected _container: HTMLElement | null = null;
  protected _entries: AuraSelectableEntry[] = [];
  protected _syncingValue = false;

  constructor() {
    super();

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  connectedCallback(): void {
    upgradeProperty(this, "value");
    upgradeProperty(this, "activation");
    this._connect();
  }

  disconnectedCallback(): void {
    this._disconnect();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
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

  get value(): string | null {
    return this.getAttribute("value");
  }

  set value(value: string | null) {
    if (value == null || value === "") {
      this.removeAttribute("value");
      return;
    }

    this.setAttribute("value", String(value));
  }

  get activation(): AuraActivation {
    return normalizeActivation(this.getAttribute("activation"));
  }

  set activation(value: AuraActivation | string | null) {
    const normalizedValue = normalizeActivation(value);
    if (normalizedValue === "auto") {
      this.removeAttribute("activation");
      return;
    }

    this.setAttribute("activation", normalizedValue);
  }

  show(value: string): boolean {
    return this._select(value, { dispatch: true, focus: false });
  }

  focusCurrent(): void {
    const activeEntry =
      this._entries.find((entry) =>
        entry.trigger.hasAttribute("data-active")
      ) || this._entries[0];

    activeEntry?.trigger.focus();
  }

  protected _getContainerSelector(): string | null {
    return null;
  }

  protected _getPanelRootSelector(): string | null {
    return null;
  }

  protected _getPanelIdPrefix(): string {
    return "aura-panel";
  }

  protected _setContainerSemantics(_container: HTMLElement): void {}

  protected _applyEntrySemantics(_entry: AuraSelectableEntry): void {}

  protected _applySelectionState(
    _entry: AuraSelectableEntry,
    _isActive: boolean,
  ): void {}

  protected _getNextIndex(
    _currentIndex: number,
    _key: string,
  ): number | null {
    return null;
  }

  protected _connect(): void {
    this._disconnect();

    const containerSelector = this._getContainerSelector();
    const panelRootSelector = this._getPanelRootSelector();
    const container = containerSelector
      ? this.querySelector<HTMLElement>(containerSelector)
      : null;
    const panelRoot = panelRootSelector
      ? this.querySelector<HTMLElement>(panelRootSelector)
      : this;

    if (!container || !panelRoot) {
      return;
    }

    const panelsByValue = new Map<string, HTMLElement>();
    for (
      const panel of panelRoot.querySelectorAll<HTMLElement>(PANEL_SELECTOR)
    ) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries: AuraSelectableEntry[] = [];
    for (
      const trigger of container.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR)
    ) {
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

  protected _disconnect(): void {
    if (this._container) {
      this._container.removeEventListener("click", this._handleClick);
      this._container.removeEventListener("keydown", this._handleKeydown);
    }

    this._container = null;
    this._entries = [];
  }

  protected _normalizeActivationAttribute(): void {
    if (this.activation === "manual") {
      this.setAttribute("activation", "manual");
      return;
    }

    this.removeAttribute("activation");
  }

  protected _selectFromAttribute(options: SelectionOptions): boolean {
    const value = this.getAttribute("value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  protected _select(value: string, options: SelectionOptions): boolean {
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

  protected _activateTrigger(
    trigger: HTMLElement,
    options: SelectionOptions,
  ): boolean {
    const value = trigger.getAttribute("data-value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  protected _isActivationKey(key: string): boolean {
    return key === "Enter" || key === " ";
  }

  protected _handleClick(event: Event): void {
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

  protected _handleKeydown(event: KeyboardEvent): void {
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
