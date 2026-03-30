import { upgradeProperty } from "./utilities.ts";

type PropType = "string" | "boolean" | "number";

type PropDefinition = {
  type?: PropType;
  attribute?: string;
  normalize?: (value: string | null | undefined) => unknown;
};

type PropDeclarations = Record<string, PropDefinition>;

function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

const _propsInstalled = new WeakSet<Function>();

function installProps(Ctor: typeof AurasElement): void {
  if (_propsInstalled.has(Ctor)) {
    return;
  }
  _propsInstalled.add(Ctor);

  const props = Ctor.props;
  if (!props || Object.keys(props).length === 0) {
    return;
  }

  const observedAttrs: string[] = [];

  for (const [propName, definition] of Object.entries(props)) {
    const attrName = definition.attribute ?? camelToKebab(propName);
    const propType = definition.type ?? "string";

    observedAttrs.push(attrName);

    if (Object.getOwnPropertyDescriptor(Ctor.prototype, propName)) {
      continue;
    }

    const descriptor: PropertyDescriptor = createPropDescriptor(
      attrName,
      propType,
      definition.normalize,
    );

    Object.defineProperty(Ctor.prototype, propName, descriptor);
  }

  Object.defineProperty(Ctor, "observedAttributes", {
    configurable: true,
    get() {
      return observedAttrs;
    },
  });
}

function createPropDescriptor(
  attrName: string,
  propType: PropType,
  normalize?: (value: string | null | undefined) => unknown,
): PropertyDescriptor {
  switch (propType) {
    case "boolean":
      return {
        configurable: true,
        enumerable: true,
        get(this: HTMLElement) {
          return this.hasAttribute(attrName);
        },
        set(this: HTMLElement, value: boolean) {
          this.toggleAttribute(attrName, Boolean(value));
        },
      };

    case "number":
      return {
        configurable: true,
        enumerable: true,
        get(this: HTMLElement) {
          const raw = this.getAttribute(attrName);
          if (raw == null || raw === "") {
            return 0;
          }
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : 0;
        },
        set(this: HTMLElement, value: number | string | null) {
          if (value == null || value === "") {
            this.removeAttribute(attrName);
            return;
          }
          this.setAttribute(attrName, String(value));
        },
      };

    default: {
      if (normalize) {
        return {
          configurable: true,
          enumerable: true,
          get(this: HTMLElement) {
            return normalize(this.getAttribute(attrName));
          },
          set(this: HTMLElement, value: string | null) {
            const normalized = normalize(value) as string;
            const defaultValue = normalize(null) as string;
            if (normalized === defaultValue) {
              this.removeAttribute(attrName);
              return;
            }
            this.setAttribute(attrName, normalized);
          },
        };
      }

      return {
        configurable: true,
        enumerable: true,
        get(this: HTMLElement) {
          return this.getAttribute(attrName);
        },
        set(this: HTMLElement, value: string | null) {
          if (value == null || value === "") {
            this.removeAttribute(attrName);
            return;
          }
          this.setAttribute(attrName, String(value));
        },
      };
    }
  }
}

const _handlerNamesCache = new WeakMap<Function, string[]>();

export class AurasElement extends HTMLElement {
  static props: PropDeclarations = {};

  private __syncing: Set<string> = new Set();

  constructor() {
    super();
    installProps(this.constructor as typeof AurasElement);
    this._autoBindHandlers();
  }

  connectedCallback(): void {
    const Ctor = this.constructor as typeof AurasElement;
    const props = Ctor.props;
    for (const propName of Object.keys(props)) {
      upgradeProperty(this, propName as keyof this);
    }

    const connected = this.onConnect();
    if (connected !== false) {
      this.setAttribute("hydrated", "");
    }
  }

  disconnectedCallback(): void {
    this.onDisconnect();
    this.removeAttribute("hydrated");
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }

    if (this.__syncing.has(name)) {
      return;
    }

    this.onAttributeChange(name, oldValue, newValue);
  }

  protected onConnect(): void | false {}
  protected onDisconnect(): void {}
  protected onAttributeChange(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {}

  protected _normalizeNormalizedProp(propName: string): void {
    const Ctor = this.constructor as typeof AurasElement;
    const definition = Ctor.props[propName];
    if (!definition?.normalize) {
      return;
    }

    const attrName = definition.attribute ?? camelToKebab(propName);
    const raw = this.getAttribute(attrName);
    const normalized = definition.normalize(raw) as string;
    const defaultValue = definition.normalize(null) as string;

    if (normalized === defaultValue) {
      this._syncAttribute(attrName, null);
    } else {
      this._syncAttribute(attrName, normalized);
    }
  }

  protected _syncAttribute(name: string, value: string | null): void {
    if (this.getAttribute(name) === value) {
      return;
    }

    this.__syncing.add(name);
    if (value === null) {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, value);
    }
    this.__syncing.delete(name);
  }

  protected _syncToggleAttribute(name: string, force: boolean): void {
    const current = this.hasAttribute(name);
    if (current === force) {
      return;
    }

    this.__syncing.add(name);
    this.toggleAttribute(name, force);
    this.__syncing.delete(name);
  }

  private _autoBindHandlers(): void {
    const Ctor = this.constructor;
    let names = _handlerNamesCache.get(Ctor);

    if (!names) {
      names = [];
      let proto = Object.getPrototypeOf(this);
      const stopAt = AurasElement.prototype;

      while (proto && proto !== stopAt) {
        for (const key of Object.getOwnPropertyNames(proto)) {
          if (
            key.startsWith("_handle") &&
            typeof proto[key] === "function"
          ) {
            names.push(key);
          }
        }
        proto = Object.getPrototypeOf(proto);
      }
      _handlerNamesCache.set(Ctor, names);
    }

    const proto = Object.getPrototypeOf(this);
    for (const key of names) {
      (this as Record<string, unknown>)[key] = proto[key].bind(this);
    }
  }
}
