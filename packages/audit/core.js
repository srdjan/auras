import {
  AURAS_CONTRACTS,
  AURAS_CONTRACTS_BY_TAG,
  AURAS_CONTRACT_TAG_NAMES,
} from "./contracts.js";

const AURAS_HOST_SELECTOR = AURAS_CONTRACT_TAG_NAMES.join(",");
const CONTRACTS_BY_ID = Object.fromEntries(
  AURAS_CONTRACTS.map((contract) => [contract.id, contract]),
);

const VALIDATORS = {
  "auras-tabs": (host, context) =>
    validateSelectablePanels(host, context, {
      containerSelector: '[data-part="tablist"]',
      containerDescription: "tablist",
      containerPart: "tablist",
      containerTagName: "nav",
      panelRootSelector: '[data-part="panels"]',
      panelRootPart: "panels",
      panelRootTagName: "section",
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
      containerPart: "master",
      containerTagName: "nav",
      panelRootSelector: '[data-part="detail"]',
      panelRootPart: "detail",
      panelRootTagName: "section",
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

const REPAIRERS = {
  "auras-tabs": (host, context) =>
    repairSelectablePanels(host, context, {
      containerSelector: '[data-part="tablist"]',
      containerPart: "tablist",
      containerTagName: "nav",
      panelRootSelector: '[data-part="panels"]',
      panelRootPart: "panels",
      panelRootTagName: "section",
    }),
  "auras-master-detail": (host, context) =>
    repairSelectablePanels(host, context, {
      containerSelector: '[data-part="master"]',
      containerPart: "master",
      containerTagName: "nav",
      panelRootSelector: '[data-part="detail"]',
      panelRootPart: "detail",
      panelRootTagName: "section",
    }),
  "auras-combobox": repairCombobox,
  "auras-tree": repairTree,
  "auras-splitter": repairSplitter,
  "auras-diagram": repairDiagram,
  "auras-sections": repairSections,
};

export function getAurasContract(tagName) {
  return AURAS_CONTRACTS_BY_TAG[tagName] ?? null;
}

export function getAurasContracts() {
  return AURAS_CONTRACTS;
}

export function getAurasStarterMarkup(identifier) {
  const contract = resolveContract(identifier);
  return contract?.starterMarkup ?? contract?.exampleMarkup ?? null;
}

export function auditAuras(root, options = {}) {
  const include = new Set(options.include ?? AURAS_CONTRACT_TAG_NAMES);
  const diagnostics = [];

  for (const host of findHosts(root, include)) {
    const tagName = host.localName;
    const contract = AURAS_CONTRACTS_BY_TAG[tagName];
    const validator = VALIDATORS[tagName];
    if (!contract || !validator) {
      continue;
    }

    const context = createAuditContext(host, contract, diagnostics);

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

export function repairAuras(root, options = {}) {
  const include = new Set(options.include ?? AURAS_CONTRACT_TAG_NAMES);
  const appliedFixes = [];

  for (const host of findHosts(root, include)) {
    const tagName = host.localName;
    const contract = AURAS_CONTRACTS_BY_TAG[tagName];
    const repairer = REPAIRERS[tagName];
    if (!contract || !repairer) {
      continue;
    }

    repairer(host, createRepairContext(host, contract, appliedFixes));
  }

  return {
    appliedFixes,
    diagnostics: auditAuras(root, options),
  };
}

function resolveContract(identifier) {
  if (!identifier) {
    return null;
  }

  return AURAS_CONTRACTS_BY_TAG[identifier] ?? CONTRACTS_BY_ID[identifier] ??
    null;
}

function createAuditContext(host, contract, diagnostics) {
  return {
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
}

function createRepairContext(host, contract, appliedFixes) {
  return {
    host,
    contract,
    appliedFixes,
    addFix(input) {
      appliedFixes.push({
        hostTag: contract.tagName,
        selector: input.selector ?? describeElement(host),
        code: input.code,
        message: input.message,
      });
    },
  };
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

function reportPairing(sourceValues, targetEntries, context, sourceLabel, targetLabel) {
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

  const items = Array.from(treeRoot.querySelectorAll('[data-part="item"][data-value]'));
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

    if (
      group &&
      getDirectChildElements(group, '[data-part="item"][data-value]').length ===
        0
    ) {
      context.add({
        severity: "warning",
        code: "empty-group",
        selector: describeElement(group),
        message: "auras-tree group has no direct child items.",
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

  const nodes = Array.from(canvas.querySelectorAll('[data-part="node"][data-value]'));
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

function repairSelectablePanels(host, context, config) {
  let container = getOwnedElements(host, config.containerSelector)[0] ?? null;
  let panelRoot = getOwnedElements(host, config.panelRootSelector)[0] ?? null;

  if (!container) {
    container = annotateUniqueDirectWrapper(
      host,
      config.containerPart,
      (child) => getDirectTriggerCandidates(child).length > 0,
      context,
    );
  }

  if (!panelRoot) {
    panelRoot = annotateUniqueDirectWrapper(
      host,
      config.panelRootPart,
      (child) => getDirectPanelCandidates(child).length > 0,
      context,
    );
  }

  annotateSelectableChildren(container ?? host, context);
  annotateSelectablePanels(panelRoot ?? host, context);

  container = ensureDirectWrapper(
    host,
    context,
    config.containerSelector,
    config.containerTagName,
    config.containerPart,
    "prepend",
  );
  panelRoot = ensureDirectWrapper(
    host,
    context,
    config.panelRootSelector,
    config.panelRootTagName,
    config.panelRootPart,
    "append",
  );

  moveOwnedElementsToWrapper(
    host,
    '[data-part="trigger"][data-value]',
    container,
    context,
  );
  moveOwnedElementsToWrapper(
    host,
    '[data-part="panel"][data-value]',
    panelRoot,
    context,
  );
}

function repairCombobox(host, context) {
  let listbox = getOwnedElements(host, '[data-part="listbox"]')[0] ?? null;
  const nakedInputs = getOwnedElements(
    host,
    'input:not([data-part]):not([type="hidden"])',
  );
  if (
    getOwnedElements(host, '[data-part="input"]').length === 0 &&
    nakedInputs.length === 1
  ) {
    annotatePart(
      nakedInputs[0],
      "input",
      context,
      "Annotated the authored text input as the combobox input.",
    );
  }

  if (!listbox) {
    listbox = annotateUniqueDirectWrapper(
      host,
      "listbox",
      (child) => child.matches("ul, ol"),
      context,
    );
  }

  if (!listbox) {
    listbox = ensureDirectWrapper(
      host,
      context,
      '[data-part="listbox"]',
      "ul",
      "listbox",
      "append",
    );
  }

  for (const option of getDirectChildElements(listbox, '[data-value]:not([data-part])')) {
    annotatePart(
      option,
      "option",
      context,
      "Annotated a listbox child with data-value as an option.",
    );
  }

  const looseListItems = getDirectChildElements(
    host,
    'li[data-value]:not([data-part])',
  );
  for (const item of looseListItems) {
    annotatePart(
      item,
      "option",
      context,
      "Annotated a loose list item with data-value as an option.",
    );
  }

  moveOwnedElementsToWrapper(
    host,
    '[data-part="option"][data-value]',
    listbox,
    context,
  );
}

function repairTree(host, context) {
  let treeRoot = getOwnedElements(host, '[data-part="tree"]')[0] ?? null;

  if (!treeRoot) {
    treeRoot = annotateUniqueDirectWrapper(
      host,
      "tree",
      (child) => child.matches("ul, ol"),
      context,
    );
  }

  if (!treeRoot) {
    treeRoot = ensureDirectWrapper(
      host,
      context,
      '[data-part="tree"]',
      "ul",
      "tree",
      "prepend",
    );
  }

  annotateItemContainers(treeRoot, context);
  moveOwnedElementsToWrapper(
    host,
    '[data-part="item"][data-value]',
    treeRoot,
    context,
    (element) => !treeRoot.contains(element),
  );

  for (const group of treeRoot.querySelectorAll("ul:not([data-part]), ol:not([data-part])")) {
    annotatePart(
      group,
      "group",
      context,
      "Annotated a nested list as a tree group.",
    );
  }

  annotateItemContainers(treeRoot, context);

  const items = treeRoot.querySelectorAll('[data-part="item"][data-value]');
  for (const item of items) {
    const group = getDirectChildElements(item, '[data-part="group"]')[0] ?? null;
    if (!group) {
      const rawGroups = getDirectChildElements(item, 'ul:not([data-part]), ol:not([data-part])');
      if (rawGroups.length === 1) {
        annotatePart(
          rawGroups[0],
          "group",
          context,
          "Annotated a nested list as a tree group.",
        );
      }
    }

    if (getDirectChildElements(item, '[data-part="toggle"]').length === 0) {
      const toggleCandidates = getDirectChildElements(
        item,
        'button:not([data-part]), a:not([data-part])',
      ).filter(isToggleCandidate);
      if (toggleCandidates.length === 1) {
        annotatePart(
          toggleCandidates[0],
          "toggle",
          context,
          "Annotated an obvious branch toggle.",
        );
      }
    }

    if (getDirectChildElements(item, '[data-part="node"]').length === 0) {
      const nodeCandidates = getDirectChildElements(
        item,
        'button:not([data-part]), a:not([data-part]), [role="treeitem"]:not([data-part])',
      ).filter((candidate) => !isToggleCandidate(candidate));
      if (nodeCandidates.length === 1) {
        annotatePart(
          nodeCandidates[0],
          "node",
          context,
          "Annotated the direct child control as the tree node.",
        );
      }
    }

    wrapNestedTreeItems(item, context);
  }
}

function repairSplitter(host, context) {
  for (const pane of getDirectChildElements(
    host,
    '[data-pane="primary"]:not([data-part]), [data-pane="secondary"]:not([data-part])',
  )) {
    annotatePart(
      pane,
      "pane",
      context,
      "Annotated a pane candidate using its data-pane attribute.",
    );
  }

  if (getOwnedElements(host, '[data-part="separator"]').length === 0) {
    const separatorCandidates = getDirectChildElements(
      host,
      'button:not([data-part]), [role="separator"]:not([data-part])',
    ).filter((candidate) => !candidate.hasAttribute("data-pane"));
    if (separatorCandidates.length === 1) {
      annotatePart(
        separatorCandidates[0],
        "separator",
        context,
        "Annotated the separator control.",
      );
    }
  }
}

function repairDiagram(host, context) {
  let canvas = getOwnedElements(host, '[data-part="canvas"]')[0] ?? null;

  if (!canvas) {
    canvas = annotateUniqueDirectWrapper(
      host,
      "canvas",
      (child) =>
        child.querySelector('[data-part="node"], [data-value]') != null ||
        child.matches("div, section"),
      context,
    );
  }

  if (!canvas) {
    canvas = ensureDirectWrapper(
      host,
      context,
      '[data-part="canvas"]',
      "div",
      "canvas",
      "prepend",
    );
  }

  for (const node of getDirectChildElements(canvas, '[data-value]:not([data-part])')) {
    annotatePart(
      node,
      "node",
      context,
      "Annotated a canvas child with data-value as a diagram node.",
    );
  }

  moveOwnedElementsToWrapper(
    host,
    '[data-part="node"][data-value]',
    canvas,
    context,
  );
}

function repairSections(host, context) {
  for (const section of getDirectChildElements(host, '[data-value]:not([data-part])')) {
    annotatePart(
      section,
      "section",
      context,
      "Annotated a top-level section candidate with data-value.",
    );
  }

  const sections = getOwnedElements(host, '[data-part="section"][data-value]');
  for (const section of sections) {
    if (getDirectChildElements(section, '[data-part="trigger"]').length === 0) {
      const triggerCandidates = getDirectChildElements(
        section,
        'button:not([data-part]), a:not([data-part]), summary:not([data-part])',
      );
      if (triggerCandidates.length === 1) {
        annotatePart(
          triggerCandidates[0],
          "trigger",
          context,
          "Annotated the direct child control as the section trigger.",
        );
      }
    }

    const panels = getDirectChildElements(section, '[data-part="panel"]');
    if (panels.length === 0) {
      const panelCandidates = Array.from(section.children).filter((child) =>
        child instanceof HTMLElement &&
        !child.hasAttribute("data-part") &&
        !isButtonish(child)
      );

      if (panelCandidates.length === 1) {
        annotatePart(
          panelCandidates[0],
          "panel",
          context,
          "Annotated the direct child content block as the section panel.",
        );
      } else if (panelCandidates.length > 0) {
        const panel = section.ownerDocument.createElement("div");
        panel.setAttribute("data-part", "panel");
        const anchor = getDirectChildElements(section, '[data-part="trigger"]')[0];
        if (anchor?.nextSibling) {
          section.insertBefore(panel, anchor.nextSibling);
        } else {
          section.append(panel);
        }
        context.addFix({
          selector: describeElement(panel),
          code: "wrapped-section-content",
          message:
            "Wrapped direct child section content in a canonical [data-part=\"panel\"] container.",
        });

        for (const candidate of panelCandidates) {
          panel.append(candidate);
          context.addFix({
            selector: describeElement(candidate),
            code: "moved-part",
            message:
              "Moved section content into the canonical [data-part=\"panel\"] container.",
          });
        }
      }
    }
  }
}

function annotateSelectableChildren(parent, context) {
  for (const child of getDirectTriggerCandidates(parent)) {
    annotatePart(
      child,
      "trigger",
      context,
      "Annotated a direct child control with data-value as a trigger.",
    );
  }
}

function annotateSelectablePanels(parent, context) {
  for (const child of getDirectPanelCandidates(parent)) {
    annotatePart(
      child,
      "panel",
      context,
      "Annotated a direct child content block with data-value as a panel.",
    );
  }
}

function getDirectTriggerCandidates(parent) {
  return Array.from(parent.children).filter((child) =>
    child instanceof HTMLElement &&
    child.hasAttribute("data-value") &&
    !child.hasAttribute("data-part") &&
    isButtonish(child)
  );
}

function getDirectPanelCandidates(parent) {
  return Array.from(parent.children).filter((child) =>
    child instanceof HTMLElement &&
    child.hasAttribute("data-value") &&
    !child.hasAttribute("data-part") &&
    !isButtonish(child)
  );
}

function annotateUniqueDirectWrapper(host, part, predicate, context) {
  const candidates = Array.from(host.children).filter((child) =>
    child instanceof HTMLElement &&
    !child.hasAttribute("data-part") &&
    predicate(child)
  );

  if (candidates.length !== 1) {
    return null;
  }

  annotatePart(
    candidates[0],
    part,
    context,
    `Annotated a direct child wrapper as [data-part="${part}"].`,
  );
  return candidates[0];
}

function ensureDirectWrapper(
  host,
  context,
  selector,
  tagName,
  part,
  position,
) {
  const existing = getOwnedElements(host, selector)[0] ?? null;
  if (existing) {
    return existing;
  }

  const wrapper = host.ownerDocument.createElement(tagName);
  wrapper.setAttribute("data-part", part);

  if (position === "prepend" && host.firstChild) {
    host.insertBefore(wrapper, host.firstChild);
  } else {
    host.append(wrapper);
  }

  context.addFix({
    selector: describeElement(wrapper),
    code: "created-wrapper",
    message: `Created the canonical [data-part="${part}"] wrapper.`,
  });

  return wrapper;
}

function moveOwnedElementsToWrapper(
  host,
  selector,
  wrapper,
  context,
  shouldMove = null,
) {
  for (const element of getOwnedElements(host, selector)) {
    if (wrapper.contains(element) || element === wrapper) {
      continue;
    }

    if (shouldMove && !shouldMove(element)) {
      continue;
    }

    wrapper.append(element);
    context.addFix({
      selector: describeElement(element),
      code: "moved-part",
      message:
        `Moved the authored ${element.localName} into the canonical [data-part="${wrapper.getAttribute("data-part")}"] wrapper.`,
    });
  }
}

function annotatePart(element, part, context, message) {
  if (element.getAttribute("data-part") === part) {
    return;
  }

  if (element.hasAttribute("data-part")) {
    return;
  }

  element.setAttribute("data-part", part);
  context.addFix({
    selector: describeElement(element),
    code: "annotated-part",
    message,
  });
}

function annotateItemContainers(root, context) {
  const listContainers = [root, ...root.querySelectorAll('[data-part="group"]')];
  for (const container of listContainers) {
    for (const item of getDirectChildElements(container, '[data-value]:not([data-part])')) {
      annotatePart(
        item,
        "item",
        context,
        "Annotated a list item with data-value as a tree item.",
      );
    }
  }
}

function wrapNestedTreeItems(item, context) {
  const nestedItems = getDirectChildElements(item, '[data-part="item"][data-value]');
  if (nestedItems.length === 0) {
    return;
  }

  let group = getDirectChildElements(item, '[data-part="group"]')[0] ?? null;
  if (!group) {
    group = item.ownerDocument.createElement("ul");
    group.setAttribute("data-part", "group");
    item.append(group);
    context.addFix({
      selector: describeElement(group),
      code: "created-wrapper",
      message: 'Created a canonical [data-part="group"] wrapper for nested tree items.',
    });
  }

  for (const nestedItem of nestedItems) {
    group.append(nestedItem);
    context.addFix({
      selector: describeElement(nestedItem),
      code: "moved-part",
      message: "Moved a nested tree item into the canonical group wrapper.",
    });
  }
}

function isButtonish(element) {
  return element.matches(
    'button, a, summary, [role="button"], [role="tab"]',
  );
}

function isToggleCandidate(element) {
  const label = (
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-labelledby") ||
    ""
  ).toLowerCase();

  return label.startsWith("toggle") ||
    label.includes("expand") ||
    label.includes("collapse");
}
