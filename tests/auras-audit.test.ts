/// <reference lib="deno.ns" />

import { assertEquals, assertMatch } from "jsr:@std/assert@^1.0.14";
import { Window } from "npm:happy-dom";

const testWindow = new Window();

Object.assign(globalThis, {
  window: testWindow,
  document: testWindow.document,
  customElements: testWindow.customElements,
  Element: testWindow.Element,
  HTMLElement: testWindow.HTMLElement,
  HTMLButtonElement: testWindow.HTMLButtonElement,
  HTMLInputElement: testWindow.HTMLInputElement,
  DOMParser: testWindow.DOMParser,
});

await testWindow.happyDOM.whenAsyncComplete();

const {
  auditAuras,
  getAurasContract,
  getAurasContracts,
  getAurasStarterMarkup,
  repairAuras,
} = await import("../packages/audit/mod.ts");

function renderMarkup(markup: string): Document {
  document.body.innerHTML = markup;
  return document;
}

Deno.test("getAurasContract returns the published combobox contract", () => {
  const contract = getAurasContract("auras-combobox");

  assertEquals(contract?.tagName, "auras-combobox");
  assertEquals(contract?.requiredParts.length, 3);
});

Deno.test("getAurasContracts exposes the shared registry including sections", () => {
  const contracts = getAurasContracts();

  assertEquals(
    contracts.some((contract) => contract.tagName === "auras-sections"),
    true,
  );
  assertEquals(
    contracts.find((contract) => contract.tagName === "auras-sections")?.label,
    "Sections",
  );
});

Deno.test("getAurasStarterMarkup resolves canonical starter markup by id and tag", () => {
  const comboboxContract = getAurasContract("auras-combobox");

  assertEquals(
    getAurasStarterMarkup("combobox"),
    comboboxContract?.exampleMarkup ?? null,
  );
  assertEquals(
    getAurasStarterMarkup("auras-combobox"),
    comboboxContract?.exampleMarkup ?? null,
  );
});

Deno.test("auditAuras accepts valid authored markup without findings", () => {
  const diagnostics = auditAuras(
    renderMarkup(`
      <auras-tabs value="overview">
        <nav data-part="tablist" aria-label="Release views">
          <button type="button" data-part="trigger" data-value="overview">
            Overview
          </button>
          <button type="button" data-part="trigger" data-value="tokens">
            Tokens
          </button>
        </nav>

        <section data-part="panels">
          <article data-part="panel" data-value="overview">Overview</article>
          <article data-part="panel" data-value="tokens" hidden>Tokens</article>
        </section>
      </auras-tabs>
    `),
  );

  assertEquals(diagnostics, []);
});

Deno.test("repairAuras annotates canonical tabs parts and clears structural findings", () => {
  const doc = renderMarkup(`
    <auras-tabs value="overview">
      <nav aria-label="Release views">
        <button type="button" data-value="overview">Overview</button>
        <button type="button" data-value="tokens">Tokens</button>
      </nav>
      <section>
        <article data-value="overview">Overview</article>
        <article data-value="tokens" hidden>Tokens</article>
      </section>
    </auras-tabs>
  `);

  const result = repairAuras(doc);

  assertEquals(result.diagnostics, []);
  assertEquals(
    result.appliedFixes.some((fix) => fix.code === "annotated-part"),
    true,
  );
  assertMatch(doc.body.innerHTML, /data-part="tablist"/);
  assertMatch(doc.body.innerHTML, /data-part="trigger"/);
  assertMatch(doc.body.innerHTML, /data-part="panels"/);
  assertMatch(doc.body.innerHTML, /data-part="panel"/);
});

Deno.test("repairAuras wraps loose section content in a canonical panel", () => {
  const doc = renderMarkup(`
    <auras-sections mode="auto" value="overview">
      <section data-value="overview">
        <button type="button">Overview</button>
        <p>Overview panel</p>
        <p>More overview content</p>
      </section>
    </auras-sections>
  `);

  const result = repairAuras(doc);

  assertEquals(result.diagnostics, []);
  assertEquals(
    result.appliedFixes.some((fix) => fix.code === "wrapped-section-content"),
    true,
  );
  assertMatch(doc.body.innerHTML, /data-part="section"/);
  assertMatch(doc.body.innerHTML, /data-part="trigger"/);
  assertMatch(doc.body.innerHTML, /data-part="panel"/);
});

Deno.test("repairAuras leaves non-deterministic accessibility issues as diagnostics", () => {
  const doc = renderMarkup(`
    <auras-splitter>
      <section data-pane="primary">Primary</section>
      <button type="button"></button>
      <section data-pane="secondary">Secondary</section>
    </auras-splitter>
  `);

  const result = repairAuras(doc);

  assertEquals(
    result.appliedFixes.filter((fix) => fix.code === "annotated-part").length,
    3,
  );
  assertEquals(result.diagnostics.length, 1);
  assertEquals(result.diagnostics[0]?.code, "missing-accessible-name");
  assertMatch(doc.body.innerHTML, /data-part="separator"/);
});

Deno.test("auditAuras reports duplicate combobox values and orphaned panels", () => {
  const diagnostics = auditAuras(
    renderMarkup(`
      <auras-combobox value="tabs">
        <input data-part="input" type="text" />
        <ul data-part="listbox">
          <li data-part="option" data-value="tabs">Tabs</li>
          <li data-part="option" data-value="tabs">Duplicate tabs</li>
        </ul>
        <section data-part="panels">
          <article data-part="panel" data-value="missing">Missing panel</article>
        </section>
      </auras-combobox>
    `),
  );

  assertEquals(
    diagnostics.length,
    4,
  );
  assertEquals(
    diagnostics.filter((item) => item.code === "duplicate-data-value").length,
    1,
  );
  assertEquals(
    diagnostics.filter((item) => item.code === "orphaned-pair").length,
    3,
  );
});

Deno.test("auditAuras reports tree topology and accessibility gaps", () => {
  const diagnostics = auditAuras(
    renderMarkup(`
      <auras-tree>
        <ul data-part="tree">
          <li data-part="item" data-value="components">
            <button type="button" data-part="toggle"></button>
            <ul data-part="group"></ul>
          </li>
        </ul>
      </auras-tree>
    `),
  );

  assertEquals(
    diagnostics.map((item) => item.code).sort(),
    [
      "missing-required-part",
      "empty-group",
      "missing-accessible-name",
      "missing-accessible-name",
    ].sort(),
  );
});

Deno.test("auditAuras treats unlabeled splitter separators as errors", () => {
  const diagnostics = auditAuras(
    renderMarkup(`
      <auras-splitter>
        <section data-part="pane" data-pane="primary">Primary</section>
        <button type="button" data-part="separator"></button>
        <section data-part="pane" data-pane="secondary">Secondary</section>
      </auras-splitter>
    `),
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0]?.code, "missing-accessible-name");
  assertEquals(diagnostics[0]?.severity, "error");
});

Deno.test("auditAuras validates per-section structure for auras-sections", () => {
  const diagnostics = auditAuras(
    renderMarkup(`
      <auras-sections mode="tabs" value="overview">
        <section data-part="section" data-value="overview">
          <div data-part="panel">Overview</div>
        </section>
        <section data-part="section" data-value="overview">
          <button type="button" data-part="trigger">Duplicate</button>
          <div data-part="panel">Duplicate</div>
        </section>
      </auras-sections>
    `),
  );

  assertEquals(
    diagnostics.map((item) => item.code).sort(),
    [
      "duplicate-data-value",
      "missing-required-part",
    ].sort(),
  );
});

Deno.test("homepage live component examples pass the audit", async () => {
  const html = await Deno.readTextFile(
    new URL("../public/index.html", import.meta.url),
  );
  const liveHosts = [
    extractHost(html, "auras-tabs", "site-tabs"),
    extractHost(html, "auras-master-detail", "site-md"),
    extractHost(html, "auras-combobox", "site-combobox"),
    extractHost(html, "auras-splitter", "site-splitter"),
    extractHost(html, "auras-tree", "site-tree"),
    extractHost(html, "auras-diagram", "site-diagram"),
    extractHost(html, "auras-sections", "site-sections-tabs"),
    extractHost(html, "auras-sections", "site-sections-accordion"),
    extractHost(html, "auras-sections", "site-sections-auto"),
  ].join("\n");
  const diagnostics = auditAuras(renderMarkup(liveHosts));

  assertEquals(diagnostics, []);
});

Deno.test("lab page loads the audit package and exposes the Contract Lab title", async () => {
  const html = await Deno.readTextFile(
    new URL("../public/lab.html", import.meta.url),
  );

  assertMatch(html, /<title>Contract Lab - Auras CSS<\/title>/);
  assertMatch(html, /from "\/packages\/audit\/browser\.js"/);
  assertMatch(html, /getAurasContracts/);
  assertMatch(html, /getAurasStarterMarkup/);
  assertMatch(html, /repairAuras/);
});

function extractHost(html: string, tagName: string, id: string): string {
  const match = new RegExp(
    `<${tagName}[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/${tagName}>`,
    "u",
  ).exec(html);

  if (!match) {
    throw new Error(`Expected ${tagName}#${id} host in public/index.html`);
  }

  return match[0];
}
