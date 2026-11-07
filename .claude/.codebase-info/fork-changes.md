# What this fork adds

*Last Updated: 2026-11-07*

| Feature | Where | Notes |
|---|---|---|
| Latch look (PC) | `app/src/skins/latch/` (`frame.tsx`, `home.tsx`, `skin.css`), picked in `app/src/skins/registry.ts` | Spec: `/mnt/project-files/design/Latch-look-and-feel.md` |
| Bot faces | `app/src/components/agents/solid-face.tsx`, phone `mobile/src/home-screen.tsx` (`Face`) | Colour from the name (`faceColour`) |
| Plain Approvals | `app/src/lib/plain-approvals.ts`, `app/src/components/approvals/plain-choices.tsx`, phone `mobile/src/plain-approvals.ts` + `mobile/app/rules.tsx` | The two libs are copies; change both. A choice is one rule whose tool uses `a\|b` ("any of", tool field only) |
| Email for Bots | `server/src/mail/` (service, client, providers, routes), tools in `server/src/plugins/builtin-mail.ts`, PC page `app/src/components/settings/email-account.tsx` | Server names checked by `hostRefusal` (spelling) and `addressRefusal` (DNS, before every connection) |
| Online-first AI | `ai-switch/switch.ts`, set up by `scripts/ai.ts` (`bun run ai auto`, `ollama-cloud`), status at `server/src/ai/status-routes.ts` | Online (Ollama cloud) first, Ollama on the PC when it fails |
| Local AI detection | `server/src/local-ai/` (`detect.ts`, `routes.ts`), admin page `app/src/routes/_authed/admin/local-ai.tsx` | |
| Needle | `needle-helper/serve.py` (PC), `server/src/local-ai/needle.ts`, `server/src/plugins/selection.ts`; phone module `mobile/modules/needle/` | Picks tools per message |
| Phone app | `mobile/`, see [phone-app.md](phone-app.md) | APK from `.github/workflows/phone-app.yml` |
| Windows install | `scripts/windows/`, `installer/windows/openbot.iss`, `.github/workflows/pc-app.yml`, see [windows.md](windows.md) | |
| Claude setup | `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/skills/openbot-*` | Hooks: fork-only PRs, format on edit |
