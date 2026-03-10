import { assertMatch, assertStringIncludes } from "jsr:@std/assert@^1.0.14";

const html = await Deno.readTextFile(
  new URL("../public/index.html", import.meta.url),
);

Deno.test(
  "public demo loads the Aura brand pack by default and exposes preference toggles",
  () => {
    assertMatch(
      html,
      /<link\s+id="brand-pack-aura"\s+rel="stylesheet"\s+href="\/packages\/brands\/aura-brand\.css"/,
    );
    assertMatch(html, /<body\s+data-brand="aura">/);
    assertMatch(
      html,
      /<button\s+id="toggle-contrast"[\s\S]*?aria-pressed="false"/,
    );
    assertMatch(
      html,
      /<button\s+id="toggle-motion"[\s\S]*?aria-pressed="false"/,
    );
    assertStringIncludes(
      html,
      'root.getAttribute("data-contrast") === "more"',
    );
    assertStringIncludes(
      html,
      'root.getAttribute("data-motion") === "reduce"',
    );
  },
);
