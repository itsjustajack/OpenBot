import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

/**
 * The phone's own preferences, kept in a small file on the phone so they work with no PC and no
 * signal: how the app looks, and how careful the Phone Bot is.
 */

export type LookMode = "phone" | "light" | "dark";
export type AccentName =
  | "blue"
  | "red"
  | "green"
  | "orange"
  | "purple"
  | "mono";

export type Preferences = {
  /** Light, dark, or whatever the phone is set to. */
  look: LookMode;
  /** The one accent colour, from the Latch set. */
  accent: AccentName;
  /** In dark mode, a true black page, kinder to OLED screens and battery. */
  trueBlack: boolean;
  /** The Phone Bot shows what it will do and waits for Approve, every time. */
  phoneBotAlwaysAsks: boolean;
};

export const DEFAULTS: Preferences = {
  look: "phone",
  accent: "blue",
  trueBlack: false,
  phoneBotAlwaysAsks: false,
};

const LOOKS: readonly LookMode[] = ["phone", "light", "dark"];
const ACCENTS: readonly AccentName[] = [
  "blue",
  "red",
  "green",
  "orange",
  "purple",
  "mono",
];

/** A saved file is read field by field, so an old or damaged one never breaks the app. */
export function readPreferences(text: string | null): Preferences {
  if (!text) return { ...DEFAULTS };
  try {
    const saved = JSON.parse(text) as Partial<Preferences>;
    return {
      look: LOOKS.includes(saved.look as LookMode)
        ? (saved.look as LookMode)
        : DEFAULTS.look,
      accent: ACCENTS.includes(saved.accent as AccentName)
        ? (saved.accent as AccentName)
        : DEFAULTS.accent,
      trueBlack:
        typeof saved.trueBlack === "boolean"
          ? saved.trueBlack
          : DEFAULTS.trueBlack,
      phoneBotAlwaysAsks:
        typeof saved.phoneBotAlwaysAsks === "boolean"
          ? saved.phoneBotAlwaysAsks
          : DEFAULTS.phoneBotAlwaysAsks,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function file(): File | null {
  try {
    return new File(Paths.document, "preferences.json");
  } catch {
    return null;
  }
}

function loadFromPhone(): Preferences {
  try {
    const saved = file();
    return readPreferences(saved?.exists ? saved.textSync() : null);
  } catch {
    return { ...DEFAULTS };
  }
}

let current: Preferences | null = null;
const listeners = new Set<() => void>();

export function getPreferences(): Preferences {
  current ??= loadFromPhone();
  return current;
}

/** Change some preferences, save them on the phone, and redraw every screen that uses them. */
export function setPreferences(change: Partial<Preferences>) {
  current = { ...getPreferences(), ...change };
  try {
    const saved = file();
    if (saved) {
      if (!saved.exists) saved.create();
      saved.write(JSON.stringify(current));
    }
  } catch {
    // Not saved this time; the change still holds until the app closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, getPreferences);
}
