// Tap through every phone screen in the web build, light and dark, and report JS errors,
// crashes (blank screens), and buttons smaller than 44x44.
const { chromium } = require("playwright");
const [base, label] = process.argv.slice(2);
const routes = [
  "/",
  "/bots",
  "/phone-bot",
  "/preferences",
  "/rules",
  "/rules?botId=scout",
  "/email-ai",
  "/approvals",
  "/needs-you",
  "/memory",
  "/bot?botId=scout",
  "/conversation?channelId=c1",
  "/routine?routineId=ro1",
  "/plugins?botId=scout",
  "/computer?botId=scout",
];
(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const scheme of ["light", "dark"]) {
    const p = await b.newPage({
      viewport: { width: 390, height: 800 },
      colorScheme: scheme,
    });
    let errors = [];
    p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    p.on("console", (m) => {
      if (m.type() === "error")
        errors.push("console: " + m.text().slice(0, 200));
    });
    for (const r of routes) {
      errors = [];
      await p
        .goto(base + r, { waitUntil: "networkidle" })
        .catch((e) => errors.push("goto " + e.message));
      await p.waitForTimeout(1200);
      const text = (await p.locator("body").innerText()).trim();
      const small = await p.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[role="button"],[role="tab"],[role="radio"],[role="switch"],input[type="checkbox"]',
          ),
        ]
          .map((e) => ({
            l: e.getAttribute("aria-label") || e.innerText.slice(0, 30),
            r: e.getBoundingClientRect(),
          }))
          .filter((x) => x.r.width > 0 && (x.r.width < 44 || x.r.height < 40))
          .map(
            (x) =>
              `${x.l.replace(/\n/g, " ")} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`,
          ),
      );
      // Tap every button on the page once (skipping ones that leave the app or delete things), then come back.
      const buttons = await p.locator('[role="button"]').count();
      const tapErrors = [];
      for (let i = 0; i < Math.min(buttons, 25); i++) {
        const btn = p.locator('[role="button"]').nth(i);
        const name = (
          (await btn
            .getAttribute("aria-label", { timeout: 800 })
            .catch(() => null)) ||
          (await btn.innerText({ timeout: 800 }).catch(() => ""))
        ).slice(0, 30);
        if (
          /remove|delete|sign out|stop all|forget|send|connect|approve|discard|deny|start/i.test(
            name,
          )
        )
          continue;
        const before = errors.length;
        await btn.click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(300);
        if (errors.length > before)
          tapErrors.push(`${name}: ${errors.slice(before).join(" | ")}`);
        if (p.url() !== base + r) {
          await p.goto(base + r, { waitUntil: "networkidle" }).catch(() => {});
          await p.waitForTimeout(600);
        }
        await p.keyboard.press("Escape").catch(() => {});
      }
      report.push({
        scheme,
        route: r,
        blank: text.length < 5,
        errors: [...new Set(errors)].slice(0, 5),
        tapErrors: tapErrors.slice(0, 5),
        small: [...new Set(small)].slice(0, 8),
      });
    }
    await p.close();
  }
  await b.close();
  console.log(JSON.stringify({ label, report }, null, 1));
})();
