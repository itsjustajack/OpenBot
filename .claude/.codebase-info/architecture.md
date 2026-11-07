# Architecture

*Last Updated: 2026-11-07*

```
 Phone app (mobile/, Expo)          PC web app (app/, React + Vite, :3010)
   │ works alone: Phone Bot              │
   │ optional sign-in to the PC          │
   └──────────────► server (server/, Bun + Hono, :3001) ◄── worker/ (routines)
                       │  gateway: resolve → decide (approvals/policy.ts) → audit → act
                       ├─► PostgreSQL (drizzle, server/drizzle/)
                       ├─► Bots over AG-UI (agent-bot, agent-langgraph, agent-*)
                       ├─► agent-computer (Chromium + files per Bot), made by supervisor/
                       ├─► AI: OPENAI_BASE_URL → ai-switch (:4320) → online model, else Ollama
                       ├─► needle (:4310) picks which skills a message needs
                       └─► mailbox over IMAP/SMTP (server/src/mail/)
```

- **Server entry:** `server/src/index.ts` wires services; `server/src/app.ts` mounts the routes.
- **Approvals gate:** `server/src/approvals/policy.ts` (`globMatches`, `ruleMatches`,
  `strictestRule`, built-in safety hand-offs). Stricter rule wins; team rules beat personal on ties.
- **Shared code:** `shared/` (Bot prompt, subagents, browser rules) is imported by server and app.
- **Containers:** `docker-compose.yml`; `scripts/start.sh` starts Postgres, the computers,
  supervisor, the AI switch and Needle in Docker, and runs server, worker and app on the host.

The upstream picture and ports table are in `docs/architecture.md`.
