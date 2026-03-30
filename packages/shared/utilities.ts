let generatedIdSequence = 0;

export type AurasActivation = "auto" | "manual";

export function normalizeActivation(
  value: string | null | undefined,
): AurasActivation {
  return value === "manual" ? "manual" : "auto";
}

export function getDirectionality(node: Element): "ltr" | "rtl" {
  if (node.closest('[dir="rtl"]') || document.documentElement.dir === "rtl") {
    return "rtl";
  }

  return "ltr";
}

export function ensureElementId(
  element: HTMLElement,
  prefix: string,
): string {
  if (element.id) {
    return element.id;
  }

  generatedIdSequence += 1;
  element.id = `${prefix}-${generatedIdSequence}`;
  return element.id;
}

export function upgradeProperty<T extends object, K extends keyof T>(
  node: T,
  name: K,
): void {
  if (!Object.prototype.hasOwnProperty.call(node, name)) {
    return;
  }

  const value = node[name];
  delete node[name];
  node[name] = value;
}

export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export function isNativeInteractiveElement(node: HTMLElement): boolean {
  return (
    node instanceof HTMLButtonElement ||
    node instanceof HTMLAnchorElement ||
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

export function clampPercent(
  value: number,
  min: number,
  max: number,
): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function parseNumericAttribute(
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
