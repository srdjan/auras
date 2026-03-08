import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { chromium } from "npm:playwright-core";

const DEFAULT_BROWSER_CANDIDATES = [
  Deno.env.get("AURA_BROWSER_EXECUTABLE"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

function resolveContentType(pathname) {
  if (pathname.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (pathname.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (pathname.endsWith(".js") || pathname.endsWith(".ts")) {
    return "text/javascript; charset=utf-8";
  }

  return "application/octet-stream";
}

async function resolveBrowserExecutable() {
  for (const candidate of DEFAULT_BROWSER_CANDIDATES) {
    if (!candidate) {
      continue;
    }

    try {
      await Deno.stat(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    "Could not find a Chromium-based browser. Set AURA_BROWSER_EXECUTABLE.",
  );
}

function startStaticServer(rootDir) {
  return Deno.serve({ hostname: "127.0.0.1", port: 0 }, async (request) => {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(
      url.pathname === "/" ? "/showcase/index.html" : url.pathname,
    );
    const filePath = `${rootDir}${relativePath}`;

    try {
      const file = await Deno.readFile(filePath);
      return new Response(file, {
        headers: {
          "content-type": resolveContentType(filePath),
        },
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(String(error), { status: 500 });
    }
  });
}

Deno.test(
  "browser smoke test upgrades optional packages and syncs demo state",
  async () => {
    const rootDir = Deno.cwd();
    const browserExecutable = await resolveBrowserExecutable();
    const server = startStaticServer(rootDir);

    try {
      const browser = await chromium.launch({
        executablePath: browserExecutable,
        headless: true,
      });

      try {
        const page = await browser.newPage();
        const origin = `http://127.0.0.1:${server.addr.port}`;

        await page.goto(`${origin}/showcase/index.html`);

        await page.waitForSelector("aura-diagram");
        await page.waitForSelector("aura-master-detail");
        await page.waitForSelector("aura-tabs");

        await expectText(page, "#diagram-selection", "received");
        await expectText(page, "#master-detail-selection", "elements");
        await expectText(page, "#manual-master-detail-selection", "elements");
        await expectText(page, "#tabs-selection", "overview");
        await expectText(page, "#manual-tabs-selection", "overview");

        await page
          .locator('#diagram-pilot [data-part="node"][data-value="received"]')
          .focus();
        await page.keyboard.press("ArrowRight");
        await expectText(page, "#diagram-selection", "received");
        await page.keyboard.press("Enter");
        await expectText(page, "#diagram-selection", "validate");

        await page
          .locator('#layer-pilot [data-part="trigger"][data-value="elements"]')
          .focus();
        await page.keyboard.press("ArrowDown");
        await expectText(page, "#master-detail-selection", "composites");

        await page
          .locator(
            '#tabs-auto-pilot [data-part="trigger"][data-value="overview"]',
          )
          .focus();
        await page.keyboard.press("ArrowRight");
        await expectText(page, "#tabs-selection", "tokens");

        await page
          .locator(
            '#tabs-manual-pilot [data-part="trigger"][data-value="overview"]',
          )
          .focus();
        await page.keyboard.press("ArrowRight");
        await expectText(page, "#manual-tabs-selection", "overview");
        await page.keyboard.press("Enter");
        await expectText(page, "#manual-tabs-selection", "tokens");

        const activeTabValue = await page
          .locator('#tabs-manual-pilot [data-part="trigger"][data-active]')
          .getAttribute("data-value");

        assertEquals(activeTabValue, "tokens");
      } finally {
        await browser.close();
      }
    } finally {
      await server.shutdown();
    }
  },
);

async function expectText(page, selector, expectedText) {
  await page.waitForFunction(
    ({ selector, expectedText }) => {
      return (
        document.querySelector(selector)?.textContent?.trim() === expectedText
      );
    },
    { selector, expectedText },
  );
}
