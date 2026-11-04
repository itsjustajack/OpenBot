import { expect, test } from "bun:test";
import { readAiStatus, switchHealthUrl } from "../src/ai/status-routes";

test("the switch's health address comes from OPENAI_BASE_URL only when the switch is on", () => {
  expect(
    switchHealthUrl({
      AI_SWITCH: "on",
      OPENAI_BASE_URL: "http://127.0.0.1:4320/v1",
    }),
  ).toBe("http://127.0.0.1:4320/health");
  expect(
    switchHealthUrl({ OPENAI_BASE_URL: "http://127.0.0.1:4320/v1" }),
  ).toBeNull();
  expect(switchHealthUrl({ AI_SWITCH: "on" })).toBeNull();
});

test("the status says which AI answered last", async () => {
  const env = { AI_SWITCH: "on", OPENAI_BASE_URL: "http://switch:4320/v1" };
  expect(
    await readAiStatus(env, async () => ({
      ok: true,
      online: true,
      lastUsed: "offline",
      offlineForNow: true,
    })),
  ).toEqual({
    switch: true,
    online: true,
    lastUsed: "offline",
    offlineForNow: true,
  });
  expect(await readAiStatus({}, async () => ({}))).toEqual({ switch: false });
});

test("a switch that can't be reached is said plainly, not as an error", async () => {
  const env = { AI_SWITCH: "on", OPENAI_BASE_URL: "http://switch:4320/v1" };
  expect(
    await readAiStatus(env, async () => {
      throw new Error("down");
    }),
  ).toEqual({ switch: true, unreachable: true });
});
