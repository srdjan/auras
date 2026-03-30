import { AurasElement } from "../../shared/auras-element.ts";
import {
  ensureElementId,
  getDirectionality,
  isActivationKey,
  isNativeInteractiveElement,
  normalizeActivation,
} from "../../shared/utilities.ts";

const CANVAS_SELECTOR = '[data-part="canvas"]';
const NODE_SELECTOR = '[data-part="node"][data-value]';
const PANEL_SELECTOR = '[data-part="panel"][data-value]';

type DiagramDirection = "up" | "down" | "left" | "right";

type SelectionOptions = {
  dispatch: boolean;
  focus: boolean;
};

type DiagramLayout = {
  columnStart: number;
  rowStart: number;
  order: number;
};

export type AurasDiagramEntry = {
  value: string;
  node: HTMLElement;
  panel: HTMLElement | null;
  layout: DiagramLayout;
};

function parseGridStartValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const startSegment = value.split("/")[0]?.trim();
  if (!startSegment) {
    return null;
  }

  const parsedValue = Number.parseInt(startSegment, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getEntryLayout(node: HTMLElement, index: number): DiagramLayout {
  return {
    columnStart:
      parseGridStartValue(node.style.getPropertyValue("--diagram-column")) ??
      index + 1,
    rowStart:
      parseGridStartValue(node.style.getPropertyValue("--diagram-row")) ?? 1,
    order: index,
  };
}

function getDirectionalScore(
  currentLayout: DiagramLayout,
  candidateLayout: DiagramLayout,
  direction: DiagramDirection,
): number | null {
  const columnDelta = candidateLayout.columnStart - currentLayout.columnStart;
  const rowDelta = candidateLayout.rowStart - currentLayout.rowStart;

  switch (direction) {
    case "right":
      if (columnDelta <= 0) {
        return null;
      }
      return (
        columnDelta * 1000 +
        Math.abs(rowDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "left":
      if (columnDelta >= 0) {
        return null;
      }
      return (
        Math.abs(columnDelta) * 1000 +
        Math.abs(rowDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "down":
      if (rowDelta <= 0) {
        return null;
      }
      return (
        rowDelta * 1000 +
        Math.abs(columnDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
    case "up":
      if (rowDelta >= 0) {
        return null;
      }
      return (
        Math.abs(rowDelta) * 1000 +
        Math.abs(columnDelta) * 10 +
        Math.abs(candidateLayout.order - currentLayout.order)
      );
  }
}

function getDiagramDirection(
  key: string,
  directionality: "ltr" | "rtl",
): DiagramDirection | null {
  switch (key) {
    case "ArrowDown":
      return "down";
    case "ArrowUp":
      return "up";
    case "ArrowRight":
      return directionality === "rtl" ? "left" : "right";
    case "ArrowLeft":
      return directionality === "rtl" ? "right" : "left";
    default:
      return null;
  }
}

function getNextDiagramIndex(
  entries: AurasDiagramEntry[],
  currentIndex: number,
  key: string,
  directionality: "ltr" | "rtl",
): number | null {
  if (entries.length === 0) {
    return null;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return entries.length - 1;
  }

  const direction = getDiagramDirection(key, directionality);
  if (!direction) {
    return null;
  }

  const currentEntry = entries[currentIndex];
  if (!currentEntry) {
    return null;
  }

  let bestIndex = currentIndex;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const [index, entry] of entries.entries()) {
    if (index === currentIndex) {
      continue;
    }

    const score = getDirectionalScore(
      currentEntry.layout,
      entry.layout,
      direction,
    );

    if (score == null || score >= bestScore) {
      continue;
    }

    bestIndex = index;
    bestScore = score;
  }

  return bestIndex;
}

export const AURAS_DIAGRAM_TAG_NAME = "auras-diagram";

export class AurasDiagram extends AurasElement {
  static override props = {
    value: { type: "string" as const },
    activation: {
      type: "string" as const,
      normalize: normalizeActivation,
    },
  };

  declare value: string | null;
  declare activation: "auto" | "manual";

  private _canvas: HTMLElement | null = null;
  private _entries: AurasDiagramEntry[] = [];

  show(value: string): boolean {
    return this._select(value, { dispatch: true, focus: false });
  }

  focusCurrent(): void {
    const activeEntry =
      this._entries.find((entry) => entry.node.hasAttribute("data-active")) ??
      this._entries[0];

    activeEntry?.node.focus();
  }

  protected override onConnect(): void | false {
    this._disconnectInternal();


    const canvas = this.querySelector<HTMLElement>(CANVAS_SELECTOR);
    if (!canvas) {
      return false;
    }

    const panelsByValue = new Map<string, HTMLElement>();
    for (const panel of this.querySelectorAll<HTMLElement>(PANEL_SELECTOR)) {
      const value = panel.getAttribute("data-value");
      if (value && !panelsByValue.has(value)) {
        panelsByValue.set(value, panel);
      }
    }

    const entries: AurasDiagramEntry[] = [];
    let order = 0;
    for (const node of canvas.querySelectorAll<HTMLElement>(NODE_SELECTOR)) {
      const value = node.getAttribute("data-value");
      if (!value) {
        continue;
      }

      const panel = panelsByValue.get(value) ?? null;
      const entry = {
        value,
        node,
        panel,
        layout: getEntryLayout(node, order),
      };

      this._applyEntrySemantics(entry);
      entries.push(entry);
      order += 1;
    }

    if (entries.length === 0) {
      return false;
    }

    this._canvas = canvas;
    this._entries = entries;

    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "group");
    }

    this.toggleAttribute(
      "data-has-panels",
      entries.some((entry) => entry.panel !== null),
    );

    canvas.addEventListener("click", this._handleClick);
    canvas.addEventListener("keydown", this._handleKeydown);

    this._normalizeNormalizedProp("activation");

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      this._select(entries[0].value, { dispatch: false, focus: false });
    }
  }

  protected override onDisconnect(): void {
    this._disconnectInternal();
  }

  protected override onAttributeChange(
    name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    if (name === "activation") {
      this._normalizeNormalizedProp("activation");
      return;
    }

    if (!this._selectFromAttribute({ dispatch: false, focus: false })) {
      const firstEntry = this._entries[0];
      if (firstEntry) {
        this._select(firstEntry.value, { dispatch: false, focus: false });
      }
    }
  }

  private _disconnectInternal(): void {
    if (this._canvas) {
      this._canvas.removeEventListener("click", this._handleClick);
      this._canvas.removeEventListener("keydown", this._handleKeydown);
    }

    this._canvas = null;
    this._entries = [];
    this.removeAttribute("data-has-panels");
  }

  private _selectFromAttribute(options: SelectionOptions): boolean {
    const value = this.getAttribute("value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  private _applyEntrySemantics(entry: AurasDiagramEntry): void {
    if (
      !isNativeInteractiveElement(entry.node) &&
      !entry.node.hasAttribute("role")
    ) {
      entry.node.setAttribute("role", "button");
    }

    entry.node.setAttribute("aria-current", "false");

    if (!entry.panel) {
      return;
    }

    entry.node.setAttribute(
      "aria-controls",
      ensureElementId(entry.panel, "auras-diagram-panel"),
    );
    entry.node.setAttribute("aria-expanded", "false");
    entry.panel.setAttribute("role", "region");
    entry.panel.setAttribute(
      "aria-labelledby",
      ensureElementId(entry.node, "auras-diagram-node"),
    );
  }

  private _select(value: string, options: SelectionOptions): boolean {
    const entry = this._entries.find(
      (currentEntry) => currentEntry.value === value,
    );
    if (!entry) {
      return false;
    }

    const previousValue = this.getAttribute("value");
    const didChange = previousValue !== entry.value;

    for (const currentEntry of this._entries) {
      const isActive = currentEntry === entry;

      currentEntry.node.tabIndex = isActive ? 0 : -1;
      currentEntry.node.toggleAttribute("data-active", isActive);

      if (isActive) {
        currentEntry.node.setAttribute("aria-current", "true");
      } else {
        currentEntry.node.setAttribute("aria-current", "false");
      }

      if (currentEntry.panel) {
        currentEntry.panel.hidden = !isActive;
        currentEntry.panel.toggleAttribute("data-active", isActive);
        currentEntry.node.setAttribute("aria-expanded", String(isActive));
      }
    }

    this._syncAttribute("value", entry.value);

    if (options.focus) {
      entry.node.focus();
    }

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
          detail: {
            value: entry.value,
            node: entry.node,
            panel: entry.panel,
          },
          bubbles: true,
        }),
      );
    }

    return true;
  }

  private _activateNode(
    node: HTMLElement,
    options: SelectionOptions,
  ): boolean {
    const value = node.getAttribute("data-value");
    if (!value) {
      return false;
    }

    return this._select(value, options);
  }

  private _handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const node = target.closest(NODE_SELECTOR);
    if (!(node instanceof HTMLElement) || !this._canvas?.contains(node)) {
      return;
    }

    if (node instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    this._activateNode(node, { dispatch: true, focus: false });
  }

  private _handleKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const node = target.closest(NODE_SELECTOR);
    if (!(node instanceof HTMLElement) || !this._canvas?.contains(node)) {
      return;
    }

    const currentIndex = this._entries.findIndex(
      (entry) => entry.node === node,
    );
    if (currentIndex < 0) {
      return;
    }

    if (isActivationKey(event.key)) {
      if (this.activation === "manual") {
        event.preventDefault();
        this._activateNode(node, { dispatch: true, focus: false });
      }
      return;
    }

    const nextIndex = getNextDiagramIndex(
      this._entries,
      currentIndex,
      event.key,
      getDirectionality(this),
    );
    if (nextIndex == null) {
      return;
    }

    event.preventDefault();

    const nextEntry = this._entries[nextIndex];
    if (!nextEntry) {
      return;
    }

    nextEntry.node.focus();

    if (this.activation === "auto") {
      this._select(nextEntry.value, { dispatch: true, focus: false });
    }
  }
}

export function registerAurasDiagram(): typeof AurasDiagram {
  if (!customElements.get(AURAS_DIAGRAM_TAG_NAME)) {
    customElements.define(AURAS_DIAGRAM_TAG_NAME, AurasDiagram);
  }

  return AurasDiagram;
}
