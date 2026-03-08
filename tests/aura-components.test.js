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
  KeyboardEvent: testWindow.KeyboardEvent,
  MouseEvent: testWindow.MouseEvent,
  CustomEvent: testWindow.CustomEvent,
  Event: testWindow.Event,
});

const { registerAuraComponents } =
  await import("../packages/components/mod.ts");

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

function renderMasterDetail(attributes = "") {
  const host = connectHost(
    "aura-master-detail",
    `
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
    `,
  );

  const triggers = Array.from(host.querySelectorAll('[data-part="trigger"]'));
  const panels = Array.from(host.querySelectorAll('[data-part="panel"]'));

  return {
    host,
    triggers,
    panels,
  };
}

function renderTabs(attributes = "") {
  const host = connectHost(
    "aura-tabs",
    `
      <aura-tabs ${attributes}>
        <nav data-part="tablist" aria-label="Product views">
          <button type="button" data-part="trigger" data-value="overview">
            Overview
          </button>
          <button type="button" data-part="trigger" data-value="tokens">
            Tokens
          </button>
          <button type="button" data-part="trigger" data-value="behavior">
            Behavior
          </button>
        </nav>

        <section data-part="panels">
          <article data-part="panel" data-value="overview">Overview panel</article>
          <article data-part="panel" data-value="tokens" hidden>
            Tokens panel
          </article>
          <article data-part="panel" data-value="behavior" hidden>
            Behavior panel
          </article>
        </section>
      </aura-tabs>
    `,
  );

  const tablist = host.querySelector('[data-part="tablist"]');
  const triggers = Array.from(host.querySelectorAll('[data-part="trigger"]'));
  const panels = Array.from(host.querySelectorAll('[data-part="panel"]'));

  return {
    host,
    tablist,
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

Deno.test(
  "master-detail falls back to the first valid item when the initial value is invalid",
  () => {
    const { host, triggers, panels } = renderMasterDetail('value="missing"');

    assertEquals(host.value, "elements");
    assert(triggers[0].hasAttribute("data-active"));
    assertFalse(triggers[1].hasAttribute("data-active"));
    assertFalse(panels[0].hidden);
    assert(panels[1].hidden);
    assertEquals(triggers[0].tabIndex, 0);
    assertEquals(triggers[1].tabIndex, -1);
  },
);

Deno.test(
  "master-detail clicking a trigger updates selection and dispatches aura-change",
  () => {
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
  },
);

Deno.test(
  "master-detail reselecting the active item does not dispatch aura-change",
  () => {
    const { host, triggers } = renderMasterDetail('value="elements"');
    const changes = [];

    host.addEventListener("aura-change", (event) => {
      changes.push(event.detail.value);
    });

    triggers[0].click();
    host.show("elements");

    assertEquals(host.value, "elements");
    assertEquals(changes, []);
  },
);

Deno.test(
  "master-detail auto activation changes selection on arrow navigation",
  () => {
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
  },
);

Deno.test(
  "master-detail manual activation moves focus first and activates on Enter or Space",
  () => {
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
  },
);

Deno.test(
  "master-detail invalid activation values normalize back to auto",
  () => {
    const { host } = renderMasterDetail('activation="sideways"');

    assertEquals(host.activation, "auto");
    assertEquals(host.getAttribute("activation"), null);
  },
);

Deno.test("master-detail focusCurrent focuses the active trigger", () => {
  const { host, triggers } = renderMasterDetail('value="components"');

  host.focusCurrent();

  assertEquals(document.activeElement, triggers[2]);
});

Deno.test(
  "tabs fall back to the first valid tab and apply tab semantics",
  () => {
    const { host, tablist, triggers, panels } = renderTabs('value="missing"');

    assertEquals(host.value, "overview");
    assertEquals(tablist?.getAttribute("role"), "tablist");
    assertEquals(tablist?.getAttribute("aria-orientation"), "horizontal");
    assertEquals(triggers[0].getAttribute("role"), "tab");
    assertEquals(triggers[0].getAttribute("aria-selected"), "true");
    assertEquals(triggers[1].getAttribute("aria-selected"), "false");
    assertEquals(triggers[0].getAttribute("aria-controls"), panels[0].id);
    assertEquals(panels[0].getAttribute("role"), "tabpanel");
    assertEquals(panels[0].getAttribute("aria-labelledby"), triggers[0].id);
    assertFalse(panels[0].hidden);
    assert(panels[1].hidden);
  },
);

Deno.test(
  "tabs clicking a trigger updates selection and dispatches aura-change",
  () => {
    const { host, triggers, panels } = renderTabs('value="overview"');
    const changes = [];

    host.addEventListener("aura-change", (event) => {
      changes.push(event.detail.value);
    });

    triggers[2].click();

    assertEquals(host.value, "behavior");
    assertEquals(triggers[2].getAttribute("aria-selected"), "true");
    assertFalse(panels[2].hidden);
    assert(panels[0].hidden);
    assertEquals(changes, ["behavior"]);
  },
);

Deno.test(
  "tabs auto activation changes selection on horizontal arrow navigation",
  () => {
    const { host, triggers } = renderTabs('value="overview"');
    const changes = [];

    host.addEventListener("aura-change", (event) => {
      changes.push(event.detail.value);
    });

    triggers[0].focus();
    dispatchKey(triggers[0], "ArrowRight");

    assertEquals(host.value, "tokens");
    assertEquals(document.activeElement, triggers[1]);
    assertEquals(changes, ["tokens"]);

    dispatchKey(triggers[1], "End");

    assertEquals(host.value, "behavior");
    assertEquals(document.activeElement, triggers[2]);
    assertEquals(changes, ["tokens", "behavior"]);

    dispatchKey(triggers[2], "ArrowRight");

    assertEquals(host.value, "behavior");
    assertEquals(document.activeElement, triggers[2]);
    assertEquals(changes, ["tokens", "behavior"]);
  },
);

Deno.test(
  "tabs manual activation moves focus first and activates on Enter or Space",
  () => {
    const { host, triggers, panels } = renderTabs(
      'value="overview" activation="manual"',
    );
    const changes = [];

    host.addEventListener("aura-change", (event) => {
      changes.push(event.detail.value);
    });

    triggers[0].focus();
    dispatchKey(triggers[0], "ArrowRight");

    assertEquals(host.value, "overview");
    assertEquals(document.activeElement, triggers[1]);
    assertEquals(triggers[1].getAttribute("aria-selected"), "false");
    assertEquals(changes, []);

    dispatchKey(triggers[1], "Enter");

    assertEquals(host.value, "tokens");
    assertEquals(triggers[1].getAttribute("aria-selected"), "true");
    assertFalse(panels[1].hidden);
    assertEquals(changes, ["tokens"]);

    dispatchKey(triggers[1], "End");

    assertEquals(host.value, "tokens");
    assertEquals(document.activeElement, triggers[2]);
    assertEquals(changes, ["tokens"]);

    dispatchKey(triggers[2], " ");

    assertEquals(host.value, "behavior");
    assertEquals(changes, ["tokens", "behavior"]);
  },
);

Deno.test("tabs invalid activation values normalize back to auto", () => {
  const { host } = renderTabs('activation="sideways"');

  assertEquals(host.activation, "auto");
  assertEquals(host.getAttribute("activation"), null);
});

Deno.test("tabs focusCurrent focuses the active trigger", () => {
  const { host, triggers } = renderTabs('value="behavior"');

  host.focusCurrent();

  assertEquals(document.activeElement, triggers[2]);
});
