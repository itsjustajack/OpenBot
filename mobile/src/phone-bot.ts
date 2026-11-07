import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as Notifications from "expo-notifications";
import type { NeedleCall, NeedleTool } from "../modules/needle/src";
import { api, type Bot, type Conversation } from "./api";

/**
 * The Phone Bot: what the phone can do on its own, with no PC and no signal.
 *
 * Needle (on the phone) reads the request and picks one of these jobs; this file does the job.
 * Everything here is kept on the phone in one small file. A message for a PC Bot waits in the
 * outbox and goes when the PC can be reached, so the phone works alone and catches up later.
 */

export type Note = { id: string; text: string; at: string };
export type Waiting = {
  id: string;
  bot: string;
  message: string;
  at: string;
  /** Why it hasn't gone yet, when a try failed for a reason other than no connection. */
  problem?: string;
};
type Saved = { notes: Note[]; outbox: Waiting[]; bots: string[] };

const FILE = new File(Paths.document, "phone-bot.json");
const EMPTY: Saved = { notes: [], outbox: [], bots: [] };

export function load(): Saved {
  try {
    if (!FILE.exists) return { ...EMPTY };
    const saved = JSON.parse(FILE.textSync()) as Partial<Saved>;
    return {
      notes: Array.isArray(saved.notes) ? saved.notes : [],
      outbox: Array.isArray(saved.outbox) ? saved.outbox : [],
      bots: Array.isArray(saved.bots) ? saved.bots : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(next: Saved) {
  if (!FILE.exists) FILE.create();
  FILE.write(JSON.stringify(next));
}

const id = () => Crypto.randomUUID();

/** The jobs Needle may pick, with the Bots' names the phone last saw so it can match them. */
export function phoneTools(bots: string[]): NeedleTool[] {
  return [
    {
      name: "remind_me_at",
      description: "Set a reminder on this phone for a date and time.",
      parameters: {
        type: "object",
        properties: {
          what: { type: "string", description: "What to be reminded of" },
          at: {
            type: "string",
            description: "When, as YYYY-MM-DD HH:MM in 24-hour time",
          },
        },
        required: ["what", "at"],
      },
    },
    {
      name: "remind_me_in",
      description: "Set a reminder on this phone a number of minutes from now.",
      parameters: {
        type: "object",
        properties: {
          what: { type: "string", description: "What to be reminded of" },
          minutes: {
            type: "integer",
            description: "How many minutes from now. An hour is 60",
          },
        },
        required: ["what", "minutes"],
      },
    },
    {
      name: "save_note",
      description: "Write down a note on this phone.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The note, word for word" },
        },
        required: ["text"],
      },
    },
    {
      name: "find_notes",
      description: "Look through the notes saved on this phone.",
      parameters: {
        type: "object",
        properties: {
          words: { type: "string", description: "What to look for" },
        },
        required: ["words"],
      },
    },
    {
      name: "open_screen",
      description: "Open a part of the OpenBot app.",
      parameters: {
        type: "object",
        properties: {
          screen: {
            type: "string",
            enum: [
              "chats",
              "bots",
              "approvals",
              "needs_you",
              "memory",
              "notes",
            ],
          },
        },
        required: ["screen"],
      },
    },
    {
      name: "message_bot",
      description:
        "Give a message to one of the Bots on the PC. It is sent when the PC can be reached.",
      parameters: {
        type: "object",
        properties: {
          bot: bots.length
            ? { type: "string", enum: bots, description: "Which Bot" }
            : { type: "string", description: "The Bot's name" },
          message: {
            type: "string",
            description: "The message, word for word",
          },
        },
        required: ["bot", "message"],
      },
    },
  ];
}

/** Facts Needle reads the time and place from. Facts, not instructions. */
export function phoneFacts(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${day} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  let locale = "en-US";
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale || locale;
  } catch {}
  return `date: ${date}; locale: ${locale}; device: phone; assistant: OpenBot Phone Bot`;
}

/** Reads "YYYY-MM-DD HH:MM" as local time. Exported for tests. */
export function readWhen(value: string): Date | null {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number) as number[];
  const when = new Date(year ?? 0, (month ?? 1) - 1, day, hour, minute);
  return Number.isNaN(when.getTime()) ? null : when;
}

/** "1 minute", "20 minutes", "1 hour", "1 hour 30 minutes". */
export function minutesInWords(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "? minutes";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (!hours) return part(rest, "minute");
  return rest
    ? `${part(hours, "hour")} ${part(rest, "minute")}`
    : part(hours, "hour");
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  "forty-five": 45,
  sixty: 60,
  half: 0.5,
};

function amount(word: string): number {
  const value = Number(word);
  return Number.isFinite(value)
    ? value
    : (NUMBER_WORDS[word.toLowerCase()] ?? Number.NaN);
}

/** Tidies what to be reminded of: no "to", no trailing comma, the person's own words kept. */
function tidy(what: string): string {
  return what
    .trim()
    .replace(/^(to|about|that)\s+/i, "")
    .replace(/[\s,.;:!]+$/, "")
    .trim();
}

/**
 * The common requests, read word for word before Needle is asked, so "remind me to call test in
 * 1 minute" is set exactly as said. Needle is only asked when this can't tell. Exported for tests.
 */
export function readPlainly(text: string, now = new Date()): NeedleCall | null {
  const said = text.trim().replace(/\s+/g, " ");
  const note = said.match(
    /^(?:note|save note|write down|remember)\s*[:,-]?\s+(.+)$/i,
  );
  if (note?.[1])
    return { name: "save_note", arguments: { text: note[1].trim() } };

  const remind = said.match(/^(?:please\s+)?remind me\s+(.+)$/i);
  if (!remind?.[1]) return null;
  const rest = remind[1];

  const unit = "(minutes?|mins?|hours?|hrs?)";
  const inside = rest.match(
    new RegExp(
      `^(.*?)\\s*\\bin\\s+([\\w-]+)\\s+${unit}(\\s+and a half)?\\s*(.*)$`,
      "i",
    ),
  );
  const before = rest.match(
    new RegExp(`^in\\s+([\\w-]+)\\s+${unit}\\s+(.+)$`, "i"),
  );
  const pick = inside
    ? {
        what: `${inside[1]} ${inside[5]}`,
        count: inside[2],
        unit: inside[3],
        half: Boolean(inside[4]),
      }
    : before
      ? { what: before[3], count: before[1], unit: before[2], half: false }
      : null;
  if (pick) {
    let count = amount(pick.count ?? "");
    if (pick.half) count += 0.5;
    const what = tidy(pick.what ?? "");
    if (Number.isFinite(count) && count > 0 && what) {
      const minutes = /^h/i.test(pick.unit ?? "") ? count * 60 : count;
      return {
        name: "remind_me_in",
        arguments: { what, minutes: Math.round(minutes) },
      };
    }
  }

  const at = rest.match(
    /^(.*?)\s*\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(today|tonight|tomorrow)?\s*(.*)$/i,
  );
  if (at) {
    let hour = Number(at[2]);
    const minute = Number(at[3] ?? 0);
    const half = (at[4] ?? "").toLowerCase().replace(/\./g, "");
    const day = (at[5] ?? "").toLowerCase();
    if (half === "pm" && hour < 12) hour += 12;
    if (half === "am" && hour === 12) hour = 0;
    if (!half && day === "tonight" && hour < 12) hour += 12;
    const what = tidy(
      `${at[1]} ${at[6]}`.replace(/\b(today|tonight|tomorrow)\b/i, ""),
    );
    if (hour > 23 || minute > 59 || !what) return null;
    const when = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
    );
    if (day === "tomorrow") when.setDate(when.getDate() + 1);
    // No am/pm and no day: the next time that clock time comes round.
    else if (when.getTime() <= now.getTime()) {
      if (!half && hour < 12 && hour + 12 > now.getHours())
        when.setHours(hour + 12);
      else when.setDate(when.getDate() + 1);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      name: "remind_me_at",
      arguments: {
        what,
        at: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`,
      },
    };
  }
  return null;
}

export const SCREENS: Record<string, string> = {
  chats: "/",
  bots: "/bots",
  approvals: "/approvals",
  needs_you: "/needs-you",
  memory: "/memory",
};

/** What one job did, in plain words, and where to go if it opens a screen. */
export type Done = { said: string; open?: string; notes?: Note[] };

/** Says, before doing it, what a job is about to do. For "Did you mean…?" */
export function describe(call: NeedleCall): string {
  const a = call.arguments;
  const s = (key: string) =>
    typeof a[key] === "string" ? (a[key] as string) : "";
  switch (call.name) {
    case "remind_me_at":
      return `Remind you "${s("what")}" at ${s("at")}`;
    case "remind_me_in":
      return `Remind you "${s("what")}" in ${minutesInWords(Number(a.minutes))}`;
    case "save_note":
      return `Save the note "${s("text")}"`;
    case "find_notes":
      return `Look through your notes for "${s("words")}"`;
    case "open_screen":
      return `Open ${s("screen").replace("_", " ")}`;
    case "message_bot":
      return `Give ${s("bot")} the message "${s("message")}"`;
    default:
      return call.name;
  }
}

async function remind(what: string, when: Date): Promise<string> {
  if (when.getTime() <= Date.now())
    return "That time has already passed, so I didn't set it.";
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted")
    permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    return "I need permission to show notifications. Allow it in the phone's settings.";
  await Notifications.setNotificationChannelAsync("openbot", {
    name: "OpenBot",
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: "Reminder", body: what },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: "openbot",
    },
  });
  return `Done. I'll remind you "${what}" on ${when.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}.`;
}

export async function doJob(call: NeedleCall): Promise<Done> {
  const a = call.arguments;
  const s = (key: string) =>
    typeof a[key] === "string" ? (a[key] as string).trim() : "";
  const saved = load();
  switch (call.name) {
    case "remind_me_at": {
      const when = readWhen(s("at"));
      if (!when)
        return {
          said: 'I couldn\'t work out the time. Try saying it like "at 5pm tomorrow".',
        };
      return { said: await remind(s("what"), when) };
    }
    case "remind_me_in": {
      const minutes = Number(a.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0)
        return { said: 'I couldn\'t work out how long. Try "in 20 minutes".' };
      return {
        said: await remind(s("what"), new Date(Date.now() + minutes * 60_000)),
      };
    }
    case "save_note": {
      const note = { id: id(), text: s("text"), at: new Date().toISOString() };
      save({ ...saved, notes: [note, ...saved.notes] });
      return { said: "Saved on your phone." };
    }
    case "find_notes": {
      const words = s("words").toLowerCase().split(/\s+/).filter(Boolean);
      const found = saved.notes.filter((note) =>
        words.some((word) => note.text.toLowerCase().includes(word)),
      );
      return found.length
        ? {
            said: `Found ${found.length} ${found.length === 1 ? "note" : "notes"}.`,
            notes: found,
          }
        : { said: "No notes match that." };
    }
    case "open_screen": {
      const screen = s("screen");
      if (screen === "notes")
        return {
          said: `You have ${saved.notes.length} notes.`,
          notes: saved.notes,
        };
      const path = SCREENS[screen];
      return path
        ? { said: "Opening it.", open: path }
        : { said: "I don't know that screen." };
    }
    case "message_bot": {
      const waiting = {
        id: id(),
        bot: s("bot"),
        message: s("message"),
        at: new Date().toISOString(),
      };
      const now = load();
      save({ ...now, outbox: [...now.outbox, waiting] });
      const sent = await sendWaiting();
      return {
        said: sent.sent.includes(waiting.id)
          ? `Sent to ${waiting.bot}.`
          : `It's waiting on your phone and goes to ${waiting.bot} when the PC can be reached.`,
      };
    }
    default:
      return { said: "I can't do that one on the phone." };
  }
}

export function removeNote(noteId: string) {
  const saved = load();
  save({ ...saved, notes: saved.notes.filter((note) => note.id !== noteId) });
}

export function removeWaiting(waitingId: string) {
  const saved = load();
  save({
    ...saved,
    outbox: saved.outbox.filter((entry) => entry.id !== waitingId),
  });
}

/**
 * The outbox as it is now, after a send: what went is taken out and what failed gets its reason.
 * Works from the outbox saved now, not the one the send started with, so a message added or
 * removed while the send was waiting on the PC stays added or removed.
 */
export function mergeOutbox(
  now: Waiting[],
  sent: string[],
  tried: Map<string, Waiting>,
): Waiting[] {
  return now
    .filter((entry) => !sent.includes(entry.id))
    .map((entry) => tried.get(entry.id) ?? entry);
}

type SendResult = { sent: string[]; reached: boolean };
let sending: Promise<SendResult> = Promise.resolve({
  sent: [],
  reached: false,
});

/**
 * Sends what's waiting, if the PC answers. Also keeps the Bots' names for next time offline.
 * Anything that can't go stays, so nothing is lost. One send at a time: a second call waits for
 * the first, then sends whatever is still waiting, so nothing goes twice.
 */
export function sendWaiting(): Promise<SendResult> {
  sending = sending.then(sendOnce, sendOnce);
  return sending;
}

async function sendOnce(): Promise<SendResult> {
  let bots: Bot[];
  let conversations: Conversation[];
  try {
    bots = (await api<{ agents: Bot[] }>("/api/agents")).agents;
    conversations = (
      await api<{ conversations: Conversation[] }>(
        "/api/delivery/conversations",
      )
    ).conversations;
  } catch {
    return { sent: [], reached: false };
  }
  const saved = load();
  const sent: string[] = [];
  const tried = new Map<string, Waiting>();
  for (const entry of saved.outbox) {
    // Taken off while an earlier message was on its way: don't send it.
    if (!load().outbox.some((each) => each.id === entry.id)) continue;
    const bot = bots.find(
      (each) => each.name.toLowerCase() === entry.bot.toLowerCase(),
    );
    const chat = bot
      ? conversations.find(
          (each) => each.active && each.agentIds.includes(bot.id),
        )
      : undefined;
    if (!bot || !chat) {
      tried.set(entry.id, {
        ...entry,
        problem: bot
          ? `There's no chat with ${bot.name} yet. Start one, and this goes next time.`
          : `There's no Bot called ${entry.bot}.`,
      });
      continue;
    }
    try {
      await api(
        `/api/delivery/conversations/${encodeURIComponent(chat.id)}/messages`,
        {
          method: "POST",
          body: { agentId: bot.id, text: entry.message, externalId: entry.id },
        },
      );
      sent.push(entry.id);
    } catch {
      // No answer this time: it stays as it is and goes next time.
    }
  }
  const now = load();
  save({
    ...now,
    outbox: mergeOutbox(now.outbox, sent, tried),
    bots: bots.map((bot) => bot.name),
  });
  return { sent, reached: true };
}
