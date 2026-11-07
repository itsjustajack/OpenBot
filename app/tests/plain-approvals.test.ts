import { expect, test } from "bun:test";
import type { ApprovalRuleRow } from "@/lib/approvals";
import {
  choiceSentence,
  currentAnswer,
  everyBotOverrules,
  plainChoiceOf,
  ruleFor,
  summarySentences,
} from "@/lib/plain-approvals";

const row = (
  id: string,
  rule: ReturnType<typeof ruleFor>,
): ApprovalRuleRow => ({ id, ...rule });

test("each plain choice is one rule, and is read back as the same choice", () => {
  const rule = ruleFor("files", "change", "ask");
  expect(rule.effect).toBe("write");
  expect(plainChoiceOf(rule)).toEqual({ area: "files", doing: "change" });
  expect(ruleFor("bots", "change", "allow").effect).toBe("*");
  // A rule written by hand is not mistaken for one.
  expect(
    plainChoiceOf({ toolRef: "mcp/gmail/*", effect: "*", scope: "*" }),
  ).toBeUndefined();
});

test("with no choice saved, looking goes ahead and changing follows the ask switch", () => {
  expect(currentAnswer({ rules: [], enabled: false }, "email", "look")).toBe(
    "allow",
  );
  expect(currentAnswer({ rules: [], enabled: true }, "email", "change")).toBe(
    "ask",
  );
  expect(currentAnswer({ rules: [], enabled: false }, "email", "change")).toBe(
    "allow",
  );
});

test("on one Bot's page the stricter of its own choice and the one for every Bot wins", () => {
  const rules = [
    row("all", ruleFor("websites", "change", "hand_off")),
    row("scout", ruleFor("websites", "change", "allow", "scout")),
  ];
  expect(
    currentAnswer({ rules, enabled: false }, "websites", "change", "scout"),
  ).toBe("hand_off");
});

test("the summary groups what Bots do by answer, in plain sentences", () => {
  const sentences = summarySentences({
    rules: [row("mail", ruleFor("email", "change", "hand_off"))],
    enabled: true,
    hostCommands: "never",
  });
  expect(sentences).toContain("They leave sending or deleting email to you.");
  expect(sentences).toContain("They never run programs on your PC.");
  expect(sentences[0]).toStartWith(
    "Your Bots go ahead with reading your email",
  );
});

test("the sentence under a choice names one Bot in the singular", () => {
  expect(
    choiceSentence({
      area: "files",
      doing: "change",
      answer: "ask",
      botName: "Scribe",
    }),
  ).toBe("Scribe asks you first before saving, changing or deleting files.");
});

test("on one Bot's page, a looser choice than every Bot's says that every Bot's comes first", () => {
  const data = { rules: [row("all", ruleFor("email", "change", "ask"))] };
  const everyBot = everyBotOverrules(data, "email", "change", "allow");
  expect(everyBot).toBe("ask");
  expect(
    choiceSentence({
      area: "email",
      doing: "change",
      answer: "allow",
      botName: "Scout",
      everyBot,
    }),
  ).toBe(
    "All your Bots are set to ask you first before sending or deleting email. That comes first, so Scout will still ask you first. To change it for Scout, change it for All my Bots first.",
  );
  // A stricter or equal choice for one Bot does take effect, so nothing extra is said.
  expect(
    everyBotOverrules(data, "email", "change", "hand_off"),
  ).toBeUndefined();
  expect(everyBotOverrules(data, "email", "change", "ask")).toBeUndefined();
  expect(
    everyBotOverrules(data, "websites", "change", "allow"),
  ).toBeUndefined();
});
