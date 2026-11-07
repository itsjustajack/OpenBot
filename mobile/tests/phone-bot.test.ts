import { expect, mock, test } from "bun:test";

// The phone's native parts don't exist off the phone; these tests only need the plain logic.
mock.module("expo-modules-core", () => ({
  requireOptionalNativeModule: () => null,
}));
mock.module("expo-file-system", () => ({
  File: class {
    exists = false;
  },
  Paths: { document: "" },
}));
mock.module("expo-notifications", () => ({}));
mock.module("expo-crypto", () => ({ randomUUID: () => "id" }));
mock.module("../src/api", () => ({ api: async () => ({}) }));

const { readNeedleAnswer, needleAvailable } = await import(
  "../modules/needle/src"
);
const {
  describe,
  minutesInWords,
  phoneFacts,
  phoneTools,
  readPlainly,
  readWhen,
} = await import("../src/phone-bot");

test("reads Needle's answer, including calls it held back", () => {
  const answer = readNeedleAnswer(
    JSON.stringify({
      type: "call",
      success: true,
      function_calls: [{ name: "save_note", arguments: { text: "buy milk" } }],
      suppressed_calls: [
        { name: "remind_me_in", arguments: { what: "tea", minutes: 5 } },
      ],
      confidence: 0.91,
      reasoning: "note",
    }),
  );
  expect(answer.calls).toEqual([
    { name: "save_note", arguments: { text: "buy milk" } },
  ]);
  expect(answer.unsure[0]?.name).toBe("remind_me_in");
  expect(answer.confidence).toBe(0.91);
  expect(() => readNeedleAnswer('{"error":-3}')).toThrow();
});

test("an empty answer is a plain no", () => {
  const answer = readNeedleAnswer(
    '{"type":"call","function_calls":[],"confidence":0.2}',
  );
  expect(answer.calls).toEqual([]);
  expect(answer.unsure).toEqual([]);
});

test("off the phone there is no Needle", () => {
  expect(needleAvailable()).toBe(false);
});

test("reads reminder times as local time", () => {
  const when = readWhen("2026-11-04 17:05");
  expect(when?.getFullYear()).toBe(2026);
  expect(when?.getMonth()).toBe(10);
  expect(when?.getHours()).toBe(17);
  expect(when?.getMinutes()).toBe(5);
  expect(readWhen("tomorrow")).toBeNull();
});

test("tells Needle the time as a fact", () => {
  expect(phoneFacts(new Date(2026, 10, 3, 9, 4))).toStartWith(
    "date: 2026-11-03 Tue 09:04;",
  );
});

test("offers the Bots it last saw by name", () => {
  const message = phoneTools(["Helper", "Writer"]).find(
    (tool) => tool.name === "message_bot",
  );
  expect(message?.parameters.properties.bot?.enum).toEqual([
    "Helper",
    "Writer",
  ]);
  expect(
    phoneTools([]).find((tool) => tool.name === "message_bot")?.parameters
      .properties.bot?.enum,
  ).toBeUndefined();
});

test("says what it is about to do in plain words", () => {
  expect(
    describe({
      name: "message_bot",
      arguments: { bot: "Helper", message: "check my email" },
    }),
  ).toBe('Give Helper the message "check my email"');
});

test("reads common reminders word for word", () => {
  const now = new Date(2026, 10, 3, 14, 0);
  expect(readPlainly("remind me to call test in 1 minute", now)).toEqual({
    name: "remind_me_in",
    arguments: { what: "call test", minutes: 1 },
  });
  expect(readPlainly("Remind me in 2 hours to take the bins out", now)).toEqual(
    {
      name: "remind_me_in",
      arguments: { what: "take the bins out", minutes: 120 },
    },
  );
  expect(
    readPlainly("remind me to stretch in an hour and a half", now)?.arguments,
  ).toEqual({
    what: "stretch",
    minutes: 90,
  });
  expect(readPlainly("remind me to call mum at 5pm", now)?.arguments).toEqual({
    what: "call mum",
    at: "2026-11-03 17:00",
  });
  expect(readPlainly("remind me to call mum at 5", now)?.arguments.at).toBe(
    "2026-11-03 17:00",
  );
  expect(
    readPlainly("remind me at 9am tomorrow to walk the dog", now)?.arguments,
  ).toEqual({
    what: "walk the dog",
    at: "2026-11-04 09:00",
  });
  expect(readPlainly("note: buy milk", now)).toEqual({
    name: "save_note",
    arguments: { text: "buy milk" },
  });
  expect(readPlainly("what's on my list", now)).toBeNull();
});

test("says minutes in plain words", () => {
  expect(minutesInWords(1)).toBe("1 minute");
  expect(minutesInWords(20)).toBe("20 minutes");
  expect(minutesInWords(90)).toBe("1 hour 30 minutes");
  expect(
    describe({ name: "remind_me_in", arguments: { what: "tea", minutes: 1 } }),
  ).toBe('Remind you "tea" in 1 minute');
});

test("a send keeps messages added or removed while it was on its way", async () => {
  const { mergeOutbox } = await import("../src/phone-bot");
  const at = "2026-11-07T00:00:00.000Z";
  const first = { id: "a", bot: "Scout", message: "one", at };
  const second = { id: "b", bot: "Nobody", message: "two", at };
  const added = { id: "c", bot: "Scout", message: "three", at };
  // "a" went, "b" failed with a reason, "c" was added during the send.
  const tried = new Map([
    ["b", { ...second, problem: "There's no Bot called Nobody." }],
  ]);
  expect(mergeOutbox([first, second, added], ["a"], tried)).toEqual([
    { ...second, problem: "There's no Bot called Nobody." },
    added,
  ]);
  // "b" was taken off with "Don't send" during the send: it stays off.
  expect(mergeOutbox([first, added], ["a"], tried)).toEqual([added]);
});
