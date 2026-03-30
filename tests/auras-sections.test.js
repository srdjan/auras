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

function renderSections(attributes = "") {
  const host = connectHost(
    "auras-sections",
    `
      <auras-sections ${attributes}>
        <section data-part="section" data-value="overview">
          <button type="button" data-part="trigger">Overview</button>
          <div data-part="panel">Overview content</div>
        </section>
        <section data-part="section" data-value="tokens">
          <button type="button" data-part="trigger">Tokens</button>
          <div data-part="panel">Tokens content</div>
        </section>
        <section data-part="section" data-value="behavior">
          <button type="button" data-part="trigger">Behavior</button>
          <div data-part="panel">Behavior content</div>
        </section>
      </auras-sections>
    `,
  );

  return {
    host,
    getSection(value) {
      return host.querySelector(
        `[data-part="section"][data-value="${value}"]`,
      );
    },
    getTrigger(value) {
      return host.querySelector(
        `[data-part="section"][data-value="${value}"] [data-part="trigger"]`,
      );
    },
    getPanel(value) {
      return host.querySelector(
        `[data-part="section"][data-value="${value}"] [data-part="panel"]`,
      );
    },
  };
}

// ---- Tabs mode ----

Deno.test("tabs mode: selects first section by default", () => {
  const { host, getTrigger, getPanel } = renderSections('mode="tabs"');

  assertEquals(host.getAttribute("value"), "overview");
  assertEquals(host.getAttribute("data-resolved-mode"), "tabs");
  assert(host.hasAttribute("hydrated"));

  assertEquals(getTrigger("overview").getAttribute("data-active"), "");
  assertFalse(getPanel("overview").hidden);

  assertFalse(getTrigger("tokens").hasAttribute("data-active"));
  assert(getPanel("tokens").hidden);
});

Deno.test("tabs mode: respects initial value attribute", () => {
  const { getTrigger, getPanel } = renderSections(
    'mode="tabs" value="tokens"',
  );

  assert(getTrigger("tokens").hasAttribute("data-active"));
  assertFalse(getPanel("tokens").hidden);

  assertFalse(getTrigger("overview").hasAttribute("data-active"));
  assert(getPanel("overview").hidden);
});

Deno.test("tabs mode: applies tablist ARIA", () => {
  const { host, getTrigger, getPanel, getSection } = renderSections(
    'mode="tabs"',
  );

  assertEquals(host.getAttribute("role"), "tablist");
  assertEquals(host.getAttribute("aria-orientation"), "horizontal");

  assertEquals(getSection("overview").getAttribute("role"), "presentation");
  assertEquals(getTrigger("overview").getAttribute("role"), "tab");
  assert(getTrigger("overview").hasAttribute("aria-controls"));
  assertEquals(getPanel("overview").getAttribute("role"), "tabpanel");
  assert(getPanel("overview").hasAttribute("aria-labelledby"));
});

Deno.test("tabs mode: aria-selected reflects active tab", () => {
  const { host, getTrigger } = renderSections('mode="tabs"');

  assertEquals(getTrigger("overview").getAttribute("aria-selected"), "true");
  assertEquals(getTrigger("tokens").getAttribute("aria-selected"), "false");

  host.show("tokens");

  assertEquals(getTrigger("overview").getAttribute("aria-selected"), "false");
  assertEquals(getTrigger("tokens").getAttribute("aria-selected"), "true");
});

Deno.test("tabs mode: show() selects and dispatches event", () => {
  const { host, getTrigger, getPanel } = renderSections('mode="tabs"');

  let lastEvent = null;
  host.addEventListener("auras-change", (e) => {
    lastEvent = e.detail;
  });

  const result = host.show("tokens");

  assert(result);
  assertEquals(host.getAttribute("value"), "tokens");
  assert(getTrigger("tokens").hasAttribute("data-active"));
  assertFalse(getPanel("tokens").hidden);
  assert(getPanel("overview").hidden);
  assertEquals(lastEvent.value, "tokens");
});

Deno.test("tabs mode: show() returns false for unknown value", () => {
  const { host } = renderSections('mode="tabs"');
  assertFalse(host.show("nonexistent"));
});

Deno.test("tabs mode: click trigger selects", () => {
  const { host, getTrigger, getPanel } = renderSections('mode="tabs"');

  let lastEvent = null;
  host.addEventListener("auras-change", (e) => {
    lastEvent = e.detail;
  });

  const trigger = getTrigger("tokens");
  trigger.click();

  assertEquals(host.getAttribute("value"), "tokens");
  assert(trigger.hasAttribute("data-active"));
  assertFalse(getPanel("tokens").hidden);
  assertEquals(lastEvent.value, "tokens");
});

Deno.test("tabs mode: roving tabindex on triggers", () => {
  const { getTrigger } = renderSections('mode="tabs"');

  assertEquals(getTrigger("overview").tabIndex, 0);
  assertEquals(getTrigger("tokens").tabIndex, -1);
  assertEquals(getTrigger("behavior").tabIndex, -1);
});

Deno.test("tabs mode: ArrowRight moves focus and selects (auto activation)", () => {
  const { host, getTrigger } = renderSections('mode="tabs"');

  const trigger = getTrigger("overview");
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );

  assertEquals(host.getAttribute("value"), "tokens");
  assertEquals(getTrigger("tokens").tabIndex, 0);
  assertEquals(getTrigger("overview").tabIndex, -1);
});

Deno.test("tabs mode: ArrowLeft moves backwards", () => {
  const { host, getTrigger } = renderSections(
    'mode="tabs" value="tokens"',
  );

  const trigger = getTrigger("tokens");
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );

  assertEquals(host.getAttribute("value"), "overview");
});

Deno.test("tabs mode: Home and End jump to first/last", () => {
  const { host, getTrigger } = renderSections('mode="tabs"');

  const trigger = getTrigger("overview");
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", { key: "End", bubbles: true }),
  );

  assertEquals(host.getAttribute("value"), "behavior");

  getTrigger("behavior").dispatchEvent(
    new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
  );

  assertEquals(host.getAttribute("value"), "overview");
});

Deno.test("tabs mode: manual activation requires Enter/Space", () => {
  const { host, getTrigger } = renderSections(
    'mode="tabs" activation="manual"',
  );

  const trigger = getTrigger("overview");
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );

  // Focus moved but value did not change
  assertEquals(host.getAttribute("value"), "overview");

  // Now press Enter on the tokens trigger
  getTrigger("tokens").dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );

  assertEquals(host.getAttribute("value"), "tokens");
});

Deno.test("tabs mode: expand/collapse/toggle are no-ops", () => {
  const { host } = renderSections('mode="tabs"');

  assertFalse(host.expand("overview"));
  assertFalse(host.collapse("overview"));
  assertFalse(host.toggle("overview"));
});

// ---- Accordion mode ----

Deno.test("accordion mode: sets resolved mode", () => {
  const { host } = renderSections('mode="accordion"');

  assertEquals(host.getAttribute("data-resolved-mode"), "accordion");
  assert(host.hasAttribute("hydrated"));
});

Deno.test("accordion mode: expands value section by default", () => {
  const { getSection, getPanel, getTrigger } = renderSections(
    'mode="accordion" value="overview"',
  );

  assert(getSection("overview").hasAttribute("data-expanded"));
  assertFalse(getPanel("overview").hidden);
  assertEquals(getTrigger("overview").getAttribute("aria-expanded"), "true");
});

Deno.test("accordion mode: respects pre-set data-expanded", () => {
  const host = connectHost(
    "auras-sections",
    `
      <auras-sections mode="accordion" value="overview">
        <section data-part="section" data-value="overview">
          <button type="button" data-part="trigger">Overview</button>
          <div data-part="panel">Overview content</div>
        </section>
        <section data-part="section" data-value="tokens" data-expanded>
          <button type="button" data-part="trigger">Tokens</button>
          <div data-part="panel">Tokens content</div>
        </section>
      </auras-sections>
    `,
  );

  const tokensSection = host.querySelector(
    '[data-part="section"][data-value="tokens"]',
  );
  const tokensPanel = tokensSection.querySelector('[data-part="panel"]');

  assert(tokensSection.hasAttribute("data-expanded"));
  assertFalse(tokensPanel.hidden);
});

Deno.test("accordion mode: ARIA uses aria-expanded, not aria-selected", () => {
  const { host, getTrigger, getPanel } = renderSections(
    'mode="accordion" value="overview"',
  );

  assertFalse(host.hasAttribute("role"));
  assertFalse(getTrigger("overview").hasAttribute("role"));
  assert(getTrigger("overview").hasAttribute("aria-expanded"));
  assert(getTrigger("overview").hasAttribute("aria-controls"));
  assertEquals(getPanel("overview").getAttribute("role"), "region");
  assert(getPanel("overview").hasAttribute("aria-labelledby"));
});

Deno.test("accordion mode: click toggles expansion", () => {
  const { getSection, getTrigger, getPanel } = renderSections(
    'mode="accordion" value="overview"',
  );

  // Overview starts expanded
  assert(getSection("overview").hasAttribute("data-expanded"));

  // Click to collapse
  getTrigger("overview").click();
  assertFalse(getSection("overview").hasAttribute("data-expanded"));
  assert(getPanel("overview").hidden);

  // Click to expand again
  getTrigger("overview").click();
  assert(getSection("overview").hasAttribute("data-expanded"));
  assertFalse(getPanel("overview").hidden);
});

Deno.test("accordion mode: multiple sections can be open", () => {
  const { getSection, getTrigger } = renderSections(
    'mode="accordion" value="overview"',
  );

  // Expand tokens too
  getTrigger("tokens").click();

  assert(getSection("overview").hasAttribute("data-expanded"));
  assert(getSection("tokens").hasAttribute("data-expanded"));
});

Deno.test("accordion mode: exclusive closes others", () => {
  const { getSection, getTrigger } = renderSections(
    'mode="accordion" value="overview" exclusive',
  );

  // Overview starts expanded
  assert(getSection("overview").hasAttribute("data-expanded"));

  // Click tokens - should close overview
  getTrigger("tokens").click();

  assertFalse(getSection("overview").hasAttribute("data-expanded"));
  assert(getSection("tokens").hasAttribute("data-expanded"));
});

Deno.test("accordion mode: expand/collapse/toggle methods work", () => {
  const { host, getSection, getPanel } = renderSections(
    'mode="accordion" value="overview"',
  );

  // Expand tokens via method
  assert(host.expand("tokens"));
  assert(getSection("tokens").hasAttribute("data-expanded"));
  assertFalse(getPanel("tokens").hidden);

  // Collapse tokens
  assert(host.collapse("tokens"));
  assertFalse(getSection("tokens").hasAttribute("data-expanded"));
  assert(getPanel("tokens").hidden);

  // Toggle
  assert(host.toggle("tokens"));
  assert(getSection("tokens").hasAttribute("data-expanded"));

  assert(host.toggle("tokens"));
  assertFalse(getSection("tokens").hasAttribute("data-expanded"));
});

Deno.test("accordion mode: ArrowDown/Up navigates between triggers", () => {
  const { host, getTrigger } = renderSections(
    'mode="accordion" value="overview"',
  );

  getTrigger("overview").dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
  );

  assertEquals(getTrigger("tokens").tabIndex, 0);
  assertEquals(getTrigger("overview").tabIndex, -1);

  getTrigger("tokens").dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
  );

  assertEquals(getTrigger("overview").tabIndex, 0);
});

Deno.test("accordion mode: Enter/Space toggles expansion", () => {
  const { getSection, getTrigger } = renderSections(
    'mode="accordion" value="overview"',
  );

  // Overview starts expanded, press Enter to collapse
  getTrigger("overview").dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  assertFalse(getSection("overview").hasAttribute("data-expanded"));

  // Press Space to expand again
  getTrigger("overview").dispatchEvent(
    new KeyboardEvent("keydown", { key: " ", bubbles: true }),
  );
  assert(getSection("overview").hasAttribute("data-expanded"));
});

// ---- Mode attribute changes ----

Deno.test("tabs and accordion modes have different ARIA", () => {
  // Verify tabs mode ARIA
  const tabs = renderSections('mode="tabs"');
  assertEquals(tabs.host.getAttribute("data-resolved-mode"), "tabs");
  assertEquals(tabs.getTrigger("overview").getAttribute("role"), "tab");
  assertEquals(tabs.host.getAttribute("role"), "tablist");

  // Verify accordion mode ARIA
  const accordion = renderSections('mode="accordion"');
  assertEquals(accordion.host.getAttribute("data-resolved-mode"), "accordion");
  assertFalse(accordion.getTrigger("overview").hasAttribute("role"));
  assert(accordion.getTrigger("overview").hasAttribute("aria-expanded"));
  assertFalse(accordion.host.hasAttribute("role"));
});

Deno.test("mode switch preserves value", () => {
  const { host } = renderSections('mode="tabs" value="tokens"');

  assertEquals(host.getAttribute("value"), "tokens");

  host.setAttribute("mode", "accordion");

  assertEquals(host.getAttribute("value"), "tokens");
});

Deno.test("tabs and accordion modes produce distinct structures", () => {
  const tabs = renderSections('mode="tabs" value="overview"');
  const accordion = renderSections('mode="accordion" value="overview"');

  // Tabs: panels are hidden/shown, sections have role=presentation
  assert(tabs.getPanel("tokens").hidden);
  assertFalse(tabs.getPanel("overview").hidden);
  assertEquals(tabs.getSection("overview").getAttribute("role"), "presentation");

  // Accordion: panels expand/collapse, sections have no role
  assertFalse(accordion.getPanel("overview").hidden);
  assertFalse(accordion.getSection("overview").hasAttribute("role"));
});

// ---- Progressive enhancement ----

Deno.test("hydrated attribute set on connect", () => {
  const { host } = renderSections('mode="tabs"');
  assert(host.hasAttribute("hydrated"));
});

Deno.test("empty sections fails gracefully", () => {
  const host = connectHost(
    "auras-sections",
    '<auras-sections mode="tabs"></auras-sections>',
  );

  assertFalse(host.hasAttribute("hydrated"));
});

// ---- focusCurrent ----

Deno.test("focusCurrent focuses the active trigger", () => {
  const { host, getTrigger } = renderSections('mode="tabs" value="tokens"');

  host.focusCurrent();

  assertEquals(document.activeElement, getTrigger("tokens"));
});

// ---- Value attribute change ----

Deno.test("show() updates selection in tabs mode", () => {
  const { host, getTrigger, getPanel } = renderSections('mode="tabs"');

  host.show("behavior");

  assert(getTrigger("behavior").hasAttribute("data-active"));
  assertFalse(getPanel("behavior").hidden);
  assert(getPanel("overview").hidden);
  assertEquals(host.getAttribute("value"), "behavior");
});

// ---- Edge cases ----

Deno.test("ignores sections that are not direct children", () => {
  const host = connectHost(
    "auras-sections",
    `
      <auras-sections mode="tabs">
        <section data-part="section" data-value="a">
          <button type="button" data-part="trigger">A</button>
          <div data-part="panel">A content</div>
        </section>
        <div>
          <section data-part="section" data-value="nested">
            <button type="button" data-part="trigger">Nested</button>
            <div data-part="panel">Nested content</div>
          </section>
        </div>
      </auras-sections>
    `,
  );

  assert(host.hasAttribute("hydrated"));
  assertEquals(host.getAttribute("value"), "a");

  // The nested section should not be registered
  assertFalse(host.show("nested"));
});

Deno.test("show returns false for unknown values", () => {
  const { host } = renderSections('mode="accordion"');
  assertFalse(host.show("nonexistent"));
});

Deno.test("expand/collapse return false for unknown values", () => {
  const { host } = renderSections('mode="accordion"');
  assertFalse(host.expand("nonexistent"));
  assertFalse(host.collapse("nonexistent"));
  assertFalse(host.toggle("nonexistent"));
});
