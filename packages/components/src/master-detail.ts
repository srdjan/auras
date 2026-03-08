import {
  type AuraSelectableEntry,
  AuraSelectablePanelsElement,
  getDirectionality,
} from "./shared/selectable-panels.ts";

const MASTER_SELECTOR = '[data-part="master"]';
const DETAIL_SELECTOR = '[data-part="detail"]';
export const AURA_MASTER_DETAIL_TAG_NAME = "aura-master-detail";

export class AuraMasterDetail extends AuraSelectablePanelsElement {
  protected override _getContainerSelector(): string {
    return MASTER_SELECTOR;
  }

  protected override _getPanelRootSelector(): string {
    return DETAIL_SELECTOR;
  }

  protected override _getPanelIdPrefix(): string {
    return "aura-master-detail-panel";
  }

  protected override _applyEntrySemantics(entry: AuraSelectableEntry): void {
    entry.trigger.setAttribute("aria-expanded", "false");
  }

  protected override _applySelectionState(
    entry: AuraSelectableEntry,
    isActive: boolean,
  ): void {
    entry.trigger.setAttribute("aria-expanded", String(isActive));

    if (isActive) {
      entry.trigger.setAttribute("aria-current", "true");
    } else {
      entry.trigger.removeAttribute("aria-current");
    }
  }

  protected override _getNextIndex(
    currentIndex: number,
    key: string,
  ): number | null {
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

export function registerAuraMasterDetail(): typeof AuraMasterDetail {
  if (!customElements.get(AURA_MASTER_DETAIL_TAG_NAME)) {
    customElements.define(AURA_MASTER_DETAIL_TAG_NAME, AuraMasterDetail);
  }

  return AuraMasterDetail;
}
