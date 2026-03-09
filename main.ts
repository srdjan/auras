import { serveDir } from "jsr:@std/http/file-server";

const STATIC_DIRS: Record<string, string> = {
  "/packages/": "./packages",
};

Deno.serve((req: Request) => {
  const url = new URL(req.url);

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
