/// <reference lib="deno.ns" />

import { assertEquals, assertMatch } from "jsr:@std/assert@^1.0.14";

import { runAuditCli } from "../packages/audit/cli.ts";

Deno.test({
  name: "runAuditCli reports audit findings and exits non-zero on errors",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const result = await runAuditCli(
      ["example.html"],
      async () =>
        `<auras-splitter>
  <section data-part="pane" data-pane="primary">Primary</section>
  <button type="button" data-part="separator"></button>
  <section data-part="pane" data-pane="secondary">Secondary</section>
</auras-splitter>`,
    );

    assertEquals(result.exitCode, 1);
    assertEquals(result.diagnostics.length, 1);
    assertMatch(result.output, /auras-splitter missing-accessible-name/);
    assertMatch(
      result.output,
      /Summary: 1 error\(s\), 0 warning\(s\), 1 finding\(s\)\./,
    );
  },
});

Deno.test({
  name: "runAuditCli --fix prints repaired markup and applied fixes",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const result = await runAuditCli(
      ["--fix", "example.html"],
      async () =>
        `<auras-tabs value="overview">
  <nav aria-label="Release views">
    <button type="button" data-value="overview">Overview</button>
    <button type="button" data-value="tokens">Tokens</button>
  </nav>
  <section>
    <article data-value="overview">Overview</article>
    <article data-value="tokens" hidden>Tokens</article>
  </section>
</auras-tabs>`,
    );

    assertEquals(result.exitCode, 0);
    assertEquals(result.diagnostics.length, 0);
    assertEquals(result.appliedFixes.length > 0, true);
    assertMatch(result.output, /Applied Fixes:/);
    assertMatch(result.output, /Repaired Markup:/);
    assertMatch(result.output, /data-part="tablist"/);
    assertMatch(
      result.output,
      /Summary: 0 error\(s\), 0 warning\(s\), 0 finding\(s\), \d+ fix\(es\)\./,
    );
  },
});

Deno.test({
  name: "runAuditCli --write updates the file and still reports remaining errors",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    let writtenPath = "";
    let writtenMarkup = "";

    const result = await runAuditCli(
      ["--write", "example.html"],
      async () =>
        `<auras-splitter>
  <section data-pane="primary">Primary</section>
  <button type="button"></button>
  <section data-pane="secondary">Secondary</section>
</auras-splitter>`,
      async (path, data) => {
        writtenPath = path;
        writtenMarkup = data;
      },
    );

    assertEquals(writtenPath, "example.html");
    assertMatch(writtenMarkup, /data-part="separator"/);
    assertEquals(result.exitCode, 1);
    assertEquals(result.diagnostics.length, 1);
    assertEquals(result.diagnostics[0]?.code, "missing-accessible-name");
    assertMatch(result.output, /Wrote repaired markup back to example\.html\./);
    assertMatch(
      result.output,
      /Summary: 1 error\(s\), 0 warning\(s\), 1 finding\(s\), 3 fix\(es\)\./,
    );
  },
});

Deno.test({
  name: "runAuditCli --fix preserves full HTML documents",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const result = await runAuditCli(
      ["--fix", "document.html"],
      async () =>
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Example</title>
  </head>
  <body>
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
  </body>
</html>`,
    );

    assertEquals(result.exitCode, 0);
    assertMatch(result.output, /Repaired Markup:/);
    assertMatch(result.output, /<!DOCTYPE html>/);
    assertMatch(result.output, /<html lang="en">/);
    assertMatch(result.output, /<head>/);
    assertMatch(result.output, /data-part="tablist"/);
  },
});
