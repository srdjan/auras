import {
  basename,
  dirname,
  extname,
  join,
  relative,
} from "jsr:@std/path@^1.0.8";

export type SyncPublicPackagesOptions = {
  packagesRoot?: string;
  publicPackagesRoot?: string;
};

export function isPublicPackageAsset(path: string): boolean {
  return extname(path) === ".css" || basename(path) === "browser.js";
}

async function* walkFiles(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const entryPath = join(root, entry.name);

    if (entry.isDirectory) {
      yield* walkFiles(entryPath);
      continue;
    }

    if (entry.isFile) {
      yield entryPath;
    }
  }
}

async function collectPublicPackageAssets(root: string): Promise<string[]> {
  const assets: string[] = [];

  for await (const filePath of walkFiles(root)) {
    if (!isPublicPackageAsset(filePath)) {
      continue;
    }

    assets.push(relative(root, filePath));
  }

  return assets.sort();
}

export async function syncPublicPackages(
  options: SyncPublicPackagesOptions = {},
): Promise<ReadonlyArray<string>> {
  const packagesRoot = options.packagesRoot ?? "packages";
  const publicPackagesRoot = options.publicPackagesRoot ?? "public/packages";
  const assetPaths = await collectPublicPackageAssets(packagesRoot);

  await Deno.mkdir(publicPackagesRoot, { recursive: true });

  for (const assetPath of assetPaths) {
    const sourcePath = join(packagesRoot, assetPath);
    const destinationPath = join(publicPackagesRoot, assetPath);

    await Deno.mkdir(dirname(destinationPath), { recursive: true });
    await Deno.copyFile(sourcePath, destinationPath);
  }

  return assetPaths;
}

if (import.meta.main) {
  const syncedAssets = await syncPublicPackages();
  console.log(
    `Synced ${syncedAssets.length} canonical assets into public/packages.`,
  );
}
