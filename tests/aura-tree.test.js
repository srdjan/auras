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

function renderTree(attributes = "", expandedAttribute = "") {
  const host = connectHost(
    "aura-tree",
    `
      <aura-tree ${attributes}>
        <ul data-part="tree" aria-label="Aura package map">
          <li data-part="item" data-value="elements">
            <button type="button" data-part="node">Elements</button>
          </li>

          <li data-part="item" data-value="components" ${expandedAttribute}>
            <button
              type="button"
              data-part="toggle"
              aria-label="Toggle Components"
            ></button>
            <button type="button" data-part="node">Components</button>

            <ul data-part="group">
              <li data-part="item" data-value="master-detail">
                <button type="button" data-part="node">Master-detail</button>
              </li>
              <li data-part="item" data-value="tabs">
                <button type="button" data-part="node">Tabs</button>
              </li>
              <li data-part="item" data-value="tree">
                <button type="button" data-part="node">Tree</button>
              </li>
            </ul>
          </li>

          <li data-part="item" data-value="diagram">
            <button type="button" data-part="node">Diagram</button>
          </li>
        </ul>

        <section data-part="panels">
          <article data-part="panel" data-value="elements">Elements panel</article>
          <article data-part="panel" data-value="components" hidden>
            Components panel
          </article>
          <article data-part="panel" data-value="master-detail" hidden>
            Master-detail panel
          </article>
          <article data-part="panel" data-value="tabs" hidden>Tabs panel</article>
          <article data-part="panel" data-value="tree" hidden>Tree panel</article>
          <article data-part="panel" data-value="diagram" hidden>
            Diagram panel
          </article>
        </section>
      </aura-tree>
    `,
  );

  const tree = host.querySelector('[data-part="tree"]');
  return {
    host,
    tree,
    getItem(value) {
      return host.querySelector(`[data-part="item"][data-value="${value}"]`);
    },
    getNode(value) {
      return host.querySelector(
        `[data-part="item"][data-value="${value}"] > [data-part="node"]`,
      );
    },
    getPanel(value) {
      return host.querySelector(`[data-part="panel"][data-value="${value}"]`);
    },
    getToggle(value) {
      return host.querySelector(
        `[data-part="item"][data-value="${value}"] > [data-part="toggle"]`,
      );
    },
    getGroup(value) {
      return host.querySelector(
        `[data-part="item"][data-value="${value}"] > [data-part="group"]`,
      );
    },
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
  "tree falls back to the first valid visible item when the initial value is invalid",
  () => {
    const { host, getNode, getPanel, getGroup } = renderTree('value="missing"');

    assertEquals(host.value, "elements");
    assert(getNode("elements").hasAttribute("data-active"));
    assertEquals(getNode("elements").tabIndex, 0);
    assertEquals(getNode("components").tabIndex, -1);
    assertFalse(getPanel("elements").hidden);
    assert(getPanel("components").hidden);
    assert(getGroup("components").hidden);
  },
);

Deno.test("tree applies tree semantics and expands ancestors for a valid value", () => {
  const { host, tree, getItem, getNode, getToggle, getGroup, getPanel } =
    renderTree('value="master-detail"');

  assertEquals(host.value, "master-detail");
  assertEquals(tree.getAttribute("role"), "tree");
  assertEquals(getNode("components").getAttribute("role"), "treeitem");
  assertEquals(getNode("components").getAttribute("aria-level"), "1");
  assertEquals(getNode("master-detail").getAttribute("aria-level"), "2");
  assertEquals(getNode("components").getAttribute("aria-expanded"), "true");
  assertEquals(getToggle("components").getAttribute("aria-expanded"), "true");
  assert(getItem("components").hasAttribute("data-expanded"));
  assertFalse(getGroup("components").hidden);
  assertFalse(getPanel("master-detail").hidden);
});

Deno.test("tree auto activation follows visible navigation and branch expansion", () => {
  const { host, getNode, getGroup } = renderTree('value="elements"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  getNode("elements").focus();
  dispatchKey(getNode("elements"), "ArrowDown");

  assertEquals(host.value, "components");
  assertEquals(document.activeElement, getNode("components"));
  assertEquals(changes, ["components"]);

  dispatchKey(getNode("components"), "ArrowRight");

  assertFalse(getGroup("components").hidden);
  assertEquals(host.value, "components");
  assertEquals(changes, ["components"]);

  dispatchKey(getNode("components"), "ArrowRight");

  assertEquals(host.value, "master-detail");
  assertEquals(document.activeElement, getNode("master-detail"));
  assertEquals(changes, ["components", "master-detail"]);

  dispatchKey(getNode("master-detail"), "ArrowLeft");

  assertEquals(host.value, "components");
  assertEquals(document.activeElement, getNode("components"));
  assertEquals(changes, ["components", "master-detail", "components"]);

  dispatchKey(getNode("components"), "End");

  assertEquals(host.value, "diagram");
  assertEquals(document.activeElement, getNode("diagram"));
  assertEquals(changes, [
    "components",
    "master-detail",
    "components",
    "diagram",
  ]);
});

Deno.test("tree manual activation keeps focus movement separate from selection", () => {
  const { host, getNode, getGroup, getPanel } = renderTree(
    'value="elements" activation="manual"',
  );
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  getNode("elements").focus();
  dispatchKey(getNode("elements"), "ArrowDown");

  assertEquals(host.value, "elements");
  assertEquals(document.activeElement, getNode("components"));
  assertEquals(changes, []);

  dispatchKey(getNode("components"), "ArrowRight");

  assertFalse(getGroup("components").hidden);
  assertEquals(host.value, "elements");
  assertEquals(changes, []);

  dispatchKey(getNode("components"), "ArrowRight");

  assertEquals(document.activeElement, getNode("master-detail"));
  assertEquals(host.value, "elements");
  assertFalse(getPanel("elements").hidden);

  dispatchKey(getNode("master-detail"), "Enter");

  assertEquals(host.value, "master-detail");
  assertFalse(getPanel("master-detail").hidden);
  assertEquals(changes, ["master-detail"]);
});

Deno.test("tree collapsing a branch with the active descendant selects the branch", () => {
  const { host, getItem, getGroup, getPanel } = renderTree(
    'value="master-detail"',
  );
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  assert(host.collapse("components"));

  assertEquals(host.value, "components");
  assertFalse(getPanel("components").hidden);
  assert(getPanel("master-detail").hidden);
  assert(getGroup("components").hidden);
  assert(getItem("components").hasAttribute("data-active"));
  assertEquals(changes, ["components"]);
});

Deno.test("tree toggle clicks expand and collapse branches without stray selection", () => {
  const { host, getToggle, getGroup } = renderTree('value="elements"');
  const changes = [];

  host.addEventListener("aura-change", (event) => {
    changes.push(event.detail.value);
  });

  getToggle("components").click();

  assertFalse(getGroup("components").hidden);
  assertEquals(host.value, "elements");
  assertEquals(changes, []);

  getToggle("components").click();

  assert(getGroup("components").hidden);
  assertEquals(host.value, "elements");
  assertEquals(changes, []);
});

Deno.test("tree focusCurrent and invalid activation normalization work", () => {
  const { host, getNode } = renderTree(
    'value="tree" activation="sideways"',
    "data-expanded",
  );

  assertEquals(host.activation, "auto");
  assertEquals(host.getAttribute("activation"), null);

  host.focusCurrent();

  assertEquals(document.activeElement, getNode("tree"));
});
