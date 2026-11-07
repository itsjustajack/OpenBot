# Windows (Jack's PC)

*Last Updated: 2026-11-07*

- `installer/windows/openbot.iss` builds `OpenBot-Setup.exe` (`.github/workflows/pc-app.yml`, artifact
  `OpenBot-PC`). It installs to `%LOCALAPPDATA%\OpenBot\app` and adds a Start-menu icon running
  `scripts/windows/open.vbs`.
- `open.vbs`: first open runs `setup.ps1` in a visible window; after that it starts OpenBot hidden
  (`start-hidden.vbs`), opens an Edge app window on `http://localhost:3010`, and stops OpenBot
  (`stop-hidden.vbs`) when the window closes.
- `setup.ps1`: installs Git, Bun, Node, Ollama and Docker with winget, finds Git Bash (saved in
  `.git-bash-path`), pulls `qwen2.5:7b`, signs in to CopilotKit and Ollama, runs `bun run ai auto`
  and `bun run ai needle on`, makes desktop shortcuts, starts OpenBot, and writes `.openbot-ready`.
  It logs to `setup-log.txt`.
- The installed app does not update itself: a merged change needs the new installer, or the files
  copied over the app folder (keeping `.env`) and `setup.ps1` run again.
