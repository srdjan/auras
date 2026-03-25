/// <reference lib="deno.ns" />

import { serveDir } from "jsr:@std/http/file-server";
import {
  getDocPage,
  getRedirectPath,
  renderDocPage,
  renderDocsIndex,
  renderRobots,
  renderSitemap,
} from "./site/docs.ts";

const STATIC_DIRS: Record<string, string> = {
  "/packages/": "./packages",
};

function textResponse(
  body: string,
  contentType: string,
  status = 200,
): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": `${contentType}; charset=utf-8`,
    },
  });
}

function siteOrigin(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

async function renderPage(
  filePath: string,
  origin: string,
): Promise<Response> {
  const html = await Deno.readTextFile(filePath);

  return textResponse(
    html.replaceAll("{{SITE_ORIGIN}}", origin),
    "text/html",
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origin = siteOrigin(url);
  const redirectPath = getRedirectPath(url.pathname);

  if (redirectPath) {
    return Response.redirect(new URL(redirectPath, url), 308);
  }

  if (url.pathname === "/robots.txt") {
    return textResponse(renderRobots(origin), "text/plain");
  }

  if (url.pathname === "/sitemap.xml") {
    return textResponse(renderSitemap(origin), "application/xml");
  }

  if (url.pathname === "/") {
    return renderPage("./public/index.html", origin);
  }

  if (url.pathname === "/studio.html") {
    return renderPage("./public/studio.html", origin);
  }

  if (url.pathname === "/docs/") {
    return textResponse(renderDocsIndex(origin), "text/html");
  }

  const docPage = getDocPage(url.pathname);
  if (docPage) {
    return textResponse(await renderDocPage(docPage, origin), "text/html");
  }

  for (const [prefix, fsRoot] of Object.entries(STATIC_DIRS)) {
    if (url.pathname.startsWith(prefix)) {
      return serveDir(req, {
        fsRoot,
        urlRoot: prefix.slice(1, -1),
        quiet: true,
      });
    }
  }

  return serveDir(req, {
    fsRoot: "./public",
    quiet: true,
  });
});
