/// <reference lib="deno.ns" />

import { dirname, join, normalize } from "jsr:@std/path@^1.0.8/posix";
import { marked } from "npm:marked@15";

export type DocPage = {
  route: string;
  sourcePath: string;
  title: string;
  description: string;
  category: string;
  related: ReadonlyArray<{ href: string; label: string }>;
};

export type DocHeading = {
  depth: number;
  text: string;
  id: string;
};

const SOCIAL_IMAGE_PATH = "/auras-banner-dark.jpg";

export const DOC_PAGES: ReadonlyArray<DocPage> = [
  {
    route: "/docs/user-guide/",
    sourcePath: "./docs/user-guide.md",
    title: "Auras CSS User Guide",
    description:
      "Installation, layout primitives, tokens, theming, utilities, and interactive component patterns for Auras CSS.",
    category: "Guide",
    related: [
      {
        href: "/docs/component-architecture/",
        label: "Component architecture",
      },
      { href: "/docs/packages/components/", label: "@auras/components" },
      { href: "/docs/packages/diagram/", label: "@auras/diagram" },
      { href: "/docs/packages/audit/", label: "@auras/audit" },
    ],
  },
  {
    route: "/docs/component-architecture/",
    sourcePath: "./docs/component-architecture.md",
    title: "Auras CSS Component Architecture",
    description:
      "How Auras CSS is structured into Elements, Composites, and light-DOM Components, plus the public styling and behavior contract.",
    category: "Architecture",
    related: [
      { href: "/docs/user-guide/", label: "User guide" },
      { href: "/docs/packages/components/", label: "@auras/components" },
      { href: "/docs/packages/diagram/", label: "@auras/diagram" },
      { href: "/docs/packages/audit/", label: "@auras/audit" },
    ],
  },
  {
    route: "/docs/packages/components/",
    sourcePath: "./packages/components/README.md",
    title: "@auras/components",
    description:
      "Light-DOM interactive components for Auras CSS, including tabs, combobox, splitter, tree, and master-detail.",
    category: "Package Docs",
    related: [
      { href: "/docs/user-guide/", label: "User guide" },
      {
        href: "/docs/component-architecture/",
        label: "Component architecture",
      },
      { href: "/docs/packages/diagram/", label: "@auras/diagram" },
      { href: "/docs/packages/audit/", label: "@auras/audit" },
    ],
  },
  {
    route: "/docs/packages/diagram/",
    sourcePath: "./packages/diagram/README.md",
    title: "@auras/diagram",
    description:
      "Optional light-DOM diagram controller for Auras CSS with selection state, roving focus, and keyboard navigation.",
    category: "Package Docs",
    related: [
      { href: "/docs/user-guide/", label: "User guide" },
      {
        href: "/docs/component-architecture/",
        label: "Component architecture",
      },
      { href: "/docs/packages/components/", label: "@auras/components" },
      { href: "/docs/packages/audit/", label: "@auras/audit" },
    ],
  },
  {
    route: "/docs/packages/audit/",
    sourcePath: "./packages/audit/README.md",
    title: "@auras/audit",
    description:
      "Validate authored Auras markup against light-DOM contracts in the browser, tests, or CLI.",
    category: "Package Docs",
    related: [
      { href: "/docs/user-guide/", label: "User guide" },
      {
        href: "/docs/component-architecture/",
        label: "Component architecture",
      },
      { href: "/docs/packages/components/", label: "@auras/components" },
      { href: "/lab.html", label: "Contract Lab" },
    ],
  },
] as const;

const DOC_PAGE_BY_ROUTE = new Map(
  DOC_PAGES.map((page) => [page.route, page] as const),
);

const DOC_PAGE_BY_SOURCE = new Map(
  DOC_PAGES.map((page) => [normalizeRepoPath(page.sourcePath), page] as const),
);

function normalizeRepoPath(path: string): string {
  return normalize(path.replace(/^[./]+/, ""));
}

function ensureTrailingSlash(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function trimTrailingSlash(pathname: string): string {
  return pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function absoluteUrl(origin: string, pathname: string): string {
  return `${origin}${pathname}`;
}

function docsNavItems(currentPath: string): string {
  const items = [
    { href: "/", label: "Home" },
    { href: "/docs/", label: "Docs" },
    { href: "/docs/user-guide/", label: "User guide" },
    { href: "/docs/component-architecture/", label: "Architecture" },
    { href: "/lab.html", label: "Lab" },
  ];

  return items.map((item) => {
    const ariaCurrent = item.href === currentPath ? ' aria-current="page"' : "";
    return `<li><a href="${item.href}"${ariaCurrent}>${item.label}</a></li>`;
  }).join("");
}

function footerLinks(): string {
  const links = [
    { href: "/", label: "Home" },
    { href: "/docs/", label: "Docs" },
    { href: "/lab.html", label: "Lab" },
    { href: "https://github.com/nicholasgasior/auras", label: "GitHub" },
  ];

  return links.map((link) => {
    const rel = link.href.startsWith("https://")
      ? ' rel="noopener noreferrer"'
      : "";
    return `<li><a href="${link.href}"${rel}>${link.label}</a></li>`;
  }).join("");
}

function stripInlineMarkdown(value: string): string {
  return value
    .replaceAll(/`([^`]+)`/g, "$1")
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replaceAll(/[*_~]/g, "")
    .replaceAll(/&amp;/g, "&")
    .trim();
}

export function slugifyHeading(value: string): string {
  return stripInlineMarkdown(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-") || "section";
}

export function extractHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const counts = new Map<string, number>();
  let inCodeFence = false;

  for (const line of markdown.split(/\r?\n/u)) {
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (!match) {
      continue;
    }

    const depth = match[1].length;
    const text = stripInlineMarkdown(match[2]);
    const baseId = slugifyHeading(text);
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);

    headings.push({
      depth,
      text,
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
    });
  }

  return headings;
}

function addHeadingIds(
  html: string,
  headings: ReadonlyArray<DocHeading>,
): string {
  let headingIndex = 0;

  return html.replace(
    /<h([1-6])>([\s\S]*?)<\/h\1>/gu,
    (match, rawDepth, innerHtml) => {
      const heading = headings[headingIndex];
      if (!heading) {
        return match;
      }

      headingIndex += 1;
      return `<h${rawDepth} id="${heading.id}">${innerHtml}</h${rawDepth}>`;
    },
  );
}

function stripFirstH1(html: string): string {
  return html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/u, "");
}

function resolveDocHref(fromSourcePath: string, href: string): string | null {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z]+:/iu.test(href) ||
    href.startsWith("//")
  ) {
    return null;
  }

  const [pathPart, fragment = ""] = href.split("#", 2);
  if (pathPart === "") {
    return fragment ? `#${fragment}` : href;
  }

  const normalizedSourcePath = normalizeRepoPath(fromSourcePath);
  const targetPath = pathPart.startsWith("/")
    ? normalizeRepoPath(pathPart.slice(1))
    : normalizeRepoPath(join(dirname(normalizedSourcePath), pathPart));

  if (targetPath === "README.md") {
    return fragment ? `/#${fragment}` : "/";
  }

  const docPage = DOC_PAGE_BY_SOURCE.get(targetPath);
  if (!docPage) {
    return null;
  }

  return fragment ? `${docPage.route}#${fragment}` : docPage.route;
}

export function rewriteDocLinks(html: string, fromSourcePath: string): string {
  return html.replace(/href="([^"]+)"/gu, (match, href) => {
    const resolved = resolveDocHref(fromSourcePath, href);
    if (!resolved) {
      return match;
    }

    return `href="${escapeHtml(resolved)}"`;
  });
}

function docsPageStyles(): string {
  return `@layer site {
    [data-site="docs-shell"] {
      max-inline-size: 72rem;
      padding-block: var(--space-8) var(--space-12);
    }

    [data-site="docs-toolbar"] {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background-color: color-mix(in oklch, var(--bg) 82%, transparent);
      border-block-end: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
      padding-inline: var(--space-4);
    }

    [data-site="docs-toolbar-inner"] {
      max-inline-size: 72rem;
      inline-size: 100%;
      margin-inline: auto;
    }

    [data-site="docs-wordmark"] {
      font-weight: 700;
      letter-spacing: -0.02em;
      text-decoration: none;
      color: var(--text);
    }

    [data-site="docs-toolbar"] nav a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: var(--text-sm);
    }

    [data-site="docs-toolbar"] nav a:hover,
    [data-site="docs-toolbar"] nav a[aria-current="page"] {
      color: var(--text);
    }

    [data-site="breadcrumb"] ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-6);
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    [data-site="breadcrumb"] li + li::before {
      content: "/";
      margin-inline-end: var(--space-2);
      color: var(--border-strong);
    }

    [data-site="page-header"] {
      margin-block-end: var(--space-6);
    }

    [data-site="page-header"] h1 {
      margin: 0;
      font-size: clamp(2.25rem, 5vw, 3.5rem);
      letter-spacing: -0.04em;
    }

    [data-site="page-header"] p:first-child {
      margin: 0 0 var(--space-2);
      color: var(--primary);
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    [data-site="page-header"] p:last-child {
      margin: var(--space-3) 0 0;
      color: var(--text-muted);
      font-size: var(--text-lg);
      max-inline-size: 60ch;
    }

    [data-site="docs-grid"] {
      display: grid;
      gap: var(--space-6);
      align-items: start;
    }

    [data-site="doc-article"] {
      padding: min(6vw, var(--space-8));
    }

    [data-site="sidebar"] {
      display: grid;
      gap: var(--space-4);
    }

    [data-site="sidebar"] section {
      padding: var(--space-4);
    }

    [data-site="sidebar"] h2 {
      font-size: var(--text-base);
      margin: 0 0 var(--space-3);
    }

    [data-site="sidebar"] nav ul,
    [data-site="related-links"] {
      display: grid;
      gap: var(--space-2);
      list-style: none;
      padding: 0;
      margin: 0;
    }

    [data-site="sidebar"] a {
      color: var(--text-muted);
      font-size: var(--text-sm);
      text-decoration: none;
    }

    [data-site="sidebar"] a:hover {
      color: var(--text);
    }

    [data-site="docs-footer"] {
      padding-block: var(--space-10);
      border-block-start: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
    }

    [data-site="docs-footer"] nav > ul {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-4);
      list-style: none;
      padding: 0;
      margin: 0;
    }

    [data-site="docs-footer"] p {
      color: var(--text-muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    [data-site="card-grid"] {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
      gap: var(--space-4);
    }

    [data-site="card-grid"] a {
      color: inherit;
      text-decoration: none;
    }

    [data-site="card-grid"] article {
      padding: var(--space-6);
      block-size: 100%;
    }

    [data-site="card-grid"] p:first-child {
      margin: 0 0 var(--space-2);
      color: var(--primary);
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    [data-site="card-grid"] h2 {
      margin: 0 0 var(--space-2);
      font-size: var(--text-lg);
    }

    [data-site="card-grid"] p:last-child {
      margin: 0;
      color: var(--text-muted);
    }

    @media (min-width: 64rem) {
      [data-site="docs-grid"] {
        grid-template-columns: minmax(0, 1fr) 18rem;
      }

      [data-site="sidebar"] {
        position: sticky;
        top: calc(var(--space-8) + 1rem);
      }
    }
  }`;
}

function renderPageHead(options: {
  origin: string;
  path: string;
  title: string;
  description: string;
  pageType: "website" | "article";
  structuredData: ReadonlyArray<unknown>;
}): string {
  const canonicalUrl = absoluteUrl(options.origin, options.path);
  const socialImageUrl = absoluteUrl(options.origin, SOCIAL_IMAGE_PATH);
  const fullTitle = `${options.title} | Auras CSS`;

  return `<!DOCTYPE html>
<html lang="en" data-smooth>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(options.description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="theme-color" content="#ffffff" />
    <meta property="og:type" content="${options.pageType}" />
    <meta property="og:site_name" content="Auras CSS" />
    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${
    escapeHtml(options.description)
  }" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta property="og:image:width" content="600" />
    <meta property="og:image:height" content="327" />
    <meta property="og:image:alt" content="Auras CSS social preview" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
    <meta name="twitter:description" content="${
    escapeHtml(options.description)
  }" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <meta name="twitter:image:alt" content="Auras CSS social preview" />
    <link rel="stylesheet" href="/packages/elements/auras.css" />
    <link rel="stylesheet" href="/packages/composites/auras-composites.css" />
    <link rel="stylesheet" href="/packages/brands/auras-brand.css" />
    <style>${docsPageStyles()}</style>
    ${options.structuredData.map(jsonLdScript).join("\n    ")}
  </head>`;
}

function renderBreadcrumbHtml(
  items: ReadonlyArray<{ href: string; label: string }>,
): string {
  const renderedItems = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const content = isLast
      ? `<span aria-current="page">${escapeHtml(item.label)}</span>`
      : `<a href="${item.href}">${escapeHtml(item.label)}</a>`;

    return `<li>${content}</li>`;
  }).join("");

  return `<nav aria-label="Breadcrumb" data-site="breadcrumb">
    <ol>${renderedItems}</ol>
  </nav>`;
}

function breadcrumbStructuredData(
  origin: string,
  items: ReadonlyArray<{ href: string; label: string }>,
): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(origin, item.href),
    })),
  };
}

function articleStructuredData(
  origin: string,
  page: DocPage,
): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: absoluteUrl(origin, page.route),
    author: {
      "@type": "Organization",
      name: "Auras CSS",
    },
    publisher: {
      "@type": "Organization",
      name: "Auras CSS",
    },
    mainEntityOfPage: absoluteUrl(origin, page.route),
    articleSection: page.category,
    about: [
      "CSS framework",
      "semantic HTML",
      "design tokens",
      "headless UI",
    ],
  };
}

function softwareStructuredData(origin: string): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Auras CSS Documentation",
    description:
      "Guides, architecture notes, package docs, and contract tooling for Auras CSS.",
    url: absoluteUrl(origin, "/docs/"),
    isPartOf: absoluteUrl(origin, "/"),
    hasPart: DOC_PAGES.map((page) => ({
      "@type": "TechArticle",
      name: page.title,
      url: absoluteUrl(origin, page.route),
    })),
  };
}

function renderSidebar(
  headings: ReadonlyArray<DocHeading>,
  related: ReadonlyArray<{ href: string; label: string }>,
): string {
  const tocItems = headings
    .filter((heading) => heading.depth === 2)
    .map((heading) =>
      `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`
    )
    .join("");

  const relatedItems = related.map((link) =>
    `<li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`
  ).join("");

  return `<aside data-site="sidebar">
    <section data-surface="card">
      <h2>On this page</h2>
      <nav aria-label="Table of contents">
        <ul>${tocItems || "<li><span>Overview</span></li>"}</ul>
      </nav>
    </section>
    <section data-surface="card">
      <h2>Related docs</h2>
      <ul data-site="related-links">${relatedItems}</ul>
    </section>
  </aside>`;
}

function renderFooter(currentPath: string): string {
  return `<footer data-site="docs-footer">
    <div data-layout="container">
      <div data-layout="stack" data-gap="3" data-align="center">
        <nav aria-label="Project links" data-nav="inline">
          <ul>${footerLinks()}</ul>
        </nav>
        <p>${
    currentPath === "/"
      ? "Auras CSS is headless by default and SEO-ready with semantic HTML."
      : "Auras CSS documentation is served as semantic HTML with token-driven styling."
  }</p>
      </div>
    </div>
  </footer>`;
}

export function getDocPage(pathname: string): DocPage | null {
  return DOC_PAGE_BY_ROUTE.get(ensureTrailingSlash(pathname)) ?? null;
}

export function getRedirectPath(pathname: string): string | null {
  if (pathname === "/index.html" || pathname === "/public/index.html") {
    return "/";
  }

  if (pathname === "/docs") {
    return "/docs/";
  }

  for (const page of DOC_PAGES) {
    const withoutTrailingSlash = trimTrailingSlash(page.route);
    if (pathname === withoutTrailingSlash) {
      return page.route;
    }

    if (pathname === `/${normalizeRepoPath(page.sourcePath)}`) {
      return page.route;
    }
  }

  return null;
}

export async function renderDocPage(
  page: DocPage,
  origin: string,
): Promise<string> {
  const markdown = await Deno.readTextFile(page.sourcePath);
  const headings = extractHeadings(markdown);
  const markdownHtml = await marked.parse(markdown, { gfm: true });
  const withHeadingIds = addHeadingIds(String(markdownHtml), headings);
  const contentHtml = rewriteDocLinks(
    stripFirstH1(withHeadingIds),
    page.sourcePath,
  );
  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/docs/", label: "Docs" },
    { href: page.route, label: page.title },
  ];

  return `${
    renderPageHead({
      origin,
      path: page.route,
      title: page.title,
      description: page.description,
      pageType: "article",
      structuredData: [
        articleStructuredData(origin, page),
        breadcrumbStructuredData(origin, breadcrumbItems),
      ],
    })
  }
  <body data-brand="auras">
    <header data-ui="site-header" data-sticky data-site="docs-toolbar">
      <div
        data-layout="row"
        data-align="center"
        data-justify="between"
        data-gap="2"
        data-site="docs-toolbar-inner"
      >
        <a href="/" data-site="docs-wordmark">Auras CSS</a>
        <nav aria-label="Documentation" data-nav="inline" data-hide="mobile">
          <ul>${docsNavItems(page.route)}</ul>
        </nav>
      </div>
    </header>
    <main data-layout="container" data-site="docs-shell">
      ${renderBreadcrumbHtml(breadcrumbItems)}
      <header data-site="page-header">
        <p>${escapeHtml(page.category)}</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.description)}</p>
      </header>
      <div data-site="docs-grid">
        <article data-surface="card" data-ui="prose" data-site="doc-article">
          ${contentHtml}
        </article>
        ${renderSidebar(headings, page.related)}
      </div>
    </main>
    ${renderFooter(page.route)}
  </body>
</html>`;
}

export function renderDocsIndex(origin: string): string {
  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/docs/", label: "Docs" },
  ];

  const cards = DOC_PAGES.map((page) =>
    `<a href="${page.route}">
      <article data-surface="card">
        <p>${escapeHtml(page.category)}</p>
        <h2>${escapeHtml(page.title)}</h2>
        <p>${escapeHtml(page.description)}</p>
      </article>
    </a>`
  ).join("");

  return `${
    renderPageHead({
      origin,
      path: "/docs/",
      title: "Auras CSS Documentation",
      description:
        "Guides, architecture notes, package docs, and contract tooling for Auras CSS.",
      pageType: "website",
      structuredData: [
        softwareStructuredData(origin),
        breadcrumbStructuredData(origin, breadcrumbItems),
      ],
    })
  }
  <body data-brand="auras">
    <header data-ui="site-header" data-sticky data-site="docs-toolbar">
      <div
        data-layout="row"
        data-align="center"
        data-justify="between"
        data-gap="2"
        data-site="docs-toolbar-inner"
      >
        <a href="/" data-site="docs-wordmark">Auras CSS</a>
        <nav aria-label="Documentation" data-nav="inline">
          <ul>${docsNavItems("/docs/")}</ul>
        </nav>
      </div>
    </header>
    <main data-layout="container" data-site="docs-shell">
      ${renderBreadcrumbHtml(breadcrumbItems)}
      <header data-site="page-header">
        <p>Documentation</p>
        <h1>Auras CSS Docs</h1>
        <p>
          Crawlable guides and package references for Auras CSS, served as
          semantic HTML with canonical URLs, breadcrumb metadata, and internal
          links.
        </p>
      </header>
      <section data-site="card-grid">
        ${cards}
      </section>
    </main>
    ${renderFooter("/docs/")}
  </body>
</html>`;
}

export function renderSitemap(origin: string): string {
  const urls = [
    "/",
    "/studio.html",
    "/lab.html",
    "/docs/",
    ...DOC_PAGES.map((page) => page.route),
  ];
  const items = urls.map((path) =>
    `<url><loc>${absoluteUrl(origin, path)}</loc></url>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

export function renderRobots(origin: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl(origin, "/sitemap.xml")}
`;
}
