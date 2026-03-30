/// <reference lib="deno.ns" />

import { Window } from "npm:happy-dom";

import { auditAuras, type AurasDiagnostic } from "./mod.ts";

type CliRunResult = {
  diagnostics: AurasDiagnostic[];
  output: string;
  exitCode: number;
};

export async function runAuditCli(
  args: ReadonlyArray<string>,
  readTextFile: (path: string) => Promise<string> = Deno.readTextFile,
): Promise<CliRunResult> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return {
      diagnostics: [],
      output: [
        "Usage: deno run -A packages/audit/cli.ts <file.html>",
        "",
        "Audits authored Auras markup and prints diagnostics.",
      ].join("\n"),
      exitCode: args.length === 0 ? 1 : 0,
    };
  }

  const filePath = args[0];
  if (!filePath) {
    return {
      diagnostics: [],
      output: "Missing file path.",
      exitCode: 1,
    };
  }

  try {
    const markup = await readTextFile(filePath);
    const diagnostics = auditMarkup(markup);
    return {
      diagnostics,
      output: formatDiagnostics(filePath, diagnostics),
      exitCode: diagnostics.some((item) => item.severity === "error") ? 1 : 0,
    };
  } catch (error) {
    return {
      diagnostics: [],
      output: `Failed to read ${filePath}: ${String(error)}`,
      exitCode: 1,
    };
  }
}

export function auditMarkup(markup: string): AurasDiagnostic[] {
  const window = new Window();
  const prevElement = globalThis.Element;
  const prevHTMLElement = globalThis.HTMLElement;
  Object.assign(globalThis, {
    Element: globalThis.Element ?? window.Element,
    HTMLElement: globalThis.HTMLElement ?? window.HTMLElement,
  });
  try {
    const parser = new window.DOMParser();
    const document = parser.parseFromString(
      `<!DOCTYPE html><html><body>${markup}</body></html>`,
      "text/html",
    );

    return auditAuras(document as unknown as ParentNode);
  } finally {
    Object.assign(globalThis, {
      Element: prevElement,
      HTMLElement: prevHTMLElement,
    });
    window.happyDOM.cancelAsync();
    window.happyDOM.abort();
    window.close();
  }
}

export function formatDiagnostics(
  filePath: string,
  diagnostics: ReadonlyArray<AurasDiagnostic>,
): string {
  const errorCount = diagnostics.filter((item) => item.severity === "error")
    .length;
  const warningCount = diagnostics.length - errorCount;
  const detailLines = diagnostics.length === 0
    ? ["  ok: no findings"]
    : diagnostics.flatMap((diagnostic) => {
      const lines = [
        `  ${diagnostic.severity.toUpperCase()} ${diagnostic.hostTag} ${diagnostic.code}`,
        `  selector: ${diagnostic.selector}`,
        `  message: ${diagnostic.message}`,
      ];
      if (diagnostic.fixHint) {
        lines.push(`  hint: ${diagnostic.fixHint}`);
      }
      return lines;
    });
  const lines = [
    filePath,
    ...detailLines,
    "",
    `Summary: ${errorCount} error(s), ${warningCount} warning(s), ${diagnostics.length} finding(s).`,
  ];

  return lines.join("\n");
}

if (import.meta.main) {
  const result = await runAuditCli(Deno.args);
  console.log(result.output);
  Deno.exit(result.exitCode);
}
