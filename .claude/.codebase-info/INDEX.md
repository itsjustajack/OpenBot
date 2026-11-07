# OpenBot codebase map (Jack's fork)

*Last Updated: 2026-11-07*

OpenBot is a self-hosted "company ChatGPT": Bots ("coworkers") chat in channels, each gets its own
browser computer, and every tool action passes a gateway that allows, asks or refuses it and audits
it. This fork adds Jack's look (Latch), email, online-first AI with an offline fallback, a phone app
that works alone, and a one-click Windows install.

| Doc | Read it when |
|---|---|
| [architecture.md](architecture.md) | You need the moving parts and how a message flows |
| [fork-changes.md](fork-changes.md) | You touch anything this fork added (most work here) |
| [phone-app.md](phone-app.md) | You change `mobile/` |
| [windows.md](windows.md) | You change setup, start/stop or the installer on Jack's PC |
| [onboarding.md](onboarding.md) | You need commands: tests, checks, pictures, builds |

Upstream's own docs are in `docs/` (start with `docs/architecture.md`), and Jack's rules are in
`CLAUDE.md`.

## How to use and maintain this map

Read the doc for the area you're about to change, and check the paths it names before relying on
them. After a change that moves files, adds a service or changes how something flows, update the
affected doc and its *Last Updated* line in the same PR.
