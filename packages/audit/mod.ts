export const AURAS_CONTRACT_TAG_NAMES = [
  "auras-tabs",
  "auras-master-detail",
  "auras-combobox",
  "auras-tree",
  "auras-splitter",
  "auras-diagram",
] as const;

export type AurasContractTagName = typeof AURAS_CONTRACT_TAG_NAMES[number];
export type AurasDiagnosticSeverity = "error" | "warning";

export type AurasDiagnostic = {
  severity: AurasDiagnosticSeverity;
  code: string;
  message: string;
  hostTag: AurasContractTagName;
  selector: string;
  fixHint?: string;
};

export type AurasPartRule = {
  selector: string;
  min: number;
  max?: number;
  description: string;
};

export type AurasContractDefinition = {
  tagName: AurasContractTagName;
  summary: string;
  requiredParts: ReadonlyArray<AurasPartRule>;
};

type DiagnosticInput = Omit<AurasDiagnostic, "selector" | "hostTag"> & {
  selector?: string;
};

type AuditContext = {
  readonly host: HTMLElement;
  readonly contract: AurasContractDefinition;
  readonly diagnostics: AurasDiagnostic[];
  add(input: DiagnosticInput): void;
};

type ContractValidator = (host: HTMLElement, context: AuditContext) => void;

const AURAS_HOST_SELECTOR = AURAS_CONTRACT_TAG_NAMES.join(",");

const CONTRACTS = {
  "auras-tabs": {
    tagName: "auras-tabs",
    summary: "Tab controller with explicit tablist, triggers, and panels.",
    requiredParts: [
      {
        selector: '[data-part="tablist"]',
        min: 1,
        max: 1,
        description: "One tablist container",
      },
      {
        selector: '[data-part="panels"]',
        min: 1,
        max: 1,
        description: "One panels container",
      },
      {
        selector: '[data-part="trigger"][data-value]',
        min: 1,
        description: "One or more tab triggers with data-value",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 1,
        description: "One or more panels with data-value",
      },
    ],
  },
  "auras-master-detail": {
    tagName: "auras-master-detail",
    summary: "Selection controller for a master list and detail panels.",
    requiredParts: [
      {
        selector: '[data-part="master"]',
        min: 1,
        max: 1,
        description: "One master container",
      },
      {
        selector: '[data-part="detail"]',
        min: 1,
        max: 1,
        description: "One detail container",
      },
      {
        selector: '[data-part="trigger"][data-value]',
        min: 1,
        description: "One or more triggers with data-value",
      },
      {
        selector: '[data-part="panel"][data-value]',
        min: 1,
        description: "One or more panels with data-value",
      },
    ],
  },
  "auras-combobox": {
    tagName: "auras-combobox",
    summary: "Combobox with authored input, local options, and optional panels.",
    requiredParts: [
      {
        selector: '[data-part="input"]',
        min: 1,
        max: 1,
        description: "One text input",
      },
      {
        selector: '[data-part="listbox"]',
        min: 1,
        max: 1,
        description: "One listbox container",
      },
      {
        selector: '[data-part="option"][data-value]',
        min: 1,
        description: "One or more options with data-value",
      },
    ],
  },
  "auras-tree": {
    tagName: "auras-tree",
    summary: "Tree controller for hierarchical selection and expansion.",
    requiredParts: [
      {
        selector: '[data-part="tree"]',
        min: 1,
        max: 1,
        description: "One tree container",
      },
      {
        selector: '[data-part="item"][data-value]',
        min: 1,
        description: "One or more items with data-value",
      },
    ],
  },
  "auras-splitter": {
    tagName: "auras-splitter",
    summary: "Two-pane splitter with explicit panes and separator.",
    requiredParts: [
      {
        selector: '[data-part="pane"][data-pane="primary"]',
        min: 1,
        max: 1,
        description: "One primary pane",
      },
      {
        selector: '[data-part="separator"]',
        min: 1,
        max: 1,
        description: "One separator",
      },
      {
        selector: '[data-part="pane"][data-pane="secondary"]',
        min: 1,
        max: 1,
        description: "One secondary pane",
      },
    ],
  },
  "auras-diagram": {
    tagName: "auras-diagram",
    summary: "Spatial diagram controller with authored nodes and optional panels.",
    requiredParts: [
      {
        selector: '[data-part="canvas"]',
        min: 1,
        max: 1,
        description: "One canvas container",
      },
      {
        selector: '[data-part="node"][data-value]',
        min: 1,
        description: "One or more nodes with data-value",
      },
    ],
  },
} satisfies Record<AurasContractTagName, AurasContractDefinition>;

const VALIDATORS: Record<AurasContractTagName, ContractValidator> = {
  "auras-tabs": (host, context) =>
    validateSelectablePanels(host, context, {
      containerSelector: '[data-part="tablist"]',
      containerDescription: "tablist",
      panelRootSelector: '[data-part="panels"]',
      triggerSelector: '[data-part="trigger"][data-value]',
      triggerDescription: "tab trigger",
      panelSelector: '[data-part="panel"][data-value]',
      panelDescription: "panel",
      requireContainerLabel: true,
    }),
  "auras-master-detail": (host, context) =>
    validateSelectablePanels(host, context, {
      containerSelector: '[data-part="master"]',
      containerDescription: "master container",
      panelRootSelector: '[data-part="detail"]',
      triggerSelector: '[data-part="trigger"][data-value]',
      triggerDescription: "trigger",
      panelSelector: '[data-part="panel"][data-value]',
      panelDescription: "detail panel",
      requireContainerLabel: true,
    }),
  "auras-combobox": validateCombobox,
  "auras-tree": validateTree,
  "auras-splitter": validateSplitter,
  "auras-diagram": validateDiagram,
};

export function getAurasContract(
  tagName: string,
): AurasContractDefinition | null {
  return (CONTRACTS as Record<string, AurasContractDefinition | undefined>)[tagName] ??
    null;
}

export function auditAuras(
  root: ParentNode,
  options: { include?: ReadonlyArray<AurasContractTagName> } = {},
): AurasDiagnostic[] {
  const include = new Set(options.include ?? AURAS_CONTRACT_TAG_NAMES);
  const diagnostics: AurasDiagnostic[] = [];

  for (const host of findHosts(root, include)) {
    const tagName = host.localName as AurasContractTagName;
    const contract = CONTRACTS[tagName];
    const validator = VALIDATORS[tagName];
    if (!contract || !validator) {
      continue;
    }

    const context: AuditContext = {
      host,
      contract,
      diagnostics,
      add(input) {
        diagnostics.push({
          hostTag: contract.tagName,
          selector: input.selector ?? describeElement(host),
          severity: input.severity,
          code: input.code,
          message: input.message,
          fixHint: input.fixHint,
        });
      },
    };

    for (const rule of contract.requiredParts) {
      const matches = getOwnedElements(host, rule.selector);
      if (matches.length < rule.min) {
        context.add({
          severity: "error",
          code: "missing-required-part",
          message: `${contract.tagName} is missing ${rule.description.toLowerCase()}.`,
          fixHint: `Add ${rule.description.toLowerCase()} matching ${rule.selector}.`,
        });
      }

      if (rule.max != null && matches.length > rule.max) {
        context.add({
          severity: "error",
          code: "duplicate-required-part",
          message:
            `${contract.tagName} has ${matches.length} matches for ${rule.selector}; expected at most ${rule.max}.`,
          fixHint: `Keep only ${rule.max} ${rule.description.toLowerCase()}.`,
        });
      }
    }

    validator(host, context);
  }

  return diagnostics.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "error" ? -1 : 1;
    }

    return left.selector.localeCompare(right.selector);
  });
}

function findHosts(
  root: ParentNode,
  include: ReadonlySet<AurasContractTagName>,
): HTMLElement[] {
  const hosts: HTMLElement[] = [];

  if (root instanceof Element && isIncludedHost(root, include)) {
    hosts.push(root as HTMLElement);
  }

  if ("querySelectorAll" in root) {
    for (const element of root.querySelectorAll<HTMLElement>(AURAS_HOST_SELECTOR)) {
      if (isIncludedHost(element, include)) {
        hosts.push(element);
      }
    }
  }

  return hosts;
}

function isIncludedHost(
  element: Element,
  include: ReadonlySet<AurasContractTagName>,
): element is HTMLElement {
  return element instanceof HTMLElement &&
    include.has(element.localName as AurasContractTagName);
}

function getOwnedElements(host: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(selector)).filter((element) =>
    element.closest(AURAS_HOST_SELECTOR) === host
  );
}

function getDirectChildElements(
  container: HTMLElement,
  selector: string,
): HTMLElement[] {
  return Array.from(container.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && child.matches(selector)
  );
}

function describeElement(element: Element): string {
  const fragments = [element.localName];
  const id = element.getAttribute("id");
  const dataPart = element.getAttribute("data-part");
  const dataValue = element.getAttribute("data-value");

  if (id) {
    fragments.push(`#${id}`);
  }

  if (dataPart) {
    fragments.push(`[data-part="${dataPart}"]`);
  }

  if (dataValue) {
    fragments.push(`[data-value="${dataValue}"]`);
  }

  return fragments.join("");
}

function hasAccessibleName(element: HTMLElement): boolean {
  return element.hasAttribute("aria-label") ||
    element.hasAttribute("aria-labelledby");
}

function reportDuplicateValues(
  entries: ReadonlyArray<HTMLElement>,
  context: AuditContext,
  kind: string,
): Set<string> {
  const seen = new Map<string, HTMLElement>();
  const values = new Set<string>();

  for (const entry of entries) {
    const value = entry.getAttribute("data-value");
    if (!value) {
      continue;
    }

    values.add(value);

    if (seen.has(value)) {
      context.add({
        severity: "error",
        code: "duplicate-data-value",
        selector: describeElement(entry),
        message:
          `${context.contract.tagName} has duplicate ${kind} data-value "${value}".`,
        fixHint: `Use unique data-value values for each ${kind}.`,
      });
      continue;
    }

    seen.set(value, entry);
  }

  return values;
}

function reportPairing(
  sourceValues: ReadonlySet<string>,
  targetEntries: ReadonlyArray<HTMLElement>,
  context: AuditContext,
  sourceLabel: string,
  targetLabel: string,
): void {
  for (const target of targetEntries) {
    const value = target.getAttribute("data-value");
    if (!value || sourceValues.has(value)) {
      continue;
    }

    context.add({
      severity: "error",
      code: "orphaned-pair",
      selector: describeElement(target),
      message:
        `${context.contract.tagName} ${targetLabel} "${value}" has no matching ${sourceLabel}.`,
      fixHint: `Add a matching ${sourceLabel} with data-value="${value}", or remove the orphaned ${targetLabel}.`,
    });
  }
}

function validateSelectablePanels(
  host: HTMLElement,
  context: AuditContext,
  config: {
    containerSelector: string;
    containerDescription: string;
    panelRootSelector: string;
    triggerSelector: string;
    triggerDescription: string;
    panelSelector: string;
    panelDescription: string;
    requireContainerLabel: boolean;
  },
): void {
  const container = getOwnedElements(host, config.containerSelector)[0] ?? null;
  const panelRoot = getOwnedElements(host, config.panelRootSelector)[0] ?? null;

  if (container && config.requireContainerLabel && !hasAccessibleName(container)) {
    context.add({
      severity: "warning",
      code: "missing-accessible-name",
      selector: describeElement(container),
      message:
        `${context.contract.tagName} ${config.containerDescription} should have aria-label or aria-labelledby.`,
      fixHint: `Add aria-label or aria-labelledby to the ${config.containerDescription}.`,
    });
  }

  const triggers = container
    ? Array.from(container.querySelectorAll<HTMLElement>(config.triggerSelector))
    : [];
  const panels = panelRoot
    ? Array.from(panelRoot.querySelectorAll<HTMLElement>(config.panelSelector))
    : [];

  const triggerValues = reportDuplicateValues(
    triggers,
    context,
    config.triggerDescription,
  );
  const panelValues = reportDuplicateValues(
    panels,
    context,
    config.panelDescription,
  );

  reportPairing(
    panelValues,
    triggers,
    context,
    config.panelDescription,
    config.triggerDescription,
  );
  reportPairing(
    triggerValues,
    panels,
    context,
    config.triggerDescription,
    config.panelDescription,
  );
}

function validateCombobox(host: HTMLElement, context: AuditContext): void {
  const listbox = getOwnedElements(host, '[data-part="listbox"]')[0] ?? null;
  const toggle = getOwnedElements(host, '[data-part="toggle"]')[0] ?? null;
  const panels = getOwnedElements(host, '[data-part="panel"][data-value]');
  const options = listbox
    ? Array.from(listbox.querySelectorAll<HTMLElement>('[data-part="option"][data-value]'))
    : [];

  if (toggle && !hasAccessibleName(toggle)) {
    context.add({
      severity: "warning",
      code: "missing-accessible-name",
      selector: describeElement(toggle),
      message:
        "auras-combobox toggle should have aria-label or aria-labelledby.",
      fixHint: "Add aria-label or aria-labelledby to the toggle button.",
    });
  }

  const optionValues = reportDuplicateValues(options, context, "option");
  const panelValues = reportDuplicateValues(panels, context, "panel");

  if (panels.length > 0) {
    reportPairing(panelValues, options, context, "panel", "option");
    reportPairing(optionValues, panels, context, "option", "panel");
  }
}

function validateTree(host: HTMLElement, context: AuditContext): void {
  const treeRoot = getOwnedElements(host, '[data-part="tree"]')[0] ?? null;
  const panels = getOwnedElements(host, '[data-part="panel"][data-value]');
  if (!treeRoot) {
    return;
  }

  if (!hasAccessibleName(treeRoot)) {
    context.add({
      severity: "warning",
      code: "missing-accessible-name",
      selector: describeElement(treeRoot),
      message:
        "auras-tree tree container should have aria-label or aria-labelledby.",
      fixHint: "Add aria-label or aria-labelledby to the tree container.",
    });
  }

  const items = Array.from(treeRoot.querySelectorAll<HTMLElement>(
    '[data-part="item"][data-value]',
  ));
  const itemValues = reportDuplicateValues(items, context, "tree item");
  const panelValues = reportDuplicateValues(panels, context, "panel");

  for (const item of items) {
    const nodes = getDirectChildElements(item, '[data-part="node"]');
    if (nodes.length === 0) {
      context.add({
        severity: "error",
        code: "missing-required-part",
        selector: describeElement(item),
        message:
          "auras-tree item is missing a direct child [data-part=\"node\"].",
        fixHint: "Add one direct child node button or link for each tree item.",
      });
    }

    if (nodes.length > 1) {
      context.add({
        severity: "error",
        code: "duplicate-required-part",
        selector: describeElement(item),
        message:
          "auras-tree item has multiple direct child nodes; expected exactly one.",
        fixHint: "Keep a single direct child [data-part=\"node\"] per item.",
      });
    }

    const groups = getDirectChildElements(item, '[data-part="group"]');
    if (groups.length > 1) {
      context.add({
        severity: "error",
        code: "duplicate-required-part",
        selector: describeElement(item),
        message:
          "auras-tree item has multiple direct child groups; expected at most one.",
        fixHint: "Keep a single [data-part=\"group\"] per tree item.",
      });
    }

    const toggles = getDirectChildElements(item, '[data-part="toggle"]');
    if (toggles.length > 1) {
      context.add({
        severity: "error",
        code: "duplicate-required-part",
        selector: describeElement(item),
        message:
          "auras-tree item has multiple direct child toggles; expected at most one.",
        fixHint: "Keep a single [data-part=\"toggle\"] per tree item.",
      });
    }

    const toggle = toggles[0] ?? null;
    const group = groups[0] ?? null;

    if (toggle && !hasAccessibleName(toggle)) {
      context.add({
        severity: "warning",
        code: "missing-accessible-name",
        selector: describeElement(toggle),
        message:
          "auras-tree toggle should have aria-label or aria-labelledby.",
        fixHint: "Add aria-label or aria-labelledby to the branch toggle.",
      });
    }

    if (group && getDirectChildElements(group, '[data-part="item"][data-value]').length === 0) {
      context.add({
        severity: "warning",
        code: "empty-group",
        selector: describeElement(group),
        message:
          "auras-tree group has no direct child items.",
        fixHint: "Add child items or remove the empty group.",
      });
    }
  }

  if (panels.length > 0) {
    reportPairing(panelValues, items, context, "panel", "tree item");
    reportPairing(itemValues, panels, context, "tree item", "panel");
  }
}

function validateSplitter(host: HTMLElement, context: AuditContext): void {
  const separator = getOwnedElements(host, '[data-part="separator"]')[0] ?? null;
  if (!separator) {
    return;
  }

  if (!hasAccessibleName(separator)) {
    context.add({
      severity: "error",
      code: "missing-accessible-name",
      selector: describeElement(separator),
      message:
        "auras-splitter separator requires aria-label or aria-labelledby.",
      fixHint: "Add aria-label or aria-labelledby to the separator button.",
    });
  }
}

function validateDiagram(host: HTMLElement, context: AuditContext): void {
  const canvas = getOwnedElements(host, '[data-part="canvas"]')[0] ?? null;
  const panels = getOwnedElements(host, '[data-part="panel"][data-value]');
  if (!canvas) {
    return;
  }

  const nodes = Array.from(canvas.querySelectorAll<HTMLElement>(
    '[data-part="node"][data-value]',
  ));
  const nodeValues = reportDuplicateValues(nodes, context, "node");
  const panelValues = reportDuplicateValues(panels, context, "panel");

  if (panels.length > 0) {
    reportPairing(panelValues, nodes, context, "panel", "node");
    reportPairing(nodeValues, panels, context, "node", "panel");
  }
}
