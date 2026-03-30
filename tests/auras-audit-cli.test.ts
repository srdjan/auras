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
