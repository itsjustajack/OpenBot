/**
 * Switch OpenBot's AI between online and offline.
 *
 *   bun run ai                     which one is in use now
 *   bun run ai offline             the AI on this computer (first chat model found)
 *   bun run ai offline qwen3:8b    that model on this computer
 *   bun run ai online              back to the online AI you had before (OpenAI or your own server)
 *   bun run ai needle on|off       Needle, a tiny helper that picks each message's tools in a blink
 *   bun run ai auto [model]        online AI first, this computer's AI (that model) when the internet is gone
 *   bun run ai gemini <key>        use Google's Gemini (free key from aistudio.google.com) as the online AI, then auto
 *
 * Offline finds Ollama (11434) or LM Studio (1234) the same way Admin, Local AI does. Going offline
 * first keeps a copy of the online settings in `.env` (the ONLINE_SAVED_ lines), and going online puts
 * them back, so nothing has to be typed in twice. Every other line in `.env` stays as it was.
 * Restart OpenBot after switching: the model is read when it starts.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { detectLocalAi, isLocalBaseUrl } from "../server/src/local-ai/detect";

const ENV = process.env.OPENBOT_ENV_FILE ?? new URL("../.env", import.meta.url);
const KEYS = [
  "OPENAI_BASE_URL",
  "OPENAI_CONTAINER_BASE_URL",
  "BOT_MODEL",
  "AGENT_BOT_MODEL",
  "OPENAI_API_KEY",
] as const;
const SWITCH_PORT = 4320;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const SAVED = "ONLINE_SAVED_";
/** Written for a key that had no line, so going online removes it again. */
const UNSET = "(unset)";

function read(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^\\s*${key}=(.*)$`, "m"));
  return match ? match[1]?.trim() : undefined;
}

/** Sets each key (or removes it, for `null`), keeping every other line. */
function write(text: string, values: Record<string, string | null>): string {
  let lines = text.split("\n");
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^\\s*${key}=`);
    if (value === null) {
      lines = lines.filter((entry) => !pattern.test(entry));
      continue;
    }
    const at = lines.findIndex((entry) => pattern.test(entry));
    // Before the file's closing blank line, so the file still ends with a newline.
    if (at === -1)
      lines.splice(
        lines.at(-1) === "" ? lines.length - 1 : lines.length,
        0,
        `${key}=${value}`,
      );
    else lines[at] = `${key}=${value}`;
  }
  return lines.join("\n");
}

function isAuto(text: string): boolean {
  return read(text, "AI_SWITCH") === "on";
}

function isOffline(text: string): boolean {
  const base = read(text, "OPENAI_BASE_URL");
  return Boolean(base && isLocalBaseUrl(base));
}

const current = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const mode = process.argv[2];

if (!mode || mode === "status") {
  console.log(
    isAuto(current)
      ? `Online first: ${read(current, "ONLINE_AI_MODEL") ?? "no online AI set yet"}, and ${read(current, "OFFLINE_AI_MODEL") ?? "the AI"} on this computer when the internet is gone.`
      : isOffline(current)
        ? `Offline: ${read(current, "BOT_MODEL") ?? "a local model"} on this computer. Switch with: bun run ai online`
        : `Online: ${read(current, "BOT_MODEL") ?? "the default model"}. Switch with: bun run ai offline`,
  );
  process.exit(0);
}

if (mode === "online") {
  if (!isOffline(current)) {
    console.log("Already online. Nothing changed.");
    process.exit(0);
  }
  const restore: Record<string, string | null> = { AI_SWITCH: null };
  for (const key of KEYS) {
    const saved = read(current, SAVED + key);
    restore[key] = saved === undefined || saved === UNSET ? null : saved;
    restore[SAVED + key] = null;
  }
  writeFileSync(ENV, write(current, restore));
  const key = restore.OPENAI_API_KEY;
  console.log("OpenBot is back online. Restart OpenBot to switch.");
  if (!key || key === "local") {
    console.log(
      "There's no online key saved yet: put your OPENAI_API_KEY in .env first.",
    );
  }
  process.exit(0);
}

if (mode === "needle") {
  const turn = process.argv[3];
  if (turn !== "on" && turn !== "off") {
    console.error("Use: bun run ai needle on, or bun run ai needle off");
    process.exit(1);
  }
  writeFileSync(
    ENV,
    write(current, {
      NEEDLE_URL: turn === "on" ? "http://127.0.0.1:4310" : null,
    }),
  );
  console.log(
    turn === "on"
      ? "Needle is on. Restart OpenBot: it starts Needle beside it (the first start downloads its 35 MB model once). Needle then picks which tools each message needs, so the big AI is only shown those."
      : "Needle is off. Restart OpenBot. Tools are picked the usual way again.",
  );
  process.exit(0);
}

/** Keeps the online settings once, before the first switch away from them, so `online` can put them back. */
function backupOf(text: string): Record<string, string> {
  const backup: Record<string, string> = {};
  if (!isOffline(text))
    for (const key of KEYS) backup[SAVED + key] = read(text, key) ?? UNSET;
  return backup;
}

/** Gemini's newest plain "flash" model, which is fast and on the free plan. */
function pickGeminiModel(ids: string[]): string | undefined {
  const version = (id: string) =>
    Number(id.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  return ids
    .map((id) => id.replace(/^models\//, ""))
    .filter((id) => /^gemini-[\d.]+-flash$/.test(id))
    .sort((a, b) => version(b) - version(a))[0];
}

if (mode === "gemini") {
  const key = process.argv[3]?.trim();
  if (!key) {
    console.error(
      "Use: bun run ai gemini <your key>. Get a free key at https://aistudio.google.com/apikey",
    );
    process.exit(1);
  }
  let model = GEMINI_FALLBACK_MODEL;
  try {
    const response = await fetch(`${GEMINI_URL}/models`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403
    ) {
      console.error(
        "Google said that key doesn't work. Copy it again from https://aistudio.google.com/apikey and try once more. Nothing changed.",
      );
      process.exit(1);
    }
    const ids =
      ((await response.json()) as { data?: { id: string }[] }).data?.map(
        (entry) => entry.id,
      ) ?? [];
    model = pickGeminiModel(ids) ?? model;
  } catch {
    console.log(
      `Couldn't reach Google just now, so using ${model}. That's fine.`,
    );
  }
  writeFileSync(
    ENV,
    write(current, {
      ONLINE_AI_URL: GEMINI_URL,
      ONLINE_AI_KEY: key,
      ONLINE_AI_MODEL: model,
    }),
  );
  console.log(`Online AI set: ${model} from Google.`);
  process.argv[2] = "auto";
  process.argv.length = 3;
}

if (process.argv[2] === "auto") {
  const text = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
  const offlineModel =
    process.argv[3]?.trim() || read(text, "OFFLINE_AI_MODEL") || "qwen2.5:7b";
  const onlineModel = read(text, "ONLINE_AI_MODEL");
  const model = onlineModel || offlineModel;
  writeFileSync(
    ENV,
    write(text, {
      ...backupOf(text),
      AI_SWITCH: "on",
      OFFLINE_AI_MODEL: offlineModel,
      OPENAI_BASE_URL: `http://127.0.0.1:${SWITCH_PORT}/v1`,
      // The Bots run in containers beside the switch, and reach it by its name.
      OPENAI_CONTAINER_BASE_URL: `http://ai-switch:${SWITCH_PORT}/v1`,
      BOT_MODEL: model,
      AGENT_BOT_MODEL: model,
      // The switch holds the real key; the settings check only that one is there.
      OPENAI_API_KEY: "switch",
    }),
  );
  console.log(
    onlineModel
      ? `OpenBot now uses ${onlineModel} online, and ${offlineModel} on this computer whenever the internet is gone. Restart OpenBot to switch.`
      : `No online AI is set yet, so OpenBot uses ${offlineModel} on this computer for now. Add one with: bun run ai gemini <key>`,
  );
  process.exit(0);
}

if (mode !== "offline") {
  console.error(
    "Use: bun run ai online, bun run ai offline [model], bun run ai needle on|off, or bun run ai",
  );
  process.exit(1);
}

const report = await detectLocalAi({});
const runtime = report.runtimes.find((entry) => entry.models.length > 0);
if (!runtime) {
  console.error(
    "No AI found on this computer. Start Ollama (ollama.com) or LM Studio's server, download a model, and run this again. Nothing changed.",
  );
  process.exit(1);
}
const wanted = process.argv[3];
const model = wanted
  ? runtime.models.find((entry) => entry.id === wanted)
  : runtime.models[0];
if (!model) {
  console.error(
    `${runtime.name} has no model called ${wanted}. It has: ${runtime.models.map((entry) => entry.id).join(", ")}`,
  );
  process.exit(1);
}

// Keep the online settings once, the first time we go offline, so `online` can put them back.
const backup = backupOf(current);
const port = new URL(runtime.baseUrl).port;
const key = read(current, "OPENAI_API_KEY");
writeFileSync(
  ENV,
  write(current, {
    ...backup,
    AI_SWITCH: null,
    OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1`,
    // The server and the Bots run in containers, which reach this computer by this name.
    OPENAI_CONTAINER_BASE_URL: `http://host.docker.internal:${port}/v1`,
    BOT_MODEL: model.id,
    AGENT_BOT_MODEL: model.id,
    // Local servers ignore the key, but the settings check that one is there.
    ...(key ? {} : { OPENAI_API_KEY: "local" }),
  }),
);
console.log(
  `OpenBot is offline now, using ${model.id} from ${runtime.name}. Restart OpenBot to switch. Go back with: bun run ai online`,
);
if (runtime.name === "Ollama") {
  console.log(
    "If the Bots can't reach it, set OLLAMA_HOST=0.0.0.0 for Ollama so the containers can see it, and restart Ollama.",
  );
}
