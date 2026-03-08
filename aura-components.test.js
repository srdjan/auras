import { assert, assertEquals, assertFalse } from "jsr:@std/assert@^1.0.14";
import { Window } from "npm:happy-dom";

const testWindow = new Window();

Object.assign(globalThis, {
  window: testWindow,
  document: testWindow.document,
  customElements: testWindow.customElements,
  HTMLElement: testWindow.HTMLElement,
  HTMLAnchorElement: testWindow.HTMLAnchorElement,
  KeyboardEvent: testWindow.KeyboardEvent,
  MouseEvent: testWindow.MouseEvent,
  CustomEvent: testWindow.CustomEvent,
  Event: testWindow.Event,
});

await import("./aura-components.js");

function renderMasterDetail(attributes = "") {
  document.body.innerHTML = `
    <aura-master-detail ${attributes}>
      <nav data-part="master" aria-label="Layers">
        <button type="button" data-part="trigger" data-value="elements">
          Elements
        </button>
        <button type="button" data-part="trigger" data-value="composites">
          Composites
        </button>
        <button type="button" data-part="trigger" data-value="components">
          Components
        </button>
      </nav>

      <section data-part="detail">
        <article data-part="panel" data-value="elements">Elements detail</article>
        <article data-part="panel" data-value="composites" hidden>
          Composites detail
        </article>
        <article data-part="panel" data-value="components" hidden>
          Components detail
        </article>
      </section>
    </aura-master-detail>
  `;

  const host = document.querySelector("aura-master-detail");
  if (!host) {
    throw new Error("Expected aura-master-detail host");
  }

  host.connectedCallback();

  const triggers = Array.from(host.querySelectorAll('[data-part="trigger"]'));
  const panels = Array.from(host.querySelectorAll('[data-part="panel"]'));

  return {
    host,
    triggers,
    panels,
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

Deno.test("falls back to the first valid item when the initial value is invalid", () => {
  const { host, triggers, panels } = renderMasterDetail('value="missing"');

  assertEquals(host.value, "elements");
  assert(triggers[0].hasAttribute("data-active"));
  assertFalse(triggers[1].hasAttribute("data-active"));
  assertFalse(panels[0].hidden);
  assert(panels[1].hidden);
  assertEquals(triggers[0].tabIndex, 0);
  assertEquals(triggers[1].tabIndex, -1);
});

Deno.test("clicking a trigger updates selection and dispatches aura-change", () => {
  const { host, triggers, panels } = renderMasterDetail('value="elements"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  triggers[2].click();

  assertEquals(host.value, "components");
  assertFalse(panels[2].hidden);
  assert(panels[0].hidden);
  assertEquals(changes, ["components"]);
});

Deno.test("reselecting the active item does not dispatch aura-change", () => {
  const { host, triggers } = renderMasterDetail('value="elements"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  triggers[0].click();
  host.show("elements");

  assertEquals(host.value, "elements");
  assertEquals(changes, []);
});

Deno.test("auto activation changes selection on arrow navigation", () => {
  const { host, triggers } = renderMasterDetail('value="elements"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  triggers[0].focus();
  dispatchKey(triggers[0], "ArrowDown");

  assertEquals(host.value, "composites");
  assertEquals(document.activeElement, triggers[1]);
  assertEquals(changes, ["composites"]);

  dispatchKey(triggers[1], "End");

  assertEquals(host.value, "components");
  assertEquals(document.activeElement, triggers[2]);
  assertEquals(changes, ["composites", "components"]);

  dispatchKey(triggers[2], "ArrowDown");

  assertEquals(host.value, "components");
  assertEquals(document.activeElement, triggers[2]);
  assertEquals(changes, ["composites", "components"]);
});

Deno.test("manual activation moves focus first and activates on Enter or Space", () => {
  const { host, triggers, panels } = renderMasterDetail(
    'value="elements" activation="manual"',
  );
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  triggers[0].focus();
  dispatchKey(triggers[0], "ArrowDown");

  assertEquals(host.value, "elements");
  assertEquals(document.activeElement, triggers[1]);
  assertFalse(triggers[1].hasAttribute("data-active"));
  assertEquals(changes, []);

  dispatchKey(triggers[1], "Enter");

  assertEquals(host.value, "composites");
  assert(triggers[1].hasAttribute("data-active"));
  assertFalse(panels[1].hidden);
  assertEquals(changes, ["composites"]);

  dispatchKey(triggers[1], "End");

  assertEquals(host.value, "composites");
  assertEquals(document.activeElement, triggers[2]);
  assertEquals(changes, ["composites"]);

  dispatchKey(triggers[2], " ");

  assertEquals(host.value, "components");
  assertEquals(changes, ["composites", "components"]);
});

Deno.test("invalid activation values normalize back to auto", () => {
  const { host } = renderMasterDetail('activation="sideways"');

  assertEquals(host.activation, "auto");
  assertEquals(host.getAttribute("activation"), null);
});

Deno.test("focusCurrent focuses the active trigger", () => {
  const { host, triggers } = renderMasterDetail('value="components"');

  host.focusCurrent();

  assertEquals(document.activeElement, triggers[2]);
});
