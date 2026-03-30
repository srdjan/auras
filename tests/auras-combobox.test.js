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
  KeyboardEvent: testWindow.KeyboardEvent,
  MouseEvent: testWindow.MouseEvent,
  CustomEvent: testWindow.CustomEvent,
  Event: testWindow.Event,
  FocusEvent: testWindow.FocusEvent,
});

await testWindow.happyDOM.whenAsyncComplete();

const { registerAurasComponents } = await import(
  "../packages/components/mod.ts"
);

registerAurasComponents();

function connectHost(tagName, markup) {
  document.body.innerHTML = markup;

  const host = document.querySelector(tagName);
  if (!host) {
    throw new Error(`Expected ${tagName} host`);
  }

  host.connectedCallback();

  return host;
}

function renderCombobox(attributes = "") {
  const host = connectHost(
    "auras-combobox",
    `
      <auras-combobox ${attributes}>
        <label for="component-search">Component</label>

        <div data-part="control">
          <input
            id="component-search"
            data-part="input"
            type="text"
            placeholder="Search components"
          />
          <button
            type="button"
            data-part="toggle"
            aria-label="Toggle component options"
          ></button>
          <input type="hidden" data-part="value" name="component" />
        </div>

        <ul data-part="listbox">
          <li data-part="option" data-value="elements">Elements</li>
          <li data-part="option" data-value="master-detail">Master-detail</li>
          <li data-part="option" data-value="tabs">Tabs</li>
          <li data-part="option" data-value="tree">Tree</li>
          <li data-part="option" data-value="diagram">Diagram</li>
        </ul>

        <p data-part="empty" hidden>No matches</p>

        <section data-part="panels">
          <article data-part="panel" data-value="elements">Elements panel</article>
          <article data-part="panel" data-value="master-detail" hidden>
            Master-detail panel
          </article>
          <article data-part="panel" data-value="tabs" hidden>Tabs panel</article>
          <article data-part="panel" data-value="tree" hidden>Tree panel</article>
          <article data-part="panel" data-value="diagram" hidden>
            Diagram panel
          </article>
        </section>
      </auras-combobox>
    `,
  );

  return {
    host,
    input: host.querySelector('[data-part="input"]'),
    toggle: host.querySelector('[data-part="toggle"]'),
    hiddenInput: host.querySelector('[data-part="value"]'),
    listbox: host.querySelector('[data-part="listbox"]'),
    emptyState: host.querySelector('[data-part="empty"]'),
    getOption(value) {
      return host.querySelector(`[data-part="option"][data-value="${value}"]`);
    },
    getPanel(value) {
      return host.querySelector(`[data-part="panel"][data-value="${value}"]`);
    },
    visibleOptions() {
      return Array.from(
        host.querySelectorAll('[data-part="option"][data-value]'),
      )
        .filter((option) => !option.hidden)
        .map((option) => option.getAttribute("data-value"));
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
  "combobox falls back to the first valid option when the initial value is invalid",
  () => {
    const { host, input, hiddenInput, listbox, getOption, getPanel } =
      renderCombobox('value="missing"');

    assertEquals(host.value, "elements");
    assertEquals(input.value, "Elements");
    assertEquals(hiddenInput.value, "elements");
    assert(listbox.hidden);
    assert(getOption("elements").hasAttribute("data-selected"));
    assertFalse(getPanel("elements").hidden);
    assert(getPanel("master-detail").hidden);
  },
);

Deno.test(
  "combobox toggle and option clicks select a value and dispatch auras-change",
  () => {
    const { host, input, toggle, listbox, getOption, getPanel } =
      renderCombobox('value="elements"');
    const changes = [];

    host.addEventListener("auras-change", (event) => {
      changes.push(event.detail.value);
    });

    toggle.click();

    assertFalse(listbox.hidden);
    assert(host.hasAttribute("open"));

    getOption("tabs").click();

    assertEquals(host.value, "tabs");
    assertEquals(input.value, "Tabs");
    assert(getPanel("elements").hidden);
    assertFalse(getPanel("tabs").hidden);
    assert(listbox.hidden);
    assertEquals(changes, ["tabs"]);
  },
);

Deno.test(
  "combobox input filtering narrows visible options and shows the empty state",
  () => {
    const { host, input, emptyState, visibleOptions } = renderCombobox(
      'value="elements"',
    );

    input.focus();
    input.value = "di";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    assert(host.hasAttribute("open"));
    assertEquals(host.value, "elements");
    assertEquals(visibleOptions(), ["diagram"]);
    assert(emptyState.hidden);

    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    assertEquals(visibleOptions(), []);
    assertFalse(emptyState.hidden);
  },
);

Deno.test(
  "combobox auto activation selects as the active option moves",
  () => {
    const { host, input, listbox, getOption } = renderCombobox(
      'value="elements"',
    );
    const changes = [];

    host.addEventListener("auras-change", (event) => {
      changes.push(event.detail.value);
    });

    input.focus();
    dispatchKey(input, "ArrowDown");

    assertFalse(listbox.hidden);
    assertEquals(host.value, "elements");
    assert(getOption("elements").hasAttribute("data-active"));

    dispatchKey(input, "ArrowDown");

    assertEquals(host.value, "master-detail");
    assert(getOption("master-detail").hasAttribute("data-active"));
    assertEquals(changes, ["master-detail"]);
  },
);

Deno.test(
  "combobox manual activation moves active state first and selects on Enter",
  () => {
    const { host, input, getOption, getPanel } = renderCombobox(
      'value="elements" activation="manual"',
    );
    const changes = [];

    host.addEventListener("auras-change", (event) => {
      changes.push(event.detail.value);
    });

    input.focus();
    dispatchKey(input, "ArrowDown");
    dispatchKey(input, "ArrowDown");

    assertEquals(host.value, "elements");
    assertFalse(getOption("master-detail").hasAttribute("data-selected"));
    assert(getOption("master-detail").hasAttribute("data-active"));
    assertFalse(getPanel("elements").hidden);
    assertEquals(changes, []);

    dispatchKey(input, "Enter");

    assertEquals(host.value, "master-detail");
    assertFalse(getPanel("master-detail").hidden);
    assertEquals(changes, ["master-detail"]);
  },
);

Deno.test(
  "combobox escape restores the selected label and listbox helpers work",
  () => {
    const { host, input, listbox, emptyState } = renderCombobox(
      'value="tabs" activation="sideways"',
    );

    assertEquals(host.activation, "auto");
    assertEquals(host.getAttribute("activation"), null);

    assert(host.openListbox());
    assertFalse(listbox.hidden);
    assert(host.closeListbox());
    assert(listbox.hidden);
    assert(host.toggleListbox());
    assertFalse(listbox.hidden);

    input.value = "tr";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    assert(emptyState.hidden);
    assertFalse(listbox.hidden);

    dispatchKey(input, "Escape");

    assert(listbox.hidden);
    assertEquals(input.value, "Tabs");

    host.focusCurrent();

    assertEquals(document.activeElement, input);
  },
);

Deno.test("combobox sets hydrated attribute after connection", () => {
  const { host } = renderCombobox('value="elements"');

  assert(host.hasAttribute("hydrated"));
});
