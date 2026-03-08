export {
  AURA_MASTER_DETAIL_TAG_NAME,
  AuraMasterDetail,
  registerAuraMasterDetail,
} from "./src/master-detail.js";
export { AURA_TABS_TAG_NAME, AuraTabs, registerAuraTabs } from "./src/tabs.js";

import { registerAuraMasterDetail } from "./src/master-detail.js";
import { registerAuraTabs } from "./src/tabs.js";

export function registerAuraComponents() {
  registerAuraMasterDetail();
  registerAuraTabs();
}
