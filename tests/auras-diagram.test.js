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

const { registerAurasDiagram } = await import("../packages/diagram/mod.ts");

registerAurasDiagram();

function connectHost(markup) {
  document.body.innerHTML = markup;

  const host = document.querySelector("auras-diagram");
  if (!host) {
    throw new Error("Expected auras-diagram host");
  }

  host.connectedCallback();

  return host;
}

function renderDiagram(attributes = "") {
  const host = connectHost(
    `
      <auras-diagram ${attributes}>
        <p data-part="caption">Order flow</p>

        <div data-part="canvas">
          <button
            type="button"
            data-part="node"
            data-value="received"
            style="--diagram-column: 1 / span 3; --diagram-row: 1"
          >
            Received
          </button>
          <button
            type="button"
            data-part="node"
            data-value="validate"
            style="--diagram-column: 5 / span 3; --diagram-row: 1"
          >
            Validate
          </button>
          <button
            type="button"
            data-part="node"
            data-value="fulfill"
            style="--diagram-column: 9 / span 3; --diagram-row: 1"
          >
            Fulfill
          </button>
          <button
            type="button"
            data-part="node"
            data-value="review"
            style="--diagram-column: 5 / span 3; --diagram-row: 3"
          >
            Review
          </button>
        </div>

        <section data-part="panels">
          <article data-part="panel" data-value="received">Received panel</article>
          <article data-part="panel" data-value="validate" hidden>
            Validate panel
          </article>
          <article data-part="panel" data-value="fulfill" hidden>
            Fulfill panel
          </article>
          <article data-part="panel" data-value="review" hidden>
            Review panel
          </article>
        </section>
      </auras-diagram>
    `,
  );

  const nodes = Array.from(host.querySelectorAll('[data-part="node"]'));
  const panels = Array.from(host.querySelectorAll('[data-part="panel"]'));

  return {
    host,
    nodes,
    panels,
  };
}

function renderDiagramWithoutPanels(attributes = "") {
  const host = connectHost(
    `
      <auras-diagram ${attributes}>
        <div data-part="canvas">
          <button
            type="button"
            data-part="node"
            data-value="received"
            style="--diagram-column: 1 / span 3; --diagram-row: 1"
          >
            Received
          </button>
          <button
            type="button"
            data-part="node"
            data-value="validate"
            style="--diagram-column: 5 / span 3; --diagram-row: 1"
          >
            Validate
          </button>
        </div>
      </auras-diagram>
    `,
  );

  const nodes = Array.from(host.querySelectorAll('[data-part="node"]'));

  return {
    host,
    nodes,
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
  "diagram falls back to the first valid node when the initial value is invalid",
  () => {
    const { host, nodes, panels } = renderDiagram('value="missing"');

    assertEquals(host.value, "received");
    assert(host.hasAttribute("data-has-panels"));
    assert(nodes[0].hasAttribute("data-active"));
    assertFalse(nodes[1].hasAttribute("data-active"));
    assertFalse(panels[0].hidden);
    assert(panels[1].hidden);
    assertEquals(nodes[0].tabIndex, 0);
    assertEquals(nodes[1].tabIndex, -1);
  },
);

Deno.test(
  "diagram clicking a node updates selection and dispatches auras-change",
  () => {
    const { host, nodes, panels } = renderDiagram('value="received"');
    const changes = [];

    host.addEventListener("auras-change", (event) => {
      changes.push(event.detail.value);
    });

    nodes[2].click();

    assertEquals(host.value, "fulfill");
    assertFalse(panels[2].hidden);
    assert(panels[0].hidden);
    assertEquals(changes, ["fulfill"]);
  },
);

Deno.test("diagram auto activation follows spatial arrow navigation", () => {
  const { host, nodes } = renderDiagram('value="received"');
  const changes = [];

  host.addEventListener("auras-change", (event) => {
    changes.push(event.detail.value);
  });

  nodes[0].focus();
  dispatchKey(nodes[0], "ArrowRight");

  assertEquals(host.value, "validate");
  assertEquals(document.activeElement, nodes[1]);

  dispatchKey(nodes[1], "ArrowDown");

  assertEquals(host.value, "review");
  assertEquals(document.activeElement, nodes[3]);
  assertEquals(changes, ["validate", "review"]);
});

Deno.test(
  "diagram manual activation moves focus first and activates on Enter or Space",
  () => {
    const { host, nodes, panels } = renderDiagram(
      'value="received" activation="manual"',
    );
    const changes = [];

    host.addEventListener("auras-change", (event) => {
      changes.push(event.detail.value);
    });

    nodes[0].focus();
    dispatchKey(nodes[0], "ArrowRight");

    assertEquals(host.value, "received");
    assertEquals(document.activeElement, nodes[1]);
    assertFalse(nodes[1].hasAttribute("data-active"));
    assertEquals(changes, []);

    dispatchKey(nodes[1], "Enter");

    assertEquals(host.value, "validate");
    assertFalse(panels[1].hidden);
    assertEquals(changes, ["validate"]);

    dispatchKey(nodes[1], "ArrowDown");
    dispatchKey(nodes[3], " ");

    assertEquals(host.value, "review");
    assertEquals(changes, ["validate", "review"]);
  },
);

Deno.test("diagram invalid activation values normalize back to auto", () => {
  const { host } = renderDiagram('activation="sideways"');

  assertEquals(host.activation, "auto");
  assertEquals(host.getAttribute("activation"), null);
});

Deno.test("diagram focusCurrent focuses the active node", () => {
  const { host, nodes } = renderDiagram('value="review"');

  host.focusCurrent();

  assertEquals(document.activeElement, nodes[3]);
});

Deno.test("diagram works without linked panels", () => {
  const { host, nodes } = renderDiagramWithoutPanels('value="received"');
  const changes = [];

  host.addEventListener("auras-change", (event) => {
    changes.push({
      value: event.detail.value,
      panel: event.detail.panel,
    });
  });

  host.show("validate");

  assertEquals(host.value, "validate");
  assertFalse(host.hasAttribute("data-has-panels"));
  assert(nodes[1].hasAttribute("data-active"));
  assertEquals(changes, [{ value: "validate", panel: null }]);
});

Deno.test("diagram sets hydrated attribute after connection", () => {
  const { host } = renderDiagram('value="received"');

  assert(host.hasAttribute("hydrated"));
});
