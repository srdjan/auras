import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
import { Window } from "npm:happy-dom";

const testWindow = new Window();

Object.assign(globalThis, {
  window: testWindow,
  document: testWindow.document,
  customElements: testWindow.customElements,
  Element: testWindow.Element,
  HTMLElement: testWindow.HTMLElement,
  HTMLButtonElement: testWindow.HTMLButtonElement,
  KeyboardEvent: testWindow.KeyboardEvent,
  MouseEvent: testWindow.MouseEvent,
  CustomEvent: testWindow.CustomEvent,
  Event: testWindow.Event,
});

await testWindow.happyDOM.whenAsyncComplete();

const { registerAuraComponents } = await import(
  "../packages/components/mod.ts"
);

registerAuraComponents();

function connectHost(tagName, markup) {
  document.body.innerHTML = markup;

  const host = document.querySelector(tagName);
  if (!host) {
    throw new Error(`Expected ${tagName} host`);
  }

  host.connectedCallback();

  return host;
}

function renderSplitter(attributes = "") {
  const host = connectHost(
    "aura-splitter",
    `
      <aura-splitter ${attributes}>
        <section data-part="pane" data-pane="primary">Primary</section>
        <button
          type="button"
          data-part="separator"
          aria-label="Resize panes"
        ></button>
        <section data-part="pane" data-pane="secondary">Secondary</section>
      </aura-splitter>
    `,
  );

  const separator = host.querySelector('[data-part="separator"]');
  const panes = Array.from(host.querySelectorAll('[data-part="pane"]'));

  host.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 500,
    width: 1000,
    height: 500,
    toJSON() {
      return {};
    },
  });

  return {
    host,
    separator,
    panes,
  };
}

function dispatchKey(target, key) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
    }),
  );
}

Deno.test(
  "splitter falls back to defaults and applies separator semantics",
  () => {
    const { host, separator, panes } = renderSplitter(
      'value="missing" orientation="sideways"',
    );

    assertEquals(host.value, 50);
    assertEquals(host.orientation, "horizontal");
    assertEquals(host.style.getPropertyValue("--splitter-primary-size"), "50%");
    assertEquals(separator.getAttribute("role"), "separator");
    assertEquals(separator.getAttribute("aria-orientation"), "horizontal");
    assertEquals(separator.getAttribute("aria-valuemin"), "20");
    assertEquals(separator.getAttribute("aria-valuemax"), "80");
    assertEquals(separator.getAttribute("aria-valuenow"), "50");
    assertEquals(separator.tabIndex, 0);
    assert(separator.getAttribute("aria-controls"));
    assert(panes[0].id);
    assert(panes[1].id);
  },
);

Deno.test("splitter keyboard resizing updates value and dispatches aura-change", () => {
  const { host, separator } = renderSplitter(
    'value="45" min="25" max="75" step="10"',
  );
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  separator.focus();
  dispatchKey(separator, "ArrowRight");

  assertEquals(host.value, 55);
  assertEquals(host.getAttribute("value"), "55");
  assertEquals(separator.getAttribute("aria-valuenow"), "55");

  dispatchKey(separator, "Home");
  dispatchKey(separator, "End");

  assertEquals(host.value, 75);
  assertEquals(changes, [55, 25, 75]);
});

Deno.test("splitter vertical orientation uses up and down keys", () => {
  const { host, separator } = renderSplitter(
    'value="40" orientation="vertical" min="30" max="70" step="5"',
  );

  dispatchKey(separator, "ArrowDown");
  assertEquals(host.value, 45);

  dispatchKey(separator, "ArrowUp");
  assertEquals(host.value, 40);
  assertEquals(separator.getAttribute("aria-orientation"), "vertical");
});

Deno.test("splitter drag updates the position within bounds", () => {
  const { host, separator } = renderSplitter('value="45" min="25" max="75"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  separator.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      button: 0,
      clientX: 450,
    }),
  );

  document.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      clientX: 720,
    }),
  );

  assertEquals(host.value, 72);
  assert(host.hasAttribute("data-dragging"));

  document.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      clientX: 720,
    }),
  );

  assertEquals(changes, [72]);
  assertEquals(host.hasAttribute("data-dragging"), false);
});

Deno.test("splitter methods clamp values and focus the separator", () => {
  const { host, separator } = renderSplitter('value="45" min="25" max="75"');

  assertEquals(host.setPosition(10), true);
  assertEquals(host.value, 25);
  assertEquals(host.setPosition(25), false);
  assertEquals(host.setPosition(80), true);
  assertEquals(host.value, 75);

  host.focusHandle();

  assertEquals(document.activeElement, separator);
});
