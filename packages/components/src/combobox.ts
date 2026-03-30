import { AurasElement } from "../../shared/auras-element.ts";
import {
  ensureElementId,
  normalizeActivation,
} from "../../shared/utilities.ts";

const INPUT_SELECTOR = '[data-part="input"]';
const TOGGLE_SELECTOR = '[data-part="toggle"]';
const VALUE_INPUT_SELECTOR = 'input[data-part="value"]';
const LISTBOX_SELECTOR = '[data-part="listbox"]';
const OPTION_SELECTOR = '[data-part="option"][data-value]';
const EMPTY_SELECTOR = '[data-part="empty"]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

type SelectionOptions = {
  dispatch: boolean;
  closeListbox: boolean;
  focusInput: boolean;
  syncInput: boolean;
};

type AurasComboboxEntry = {
  value: string;
  label: string;
  searchText: string;
  option: HTMLElement;
  panel: HTMLElement | null;
};

export const AURAS_COMBOBOX_TAG_NAME = "auras-combobox";

export class AurasCombobox extends AurasElement {
  static override props = {
    value: { type: "string" as const },
    activation: {
      type: "string" as const,
      normalize: normalizeActivation,
    },
    open: { type: "boolean" as const },
  };

  declare value: string | null;
  declare activation: "auto" | "manual";
  declare open: boolean;

  private _input: HTMLInputElement | null = null;
  private _toggle: HTMLElement | null = null;
  private _listbox: HTMLElement | null = null;
  private _emptyState: HTMLElement | null = null;
  private _valueInput: HTMLInputElement | null = null;
  private _entries: AurasComboboxEntry[] = [];
  private _entriesByValue = new Map<string, AurasComboboxEntry>();
  private _activeValue: string | null = null;
  private _isQuerying = false;
  private _popoverSupported = false;

  show(value: string): boolean {
    return this._select(value, {
      dispatch: true,
      closeListbox: true,
      focusInput: false,
      syncInput: true,
    });
  }

  focusCurrent(): void {
    this._input?.focus();
  }

  openListbox(): boolean {
    if (!this._listbox || this.open) {
      return false;
    }

    this._applyOpenState(true, { restoreInput: false });
    this._syncToggleAttribute("open", true);
    return true;
  }

  closeListbox(): boolean {
    if (!this._listbox || !this.open) {
      return false;
    }

    this._applyOpenState(false, { restoreInput: true });
    this._syncToggleAttribute("open", false);
    return true;
  }

  toggleListbox(): boolean {
    return this.open ? this.closeListbox() : this.openListbox();
  }

  protected override onConnect(): void | false {
    this._disconnectInternal();

    const input = this.querySelector<HTMLInputElement>(INPUT_SELECTOR);
    const listbox = this.querySelector<HTMLElement>(LISTBOX_SELECTOR);

    if (!input || !listbox) {
      return false;
    }

    const toggle = this.querySelector<HTMLElement>(TOGGLE_SELECTOR);
    const emptyState = this.querySelector<HTMLElement>(EMPTY_SELECTOR);
    const valueInput = this.querySelector<HTMLInputElement>(
      VALUE_INPUT_SELECTOR,
    );

    const panelsByValue = new Map<string, HTMLElement>();
    for (const panel of this.querySelectorAll<HTMLElement>(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries: AurasComboboxEntry[] = [];
    const seenValues = new Set<string>();
    for (
      const option of listbox.querySelectorAll<HTMLElement>(OPTION_SELECTOR)
    ) {
      const value = option.getAttribute("data-value");
      if (!value || seenValues.has(value)) {
        continue;
      }
      seenValues.add(value);

      const label = option.getAttribute("data-label")?.trim() ||
        option.textContent?.trim() || value;

      const entry: AurasComboboxEntry = {
        value,
        label,
        searchText: label.toLocaleLowerCase(),
        option,
        panel: panelsByValue.get(value) ?? null,
      };

      entries.push(entry);
    }

    if (entries.length === 0) {
      return false;
    }

    this._input = input;
    this._toggle = toggle;
    this._listbox = listbox;
    this._emptyState = emptyState;
    this._valueInput = valueInput;
    this._entries = entries;
    this._entriesByValue = new Map(
      entries.map((entry) => [entry.value, entry]),
    );
    this._activeValue = null;
    this._isQuerying = false;

    this._applySemantics();

    this._popoverSupported = "popover" in listbox &&
      typeof (listbox as unknown as { showPopover?: unknown }).showPopover ===
        "function";

    this.addEventListener("click", this._handleClick);
    this.addEventListener("keydown", this._handleKeydown);
    this.addEventListener("input", this._handleInput);

    if (this._popoverSupported) {
      listbox.addEventListener("toggle", this._handlePopoverToggle as EventListener);
    } else {
      this.addEventListener("focusout", this._handleFocusOut);
      this.addEventListener("mousedown", this._handleMouseDown);
    }

    this._normalizeNormalizedProp("activation");

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
  }

  protected override onDisconnect(): void {
    this._disconnectInternal();
  }

  protected override onAttributeChange(
    name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    if (name === "activation") {
      this._normalizeNormalizedProp("activation");
      return;
    }

    if (name === "open") {
      this._applyOpenState(this.hasAttribute("open"), {
        restoreInput: !this.hasAttribute("open"),
      });
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

  private _disconnectInternal(): void {
    this.removeEventListener("click", this._handleClick);
    this.removeEventListener("keydown", this._handleKeydown);
    this.removeEventListener("input", this._handleInput);

    if (this._popoverSupported && this._listbox) {
      this._listbox.removeEventListener(
        "toggle",
        this._handlePopoverToggle as EventListener,
      );
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
  }

  private _applySemantics(): void {
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

    this._syncAttribute("value", entry.value);

    if (this._valueInput) {
      this._valueInput.value = entry.value;
    }

    if (options.syncInput) {
      this._commitSelectedLabel(entry);
    }

    if (
      this.open &&
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

  private _commitSelectedLabel(entry: AurasComboboxEntry): void {
    if (!this._input) {
      return;
    }

    this._input.value = entry.label;
    this._isQuerying = false;
  }

  private _restoreSelectedLabel(): void {
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

  private _applyOpenState(
    open: boolean,
    options: { restoreInput: boolean },
  ): void {
    if (!this._input || !this._listbox) {
      return;
    }

    if (!open && options.restoreInput) {
      this._restoreSelectedLabel();
    }

    if (this._popoverSupported) {
      try {
        if (open) {
          (this._listbox as unknown as { showPopover(): void }).showPopover();
        } else {
          (this._listbox as unknown as { hidePopover(): void }).hidePopover();
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

  private _syncOptionVisibility(): void {
    const query = this._getQuery();
    for (const entry of this._entries) {
      entry.option.hidden = !this._isEntryVisible(entry, query);
    }
  }

  private _syncEmptyState(open: boolean): void {
    if (!this._emptyState) {
      return;
    }
    this._emptyState.hidden = !(open && this._getVisibleEntries().length === 0);
  }

  private _getQuery(): string {
    if (!this.open) {
      return "";
    }
    if (!this._isQuerying) {
      return "";
    }
    return this._input?.value.trim().toLocaleLowerCase() ?? "";
  }

  private _isEntryVisible(entry: AurasComboboxEntry, query: string): boolean {
    if (query === "") {
      return true;
    }
    return entry.searchText.includes(query);
  }

  private _getVisibleEntries(): AurasComboboxEntry[] {
    const query = this._getQuery();
    return this._entries.filter((entry) => this._isEntryVisible(entry, query));
  }

  private _setActiveOption(value: string | null): void {
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

  private _moveActive(direction: 1 | -1): void {
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

  private _handleMouseDown(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const option = target.closest(OPTION_SELECTOR);
    if (option instanceof HTMLElement && this.contains(option)) {
      event.preventDefault();
    }
  }

  private _handleClick(event: Event): void {
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

  private _handleInput(event: Event): void {
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

  private _handleKeydown(event: KeyboardEvent): void {
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
            selectedEntry && visibleEntries.includes(selectedEntry)
              ? selectedEntry
              : visibleEntries[0];
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
            selectedEntry && visibleEntries.includes(selectedEntry)
              ? selectedEntry
              : visibleEntries[visibleEntries.length - 1];
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

  private _handlePopoverToggle(event: ToggleEvent): void {
    if (event.newState === "closed" && this.open) {
      this._restoreSelectedLabel();
      this._syncToggleAttribute("open", false);
      this._input?.setAttribute("aria-expanded", "false");
      if (this._toggle) {
        this._toggle.setAttribute("aria-expanded", "false");
      }
      this._setActiveOption(null);
    }
  }

  private _handleFocusOut(): void {
    queueMicrotask(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof Node && this.contains(activeElement)) {
        return;
      }

      this.closeListbox();
    });
  }
}

export function registerAurasCombobox(): typeof AurasCombobox {
  if (!customElements.get(AURAS_COMBOBOX_TAG_NAME)) {
    customElements.define(AURAS_COMBOBOX_TAG_NAME, AurasCombobox);
  }

  return AurasCombobox;
}
