// Downloads Needle's Android engine and model into modules/needle, once, before building the app.
// Needle: https://github.com/cactus-compute/needle (Apache-2.0). Files from Hugging Face.
//   npm run get-needle
// Files already there are kept, so a build that restored them from its cache downloads nothing.
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "Cactus-Compute/needle3";
const REPO = `https://huggingface.co/${NAME}`;
/** The exact version the app was built and tested with, so a change upstream can't break a build. */
const REVISION =
  process.env.NEEDLE_REVISION ?? "b274efcb211a9eef48c9a88da4b43bd569696a39";
const MODULE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "modules",
  "needle",
);
const LIBS = join(MODULE, "android", "libs", "arm64-v8a");
const HEADERS = {
  "user-agent": "openbot-phone-build",
  ...(process.env.HF_TOKEN
    ? { authorization: `Bearer ${process.env.HF_TOKEN}` }
    : {}),
};

/** Fetch with a few tries, waiting longer each time, since Hugging Face sometimes refuses a burst. */
async function fetchWithRetry(url, tries = 5) {
  let last;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) return response;
      last = `${response.status} from ${response.url || url}`;
    } catch (failure) {
      last = failure instanceof Error ? failure.message : String(failure);
    }
    if (attempt < tries) {
      console.log(`  try ${attempt} failed (${last}), trying again…`);
      await new Promise((done) => setTimeout(done, 2 ** attempt * 1000));
    }
  }
  throw new Error(last);
}

/** The Android folder's files, as Hugging Face lists them, so a renamed file is still found. */
async function androidFiles() {
  try {
    const response = await fetchWithRetry(
      `https://huggingface.co/api/models/${NAME}/tree/${REVISION}/android-arm64`,
      3,
    );
    return (await response.json()).map((entry) => entry.path);
  } catch (failure) {
    console.log(`Couldn't list Needle's Android files (${failure.message}).`);
    return [];
  }
}

const FILES = [
  ["android-arm64/libneedle.a", join(LIBS, "libneedle.a")],
  ["android-arm64/needle.h", join(LIBS, "needle.h")],
  ["needle3.cact", join(MODULE, "assets", "needle3.cact")],
];
const have = ([, to]) => existsSync(to) && statSync(to).size > 0;

if (FILES.every(have)) {
  console.log("Needle's files are already here.");
} else {
  const listed = await androidFiles();
  if (listed.length) {
    console.log(`Needle's Android files: ${listed.join(", ")}`);
    FILES[0][0] = listed.find((path) => path.endsWith(".a")) ?? FILES[0][0];
    FILES[1][0] = listed.find((path) => path.endsWith(".h")) ?? FILES[1][0];
  }
  for (const file of FILES) {
    const [from, to] = file;
    if (have(file)) continue;
    console.log(`Getting ${from}…`);
    let response;
    try {
      response = await fetchWithRetry(`${REPO}/resolve/${REVISION}/${from}`);
    } catch (failure) {
      console.error(
        `Failed (${failure.message}). Check ${REPO}/tree/${REVISION} and try again.`,
      );
      process.exit(1);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, bytes);
    console.log(`  ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
  }
}
console.log(
  "Done. Build the phone app as usual and the Phone Bot will work offline.",
);
