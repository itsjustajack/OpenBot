const { chromium } = require("playwright");
const [base, out, ...routes] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const scheme of ["light", "dark"]) {
    const p = await b.newPage({
      viewport: { width: 390, height: 800 },
      deviceScaleFactor: 2,
      colorScheme: scheme,
    });
    for (const r of routes) {
      await p.goto(base + r, { waitUntil: "networkidle" }).catch(() => {});
      await p.waitForTimeout(1500);
      const name =
        (r === "/" ? "home" : r.slice(1).replace(/\W+/g, "-")) + "-" + scheme;
      await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
      console.log(name);
    }
    await p.close();
  }
  await b.close();
})();
