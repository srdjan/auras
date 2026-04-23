/// <reference lib="deno.ns" />

import { Window } from "npm:happy-dom";

import {
  auditAuras,
  repairAuras,
  type AurasAppliedFix,
  type AurasDiagnostic,
} from "./mod.ts";

type CliRunResult = {
  diagnostics: AurasDiagnostic[];
  appliedFixes: ReadonlyArray<AurasAppliedFix>;
  output: string;
  exitCode: number;
  repairedMarkup?: string;
  wroteFile?: boolean;
};

type ParsedCliArgs = {
  help: boolean;
  fix: boolean;
  write: boolean;
  filePath: string | null;
  error?: string;
};

export async function runAuditCli(
  args: ReadonlyArray<string>,
  readTextFile: (path: string) => Promise<string> = Deno.readTextFile,
  writeTextFile: (
    path: string,
    data: string,
  ) => Promise<void> = Deno.writeTextFile,
): Promise<CliRunResult> {
  const parsedArgs = parseCliArgs(args);

  if (args.length === 0 || parsedArgs.help) {
    return {
      diagnostics: [],
      appliedFixes: [],
      output: [
        "Usage: deno run -A packages/audit/cli.ts [--fix] [--write] <file.html>",
        "",
        "Audit authored Auras markup, print diagnostics, and optionally apply deterministic structural repairs.",
        "",
        "  --fix    Print repaired markup and any applied fixes without mutating the file.",
        "  --write  Repair the file in place and print any remaining diagnostics.",
      ].join("\n"),
      exitCode: args.length === 0 ? 1 : 0,
    };
  }

  if (parsedArgs.error) {
    return {
      diagnostics: [],
      appliedFixes: [],
      output: parsedArgs.error,
      exitCode: 1,
    };
  }

  if (!parsedArgs.filePath) {
    return {
      diagnostics: [],
      appliedFixes: [],
      output: "Missing file path.",
      exitCode: 1,
    };
  }

  try {
    const markup = await readTextFile(parsedArgs.filePath);

    if (!parsedArgs.fix && !parsedArgs.write) {
      const diagnostics = auditMarkup(markup);
      return {
        diagnostics,
        appliedFixes: [],
        output: formatDiagnostics(parsedArgs.filePath, diagnostics),
        exitCode: diagnostics.some((item) => item.severity === "error") ? 1 : 0,
      };
    }

    const repairResult = repairMarkup(markup);
    if (parsedArgs.write) {
      await writeTextFile(parsedArgs.filePath, repairResult.markup);
    }

    return {
      diagnostics: [...repairResult.diagnostics],
      appliedFixes: repairResult.appliedFixes,
      repairedMarkup: repairResult.markup,
      wroteFile: parsedArgs.write,
      output: formatRepairOutput(parsedArgs.filePath, repairResult, {
        wroteFile: parsedArgs.write,
      }),
      exitCode: repairResult.diagnostics.some((item) => item.severity === "error")
        ? 1
        : 0,
    };
  } catch (error) {
    return {
      diagnostics: [],
      appliedFixes: [],
      output: `Failed to read ${parsedArgs.filePath}: ${String(error)}`,
      exitCode: 1,
    };
  }
}

export function auditMarkup(markup: string): AurasDiagnostic[] {
  return withParsedMarkup(markup, ({ document }) =>
    auditAuras(document as unknown as ParentNode)
  );
}

export function repairMarkup(markup: string): {
  appliedFixes: ReadonlyArray<AurasAppliedFix>;
  diagnostics: ReadonlyArray<AurasDiagnostic>;
  markup: string;
} {
  return withParsedMarkup(markup, ({ document, isWholeDocument }) => {
    const result = repairAuras(document as unknown as ParentNode);
    return {
      appliedFixes: result.appliedFixes,
      diagnostics: result.diagnostics,
      markup: serializeMarkup(document, isWholeDocument),
    };
  });
}

function withParsedMarkup<Result>(
  markup: string,
  run: (
    parsed: {
      document: Document;
      isWholeDocument: boolean;
    },
  ) => Result,
): Result {
  const window = new Window();
  const prevElement = globalThis.Element;
  const prevHTMLElement = globalThis.HTMLElement;
  Object.assign(globalThis, {
    Element: globalThis.Element ?? window.Element,
    HTMLElement: globalThis.HTMLElement ?? window.HTMLElement,
  });

  try {
    const parser = new window.DOMParser();
    const isWholeDocument = isWholeDocumentMarkup(markup);
    const document = parser.parseFromString(
      isWholeDocument
        ? markup
        : `<!DOCTYPE html><html><body>${markup}</body></html>`,
      "text/html",
    );

    return run({
      document: document as unknown as Document,
      isWholeDocument,
    });
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

function isWholeDocumentMarkup(markup: string): boolean {
  return /<(?:!doctype\s+html|html|head|body)\b/i.test(markup);
}

function serializeMarkup(
  document: Document,
  isWholeDocument: boolean,
): string {
  if (!isWholeDocument) {
    return document.body.innerHTML.trim();
  }

  const doctype = document.doctype
    ? `<!DOCTYPE ${document.doctype.name}>\n`
    : "";

  return `${doctype}${document.documentElement.outerHTML}`;
}

function parseCliArgs(args: ReadonlyArray<string>): ParsedCliArgs {
  const state: ParsedCliArgs = {
    help: false,
    fix: false,
    write: false,
    filePath: null,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      state.help = true;
      continue;
    }

    if (arg === "--fix") {
      state.fix = true;
      continue;
    }

    if (arg === "--write") {
      state.write = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ...state,
        error: `Unknown flag: ${arg}`,
      };
    }

    if (state.filePath) {
      return {
        ...state,
        error: `Unexpected extra argument: ${arg}`,
      };
    }

    state.filePath = arg;
  }

  return state;
}

export function formatDiagnostics(
  filePath: string,
  diagnostics: ReadonlyArray<AurasDiagnostic>,
): string {
  const { errorCount, warningCount } = summarizeDiagnostics(diagnostics);
  const detailLines = formatDiagnosticLines(diagnostics);
  const lines = [
    filePath,
    ...detailLines,
    "",
    `Summary: ${errorCount} error(s), ${warningCount} warning(s), ${diagnostics.length} finding(s).`,
  ];

  return lines.join("\n");
}

function formatRepairOutput(
  filePath: string,
  result: {
    appliedFixes: ReadonlyArray<AurasAppliedFix>;
    diagnostics: ReadonlyArray<AurasDiagnostic>;
    markup: string;
  },
  options: { wroteFile: boolean },
): string {
  const { errorCount, warningCount } = summarizeDiagnostics(result.diagnostics);
  const sections = [
    filePath,
    "",
    "Applied Fixes:",
    ...formatAppliedFixes(result.appliedFixes),
    "",
    "Remaining Diagnostics:",
    ...formatDiagnosticLines(result.diagnostics),
  ];

  if (options.wroteFile) {
    sections.push("", `Wrote repaired markup back to ${filePath}.`);
  } else {
    sections.push("", "Repaired Markup:", result.markup || "  (empty)");
  }

  sections.push(
    "",
    `Summary: ${errorCount} error(s), ${warningCount} warning(s), ${result.diagnostics.length} finding(s), ${result.appliedFixes.length} fix(es).`,
  );

  return sections.join("\n");
}

function formatAppliedFixes(
  appliedFixes: ReadonlyArray<AurasAppliedFix>,
): string[] {
  return appliedFixes.length === 0
    ? ["  ok: no automatic fixes applied"]
    : appliedFixes.flatMap((fix) => [
      `  FIX ${fix.hostTag} ${fix.code}`,
      `  selector: ${fix.selector}`,
      `  message: ${fix.message}`,
    ]);
}

function formatDiagnosticLines(
  diagnostics: ReadonlyArray<AurasDiagnostic>,
): string[] {
  return diagnostics.length === 0
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
}

function summarizeDiagnostics(
  diagnostics: ReadonlyArray<AurasDiagnostic>,
): { errorCount: number; warningCount: number } {
  const errorCount = diagnostics.filter((item) => item.severity === "error")
    .length;
  return {
    errorCount,
    warningCount: diagnostics.length - errorCount,
  };
}

if (import.meta.main) {
  const result = await runAuditCli(Deno.args);
  console.log(result.output);
  Deno.exit(result.exitCode);
}
