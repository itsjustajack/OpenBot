// Serves an Expo web export with a fallback to index.html, so every route opens.
const dir = process.argv[2];
const port = Number(process.argv[3] ?? 8099);
Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(dir + path);
    if (path !== "/" && (await file.exists())) return new Response(file);
    return new Response(Bun.file(`${dir}/index.html`), {
      headers: { "content-type": "text/html" },
    });
  },
});
console.log(`serving ${dir} on ${port}`);
