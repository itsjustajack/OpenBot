// Fails when an installed package that Expo ships native code for isn't the version this Expo SDK
// expects. A mismatch still builds, but the app can close the moment it opens: in November 2026
// expo-font 57 on SDK 55 did exactly that. Run after `npm ci`:  npm run check-native
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
);
const expected = JSON.parse(
  readFileSync(join(root, "expo", "bundledNativeModules.json"), "utf8"),
);

/** Major and minor of a version or of a `~x.y.z`, `^x.y.z` or `x.y.z` range. */
function parts(version) {
  const [major, minor] = version.replace(/^[~^>=\s]+/, "").split(".");
  return { major: Number(major), minor: Number(minor) };
}

const wrong = [];
for (const [name, range] of Object.entries(expected)) {
  const manifest = join(root, name, "package.json");
  if (!existsSync(manifest)) continue;
  const installed = JSON.parse(readFileSync(manifest, "utf8")).version;
  const want = parts(range);
  const have = parts(installed);
  const ok =
    have.major === want.major &&
    (!range.startsWith("~") || have.minor === want.minor);
  if (!ok)
    wrong.push(`${name} is ${installed}; this Expo SDK expects ${range}`);
}
if (wrong.length) {
  console.error(
    `These parts don't match the Expo SDK, so the app may close on opening:\n  ${wrong.join("\n  ")}\nAdd each one to package.json at the expected version.`,
  );
  process.exit(1);
}
console.log("Every native part matches the Expo SDK.");
