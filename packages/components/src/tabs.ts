import {
  type AurasSelectableEntry,
  AurasSelectablePanelsElement,
  ensureElementId,
  getDirectionality,
} from "./shared/selectable-panels.ts";

const TABLIST_SELECTOR = '[data-part="tablist"]';
const PANELS_SELECTOR = '[data-part="panels"]';
export const AURAS_TABS_TAG_NAME = "auras-tabs";

export class AurasTabs extends AurasSelectablePanelsElement {
  protected override _getContainerSelector(): string {
    return TABLIST_SELECTOR;
  }

  protected override _getPanelRootSelector(): string {
    return PANELS_SELECTOR;
  }

  protected override _getPanelIdPrefix(): string {
    return "auras-tabs-panel";
  }

  protected override _setContainerSemantics(container: HTMLElement): void {
    container.setAttribute("role", "tablist");
    container.setAttribute("aria-orientation", "horizontal");
  }

  protected override _applyEntrySemantics(entry: AurasSelectableEntry): void {
    entry.trigger.setAttribute("role", "tab");
    entry.trigger.setAttribute("aria-selected", "false");
    entry.trigger.setAttribute(
      "id",
      ensureElementId(entry.trigger, "auras-tabs-trigger"),
    );
    entry.panel.setAttribute("role", "tabpanel");
    entry.panel.setAttribute("aria-labelledby", entry.trigger.id);
  }

  protected override _applySelectionState(
    entry: AurasSelectableEntry,
    isActive: boolean,
  ): void {
    entry.trigger.setAttribute("aria-selected", String(isActive));
  }

  protected override _getNextIndex(
    currentIndex: number,
    key: string,
  ): number | null {
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

export function registerAurasTabs(): typeof AurasTabs {
  if (!customElements.get(AURAS_TABS_TAG_NAME)) {
    customElements.define(AURAS_TABS_TAG_NAME, AurasTabs);
  }

  return AurasTabs;
}
