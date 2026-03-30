/// <reference lib="deno.ns" />

import { assert, assertEquals, assertFalse } from "jsr:@std/assert@^1.0.14";
import { Window } from "npm:happy-dom";

const testWindow = new Window();

Object.assign(globalThis, {
  window: testWindow,
  document: testWindow.document,
  customElements: testWindow.customElements,
  Element: testWindow.Element,
  HTMLElement: testWindow.HTMLElement,
  HTMLAnchorElement: testWindow.HTMLAnchorElement,
  HTMLButtonElement: testWindow.HTMLButtonElement,
  HTMLInputElement: testWindow.HTMLInputElement,
  HTMLSelectElement: testWindow.HTMLSelectElement,
  HTMLTextAreaElement: testWindow.HTMLTextAreaElement,
  KeyboardEvent: testWindow.KeyboardEvent,
  MouseEvent: testWindow.MouseEvent,
  CustomEvent: testWindow.CustomEvent,
  Event: testWindow.Event,
});

await testWindow.happyDOM.whenAsyncComplete();

const { AurasElement } = await import("../packages/shared/auras-element.ts");
const { normalizeActivation } = await import(
  "../packages/shared/utilities.ts"
);

let tagSequence = 0;

function defineTestElement(
  ElementClass: typeof AurasElement,
): typeof AurasElement {
  tagSequence += 1;
  const tagName = `test-el-${tagSequence}`;
  customElements.define(tagName, ElementClass);
  return ElementClass;
}

function connectElement(
  tagName: string,
  attributes = "",
): HTMLElement {
  document.body.innerHTML = `<${tagName} ${attributes}></${tagName}>`;
  const el = document.querySelector(tagName);
  if (!el) {
    throw new Error(`Expected ${tagName} host`);
  }
  (el as { connectedCallback?: () => void }).connectedCallback?.();
  return el as HTMLElement;
}

Deno.test("observedAttributes computed from static props", () => {
  class TestEl extends AurasElement {
    static override props = {
      value: { type: "string" as const },
      activation: {
        type: "string" as const,
        normalize: normalizeActivation,
      },
    };
  }
  defineTestElement(TestEl);

  // installProps runs on first construction
  connectElement(`test-el-${tagSequence}`);

  const observed = (TestEl as unknown as { observedAttributes: string[] })
    .observedAttributes;
  assertEquals(observed, ["value", "activation"]);
});

Deno.test("string property getter and setter sync with attributes", () => {
  class TestEl extends AurasElement {
    static override props = {
      value: { type: "string" as const },
    };
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`, 'value="hello"');

  assertEquals((el as unknown as { value: string | null }).value, "hello");

  (el as unknown as { value: string | null }).value = "world";
  assertEquals(el.getAttribute("value"), "world");

  (el as unknown as { value: string | null }).value = null;
  assertFalse(el.hasAttribute("value"));
});

Deno.test("boolean property getter and setter sync with attributes", () => {
  class TestEl extends AurasElement {
    static override props = {
      open: { type: "boolean" as const },
    };
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`);
  assertEquals((el as unknown as { open: boolean }).open, false);

  (el as unknown as { open: boolean }).open = true;
  assert(el.hasAttribute("open"));

  (el as unknown as { open: boolean }).open = false;
  assertFalse(el.hasAttribute("open"));
});

Deno.test("normalized property applies normalize function", () => {
  class TestEl extends AurasElement {
    static override props = {
      activation: {
        type: "string" as const,
        normalize: normalizeActivation,
      },
    };
  }
  defineTestElement(TestEl);

  const el = connectElement(
    `test-el-${tagSequence}`,
    'activation="sideways"',
  );

  assertEquals(
    (el as unknown as { activation: string }).activation,
    "auto",
  );

  (el as unknown as { activation: string }).activation = "manual";
  assertEquals(el.getAttribute("activation"), "manual");

  (el as unknown as { activation: string }).activation = "auto";
  assertFalse(el.hasAttribute("activation"));
});

Deno.test("onConnect and onDisconnect hooks are called", () => {
  const log: string[] = [];

  class TestEl extends AurasElement {
    static override props = {};

    protected override onConnect(): void {
      log.push("connect");
    }

    protected override onDisconnect(): void {
      log.push("disconnect");
    }
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`);
  // happy-dom may call connectedCallback on insertion plus our explicit call
  assert(log.includes("connect"));
  const connectCount = log.filter((x) => x === "connect").length;

  (el as unknown as { disconnectedCallback: () => void })
    .disconnectedCallback();
  assertEquals(
    log.filter((x) => x === "disconnect").length,
    1,
  );
  assert(log.length === connectCount + 1);
});

Deno.test("attributeChangedCallback guards against same value and syncing", () => {
  const changes: string[] = [];

  class TestEl extends AurasElement {
    static override props = {
      value: { type: "string" as const },
    };

    protected override onAttributeChange(name: string): void {
      changes.push(name);
    }
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`, 'value="a"');

  (el as unknown as {
    attributeChangedCallback: (
      n: string,
      o: string | null,
      v: string | null,
    ) => void;
  }).attributeChangedCallback("value", "a", "a");
  assertEquals(changes, []);

  (el as unknown as {
    attributeChangedCallback: (
      n: string,
      o: string | null,
      v: string | null,
    ) => void;
  }).attributeChangedCallback("value", "a", "b");
  assertEquals(changes, ["value"]);
});

Deno.test("_syncAttribute prevents feedback loops", () => {
  const changes: string[] = [];

  class TestEl extends AurasElement {
    static override props = {
      value: { type: "string" as const },
    };

    protected override onAttributeChange(name: string): void {
      changes.push(name);
    }

    doSync(value: string): void {
      this._syncAttribute("value", value);
    }
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`, 'value="a"') as TestEl;
  el.doSync("b");

  assertEquals(el.getAttribute("value"), "b");
  assertEquals(changes, []);
});

Deno.test("auto-binding binds _handle methods", () => {
  let clickContext: unknown = null;

  class TestEl extends AurasElement {
    static override props = {};

    _handleClick(): void {
      clickContext = this;
    }
  }
  defineTestElement(TestEl);

  const el = connectElement(`test-el-${tagSequence}`) as TestEl;

  const bound = el._handleClick;
  bound();

  assertEquals(clickContext, el);
});

Deno.test("upgradeProperty runs on connect for declared props", () => {
  class TestEl extends AurasElement {
    static override props = {
      value: { type: "string" as const },
    };
  }
  defineTestElement(TestEl);

  document.body.innerHTML = `<test-el-${tagSequence}></test-el-${tagSequence}>`;
  const el = document.querySelector(
    `test-el-${tagSequence}`,
  ) as unknown as TestEl & { value: string | null };

  // Simulate setting a property before upgrade (before connectedCallback)
  Object.defineProperty(el, "value", {
    value: "pre-upgrade",
    writable: true,
    configurable: true,
  });

  assertEquals(el.value, "pre-upgrade");

  (el as unknown as { connectedCallback: () => void }).connectedCallback();

  // After upgrade, the property should be funneled through the accessor
  assertEquals(el.getAttribute("value"), "pre-upgrade");
});
