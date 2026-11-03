// Downloads Needle's Android engine and model into modules/needle, once, before building the app.
// Needle: https://github.com/cactus-compute/needle (Apache-2.0). Files from Hugging Face.
//   npm run get-needle
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "https://huggingface.co/Cactus-Compute/needle3";
const MODULE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "modules",
  "needle",
);
const LIBS = join(MODULE, "android", "libs", "arm64-v8a");

/** The Android folder's files, as Hugging Face lists them, so a renamed file is still found. */
async function androidFiles() {
  try {
    const response = await fetch(
      "https://huggingface.co/api/models/Cactus-Compute/needle3/tree/main/android-arm64",
    );
    if (!response.ok) return [];
    return (await response.json()).map((entry) => entry.path);
  } catch {
    return [];
  }
}

const listed = await androidFiles();
const library =
  listed.find((path) => path.endsWith(".a")) ?? "android-arm64/libneedle.a";
const header =
  listed.find((path) => path.endsWith(".h")) ?? "android-arm64/needle.h";
if (listed.length) console.log(`Needle's Android files: ${listed.join(", ")}`);
const FILES = [
  [library, join(LIBS, "libneedle.a")],
  [header, join(LIBS, "needle.h")],
  ["needle3.cact", join(MODULE, "assets", "needle3.cact")],
];

for (const [from, to] of FILES) {
  process.stdout.write(`Getting ${from}… `);
  const response = await fetch(`${REPO}/resolve/main/${from}`);
  if (!response.ok) {
    console.error(
      `failed (${response.status}). Check ${REPO}/tree/main and try again.`,
    );
    process.exit(1);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, bytes);
  console.log(`${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
}
console.log(
  "Done. Build the phone app as usual and the Phone Bot will work offline.",
);
