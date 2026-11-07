# OpenBot (Jack's fork)

This is Jack's fork of CopilotKit/OpenBot. He runs it on a Windows PC and an Android phone.

## Working with Jack

- Use plain words, with no jargon and no setup guides. Things should just install: "open it, click
  install, it installs".
- Work one step at a time. Show pictures of anything with a screen before it is built or merged.
  For the phone, use the `openbot-phone-pictures` skill instead of drawing a mock-up.
- Jack merges a PR within about a minute, so push fixes before telling him a PR is ready.
- AI is online first (Ollama's free cloud models, never a paid key) and falls back to Ollama on
  the PC when the internet is gone. The phone app must always work on its own, with no PC and no
  signal. His phone is never on Wi-Fi.

## Pull requests

- Every PR targets `itsjustajack/openbot`, never CopilotKit's original project. A hook in
  `.claude/settings.json` refuses anything else.
- Fill in `.github/pull_request_template.md`, and add a `CHANGELOG.md` line under `Unreleased`.

## Checks

Run these from the repository root, not from inside a package:

- `bun test <files>`. Tests rely on the root `bunfig.toml` preload. Server tests that need Postgres
  fail locally without `TEST_DATABASE_URL`; CI runs them.
- `cd mobile && bun test && npx tsc --noEmit` for the phone app.
- `bun run typecheck`, and `NODE_OPTIONS=--max-old-space-size=6144 bun run typecheck:tests` (it
  runs out of memory with the default heap).
- `bunx biome lint --error-on-warnings .` and `bunx biome format .`. A hook formats each file
  Claude edits.
- CI on `main` is red from the extension's page-network-hook test, which failed before the fork.

## Where things are

A fuller map is in `.claude/.codebase-info/` (start at `INDEX.md`). Update it in the same PR when
files move or a flow changes.


- `app/` is the PC web app. Jack's look is the Latch skin in `app/src/skins/latch/`.
- `mobile/` is the Expo phone app, built into an APK by `.github/workflows/phone-app.yml`.
- `scripts/windows/` and `installer/` hold the Windows setup and the OpenBot-Setup.exe build
  (`.github/workflows/pc-app.yml`). The installed PC app doesn't update itself.
- `ai-switch/` switches between online and offline AI, and `bun run ai ...` (`scripts/ai.ts`)
  sets it up.
- `app/src/lib/plain-approvals.ts` and `mobile/src/plain-approvals.ts` are copies of the same
  logic. Change both.
