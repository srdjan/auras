import {
  AuraSelectablePanelsElement,
  ensureElementId,
  getDirectionality,
} from "./shared/selectable-panels.js";

const TABLIST_SELECTOR = '[data-part="tablist"]';
const PANELS_SELECTOR = '[data-part="panels"]';
export const AURA_TABS_TAG_NAME = "aura-tabs";

export class AuraTabs extends AuraSelectablePanelsElement {
  _getContainerSelector() {
    return TABLIST_SELECTOR;
  }

  _getPanelRootSelector() {
    return PANELS_SELECTOR;
  }

  _getPanelIdPrefix() {
    return "aura-tabs-panel";
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
      ensureElementId(entry.trigger, "aura-tabs-trigger"),
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

export function registerAuraTabs() {
  if (!customElements.get(AURA_TABS_TAG_NAME)) {
    customElements.define(AURA_TABS_TAG_NAME, AuraTabs);
  }

  return AuraTabs;
}
