/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "jsr:@std/assert@^1.0.14";

import {
  extractHeadings,
  getRedirectPath,
  renderSitemap,
  rewriteDocLinks,
  slugifyHeading,
} from "../site/docs.ts";

Deno.test("extractHeadings ignores fenced code blocks and creates stable ids", () => {
  const markdown = `# Aura CSS

## Quick Start

\`\`\`md
## Not a real heading
\`\`\`

## Quick Start
### Components
`;

  assertEquals(extractHeadings(markdown), [
    { depth: 1, text: "Aura CSS", id: "aura-css" },
    { depth: 2, text: "Quick Start", id: "quick-start" },
    { depth: 2, text: "Quick Start", id: "quick-start-2" },
    { depth: 3, text: "Components", id: "components" },
  ]);
});

Deno.test("rewriteDocLinks maps repo markdown links to pretty docs routes", () => {
  const html = `
    <p><a href="./component-architecture.md">Architecture</a></p>
    <p><a href="../packages/components/README.md">Components</a></p>
    <p><a href="https://example.com">External</a></p>
  `;

  const rewritten = rewriteDocLinks(html, "./docs/user-guide.md");

  assertStringIncludes(
    rewritten,
    'href="/docs/component-architecture/"',
  );
  assertStringIncludes(
    rewritten,
    'href="/docs/packages/components/"',
  );
  assertStringIncludes(rewritten, 'href="https://example.com"');
});

Deno.test("getRedirectPath normalizes raw markdown and legacy homepage paths", () => {
  assertEquals(getRedirectPath("/public/index.html"), "/");
  assertEquals(getRedirectPath("/docs/user-guide"), "/docs/user-guide/");
  assertEquals(
    getRedirectPath("/docs/component-architecture.md"),
    "/docs/component-architecture/",
  );
});

Deno.test("renderSitemap includes the homepage and documentation pages", () => {
  const sitemap = renderSitemap("https://aura.example");

  assertStringIncludes(sitemap, "<loc>https://aura.example/</loc>");
  assertStringIncludes(sitemap, "<loc>https://aura.example/docs/</loc>");
  assertStringIncludes(
    sitemap,
    "<loc>https://aura.example/docs/user-guide/</loc>",
  );
});

Deno.test("slugifyHeading strips inline markdown noise", () => {
  assertEquals(
    slugifyHeading("`aura-tabs` v1 Scope"),
    "aura-tabs-v1-scope",
  );
});
