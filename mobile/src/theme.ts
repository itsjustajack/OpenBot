import { useColorScheme } from "react-native";

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
  send: "#E3E3E3",
  sendIcon: "#131314",
  error: "#F2B8B5",
};

export function useTheme(): Theme {
  return useColorScheme() === "light" ? LIGHT : DARK;
}

/** Two soft colours per face, blended in the round avatar. Picked by name so a Bot keeps its colours. */
const FACES: [string, string][] = [
  ["#F5A623", "#E85D9E"],
  ["#C2187A", "#D99BE0"],
  ["#8DA2D6", "#B0148C"],
  ["#2E8B57", "#8DA2D6"],
  ["#4C8DF6", "#6FD3C1"],
  ["#F06A4A", "#F7C948"],
  ["#7B61FF", "#E28BF2"],
  ["#2BB673", "#F5D547"],
];

export function faceColours(name: string): [string, string] {
  let sum = 0;
  for (const letter of name) sum = (sum * 31 + letter.charCodeAt(0)) >>> 0;
  return FACES[sum % FACES.length] ?? FACES[0] ?? ["#888", "#aaa"];
}

/** "Good morning", "Good afternoon" or "Good evening" by the phone's clock. */
export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
