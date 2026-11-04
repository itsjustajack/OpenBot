import type {
  ApprovalSettings as ApprovalInboxData,
  ApprovalRule as ApprovalRuleRow,
  HostCommandPolicy,
  RuleBehaviour,
} from "./api";

/** A new rule, as `POST /api/approvals/rules` takes it. */
export type ApprovalRuleInput = Omit<ApprovalRuleRow, "id">;

/*
 * The same plain choices as the PC's Settings → Approvals (app/src/lib/plain-approvals.ts), so the
 * phone and the PC read and write the very same rules. Keep the two in step.
 */

/**
 * Settings → Approvals in plain words: a few things a Bot can touch (Email, Websites, Files, Other
 * Bots, your PC), and for each, whether it may look and whether it may change things, with one of
 * three answers: Just do it, Ask me first, or Never.
 *
 * Underneath these are ordinary approval rules, so the gate on the server decides exactly as it
 * always has. Each choice is one rule for every Bot (or for one Bot), naming every tool in the
 * group at once with `|` (see `globMatches` on the server), and either `read` or `write` as its
 * effect. A rule written any other way is not one of these, and is listed under "Other rules".
 */

export type PlainArea = "email" | "websites" | "files" | "bots";
export type PlainDoing = "look" | "change";
/** The three answers offered. `pre_approved` is not offered, but a saved one is still described. */
export type PlainAnswer = "allow" | "ask" | "hand_off";

export const ANSWER_LABELS: Record<PlainAnswer, string> = {
  allow: "Just do it",
  ask: "Ask me first",
  hand_off: "Never",
};

type AreaInfo = {
  title: string;
  /** The tools this area covers, as one rule's `toolRef`. */
  toolRef: string;
  /** What looking and changing mean here, in a few words each. */
  look: string;
  change: string;
  /** For a Bot, which effects a choice writes. Other Bots has only one: handing work on. */
  doings: readonly PlainDoing[];
};

export const AREAS: Record<PlainArea, AreaInfo> = {
  email: {
    title: "Email",
    toolRef: "*mail*|*outlook*",
    look: "reading your email",
    change: "sending or deleting email",
    doings: ["look", "change"],
  },
  websites: {
    title: "Websites",
    toolRef: [
      "computer_navigate",
      "computer_read",
      "computer_snapshot",
      "computer_screenshot",
      "computer_scroll",
      "computer_click",
      "computer_type",
      "computer_key",
      "computer_download_file",
    ].join("|"),
    look: "looking at websites",
    change: "clicking, typing or filling in forms on websites",
    doings: ["look", "change"],
  },
  files: {
    title: "Files",
    toolRef:
      "computer_read_file|computer_list_files|computer_write_file|*drive*|files/*",
    look: "opening files",
    change: "saving, changing or deleting files",
    doings: ["look", "change"],
  },
  bots: {
    title: "Other Bots",
    toolRef: "bot/*",
    look: "asking another of your Bots",
    change: "handing part of a job to another of your Bots",
    doings: ["change"],
  },
};

export const AREA_ORDER: readonly PlainArea[] = [
  "email",
  "websites",
  "files",
  "bots",
];

/** Handing work to another Bot is its own kind of action, neither a read nor a write. */
function effectFor(area: PlainArea, doing: PlainDoing): string {
  if (area === "bots") return "*";
  return doing === "look" ? "read" : "write";
}

export function ruleFor(
  area: PlainArea,
  doing: PlainDoing,
  answer: PlainAnswer,
  botId = "*",
): ApprovalRuleInput {
  return {
    botId,
    toolRef: AREAS[area].toolRef,
    effect: effectFor(area, doing),
    scope: "*",
    behaviour: answer,
  };
}

/** Which plain choice a saved rule is, or nothing when it was written some other way. */
export function plainChoiceOf(
  rule: Pick<ApprovalRuleRow, "toolRef" | "effect" | "scope">,
): { area: PlainArea; doing: PlainDoing } | undefined {
  if (rule.scope !== "*") return undefined;
  for (const area of AREA_ORDER) {
    if (AREAS[area].toolRef !== rule.toolRef) continue;
    for (const doing of AREAS[area].doings)
      if (effectFor(area, doing) === rule.effect) return { area, doing };
  }
  return undefined;
}

/** The saved rule for one choice, for every Bot (`*`) or for one Bot. */
export function savedRule(
  rules: readonly ApprovalRuleRow[],
  area: PlainArea,
  doing: PlainDoing,
  botId = "*",
): ApprovalRuleRow | undefined {
  return rules.find((rule) => {
    if (rule.botId !== botId) return false;
    const choice = plainChoiceOf(rule);
    return choice?.area === area && choice.doing === doing;
  });
}

/**
 * What happens today for one choice: the saved rule's answer, or what happens with no rule at all.
 * Looking needs no asking; changing asks first only while "Ask before other changes" is on.
 */
export function currentAnswer(
  data: Pick<ApprovalInboxData, "rules" | "enabled">,
  area: PlainArea,
  doing: PlainDoing,
  botId = "*",
): RuleBehaviour {
  // On one Bot's page, its own choice and the one for every Bot both apply, and the stricter wins,
  // as it does on the server.
  const saved = [
    savedRule(data.rules, area, doing, botId),
    botId === "*" ? undefined : savedRule(data.rules, area, doing, "*"),
  ].filter((rule) => rule !== undefined);
  if (saved.length)
    return saved
      .map((rule) => rule.behaviour)
      .reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
  if (doing === "look") return "allow";
  return data.enabled ? "ask" : "allow";
}

const RANK: Record<RuleBehaviour, number> = {
  allow: 0,
  pre_approved: 1,
  ask: 2,
  hand_off: 3,
};

export function answerLabel(behaviour: RuleBehaviour): string {
  return behaviour === "pre_approved"
    ? "Only if I asked for it"
    : ANSWER_LABELS[behaviour];
}

const HOST_SENTENCE: Record<HostCommandPolicy, string> = {
  allow: "run programs on your PC without asking",
  ask: "ask you first before running programs on your PC",
  never: "never run programs on your PC",
};

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * The page's summary: what every Bot may do right now, in up to four short sentences, grouped by
 * answer so it reads "They can … without asking. They ask you first before … . They never … ."
 */
export function summarySentences(
  data: Pick<ApprovalInboxData, "rules" | "enabled"> & {
    hostCommands?: HostCommandPolicy;
  },
): string[] {
  const groups: Record<RuleBehaviour, string[]> = {
    allow: [],
    pre_approved: [],
    ask: [],
    hand_off: [],
  };
  for (const area of AREA_ORDER)
    for (const doing of AREAS[area].doings)
      groups[currentAnswer(data, area, doing)].push(AREAS[area][doing]);
  const sentences: string[] = [];
  if (groups.allow.length)
    sentences.push(
      `Your Bots go ahead with ${list(groups.allow)} without asking.`,
    );
  if (groups.pre_approved.length)
    sentences.push(
      `They go ahead with ${list(groups.pre_approved)} only when you asked for it.`,
    );
  if (groups.ask.length)
    sentences.push(`They ask you first before ${list(groups.ask)}.`);
  if (groups.hand_off.length)
    sentences.push(`They leave ${list(groups.hand_off)} to you.`);
  if (data.hostCommands)
    sentences.push(`They ${HOST_SENTENCE[data.hostCommands]}.`);
  return sentences;
}

/** The sentence under the choice being made, so what is allowed is said before it is saved. */
export function choiceSentence(input: {
  area: PlainArea;
  doing: PlainDoing;
  answer: PlainAnswer;
  botName?: string;
}): string {
  const one = input.botName !== undefined;
  const who = input.botName ?? "All your Bots";
  const what = AREAS[input.area][input.doing];
  if (input.answer === "allow")
    return `${who} ${one ? "goes" : "go"} ahead with ${what} without asking.`;
  if (input.answer === "ask")
    return `${who} ${one ? "asks" : "ask"} you first before ${what}.`;
  return `${who} ${one ? "leaves" : "leave"} ${what} to you.`;
}
