export {
  AURAS_COMBOBOX_TAG_NAME,
  AurasCombobox,
  registerAurasCombobox,
} from "./src/combobox.ts";
export {
  AURAS_SPLITTER_TAG_NAME,
  AurasSplitter,
  registerAurasSplitter,
} from "./src/splitter.ts";
export {
  AURAS_MASTER_DETAIL_TAG_NAME,
  AurasMasterDetail,
  registerAurasMasterDetail,
} from "./src/master-detail.ts";
export { AURAS_TREE_TAG_NAME, AurasTree, registerAurasTree } from "./src/tree.ts";
export { AURAS_TABS_TAG_NAME, AurasTabs, registerAurasTabs } from "./src/tabs.ts";
export {
  AURAS_SECTIONS_TAG_NAME,
  AurasSections,
  registerAurasSections,
} from "./src/sections.ts";

import { registerAurasCombobox } from "./src/combobox.ts";
import { registerAurasMasterDetail } from "./src/master-detail.ts";
import { registerAurasSections } from "./src/sections.ts";
import { registerAurasSplitter } from "./src/splitter.ts";
import { registerAurasTree } from "./src/tree.ts";
import { registerAurasTabs } from "./src/tabs.ts";

export function registerAurasComponents(): void {
  registerAurasCombobox();
  registerAurasMasterDetail();
  registerAurasSections();
  registerAurasSplitter();
  registerAurasTree();
  registerAurasTabs();
}
