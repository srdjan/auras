export {
  AURA_MASTER_DETAIL_TAG_NAME,
  AuraMasterDetail,
  registerAuraMasterDetail,
} from "./src/master-detail.ts";
export { AURA_TABS_TAG_NAME, AuraTabs, registerAuraTabs } from "./src/tabs.ts";

import { registerAuraMasterDetail } from "./src/master-detail.ts";
import { registerAuraTabs } from "./src/tabs.ts";

export function registerAuraComponents(): void {
  registerAuraMasterDetail();
  registerAuraTabs();
}
