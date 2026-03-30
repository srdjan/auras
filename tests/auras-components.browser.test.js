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
      url.pathname === "/" ? "/public/index.html" : url.pathname,
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

        await page.goto(`${origin}/public/index.html`);

        await page.waitForSelector("auras-combobox");
        await page.waitForSelector("auras-diagram");
        await page.waitForSelector("auras-splitter");
        await page.waitForSelector("auras-tree");
        await page.waitForSelector("auras-master-detail");
        await page.waitForSelector("auras-tabs");

        await expectAttribute(page, "body", "data-brand", "auras");
        await expectAttribute(page, "#brand-headless", "data-variant", "ghost");
        await expectAttribute(page, "#brand-auras", "data-variant", "solid");
        await expectAttribute(
          page,
          "#brand-editorial",
          "data-variant",
          "ghost",
        );
        await expectLinkHref(
          page,
          "#brand-pack-auras",
          "/packages/brands/auras-brand.css",
        );

        await expectText(page, "#combobox-out", "tabs");
        await expectText(page, "#diagram-out", "input");
        await expectText(page, "#splitter-out", "40");
        await expectText(page, "#tree-out", "auras.css");
        await expectText(page, "#md-out", "elements");
        await expectText(page, "#tabs-out", "overview");

        await page.click("#brand-editorial");
        await expectAttribute(page, "body", "data-brand", "editorial");
        await expectAttribute(
          page,
          "#brand-editorial",
          "data-variant",
          "solid",
        );
        await expectLinkHref(
          page,
          "#brand-pack-editorial",
          "/packages/brands/auras-brand-editorial.css",
        );

        await page.click("#brand-headless");
        await expectMissingAttribute(page, "body", "data-brand");
        await expectAttribute(page, "#brand-headless", "data-variant", "solid");

        await page.click("#brand-auras");
        await expectAttribute(page, "body", "data-brand", "auras");
        await expectAttribute(page, "#brand-auras", "data-variant", "solid");

        await page.click("#toggle-contrast");
        await expectAttribute(page, "html", "data-contrast", "more");
        await expectAttribute(page, "#toggle-contrast", "aria-pressed", "true");

        await page.click("#toggle-motion");
        await expectAttribute(page, "html", "data-motion", "reduce");
        await expectAttribute(page, "#toggle-motion", "aria-pressed", "true");

        await page.click("#toggle-dark");
        await expectAttribute(page, "html", "data-theme", "dark");
        await expectAttribute(page, "#toggle-dark", "aria-pressed", "true");

        await page.locator(
          '#site-combobox [data-part="option"][data-value="master-detail"]',
        ).evaluate((element) => element.click());
        await expectText(page, "#combobox-out", "master-detail");

        await page.locator('#site-splitter [data-part="separator"]').focus();
        await page.keyboard.press("ArrowRight");
        await expectText(page, "#splitter-out", "45");

        await page.click(
          '#site-diagram [data-part="node"][data-value="transform"]',
        );
        await expectText(page, "#diagram-out", "transform");

        await page.click(
          '#site-tree [data-part="node"][data-value="components"]',
        );
        await expectText(page, "#tree-out", "components");
        await page.click('#site-tree [aria-label="Toggle components"]');
        await expectAttribute(
          page,
          '#site-tree [data-part="item"][data-value="components"]',
          "data-expanded",
          "",
        );
        await page.click(
          '#site-tree [data-part="node"][data-value="browser-js"]',
        );
        await expectText(page, "#tree-out", "browser-js");
        await page.click('#site-tree [aria-label="Toggle components"]');
        await expectText(page, "#tree-out", "components");
        await expectHidden(
          page,
          '#site-tree [data-part="item"][data-value="components"] > [data-part="group"]',
          true,
        );

        await page.click(
          '#site-md [data-part="trigger"][data-value="composites"]',
        );
        await expectText(page, "#md-out", "composites");

        await page.locator(
          '#site-tabs [data-part="trigger"][data-value="tokens"]',
        ).evaluate((element) => element.click());
        await expectText(page, "#tabs-out", "tokens");
        await expectAttribute(
          page,
          '#site-tabs [data-part="trigger"][data-value="tokens"]',
          "data-active",
          "",
        );
        await expectMissingAttribute(
          page,
          '#site-tabs [data-part="trigger"][data-value="overview"]',
          "data-active",
        );

        const labPage = await browser.newPage();
        await labPage.goto(`${origin}/public/lab.html`);

        await labPage.waitForSelector("#markup-editor");
        await labPage.waitForSelector("#preview-frame");
        await labPage.waitForSelector('#contract-badges [data-lab="badge"]');
        await expectText(
          labPage,
          "#preview-caption",
          "1 host detected in the current snippet.",
        );

        await labPage.click('button[data-preset="splitter"]');
        await expectText(
          labPage,
          "#preview-caption",
          "1 host detected in the current snippet.",
        );

        const editor = labPage.locator("#markup-editor");
        await editor.fill(`<auras-splitter>
  <section data-part="pane" data-pane="primary">Primary</section>
  <button type="button" data-part="separator"></button>
  <section data-part="pane" data-pane="secondary">Secondary</section>
</auras-splitter>`);

        await labPage.waitForSelector('#diagnostics [data-severity="error"]');
        await labPage.locator('#diagnostics [data-severity="error"]').first()
          .click();

        await expectFrameAttribute(
          labPage,
          "#preview-frame",
          '[data-part="separator"]',
          "data-audit-highlight",
          "",
        );

        await labPage.close();
      } finally {
        await browser.close();
      }
    } finally {
      await server.shutdown();
    }
  },
);

async function expectText(page, selector, expectedText) {
  try {
    await page.waitForFunction(
      ({ selector, expectedText }) => {
        return (
          document.querySelector(selector)?.textContent?.trim() === expectedText
        );
      },
      { selector, expectedText },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for text ${JSON.stringify(expectedText)} on ${selector}: ${error}`,
    );
  }
}

async function expectAttribute(page, selector, attribute, expectedValue) {
  try {
    await page.waitForFunction(
      ({ selector, attribute, expectedValue }) => {
        return document.querySelector(selector)?.getAttribute(attribute) ===
          expectedValue;
      },
      { selector, attribute, expectedValue },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for ${selector} to have ${attribute}=${JSON.stringify(expectedValue)}: ${error}`,
    );
  }
}

async function expectMissingAttribute(page, selector, attribute) {
  try {
    await page.waitForFunction(
      ({ selector, attribute }) => {
        const element = document.querySelector(selector);
        return Boolean(element) && !element.hasAttribute(attribute);
      },
      { selector, attribute },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for ${selector} to drop attribute ${attribute}: ${error}`,
    );
  }
}

async function expectHidden(page, selector, expectedHidden) {
  try {
    await page.waitForFunction(
      ({ selector, expectedHidden }) => {
        const element = document.querySelector(selector);
        return element instanceof HTMLElement &&
          element.hidden === expectedHidden;
      },
      { selector, expectedHidden },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for ${selector} hidden=${expectedHidden}: ${error}`,
    );
  }
}

async function expectLinkHref(page, selector, hrefSuffix) {
  try {
    await page.waitForFunction(
      ({ selector, hrefSuffix }) => {
        const element = document.querySelector(selector);
        return element instanceof HTMLLinkElement &&
          element.href.endsWith(hrefSuffix);
      },
      { selector, hrefSuffix },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for ${selector} href to end with ${hrefSuffix}: ${error}`,
    );
  }
}

async function expectFrameAttribute(
  page,
  frameSelector,
  targetSelector,
  attribute,
  expectedValue,
) {
  try {
    await page.waitForFunction(
      ({ frameSelector, targetSelector, attribute, expectedValue }) => {
        const frame = document.querySelector(frameSelector);
        const target = frame instanceof HTMLIFrameElement
          ? frame.contentDocument?.querySelector(targetSelector)
          : null;
        return Boolean(target) &&
          target.getAttribute(attribute) === expectedValue;
      },
      { frameSelector, targetSelector, attribute, expectedValue },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for ${targetSelector} in ${frameSelector} to have ${attribute}=${JSON.stringify(expectedValue)}: ${error}`,
    );
  }
}
