import { useColorScheme } from "react-native";
import {
  type AccentName,
  type Preferences,
  usePreferences,
} from "./preferences";

/**
 * The Latch look for the phone: calm grey or near-black pages, rounded cards with a faint border,
 * one blue accent. Follows the phone's dark or light setting. Colours from
 * design/Latch-look-and-feel.md.
 */
export type Theme = {
  dark: boolean;
  page: string;
  card: string;
  raised: string;
  text: string;
  grey: string;
  border: string;
  accent: string;
  /** Text on the accent colour, such as a filled button's label. */
  onAccent: string;
  /** The round send button: dark on light pages, light on dark ones. */
  send: string;
  sendIcon: string;
  error: string;
};

export const LIGHT: Theme = {
  dark: false,
  page: "#F8F9FA",
  card: "#FFFFFF",
  raised: "#F1F3F4",
  text: "#202124",
  grey: "#5F6368",
  border: "#DADCE0",
  accent: "#0B57D0",
  onAccent: "#FFFFFF",
  send: "#202124",
  sendIcon: "#FFFFFF",
  error: "#B3261E",
};

export const DARK: Theme = {
  dark: true,
  page: "#131314",
  card: "#1E1E1E",
  raised: "#28292A",
  text: "#E3E3E3",
  grey: "#9AA0A6",
  border: "#444746",
  accent: "#A8C7FA",
  onAccent: "#062E6F",
  send: "#E3E3E3",
  sendIcon: "#131314",
  error: "#F2B8B5",
};

/** The Latch accent colours: [light page, dark page], with the text that sits on each. */
export const ACCENTS: Record<
  AccentName,
  { name: string; light: string; dark: string; onDark: string }
> = {
  blue: {
    name: "Ocean blue",
    light: "#0B57D0",
    dark: "#A8C7FA",
    onDark: "#062E6F",
  },
  red: { name: "Red", light: "#B3261E", dark: "#F2B8B5", onDark: "#601410" },
  green: {
    name: "Green",
    light: "#146C2E",
    dark: "#6DD58C",
    onDark: "#0A3818",
  },
  orange: {
    name: "Orange",
    light: "#A04100",
    dark: "#FFB68A",
    onDark: "#552000",
  },
  purple: {
    name: "Purple",
    light: "#6750A4",
    dark: "#D0BCFF",
    onDark: "#381E72",
  },
  mono: {
    name: "Black and white",
    light: "#202124",
    dark: "#E3E3E3",
    onDark: "#131314",
  },
};

/** The theme from the phone's light or dark setting and this app's own Preferences. */
export function themeFor(
  phoneIsLight: boolean,
  preferences: Preferences,
): Theme {
  const light =
    preferences.look === "phone" ? phoneIsLight : preferences.look === "light";
  const accent = ACCENTS[preferences.accent];
  if (light) return { ...LIGHT, accent: accent.light, onAccent: "#FFFFFF" };
  return {
    ...DARK,
    accent: accent.dark,
    onAccent: accent.onDark,
    ...(preferences.trueBlack
      ? { page: "#000000", card: "#121212", raised: "#1E1E1E" }
      : {}),
  };
}

export function useTheme(): Theme {
  const phone = useColorScheme();
  const preferences = usePreferences();
  return themeFor(phone === "light", preferences);
}

/** One soft colour per face. Picked by name so a Bot always keeps its colour. */
const FACES = [
  "#D98BE8",
  "#F2A94E",
  "#4F8FF0",
  "#5CC08A",
  "#F27A7A",
  "#48C1C9",
  "#A88BF0",
  "#E8C547",
];

export function faceColour(name: string): string {
  let sum = 0;
  for (const letter of name) sum = (sum * 31 + letter.charCodeAt(0)) >>> 0;
  return FACES[sum % FACES.length] ?? "#4F8FF0";
}

/** "Good morning", "Good afternoon" or "Good evening" by the phone's clock. */
export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
