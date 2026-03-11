import {
  ensureElementId,
  upgradeProperty,
} from "./shared/selectable-panels.ts";

const PRIMARY_PANE_SELECTOR = '[data-part="pane"][data-pane="primary"]';
const SECONDARY_PANE_SELECTOR = '[data-part="pane"][data-pane="secondary"]';
const SEPARATOR_SELECTOR = '[data-part="separator"]';

type AurasSplitterOrientation = "horizontal" | "vertical";

type AurasSplitterBounds = {
  min: number;
  max: number;
  step: number;
};

type SelectionOptions = {
  dispatch: boolean;
};

export const AURAS_SPLITTER_TAG_NAME = "auras-splitter";

export class AurasSplitter extends HTMLElement {
  static observedAttributes = ["value", "orientation", "min", "max", "step"];

  private _primaryPane: HTMLElement | null = null;
  private _secondaryPane: HTMLElement | null = null;
  private _separator: HTMLElement | null = null;
  private _value = 50;
  private _dragging = false;
  private _rafId = 0;
  private _syncingValue = false;
  private _syncingOrientation = false;

  constructor() {
    super();

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  connectedCallback(): void {
    upgradeProperty(this, "value");
    upgradeProperty(this, "orientation");
    upgradeProperty(this, "min");
    upgradeProperty(this, "max");
    upgradeProperty(this, "step");
    this._connect();
  }

  disconnectedCallback(): void {
    this._disconnect();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (name === "orientation") {
      if (this._syncingOrientation) {
        return;
      }

      this._syncOrientationAttribute();
      this._applyState({ dispatch: false });
      return;
    }

    if (name === "value" && this._syncingValue) {
      return;
    }

    this._applyState({ dispatch: false });
  }

  get value(): number {
    return this._value;
  }

  set value(value: number | string | null) {
    if (value == null || value === "") {
      this.removeAttribute("value");
      return;
    }

    this.setAttribute("value", String(value));
  }

  get orientation(): AurasSplitterOrientation {
    return normalizeOrientation(this.getAttribute("orientation"));
  }

  set orientation(value: AurasSplitterOrientation | string | null) {
    if (normalizeOrientation(value) === "horizontal") {
      this.removeAttribute("orientation");
      return;
    }

    this.setAttribute("orientation", "vertical");
  }

  get min(): number {
    return this._getBounds().min;
  }

  get max(): number {
    return this._getBounds().max;
  }

  get step(): number {
    return this._getBounds().step;
  }

  setPosition(value: number): boolean {
    return this._setValue(value, { dispatch: true });
  }

  focusHandle(): void {
    this._separator?.focus();
  }

  private _connect(): void {
    this._disconnect();

    const primaryPane = this.querySelector<HTMLElement>(PRIMARY_PANE_SELECTOR);
    const secondaryPane = this.querySelector<HTMLElement>(
      SECONDARY_PANE_SELECTOR,
    );
    const separator = this.querySelector<HTMLElement>(SEPARATOR_SELECTOR);

    if (!primaryPane || !secondaryPane || !separator) {
      return;
    }

    this._primaryPane = primaryPane;
    this._secondaryPane = secondaryPane;
    this._separator = separator;

    this._applySemantics();
    separator.addEventListener("mousedown", this._handleMouseDown);
    separator.addEventListener("keydown", this._handleKeydown);

    this._syncOrientationAttribute();
    this._applyState({ dispatch: false });
  }

  private _disconnect(): void {
    this._stopDragging();

    if (this._separator) {
      this._separator.removeEventListener("mousedown", this._handleMouseDown);
      this._separator.removeEventListener("keydown", this._handleKeydown);
    }

    this._primaryPane = null;
    this._secondaryPane = null;
    this._separator = null;
    this._dragging = false;
    this.removeAttribute("data-dragging");
  }

  private _applySemantics(): void {
    if (!this._primaryPane || !this._secondaryPane || !this._separator) {
      return;
    }

    const primaryId = ensureElementId(this._primaryPane, "auras-splitter-pane");
    const secondaryId = ensureElementId(
      this._secondaryPane,
      "auras-splitter-pane",
    );

    this._separator.setAttribute("role", "separator");
    this._separator.setAttribute(
      "aria-controls",
      `${primaryId} ${secondaryId}`,
    );

    if (!this._separator.hasAttribute("tabindex")) {
      this._separator.tabIndex = 0;
    }
  }

  private _syncOrientationAttribute(): void {
    const orientation = this.orientation;

    this._syncingOrientation = true;
    if (orientation === "horizontal") {
      this.removeAttribute("orientation");
    } else {
      this.setAttribute("orientation", "vertical");
    }
    this._syncingOrientation = false;
  }

  private _applyState(options: SelectionOptions): void {
    if (!this._separator) {
      return;
    }

    const nextValue = this._resolveValue();
    this._setValue(nextValue, options);

    this._separator.setAttribute("aria-orientation", this.orientation);
  }

  private _resolveValue(): number {
    const bounds = this._getBounds();
    return clampPercent(
      parseNumericAttribute(this.getAttribute("value"), 50),
      bounds.min,
      bounds.max,
    );
  }

  private _getBounds(): AurasSplitterBounds {
    const min = clampPercent(
      parseNumericAttribute(this.getAttribute("min"), 20),
      0,
      95,
    );
    const max = clampPercent(
      parseNumericAttribute(this.getAttribute("max"), 80),
      min + 1,
      100,
    );
    const step = clampPercent(
      parseNumericAttribute(this.getAttribute("step"), 5),
      1,
      25,
    );

    return {
      min,
      max,
      step,
    };
  }

  private _setValue(nextValue: number, options: SelectionOptions): boolean {
    if (!this._separator) {
      return false;
    }

    const bounds = this._getBounds();
    const normalizedValue = clampPercent(nextValue, bounds.min, bounds.max);
    const didChange = normalizedValue !== this._value;

    this._value = normalizedValue;
    this.style.setProperty("--splitter-primary-size", `${normalizedValue}%`);

    const currentAttribute = this.getAttribute("value");
    const nextAttribute = String(normalizedValue);
    if (currentAttribute !== nextAttribute) {
      this._syncingValue = true;
      this.setAttribute("value", nextAttribute);
      this._syncingValue = false;
    }

    this._separator.setAttribute("aria-valuemin", String(bounds.min));
    this._separator.setAttribute("aria-valuemax", String(bounds.max));
    this._separator.setAttribute("aria-valuenow", nextAttribute);

    if (options.dispatch && didChange) {
      this.dispatchEvent(
        new CustomEvent("auras-change", {
          detail: {
            value: normalizedValue,
            separator: this._separator,
            primaryPane: this._primaryPane,
            secondaryPane: this._secondaryPane,
          },
          bubbles: true,
        }),
      );
    }

    return didChange;
  }

  private _handleMouseDown(event: MouseEvent): void {
    if (!(event.currentTarget instanceof HTMLElement) || event.button !== 0) {
      return;
    }

    event.preventDefault();
    this._dragging = true;
    this.setAttribute("data-dragging", "");

    document.addEventListener("mousemove", this._handleMouseMove);
    document.addEventListener("mouseup", this._handleMouseUp);
  }

  private _handleMouseMove(event: MouseEvent): void {
    if (!this._dragging) {
      return;
    }

    const position = this._positionFromPointer(event);
    if (typeof requestAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        this._setValue(position, { dispatch: true });
      });
    } else {
      this._setValue(position, { dispatch: true });
    }
  }

  private _handleMouseUp(): void {
    this._stopDragging();
  }

  private _stopDragging(): void {
    if (!this._dragging) {
      return;
    }

    this._dragging = false;
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
    }
    this.removeAttribute("data-dragging");
    document.removeEventListener("mousemove", this._handleMouseMove);
    document.removeEventListener("mouseup", this._handleMouseUp);
  }

  private _positionFromPointer(event: MouseEvent): number {
    const rect = this.getBoundingClientRect();

    if (this.orientation === "vertical") {
      const offset = event.clientY - rect.top;
      return (offset / rect.height) * 100;
    }

    const offset = event.clientX - rect.left;
    return (offset / rect.width) * 100;
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (!(event.currentTarget instanceof HTMLElement) || !this._separator) {
      return;
    }

    const step = this.step;

    switch (event.key) {
      case "ArrowLeft":
        if (this.orientation !== "horizontal") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value - step, { dispatch: true });
        return;
      case "ArrowRight":
        if (this.orientation !== "horizontal") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value + step, { dispatch: true });
        return;
      case "ArrowUp":
        if (this.orientation !== "vertical") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value - step, { dispatch: true });
        return;
      case "ArrowDown":
        if (this.orientation !== "vertical") {
          return;
        }
        event.preventDefault();
        this._setValue(this._value + step, { dispatch: true });
        return;
      case "Home":
        event.preventDefault();
        this._setValue(this.min, { dispatch: true });
        return;
      case "End":
        event.preventDefault();
        this._setValue(this.max, { dispatch: true });
        return;
      default:
        return;
    }
  }
}

export function registerAurasSplitter(): typeof AurasSplitter {
  if (!customElements.get(AURAS_SPLITTER_TAG_NAME)) {
    customElements.define(AURAS_SPLITTER_TAG_NAME, AurasSplitter);
  }

  return AurasSplitter;
}

function normalizeOrientation(
  value: string | null | undefined,
): AurasSplitterOrientation {
  return value === "vertical" ? "vertical" : "horizontal";
}

function parseNumericAttribute(
  value: string | null | undefined,
  fallbackValue: number,
): number {
  if (value == null || value === "") {
    return fallbackValue;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return parsedValue;
}

function clampPercent(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}
