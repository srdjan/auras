import { AurasElement } from "../../shared/auras-element.ts";
import {
  ensureElementId,
  getDirectionality,
  isActivationKey,
  normalizeActivation,
} from "../../shared/utilities.ts";

const SECTION_SELECTOR = '[data-part="section"][data-value]';
const TRIGGER_SELECTOR = '[data-part="trigger"]';
const PANEL_SELECTOR = '[data-part="panel"]';

const REDUCED_MOTION_QUERY =
  typeof matchMedia === "function"
    ? matchMedia("(prefers-reduced-motion: no-preference)")
    : null;

type SectionsMode = "tabs" | "accordion" | "auto";
type ResolvedMode = "tabs" | "accordion";

type SelectionOptions = {
  dispatch: boolean;
  focus: boolean;
};

export type AurasSectionsEntry = {
  value: string;
  section: HTMLElement;
  trigger: HTMLElement;
  panel: HTMLElement;
};

function normalizeMode(value: string | null | undefined): SectionsMode {
  if (value === "tabs") return "tabs";
  if (value === "accordion") return "accordion";
  return "auto";
}

export const AURAS_SECTIONS_TAG_NAME = "auras-sections";

export class AurasSections extends AurasElement {
  static override props = {
    value: { type: "string" as const },
    mode: {
      type: "string" as const,
      normalize: normalizeMode,
    },
    morphAt: {
      type: "number" as const,
      attribute: "morph-at",
    },
    exclusive: { type: "boolean" as const },
    activation: {
      type: "string" as const,
      normalize: normalizeActivation,
    },
  };

  declare value: string | null;
  declare mode: SectionsMode;
  declare morphAt: number;
  declare exclusive: boolean;
  declare activation: "auto" | "manual";

  private _entries: AurasSectionsEntry[] = [];
  private _entriesByValue = new Map<string, AurasSectionsEntry>();
  private _resizeObserver: ResizeObserver | null = null;
  private _resolvedMode: ResolvedMode | null = null;

  show(value: string): boolean {
    return this._select(value, { dispatch: true, focus: false });
  }

  focusCurrent(): void {
    const activeEntry =
      this._entries.find((entry) =>
        entry.trigger.hasAttribute("data-active")
      ) ?? this._entries[0];

    activeEntry?.trigger.focus();
  }

  expand(value: string): boolean {
    if (this._resolvedMode === "tabs") return false;

    const entry = this._entriesByValue.get(value);
    if (!entry) return false;

    return this._setExpanded(entry, true);
  }

  collapse(value: string): boolean {
    if (this._resolvedMode === "tabs") return false;

    const entry = this._entriesByValue.get(value);
    if (!entry) return false;

    return this._setExpanded(entry, false);
  }

  toggle(value: string): boolean {
    if (this._resolvedMode === "tabs") return false;

    const entry = this._entriesByValue.get(value);
    if (!entry) return false;

    return this._setExpanded(entry, !this._isExpanded(entry));
  }

  protected override onConnect(): void | false {
    this._disconnectInternal();

    const entries: AurasSectionsEntry[] = [];

    for (
      const section of this.querySelectorAll<HTMLElement>(SECTION_SELECTOR)
    ) {
      if (section.parentElement !== this) continue;

      const value = section.getAttribute("data-value");
      if (!value) continue;

      const trigger = section.querySelector<HTMLElement>(TRIGGER_SELECTOR);
      const panel = section.querySelector<HTMLElement>(PANEL_SELECTOR);
      if (!trigger || !panel) continue;

      entries.push({ value, section, trigger, panel });
    }

    if (entries.length === 0) return false;

    this._entries = entries;
    this._entriesByValue = new Map(
      entries.map((entry) => [entry.value, entry]),
    );

    this.addEventListener("click", this._handleClick);
    this.addEventListener("keydown", this._handleKeydown);

    this._normalizeNormalizedProp("mode");
    this._normalizeNormalizedProp("activation");

    const resolvedMode = this._resolveMode();
    this._applyMode(resolvedMode);
    this._setupResizeObserver();
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

    if (name === "mode") {
      this._normalizeNormalizedProp("mode");
      this._setupResizeObserver();
      const resolvedMode = this._resolveMode();
      this._transitionMode(resolvedMode);
      return;
    }

    if (name === "morph-at") {
      const resolvedMode = this._resolveMode();
      this._transitionMode(resolvedMode);
      return;
    }

    if (name === "exclusive") {
      if (this.exclusive && this._resolvedMode === "accordion") {
        this._enforceExclusive();
      }
      return;
    }

    if (name === "value") {
      this._selectFromAttribute({ dispatch: false, focus: false });
    }
  }

  private _disconnectInternal(): void {
    this.removeEventListener("click", this._handleClick);
    this.removeEventListener("keydown", this._handleKeydown);

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._resolvedMode = null;
    this._entries = [];
    this._entriesByValue = new Map();

    this.removeAttribute("data-resolved-mode");
  }

  private _resolveMode(): ResolvedMode {
    const declaredMode = this.mode;

    if (declaredMode === "tabs") return "tabs";
    if (declaredMode === "accordion") return "accordion";

    const threshold = this.morphAt || 768;
    const width = this.getBoundingClientRect().width;
    return width >= threshold ? "tabs" : "accordion";
  }

  private _setupResizeObserver(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    if (this.mode !== "auto") return;

    this._resizeObserver = new ResizeObserver((resizeEntries) => {
      const resizeEntry = resizeEntries[0];
      if (!resizeEntry) return;

      const width = resizeEntry.contentBoxSize[0]?.inlineSize ??
        resizeEntry.contentRect.width;
      const threshold = this.morphAt || 768;
      const newMode: ResolvedMode = width >= threshold ? "tabs" : "accordion";
      this._transitionMode(newMode);
    });

    this._resizeObserver.observe(this);
  }

  private _transitionMode(newMode: ResolvedMode): void {
    const previousMode = this._resolvedMode;
    if (previousMode === newMode) return;

    this._applyMode(newMode);

    if (previousMode !== null) {
      this.dispatchEvent(
        new CustomEvent("auras-morph", {
          detail: { mode: newMode, previousMode },
          bubbles: true,
        }),
      );
    }
  }

  private _applyMode(mode: ResolvedMode): void {
    this._teardownAria();
    this._resolvedMode = mode;
    this._syncAttribute("data-resolved-mode", mode);

    if (mode === "tabs") {
      this._setupTabsAria();
      this._applyTabsSelection();
    } else {
      this._setupAccordionAria();
      this._applyAccordionState();
    }
  }

  private _teardownAria(): void {
    this.removeAttribute("role");
    this.removeAttribute("aria-orientation");

    for (const entry of this._entries) {
      entry.section.removeAttribute("role");
      entry.trigger.removeAttribute("role");
      entry.trigger.removeAttribute("aria-selected");
      entry.trigger.removeAttribute("aria-expanded");
      entry.trigger.removeAttribute("aria-controls");
      entry.panel.removeAttribute("role");
      entry.panel.removeAttribute("aria-labelledby");
    }
  }

  private _setupTabsAria(): void {
    this.setAttribute("role", "tablist");
    this.setAttribute("aria-orientation", "horizontal");

    for (const entry of this._entries) {
      entry.section.setAttribute("role", "presentation");

      const triggerId = ensureElementId(
        entry.trigger,
        "auras-sections-trigger",
      );
      const panelId = ensureElementId(entry.panel, "auras-sections-panel");

      entry.trigger.setAttribute("role", "tab");
      entry.trigger.setAttribute("aria-selected", "false");
      entry.trigger.setAttribute("aria-controls", panelId);

      entry.panel.setAttribute("role", "tabpanel");
      entry.panel.setAttribute("aria-labelledby", triggerId);
    }
  }

  private _setupAccordionAria(): void {
    for (const entry of this._entries) {
      const panelId = ensureElementId(entry.panel, "auras-sections-panel");

      entry.trigger.setAttribute("aria-expanded", "false");
      entry.trigger.setAttribute("aria-controls", panelId);

      entry.panel.setAttribute("role", "region");
      entry.panel.setAttribute(
        "aria-labelledby",
        ensureElementId(entry.trigger, "auras-sections-trigger"),
      );
    }
  }

  private _applyTabsSelection(): void {
    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, { dispatch: false, focus: false });
      }
    }
  }

  private _applyAccordionState(): void {
    const currentValue = this.getAttribute("value");

    for (const entry of this._entries) {
      const shouldExpand = entry.section.hasAttribute("data-expanded") ||
        entry.value === currentValue;

      entry.panel.hidden = !shouldExpand;
      entry.section.toggleAttribute("data-expanded", shouldExpand);
      entry.trigger.setAttribute("aria-expanded", String(shouldExpand));
    }

    const selected = currentValue &&
      this._selectFromAttribute({ dispatch: false, focus: false });

    if (!selected) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._selectAccordionFocus(firstEntry);
        if (!currentValue) {
          this._setExpanded(firstEntry, true);
        }
      }
    }
  }

  private _selectAccordionFocus(entry: AurasSectionsEntry): void {
    for (const currentEntry of this._entries) {
      const isActive = currentEntry === entry;
      currentEntry.trigger.tabIndex = isActive ? 0 : -1;
      currentEntry.trigger.toggleAttribute("data-active", isActive);
    }

    this._syncAttribute("value", entry.value);
  }

  private _selectFromAttribute(options: SelectionOptions): boolean {
    const value = this.getAttribute("value");
    if (!value) return false;
    return this._select(value, options);
  }

  private _select(value: string, options: SelectionOptions): boolean {
    const entry = this._entriesByValue.get(value);
    if (!entry) return false;

    const previousValue = this.getAttribute("value");
    const didChange = previousValue !== entry.value;

    if (this._resolvedMode === "tabs") {
      const applySelection = () => {
        for (const currentEntry of this._entries) {
          const isActive = currentEntry === entry;

          currentEntry.trigger.tabIndex = isActive ? 0 : -1;
          currentEntry.trigger.toggleAttribute("data-active", isActive);
          currentEntry.trigger.setAttribute(
            "aria-selected",
            String(isActive),
          );
          currentEntry.panel.hidden = !isActive;
          currentEntry.panel.toggleAttribute("data-active", isActive);
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
    } else {
      this._selectAccordionFocus(entry);
      this._setExpanded(entry, true);
    }

    if (options.focus) {
      entry.trigger.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
          detail: {
            value: entry.value,
            section: entry.section,
            trigger: entry.trigger,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  private _toggleExpanded(entry: AurasSectionsEntry): void {
    this._setExpanded(entry, !this._isExpanded(entry));
    this.dispatchEvent(
      new CustomEvent("auras-change", {
        detail: {
          value: entry.value,
          section: entry.section,
          trigger: entry.trigger,
          panel: entry.panel,
        },
        bubbles: true,
      }),
    );
  }

  private _isExpanded(entry: AurasSectionsEntry): boolean {
    return entry.section.hasAttribute("data-expanded");
  }

  private _setExpanded(entry: AurasSectionsEntry, expanded: boolean): boolean {
    if (this._isExpanded(entry) === expanded) return false;

    entry.section.toggleAttribute("data-expanded", expanded);
    entry.panel.hidden = !expanded;
    entry.trigger.setAttribute("aria-expanded", String(expanded));

    if (expanded && this.exclusive) {
      for (const otherEntry of this._entries) {
        if (otherEntry !== entry && this._isExpanded(otherEntry)) {
          otherEntry.section.toggleAttribute("data-expanded", false);
          otherEntry.panel.hidden = true;
          otherEntry.trigger.setAttribute("aria-expanded", "false");
        }
      }
    }

    return true;
  }

  private _enforceExclusive(): void {
    let foundExpanded = false;

    for (const entry of this._entries) {
      if (this._isExpanded(entry)) {
        if (foundExpanded) {
          entry.section.toggleAttribute("data-expanded", false);
          entry.panel.hidden = true;
          entry.trigger.setAttribute("aria-expanded", "false");
        } else {
          foundExpanded = true;
        }
      }
    }
  }

  private _handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest(TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLElement) || !this.contains(trigger)) return;

    const section = trigger.closest(SECTION_SELECTOR);
    if (
      !(section instanceof HTMLElement) || section.parentElement !== this
    ) {
      return;
    }

    const entry = this._entries.find(
      (currentEntry) => currentEntry.trigger === trigger,
    );
    if (!entry) return;

    if (trigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    if (this._resolvedMode === "tabs") {
      this._select(entry.value, { dispatch: true, focus: false });
    } else {
      this._selectAccordionFocus(entry);
      this._toggleExpanded(entry);
    }
  }

  private _handleKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest(TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLElement) || !this.contains(trigger)) return;

    const section = trigger.closest(SECTION_SELECTOR);
    if (
      !(section instanceof HTMLElement) || section.parentElement !== this
    ) {
      return;
    }

    const currentIndex = this._entries.findIndex(
      (entry) => entry.trigger === trigger,
    );
    if (currentIndex < 0) return;

    if (isActivationKey(event.key)) {
      event.preventDefault();
      const entry = this._entries[currentIndex];
      if (!entry) return;

      if (this._resolvedMode === "tabs") {
        if (this.activation === "manual") {
          this._select(entry.value, { dispatch: true, focus: false });
        }
      } else {
        this._setExpanded(entry, !this._isExpanded(entry));
      }
      return;
    }

    const nextIndex = this._getNextIndex(currentIndex, event.key);
    if (nextIndex == null) return;

    event.preventDefault();

    const nextEntry = this._entries[nextIndex];
    if (!nextEntry) return;

    nextEntry.trigger.focus();

    if (this._resolvedMode === "tabs" && this.activation === "auto") {
      this._select(nextEntry.value, { dispatch: true, focus: false });
    } else if (this._resolvedMode === "accordion") {
      this._selectAccordionFocus(nextEntry);
    }
  }

  private _getNextIndex(
    currentIndex: number,
    key: string,
  ): number | null {
    const lastIndex = this._entries.length - 1;

    if (this._resolvedMode === "tabs") {
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

    switch (key) {
      case "ArrowDown":
        return Math.min(lastIndex, currentIndex + 1);
      case "ArrowUp":
        return Math.max(0, currentIndex - 1);
      case "Home":
        return 0;
      case "End":
        return lastIndex;
      default:
        return null;
    }
  }
}

export function registerAurasSections(): typeof AurasSections {
  if (!customElements.get(AURAS_SECTIONS_TAG_NAME)) {
    customElements.define(AURAS_SECTIONS_TAG_NAME, AurasSections);
  }

  return AurasSections;
}
