/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "jsr:@std/assert@^1.0.14";

import {
  DOC_PAGES,
  extractHeadings,
  getDocPage,
  getRedirectPath,
  renderDocsIndex,
  renderSitemap,
  rewriteDocLinks,
  slugifyHeading,
} from "../site/docs.ts";

Deno.test("extractHeadings ignores fenced code blocks and creates stable ids", () => {
  const markdown = `# Auras CSS

## Quick Start

\`\`\`md
## Not a real heading
\`\`\`

## Quick Start
### Components
`;

  assertEquals(extractHeadings(markdown), [
    { depth: 1, text: "Auras CSS", id: "auras-css" },
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
  const sitemap = renderSitemap("https://auras.example");

  assertStringIncludes(sitemap, "<loc>https://auras.example/</loc>");
  assertStringIncludes(sitemap, "<loc>https://auras.example/lab.html</loc>");
  assertStringIncludes(sitemap, "<loc>https://auras.example/docs/</loc>");
  assertStringIncludes(
    sitemap,
    "<loc>https://auras.example/docs/user-guide/</loc>",
  );
  assertStringIncludes(
    sitemap,
    "<loc>https://auras.example/docs/packages/elements/</loc>",
  );
  assertStringIncludes(
    sitemap,
    "<loc>https://auras.example/docs/packages/audit/</loc>",
  );
});

Deno.test("docs index exposes CSS package docs and keeps shared internal", () => {
  assert(DOC_PAGES.some((page) => page.route === "/docs/packages/elements/"));
  assert(DOC_PAGES.some((page) => page.route === "/docs/packages/composites/"));
  assert(DOC_PAGES.some((page) => page.route === "/docs/packages/brands/"));
  assert(
    DOC_PAGES.some((page) => page.route === "/docs/packages/breakpoints/"),
  );
  assertEquals(getDocPage("/docs/packages/shared/"), null);

  const docsIndex = renderDocsIndex("https://auras.example");

  assertStringIncludes(docsIndex, 'href="/docs/packages/elements/"');
  assertStringIncludes(docsIndex, 'href="/docs/packages/composites/"');
  assertStringIncludes(docsIndex, 'href="/docs/packages/brands/"');
  assertStringIncludes(docsIndex, 'href="/docs/packages/breakpoints/"');
  assert(!docsIndex.includes("/docs/packages/shared/"));
});

Deno.test("slugifyHeading strips inline markdown noise", () => {
  assertEquals(
    slugifyHeading("`auras-tabs` v1 Scope"),
    "auras-tabs-v1-scope",
  );
});
