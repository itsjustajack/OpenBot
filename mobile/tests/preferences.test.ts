import { expect, mock, test } from "bun:test";

// Off the phone there is no file system or native colour scheme; only the plain logic is tested.
mock.module("expo-file-system", () => ({
  File: class {
    exists = false;
  },
  Paths: { document: "" },
}));
mock.module("react-native", () => ({ useColorScheme: () => "light" }));

const { DEFAULTS, readPreferences } = await import("../src/preferences");
const { themeFor, LIGHT, DARK } = await import("../src/theme");

test("a missing or damaged preferences file gives the defaults", () => {
  expect(readPreferences(null)).toEqual(DEFAULTS);
  expect(readPreferences("not json")).toEqual(DEFAULTS);
  expect(readPreferences('{"look":"purple","accent":7}')).toEqual(DEFAULTS);
});

test("saved preferences are read back field by field", () => {
  expect(
    readPreferences(
      '{"look":"dark","accent":"green","trueBlack":true,"phoneBotAlwaysAsks":true}',
    ),
  ).toEqual({
    look: "dark",
    accent: "green",
    trueBlack: true,
    phoneBotAlwaysAsks: true,
  });
});

test("the theme follows the phone unless light or dark is chosen", () => {
  expect(themeFor(true, DEFAULTS).dark).toBe(false);
  expect(themeFor(false, DEFAULTS).dark).toBe(true);
  expect(themeFor(false, { ...DEFAULTS, look: "light" }).page).toBe(LIGHT.page);
  expect(themeFor(true, { ...DEFAULTS, look: "dark" }).page).toBe(DARK.page);
});

test("the accent colour and true black change only what they should", () => {
  const green = themeFor(true, { ...DEFAULTS, accent: "green" });
  expect(green.accent).toBe("#146C2E");
  expect(green.text).toBe(LIGHT.text);
  const black = themeFor(false, { ...DEFAULTS, trueBlack: true });
  expect(black.page).toBe("#000000");
  expect(themeFor(true, { ...DEFAULTS, trueBlack: true }).page).toBe(
    LIGHT.page,
  );
});
