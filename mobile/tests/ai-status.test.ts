import { expect, test } from "bun:test";
import { aiInWords } from "../src/ai-status";

test("the AI card says in plain words which AI the Bots are on", () => {
  expect(aiInWords({ switch: false }).tone).toBe("quiet");
  expect(aiInWords({ switch: true, unreachable: true }).title).toBe(
    "Can't see the AI switch",
  );
  expect(
    aiInWords({
      switch: true,
      online: false,
      lastUsed: null,
      offlineForNow: false,
    }).title,
  ).toBe("Offline AI only");
  expect(
    aiInWords({
      switch: true,
      online: true,
      lastUsed: "offline",
      offlineForNow: true,
    }),
  ).toMatchObject({ title: "Using your PC's own AI for now", tone: "backup" });
  expect(
    aiInWords({
      switch: true,
      online: true,
      lastUsed: "online",
      offlineForNow: false,
    }),
  ).toMatchObject({ title: "Online AI, with a backup", tone: "good" });
});
