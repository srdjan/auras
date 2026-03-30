import { AurasElement } from "../../../shared/auras-element.ts";
import {
  ensureElementId,
  isActivationKey,
  normalizeActivation,
} from "../../../shared/utilities.ts";

const TRIGGER_SELECTOR = '[data-part="trigger"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

const REDUCED_MOTION_QUERY =
  typeof matchMedia === "function"
    ? matchMedia("(prefers-reduced-motion: no-preference)")
    : null;

type SelectionOptions = {
  dispatch: boolean;
  focus: boolean;
};

export type AurasSelectableEntry = {
  value: string;
  trigger: HTMLElement;
  panel: HTMLElement;
};

export class AurasSelectablePanelsElement extends AurasElement {
  static override props = {
    value: { type: "string" as const },
    activation: {
      type: "string" as const,
      normalize: normalizeActivation,
    },
  };

  declare value: string | null;
  declare activation: "auto" | "manual";

  protected _container: HTMLElement | null = null;
  protected _entries: AurasSelectableEntry[] = [];

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

  protected override onConnect(): void | false {
    this._disconnectInternal();

    const containerSelector = this._getContainerSelector();
    const panelRootSelector = this._getPanelRootSelector();
    const container = containerSelector
      ? this.querySelector<HTMLElement>(containerSelector)
      : null;
    const panelRoot = panelRootSelector
      ? this.querySelector<HTMLElement>(panelRootSelector)
      : this;

    if (!container || !panelRoot) {
      return false;
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

    const entries: AurasSelectableEntry[] = [];
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
      return false;
    }

    this._container = container;
    this._entries = entries;

    this._setContainerSemantics(container);

    container.addEventListener("click", this._handleClick);
    container.addEventListener("keydown", this._handleKeydown);

    this._normalizeNormalizedProp("activation");

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      this._select(entries[0].value, { dispatch: false, focus: false });
    }
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

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, { dispatch: false, focus: false });
      }
    }
  }

  protected _getContainerSelector(): string | null {
    return null;
  }

  protected _getPanelRootSelector(): string | null {
    return null;
  }

  protected _getPanelIdPrefix(): string {
    return "auras-panel";
  }

  protected _setContainerSemantics(_container: HTMLElement): void {}

  protected _applyEntrySemantics(_entry: AurasSelectableEntry): void {}

  protected _applySelectionState(
    _entry: AurasSelectableEntry,
    _isActive: boolean,
  ): void {}

  protected _getNextIndex(
    _currentIndex: number,
    _key: string,
  ): number | null {
    return null;
  }

  private _disconnectInternal(): void {
    if (this._container) {
      this._container.removeEventListener("click", this._handleClick);
      this._container.removeEventListener("keydown", this._handleKeydown);
    }

    this._container = null;
    this._entries = [];
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

    const applySelection = () => {
      for (const currentEntry of this._entries) {
        const isActive = currentEntry === entry;

        currentEntry.trigger.tabIndex = isActive ? 0 : -1;
        currentEntry.trigger.toggleAttribute("data-active", isActive);
        currentEntry.panel.hidden = !isActive;
        currentEntry.panel.toggleAttribute("data-active", isActive);

        this._applySelectionState(currentEntry, isActive);
      }

      this._syncAttribute("value", entry.value);
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

    if (isActivationKey(event.key)) {
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
