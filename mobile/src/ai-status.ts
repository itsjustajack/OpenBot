/** What `GET /api/ai/status` says about the PC's online/offline AI switch. */
export type AiStatus =
  | { switch: false }
  | {
      switch: true;
      online: boolean;
      lastUsed: "online" | "offline" | null;
      offlineForNow: boolean;
      unreachable?: undefined;
    }
  | { switch: true; unreachable: true };

/** The AI card's headline, its dot colour, and one plain line under it. */
export function aiInWords(status: AiStatus): {
  title: string;
  about: string;
  tone: "good" | "backup" | "quiet";
} {
  if (!status.switch)
    return {
      title: "One AI, set on your PC",
      about: "Your Bots use the AI your PC was set up with.",
      tone: "quiet",
    };
  if (status.unreachable)
    return {
      title: "Can't see the AI switch",
      about:
        "Your PC is on but its AI switch didn't answer. Restarting OpenBot on the PC usually fixes it.",
      tone: "quiet",
    };
  if (!status.online)
    return {
      title: "Offline AI only",
      about: "Your Bots use your PC's own AI. No internet needed.",
      tone: "backup",
    };
  if (status.offlineForNow || status.lastUsed === "offline")
    return {
      title: "Using your PC's own AI for now",
      about:
        "The online AI didn't answer, so your PC's own AI took over. Work carries on, and it tries online again in a minute.",
      tone: "backup",
    };
  return {
    title: "Online AI, with a backup",
    about:
      "Your Bots use the free online AI first. If the internet drops, your PC's own AI takes over by itself.",
    tone: "good",
  };
}
