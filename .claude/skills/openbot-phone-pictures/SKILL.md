---
name: openbot-phone-pictures
description: Take real pictures of the phone app's screens (mobile/), light and dark, from the app's own code, to show Jack before a phone change is built or merged. Use whenever a phone screen is added or changed, or Jack asks what the phone looks like. Don't draw a mock-up by hand when this works.
---

# Pictures of the phone app

Jack sees every phone change as pictures before he approves it. These come from the real screens,
built for the web and opened in a phone-sized browser, so they match the app.

## Steps

Run from `mobile/`. The extra web packages are installed with `--no-save`, so `package.json` and
`package-lock.json` stay as they are; check that with `git status` at the end.

```bash
cd mobile
npm i --no-save --no-audit --no-fund react-native-web@~0.21.0 \
  react-dom@$(node -p "require('react/package.json').version") @expo/metro-runtime
OUT=$(mktemp -d)
npx expo export --platform web --output-dir "$OUT"
bun ../.claude/skills/openbot-phone-pictures/scripts/serve.ts "$OUT" 8099 &   # run in the background
node ../.claude/skills/openbot-phone-pictures/scripts/shoot.cjs http://localhost:8099 <picture-folder> / /bots /preferences /phone-bot
```

`shoot.cjs` takes each route at 390 wide, light and dark, full page, as `<route>-<light|dark>.png`.
Stop the server afterwards. Put the pictures Jack should see in `/mnt/project-files/openbot/phone/`
and attach them to the message.

## What the web build can't show

- No PC is signed in, so screens that read from the PC (Bots on your PC, Email, Approvals) show
  their signed-out or empty state. Say so beside those pictures, or seed data in a temporary
  patch that is never committed.
- Needle, notifications, widgets and the phone's files don't exist on the web. The Phone Bot shows
  a "Needle isn't in this build" card there; on the phone it doesn't.
- Keep screens web-safe: native-only modules are used inside functions (see `phoneFile()` in
  `src/phone-bot.ts` and the `notifications` guard in `app/_layout.tsx`), never at module load.

## Tapping through every screen

`scripts/tap-test.cjs <base-url> <label>` opens every route in light and dark, taps each button
once (never ones that remove, send, stop, sign out or approve), and prints JSON per screen:
JavaScript errors, errors from a tap, blank screens, and buttons under 44x40. On the web these are
expected and not phone bugs: `registerHeadlessTask` (widgets), `validatePath` (phone files) and
`getValueWithKeyAsync` (secure storage). Signed-out runs show Home for pages that need the PC.

## Checks that run on every phone build

- `npm run check-native` (in `mobile/`) fails when a native part isn't the version the Expo SDK
  expects, which can build fine and then close on opening.
- `phone-app.yml` installs the APK on an Android emulator and runs `.maestro/open-and-look-around.yaml`.
  Add a step there when a new main place is added.
