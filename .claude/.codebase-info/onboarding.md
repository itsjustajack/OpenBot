# Onboarding: commands

*Last Updated: 2026-11-07*

All from the repository root unless noted.

| Task | Command |
|---|---|
| Install | `bun install`; `cd mobile && npm ci` |
| Tests (app, server, shared) | `bun test <files>` (server tests needing Postgres want `TEST_DATABASE_URL`) |
| Phone tests and types | `cd mobile && bun test && npx tsc --noEmit` |
| Type check | `bun run typecheck`; `NODE_OPTIONS=--max-old-space-size=6144 bun run typecheck:tests` |
| Lint and format | `bunx biome lint --error-on-warnings .`; `bunx biome format .` |
| Run locally | `bash scripts/start.sh` (Docker needed), app on http://localhost:3010 |
| AI switch | `bun run ai status`, `bun run ai auto`, `bun run ai ollama-cloud` |
| Phone pictures | the `openbot-phone-pictures` skill |
| Phone APK / PC installer | merge to `main`; GitHub Actions builds `OpenBot-phone` and `OpenBot-PC` |

## Known CI noise

- `main` is red from the extension's page-network-hook test, which failed before the fork.
- The Python Bots' requirements aren't pinned, so a new library release can break their tests
  (google-genai 3.0 moved `/v1beta` to `/v1`; see `agent-langgraph-agui/tests/test_provider_boundaries.py`).
