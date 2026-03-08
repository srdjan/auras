import {
  type AuraSelectableEntry,
  AuraSelectablePanelsElement,
  ensureElementId,
  getDirectionality,
} from "./shared/selectable-panels.ts";

const TABLIST_SELECTOR = '[data-part="tablist"]';
const PANELS_SELECTOR = '[data-part="panels"]';
export const AURA_TABS_TAG_NAME = "aura-tabs";

export class AuraTabs extends AuraSelectablePanelsElement {
  protected override _getContainerSelector(): string {
    return TABLIST_SELECTOR;
  }

  protected override _getPanelRootSelector(): string {
    return PANELS_SELECTOR;
  }

  protected override _getPanelIdPrefix(): string {
    return "aura-tabs-panel";
  }

  protected override _setContainerSemantics(container: HTMLElement): void {
    container.setAttribute("role", "tablist");
    container.setAttribute("aria-orientation", "horizontal");
  }

  protected override _applyEntrySemantics(entry: AuraSelectableEntry): void {
    entry.trigger.setAttribute("role", "tab");
    entry.trigger.setAttribute("aria-selected", "false");
    entry.trigger.setAttribute(
      "id",
      ensureElementId(entry.trigger, "aura-tabs-trigger"),
    );
    entry.panel.setAttribute("role", "tabpanel");
    entry.panel.setAttribute("aria-labelledby", entry.trigger.id);
  }

  protected override _applySelectionState(
    entry: AuraSelectableEntry,
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

export function registerAuraTabs(): typeof AuraTabs {
  if (!customElements.get(AURA_TABS_TAG_NAME)) {
    customElements.define(AURA_TABS_TAG_NAME, AuraTabs);
  }

  return AuraTabs;
}
