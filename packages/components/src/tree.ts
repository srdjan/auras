import {
  ensureElementId,
  getDirectionality,
  normalizeActivation,
  upgradeProperty,
} from "./shared/selectable-panels.ts";

const TREE_SELECTOR = '[data-part="tree"]';
const ITEM_SELECTOR = '[data-part="item"][data-value]';
const NODE_SELECTOR = '[data-part="node"]';
const TOGGLE_SELECTOR = '[data-part="toggle"]';
const GROUP_SELECTOR = '[data-part="group"]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

type AuraActivation = "auto" | "manual";

type SelectionOptions = {
  dispatch: boolean;
  focus: boolean;
};

type ExpansionOptions = {
  dispatchSelection: boolean;
  focusNode: boolean;
};

export type AuraTreeEntry = {
  value: string;
  item: HTMLElement;
  node: HTMLElement;
  toggle: HTMLElement | null;
  group: HTMLElement | null;
  panel: HTMLElement | null;
  parentValue: string | null;
  childValues: string[];
  level: number;
  positionInSet: number;
  setSize: number;
};

function getDirectChildElements(
  container: HTMLElement,
  selector: string,
): HTMLElement[] {
  return Array.from(container.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && child.matches(selector)
  );
}

function getDirectChildElement(
  container: HTMLElement,
  selector: string,
): HTMLElement | null {
  return (
    Array.from(container.children).find((child): child is HTMLElement =>
      child instanceof HTMLElement && child.matches(selector)
    ) ?? null
  );
}

function isNativeInteractiveElement(node: HTMLElement): boolean {
  return (
    node instanceof HTMLButtonElement ||
    node instanceof HTMLAnchorElement ||
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

export const AURA_TREE_TAG_NAME = "aura-tree";

export class AuraTree extends HTMLElement {
  static observedAttributes = ["value", "activation"];

  private _tree: HTMLElement | null = null;
  private _entries: AuraTreeEntry[] = [];
  private _entriesByValue = new Map<string, AuraTreeEntry>();
  private _syncingValue = false;

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
      const firstEntry = this._getVisibleEntries()[0] ?? this._entries[0];
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
      this._entries.find((entry) => entry.node.hasAttribute("data-active")) ??
        this._getVisibleEntries()[0];

    activeEntry?.node.focus();
  }

  expand(value: string): boolean {
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

  collapse(value: string): boolean {
    const entry = this._entriesByValue.get(value);
    if (!entry || !entry.group) {
      return false;
    }

    return this._setExpanded(entry, false, {
      dispatchSelection: true,
      focusNode: false,
    });
  }

  toggle(value: string): boolean {
    const entry = this._entriesByValue.get(value);
    if (!entry || !entry.group) {
      return false;
    }

    return this._setExpanded(entry, !this._isExpanded(entry), {
      dispatchSelection: true,
      focusNode: false,
    });
  }

  private _connect(): void {
    this._disconnect();

    const tree = this.querySelector<HTMLElement>(TREE_SELECTOR);
    if (!tree) {
      return;
    }

    const panelsByValue = new Map<string, HTMLElement>();
    for (const panel of this.querySelectorAll<HTMLElement>(PANEL_SELECTOR)) {
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
  }

  private _disconnect(): void {
    if (this._tree) {
      this._tree.removeEventListener("click", this._handleClick);
      this._tree.removeEventListener("keydown", this._handleKeydown);
    }

    this._tree = null;
    this._entries = [];
    this._entriesByValue = new Map();
    this.removeAttribute("data-has-panels");
    this.removeAttribute("data-has-branches");
  }

  private _collectEntries(
    container: HTMLElement,
    panelsByValue: Map<string, HTMLElement>,
    parentValue: string | null = null,
    level = 1,
  ): AuraTreeEntry[] {
    const entries: AuraTreeEntry[] = [];
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

      const entry: AuraTreeEntry = {
        value,
        item,
        node,
        toggle,
        group,
        panel: panelsByValue.get(value) ?? null,
        parentValue,
        childValues: directChildren
          .map((child) => child.getAttribute("data-value"))
          .filter((childValue): childValue is string => Boolean(childValue)),
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

  private _normalizeActivationAttribute(): void {
    if (this.activation === "manual") {
      this.setAttribute("activation", "manual");
      return;
    }

    this.removeAttribute("activation");
  }

  private _applyEntrySemantics(entry: AuraTreeEntry): void {
    entry.item.setAttribute("data-level", String(entry.level));

    if (
      !isNativeInteractiveElement(entry.node) &&
      !entry.node.hasAttribute("role")
    ) {
      entry.node.setAttribute("role", "treeitem");
    } else {
      entry.node.setAttribute("role", "treeitem");
    }

    entry.node.setAttribute(
      "id",
      ensureElementId(entry.node, "aura-tree-node"),
    );
    entry.node.setAttribute("aria-level", String(entry.level));
    entry.node.setAttribute("aria-setsize", String(entry.setSize));
    entry.node.setAttribute("aria-posinset", String(entry.positionInSet));
    entry.node.setAttribute("aria-selected", "false");

    const controlIds: string[] = [];

    if (entry.group) {
      const groupId = ensureElementId(entry.group, "aura-tree-group");
      entry.group.setAttribute("role", "group");
      controlIds.push(groupId);

      entry.node.setAttribute("aria-expanded", "false");

      if (entry.toggle) {
        entry.toggle.setAttribute(
          "id",
          ensureElementId(entry.toggle, "aura-tree-toggle"),
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
        ensureElementId(entry.node, "aura-tree-node"),
      );
      controlIds.push(ensureElementId(entry.panel, "aura-tree-panel"));
    }

    if (controlIds.length > 0) {
      entry.node.setAttribute("aria-controls", controlIds.join(" "));
    }
  }

  private _selectFromAttribute(options: SelectionOptions): boolean {
    const value = this.getAttribute("value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  private _select(value: string, options: SelectionOptions): boolean {
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
        new CustomEvent("aura-change", {
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

  private _expandAncestors(entry: AuraTreeEntry): void {
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

  private _isExpanded(entry: AuraTreeEntry): boolean {
    return entry.group ? entry.item.hasAttribute("data-expanded") : false;
  }

  private _syncExpandedState(entry: AuraTreeEntry, expanded: boolean): void {
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

  private _setExpanded(
    entry: AuraTreeEntry,
    expanded: boolean,
    options: ExpansionOptions,
  ): boolean {
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

  private _isDescendantOf(
    entry: AuraTreeEntry,
    ancestor: AuraTreeEntry,
  ): boolean {
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

  private _getVisibleEntries(): AuraTreeEntry[] {
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

  private _moveFocus(entry: AuraTreeEntry): void {
    entry.node.focus();

    if (this.activation === "auto") {
      this._select(entry.value, { dispatch: true, focus: false });
    }
  }

  private _activateNode(
    node: HTMLElement,
    options: SelectionOptions,
  ): boolean {
    const entry = this._entries.find((currentEntry) =>
      currentEntry.node === node
    );
    if (!entry) {
      return false;
    }

    return this._select(entry.value, options);
  }

  private _isActivationKey(key: string): boolean {
    return key === "Enter" || key === " ";
  }

  private _handleClick(event: Event): void {
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

  private _handleKeydown(event: KeyboardEvent): void {
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
    const currentIndex = visibleEntries.findIndex((currentEntry) =>
      currentEntry.value === entry.value
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

  private _handleRightArrow(entry: AuraTreeEntry, event: KeyboardEvent): void {
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

  private _handleLeftArrow(entry: AuraTreeEntry, event: KeyboardEvent): void {
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

export function registerAuraTree(): typeof AuraTree {
  if (!customElements.get(AURA_TREE_TAG_NAME)) {
    customElements.define(AURA_TREE_TAG_NAME, AuraTree);
  }

  return AuraTree;
}
