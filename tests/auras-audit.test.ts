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

const { auditAuras, getAurasContract } = await import("../packages/audit/mod.ts");

function renderMarkup(markup: string): Document {
  document.body.innerHTML = markup;
  return document;
}

Deno.test("getAurasContract returns the published combobox contract", () => {
  const contract = getAurasContract("auras-combobox");

  assertEquals(contract?.tagName, "auras-combobox");
  assertEquals(contract?.requiredParts.length, 3);
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
