# Phone app (`mobile/`)

*Last Updated: 2026-11-07*

Expo (SDK 55) + expo-router. Works fully on its own (Phone Bot, notes, reminders, outbox); signing in
to an OpenBot PC adds the PC's Bots, chats, approvals and email.

| Path | What it is |
|---|---|
| `app/_layout.tsx` | Router stack and notification taps (skipped on web) |
| `app/index.tsx` | Home: data for faces, "Right now" counts, recent chats, sign-in |
| `src/home-screen.tsx` | Home layout, `Face`, `SectionLabel`, `Section`, `MenuRows` |
| `src/latch.tsx` | Latch blocks: `Icon` (Material Community Icons), `Card`, `Row`, `Tag`, `BottomBar`, `Sheet`, `QuickButtons` |
| `src/main-menu.tsx` | The slide-up menu; PC places only when signed in |
| `src/page.tsx` | `LatchPage` (top bar with back), `LatchProblem`, `SwitchCard` |
| `src/theme.ts` | Light, dark, true black, accent colours, `faceColour`, `greeting` |
| `src/phone-bot.ts` | Phone Bot jobs, notes, outbox (`sendWaiting` is serial, `mergeOutbox`) |
| `src/plain-approvals.ts` | Copy of the PC's plain Approvals logic |
| `src/widgets.tsx`, `index.js` | Home-screen widgets (react-native-android-widget) |
| `modules/needle/` | Native Needle engine (JNI), files fetched by `scripts/get-needle.mjs` |
| `tests/` | `bun test` from `mobile/` |

Pictures of screens: the `openbot-phone-pictures` skill (web export, 390 wide, light and dark).
Native-only modules must be used inside functions, never at module load, or the web build breaks.
