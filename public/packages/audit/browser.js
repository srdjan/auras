import {
  AURAS_CONTRACTS,
  AURAS_CONTRACTS_BY_TAG,
  AURAS_CONTRACT_TAG_NAMES,
} from "./contracts.js";

export { AURAS_CONTRACT_TAG_NAMES } from "./contracts.js";

const AURAS_HOST_SELECTOR = AURAS_CONTRACT_TAG_NAMES.join(",");

const CONTRACTS = AURAS_CONTRACTS_BY_TAG;

const VALIDATORS = {
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
  "auras-sections": validateSections,
};

export function getAurasContract(tagName) {
  return CONTRACTS[tagName] ?? null;
}

export function getAurasContracts() {
  return AURAS_CONTRACTS;
}

export function auditAuras(root, options = {}) {
  const include = new Set(options.include ?? AURAS_CONTRACT_TAG_NAMES);
  const diagnostics = [];

  for (const host of findHosts(root, include)) {
    const tagName = host.localName;
    const contract = CONTRACTS[tagName];
    const validator = VALIDATORS[tagName];
    if (!contract || !validator) {
      continue;
    }

    const context = {
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

function findHosts(root, include) {
  const hosts = [];

  if (root instanceof Element && isIncludedHost(root, include)) {
    hosts.push(root);
  }

  if ("querySelectorAll" in root) {
    for (const element of root.querySelectorAll(AURAS_HOST_SELECTOR)) {
      if (isIncludedHost(element, include)) {
        hosts.push(element);
      }
    }
  }

  return hosts;
}

function isIncludedHost(element, include) {
  return element instanceof HTMLElement && include.has(element.localName);
}

function getOwnedElements(host, selector) {
  return Array.from(host.querySelectorAll(selector)).filter((element) =>
    element.closest(AURAS_HOST_SELECTOR) === host
  );
}

function getDirectChildElements(container, selector) {
  return Array.from(container.children).filter((child) =>
    child instanceof HTMLElement && child.matches(selector)
  );
}

function describeElement(element) {
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

function hasAccessibleName(element) {
  return element.hasAttribute("aria-label") ||
    element.hasAttribute("aria-labelledby");
}

function reportDuplicateValues(entries, context, kind) {
  const seen = new Map();
  const values = new Set();

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
  sourceValues,
  targetEntries,
  context,
  sourceLabel,
  targetLabel,
) {
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

function validateSelectablePanels(host, context, config) {
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
    ? Array.from(container.querySelectorAll(config.triggerSelector))
    : [];
  const panels = panelRoot
    ? Array.from(panelRoot.querySelectorAll(config.panelSelector))
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

function validateCombobox(host, context) {
  const listbox = getOwnedElements(host, '[data-part="listbox"]')[0] ?? null;
  const toggle = getOwnedElements(host, '[data-part="toggle"]')[0] ?? null;
  const panels = getOwnedElements(host, '[data-part="panel"][data-value]');
  const options = listbox
    ? Array.from(listbox.querySelectorAll('[data-part="option"][data-value]'))
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

function validateTree(host, context) {
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

  const items = Array.from(
    treeRoot.querySelectorAll('[data-part="item"][data-value]'),
  );
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
          'auras-tree item is missing a direct child [data-part="node"].',
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
        fixHint: 'Keep a single direct child [data-part="node"] per item.',
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
        fixHint: 'Keep a single [data-part="group"] per tree item.',
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
        fixHint: 'Keep a single [data-part="toggle"] per tree item.',
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

function validateSplitter(host, context) {
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

function validateDiagram(host, context) {
  const canvas = getOwnedElements(host, '[data-part="canvas"]')[0] ?? null;
  const panels = getOwnedElements(host, '[data-part="panel"][data-value]');
  if (!canvas) {
    return;
  }

  const nodes = Array.from(
    canvas.querySelectorAll('[data-part="node"][data-value]'),
  );
  const nodeValues = reportDuplicateValues(nodes, context, "node");
  const panelValues = reportDuplicateValues(panels, context, "panel");

  if (panels.length > 0) {
    reportPairing(panelValues, nodes, context, "panel", "node");
    reportPairing(nodeValues, panels, context, "node", "panel");
  }
}

function validateSections(host, context) {
  const sections = getOwnedElements(host, '[data-part="section"][data-value]');

  reportDuplicateValues(sections, context, "section");

  for (const section of sections) {
    const triggers = getDirectChildElements(section, '[data-part="trigger"]');
    if (triggers.length === 0) {
      context.add({
        severity: "error",
        code: "missing-required-part",
        selector: describeElement(section),
        message:
          'auras-sections section is missing a direct child [data-part="trigger"].',
        fixHint: "Add one direct child trigger to each section.",
      });
    }

    if (triggers.length > 1) {
      context.add({
        severity: "error",
        code: "duplicate-required-part",
        selector: describeElement(section),
        message:
          "auras-sections section has multiple direct child triggers; expected exactly one.",
        fixHint: 'Keep a single direct child [data-part="trigger"] per section.',
      });
    }

    const panels = getDirectChildElements(section, '[data-part="panel"]');
    if (panels.length === 0) {
      context.add({
        severity: "error",
        code: "missing-required-part",
        selector: describeElement(section),
        message:
          'auras-sections section is missing a direct child [data-part="panel"].',
        fixHint: "Add one direct child panel to each section.",
      });
    }

    if (panels.length > 1) {
      context.add({
        severity: "error",
        code: "duplicate-required-part",
        selector: describeElement(section),
        message:
          "auras-sections section has multiple direct child panels; expected exactly one.",
        fixHint: 'Keep a single direct child [data-part="panel"] per section.',
      });
    }
  }
}

if (typeof window !== "undefined") {
  window.AurasAudit = {
    AURAS_CONTRACT_TAG_NAMES,
    auditAuras,
    getAurasContract,
    getAurasContracts,
  };
}
