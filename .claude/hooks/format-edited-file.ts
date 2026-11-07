// After Claude edits a file, format it the way CI checks it, so a run never fails on spacing.
// Reads the hook's JSON from stdin. Never blocks: a file Biome doesn't handle is left as it is.
import { spawnSync } from "node:child_process";
import { relative } from "node:path";

const input = JSON.parse(await Bun.stdin.text());
const file: string | undefined = input?.tool_input?.file_path;
const root = input?.cwd ?? process.cwd();
if (file && /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|css)$/.test(file)) {
  const path = relative(root, file);
  if (!path.startsWith("..")) {
    spawnSync("bunx", ["biome", "format", "--write", path], {
      cwd: root,
      stdio: "ignore",
    });
  }
}
