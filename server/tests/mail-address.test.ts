import { expect, test } from "bun:test";
import { addressRefusal } from "../src/mail/providers";

const pointsAt =
  (...addresses: [string, number][]) =>
  async () =>
    addresses.map(([address, family]) => ({ address, family }));

test("a mail server name that points inside a private network is refused", async () => {
  for (const [address, family] of [
    ["10.0.0.5", 4],
    ["127.0.0.1", 4],
    ["169.254.169.254", 4],
    ["192.168.1.20", 4],
    ["::1", 6],
    ["fd00::1", 6],
  ] as [string, number][]) {
    expect(
      await addressRefusal("10.0.0.5.nip.io", pointsAt([address, family])),
    ).toContain("private network");
  }
});

test("one private address among public ones is enough to refuse", async () => {
  expect(
    await addressRefusal(
      "mail.example.com",
      pointsAt(["93.184.216.34", 4], ["10.1.2.3", 4]),
    ),
  ).not.toBeNull();
});

test("a public mail server passes, and a name that doesn't resolve is left to the connection", async () => {
  expect(
    await addressRefusal(
      "imap.gmail.com",
      pointsAt(["142.250.27.108", 4], ["2a00:1450:4025:c03::6c", 6]),
    ),
  ).toBeNull();
  expect(
    await addressRefusal("nowhere.example", async () => {
      throw new Error("ENOTFOUND");
    }),
  ).toBeNull();
});
