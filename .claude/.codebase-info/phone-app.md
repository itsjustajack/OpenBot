# Phone app (`mobile/`)

*Last Updated: 2026-11-07*

Expo (SDK 55) + expo-router. Works fully on its own (Phone Bot, notes, reminders, outbox); signing in
to an OpenBot PC adds the PC's Bots, chats, approvals and email.

| Path | What it is |
|---|---|
| `app/_layout.tsx` | Router stack and notification taps (skipped on web) |
| `app/index.tsx` | Home: data for faces, "Right now" counts, recent chats, sign-in |
| `src/home-screen.tsx` | Home layout, `Face`, `SectionLabel`, `Section`, `MenuRows` |
| `src/latch.tsx` | Latch blocks: `Icon` (Material Community Icons), `Card`, `Row` (with `leading`, e.g. a face), `Tag`, `BottomBar`, `Sheet`, `QuickButtons`, `faint` |
| `src/main-menu.tsx` | The slide-up menu; PC places only when signed in |
| `src/page.tsx` | `LatchPage` (top bar with back), `LatchProblem`, `SwitchCard`, `SwitchRow` (one on/off row in a card), `Chips` (round pick-one choices) |
| `src/theme.ts` | Light, dark, true black, accent colours, `faceColour`, `greeting` |
| `src/phone-bot.ts` | Phone Bot jobs, notes, outbox (`sendWaiting` is serial, `mergeOutbox`) |
| `src/plain-approvals.ts` | Copy of the PC's plain Approvals logic |
| `src/widgets.tsx`, `index.js` | Home-screen widgets (react-native-android-widget) |
| `modules/needle/` | Native Needle engine (JNI). `scripts/get-needle.mjs` fetches its files from Hugging Face at a pinned revision, with retries and an optional `HF_TOKEN`; the APK build caches them (bump the cache key in `phone-app.yml` with the revision) |
| `tests/` | `bun test` from `mobile/` |

## Screens and the Latch look

| Screen | File | Latch look |
|---|---|---|
| Home, bottom bar, menu | `app/index.tsx`, `src/home-screen.tsx`, `src/main-menu.tsx` | Done |
| Bots list | `app/bots.tsx` | Done |
| Look and feel | `app/preferences.tsx` | Done |
| Email and AI | `app/email-ai.tsx` | Done |
| What your Bots can do | `app/rules.tsx` | Done |
| Bot page | `app/bot.tsx` | Not yet (old `#2E2F30`/`#ECEDEF` borders) |
| Chats | `app/phone-bot.tsx`, `app/conversation.tsx`, `src/chat-screen.tsx`, `src/check-ins.tsx` | Not yet |
| Others | `approvals`, `needs-you`, `memory`, `routine`, `computer`, `plugins` in `app/` | Not yet |

A screen in the Latch look uses `LatchPage` and the blocks in `src/latch.tsx`, with colours from
`src/theme.ts` only.

## Pictures and gotchas

Pictures of screens: the `openbot-phone-pictures` skill (web export, 390 wide, light and dark).
Native-only modules must be used inside functions, never at module load, or the web build breaks.
For pictures of signed-in pages, patch `src/auth.ts` (wrap `authClient` in a Proxy with a fake
`useSession`; plain assignment doesn't work) and `src/api.ts` (demo data), then undo both before
committing.

Expo packages must match SDK 55 : a newer `expo-font` pulled in by another package made the APK
close on open, so it is pinned in `package.json`.
