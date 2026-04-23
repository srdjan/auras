import {
  AURAS_CONTRACTS as RAW_AURAS_CONTRACTS,
  AURAS_CONTRACT_TAG_NAMES as RAW_AURAS_CONTRACT_TAG_NAMES,
} from "./contracts.js";
import {
  auditAuras as auditAurasCore,
  getAurasContract as getAurasContractCore,
  getAurasStarterMarkup as getAurasStarterMarkupCore,
  repairAuras as repairAurasCore,
} from "./core.js";

export type AurasContractTagName =
  | "auras-tabs"
  | "auras-master-detail"
  | "auras-combobox"
  | "auras-tree"
  | "auras-splitter"
  | "auras-diagram"
  | "auras-sections";

export const AURAS_CONTRACT_TAG_NAMES =
  RAW_AURAS_CONTRACT_TAG_NAMES as ReadonlyArray<AurasContractTagName>;

export type AurasDiagnosticSeverity = "error" | "warning";

export type AurasDiagnostic = {
  severity: AurasDiagnosticSeverity;
  code: string;
  message: string;
  hostTag: AurasContractTagName;
  selector: string;
  fixHint?: string;
};

export type AurasAppliedFix = {
  hostTag: AurasContractTagName;
  code: string;
  message: string;
  selector: string;
};

export type AurasPartRule = {
  selector: string;
  min: number;
  max?: number;
  description: string;
};

export type AurasContractDefinition = {
  id: string;
  label: string;
  tagName: AurasContractTagName;
  summary: string;
  requiredParts: ReadonlyArray<AurasPartRule>;
  optionalParts: ReadonlyArray<AurasPartRule>;
  accessibilityRules: ReadonlyArray<string>;
  exampleMarkup: string;
  starterMarkup?: string;
};

export type AurasRepairResult = {
  appliedFixes: ReadonlyArray<AurasAppliedFix>;
  diagnostics: ReadonlyArray<AurasDiagnostic>;
};

const AURAS_CONTRACTS =
  RAW_AURAS_CONTRACTS as ReadonlyArray<AurasContractDefinition>;

export function getAurasContract(
  tagName: string,
): AurasContractDefinition | null {
  return getAurasContractCore(tagName) as AurasContractDefinition | null;
}

export function getAurasContracts(): ReadonlyArray<AurasContractDefinition> {
  return AURAS_CONTRACTS;
}

export function getAurasStarterMarkup(identifier: string): string | null {
  return getAurasStarterMarkupCore(identifier);
}

export function auditAuras(
  root: ParentNode | Element | Document,
  options: { include?: ReadonlyArray<AurasContractTagName> } = {},
): AurasDiagnostic[] {
  return auditAurasCore(root, options) as AurasDiagnostic[];
}

export function repairAuras(
  root: ParentNode | Element | Document,
  options: { include?: ReadonlyArray<AurasContractTagName> } = {},
): AurasRepairResult {
  return repairAurasCore(root, options) as AurasRepairResult;
}
