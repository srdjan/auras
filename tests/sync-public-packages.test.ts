import { assertEquals, assertRejects } from "jsr:@std/assert@^1.0.14";
import { join } from "jsr:@std/path@^1.0.8";

import { syncPublicPackages } from "../scripts/sync-public-packages.ts";

const TEST_ROOT = "test-results/sync-public-packages";

async function resetDir(path: string): Promise<void> {
  await Deno.remove(path, { recursive: true }).catch(() => undefined);
  await Deno.mkdir(path, { recursive: true });
}

Deno.test("syncPublicPackages copies canonical browser and CSS assets only", async () => {
  await resetDir(TEST_ROOT);

  const packagesRoot = join(TEST_ROOT, "packages");
  const publicPackagesRoot = join(TEST_ROOT, "public", "packages");

  await Deno.mkdir(join(packagesRoot, "elements"), { recursive: true });
  await Deno.mkdir(join(packagesRoot, "components"), { recursive: true });
  await Deno.mkdir(join(packagesRoot, "audit"), { recursive: true });

  await Deno.writeTextFile(
    join(packagesRoot, "elements", "auras.css"),
    "/* elements */\n",
  );
  await Deno.writeTextFile(
    join(packagesRoot, "components", "browser.js"),
    "console.log('components');\n",
  );
  await Deno.writeTextFile(
    join(packagesRoot, "audit", "README.md"),
    "# not copied\n",
  );
  await Deno.writeTextFile(
    join(packagesRoot, "components", "mod.ts"),
    "export {};\n",
  );

  const copiedAssets = await syncPublicPackages({
    packagesRoot,
    publicPackagesRoot,
  });

  assertEquals(copiedAssets, [
    "components/browser.js",
    "elements/auras.css",
  ]);
  assertEquals(
    await Deno.readTextFile(join(publicPackagesRoot, "elements", "auras.css")),
    "/* elements */\n",
  );
  assertEquals(
    await Deno.readTextFile(
      join(publicPackagesRoot, "components", "browser.js"),
    ),
    "console.log('components');\n",
  );
  await assertRejects(
    () => Deno.stat(join(publicPackagesRoot, "audit", "README.md")),
    Deno.errors.NotFound,
  );
  await assertRejects(
    () => Deno.stat(join(publicPackagesRoot, "components", "mod.ts")),
    Deno.errors.NotFound,
  );
});
