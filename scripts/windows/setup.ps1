# Sets up and starts OpenBot on a Windows PC, so nobody has to follow a guide.
#
# Run by double-clicking "Set up OpenBot.bat" in the OpenBot folder. Safe to run again: every step
# checks first and skips what is already done, so after a restart it carries on where it stopped.
# What it can't do for you: Windows asking "Yes" to install, a restart if Docker needs one, and
# signing in to CopilotKit in the browser (OpenBot keeps its chat history there).

# "Continue", not "Stop": Windows PowerShell 5.1 treats any native program writing to stderr as a
# failure under "Stop", and docker, ollama and winget all write progress there.
$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "Setting up OpenBot"
# Everything this window shows is also saved to setup-log.txt, to send if something goes wrong.
try { Start-Transcript -Path (Join-Path $Root "setup-log.txt") -Append | Out-Null } catch {}
# qwen2.5:7b answers straight away; qwen3 "thinks" first, which made every reply slow on a home PC.
# Both fit a 12 GB graphics card with room for a long conversation.
$Model = "qwen2.5:7b"

function Say($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Fine($text) { Write-Host "   $text" -ForegroundColor Green }
function Stop-Here($text) {
  Write-Host ""
  Write-Host $text -ForegroundColor Yellow
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

# Programs installed a moment ago aren't on this window's PATH yet; read it again from Windows.
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user;$env:USERPROFILE\.bun\bin"
}

function Have($command) { [bool](Get-Command $command -ErrorAction SilentlyContinue) }

function Install($name, $wingetId, $command) {
  Refresh-Path
  if (Have $command) { Fine "$name is already installed."; return }
  Say "Installing $name (click Yes if Windows asks)"
  winget install --id $wingetId -e --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
  if (-not (Have $command)) {
    Stop-Here "$name didn't finish installing. Restart the PC, then double-click 'Set up OpenBot' again. It carries on from here."
  }
  Fine "$name installed."
}

Say "Setting up OpenBot in $Root"
if (-not (Have "winget")) {
  Stop-Here "This PC is missing 'App Installer' from the Microsoft Store, which installs the other programs. Install it from the Store, then run this again."
}

Install "Git" "Git.Git" "git"
Install "Bun" "Oven-sh.Bun" "bun"
Install "Node.js" "OpenJS.NodeJS.LTS" "npx"
Install "Ollama (your offline AI)" "Ollama.Ollama" "ollama"
Install "Docker Desktop" "Docker.DockerDesktop" "docker"

# Git Bash runs OpenBot's start script. Some Git copies (GitHub Desktop's, or a per-user install)
# live elsewhere or have no bash, so look in the usual places and install Git for Windows if none has it.
function Find-Bash {
  $places = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
  )
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    $gitDir = Split-Path (Split-Path $git.Source)
    $places += (Join-Path $gitDir "bin\bash.exe")
  }
  foreach ($place in $places) { if ($place -and (Test-Path $place)) { return $place } }
  return $null
}
$Bash = Find-Bash
if (-not $Bash) {
  Say "Installing Git for Windows (the copy of Git on this PC has no Git Bash)"
  winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
  $Bash = Find-Bash
}
if (-not $Bash) { Stop-Here "Couldn't find Git Bash. Restart the PC and run this again." }
# Saved for the Start and Stop launchers, which can't search the way this script can.
Set-Content -Path (Join-Path $Root ".git-bash-path") -Value $Bash

Say "Starting Docker"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $DockerApp = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $DockerApp) { Start-Process $DockerApp }
  Write-Host "   Waiting for Docker to be ready (the first time can take a few minutes; accept its terms if it asks)..."
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  }
  if (-not $ready) {
    Stop-Here "Docker isn't ready yet. If it asked to restart, restart the PC. Then open Docker Desktop once, and double-click 'Set up OpenBot' again."
  }
}
Fine "Docker is running."

Say "Getting the offline AI model ($Model, about 5 GB the first time)"
# OpenBot sends long instructions with every message. Ollama's default memory for a conversation
# (4,096 words-pieces) cuts them off and slows everything down, so give it 16,384.
# It also keeps the model ready for an hour after the last message, instead of five minutes, so a
# reply after a short break doesn't wait for the model to load again.
if ([Environment]::GetEnvironmentVariable("OLLAMA_CONTEXT_LENGTH", "User") -ne "16384" -or
    [Environment]::GetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "User") -ne "1h") {
  [Environment]::SetEnvironmentVariable("OLLAMA_CONTEXT_LENGTH", "16384", "User")
  [Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "1h", "User")
  $env:OLLAMA_CONTEXT_LENGTH = "16384"
  $env:OLLAMA_KEEP_ALIVE = "1h"
  # Restart Ollama so it picks the setting up.
  Get-Process ollama*, "ollama app" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Fine "Gave the offline AI more room for long conversations."
}
ollama list *> $null
if ($LASTEXITCODE -ne 0) { Start-Process "ollama" "serve" -WindowStyle Hidden; Start-Sleep -Seconds 5 }
$models = (ollama list) -join "`n"
if ($models -notmatch [regex]::Escape($Model)) { ollama pull $Model } else { Fine "Already downloaded." }

Say "Preparing OpenBot"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Fine "Made the settings file." }
bun install
if ($LASTEXITCODE -ne 0) { Stop-Here "Installing OpenBot's parts failed. Send Claude the lines above." }

$envText = Get-Content ".env" -Raw
if ($envText -notmatch "(?m)^\s*(CPK_INTELLIGENCE_API_KEY|INTELLIGENCE_API_KEY)=\S+") {
  Say "Sign in to CopilotKit (a browser window opens; use the free plan)"
  npx --yes copilotkit@latest login
  npx --yes copilotkit@latest project select
  bun scripts/setup-learning.ts
  $envText = Get-Content ".env" -Raw
  if ($envText -notmatch "(?m)^\s*(CPK_INTELLIGENCE_API_KEY|INTELLIGENCE_API_KEY)=\S+") {
    Stop-Here "The CopilotKit sign-in didn't finish. Run 'Set up OpenBot' again and finish signing in."
  }
} else { Fine "Already signed in to CopilotKit." }

Say "Switching OpenBot to the offline AI"
bun run ai offline $Model
# Needle picks which skills each message needs in a blink, instead of asking the main AI first.
bun run ai needle on

Say "Adding 'OpenBot' shortcuts to your desktop"
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
# The shortcuts run OpenBot with no windows left open (the .vbs files hide them).
foreach ($pair in @(@("Start OpenBot", "start-hidden.vbs"), @("Stop OpenBot", "stop-hidden.vbs"))) {
  $link = $shell.CreateShortcut((Join-Path $desktop "$($pair[0]).lnk"))
  $link.TargetPath = "$env:SystemRoot\System32\wscript.exe"
  $link.Arguments = '"' + (Join-Path $Root "scripts\windows\$($pair[1])") + '"'
  $link.IconLocation = "$env:SystemRoot\System32\shell32.dll,137"
  $link.WorkingDirectory = $Root
  $link.Save()
}
Fine "Done. Next time just double-click 'Start OpenBot' on your desktop."

Say "Starting OpenBot (this takes a few minutes the first time)"
# Running setup again (to pick up new settings) restarts OpenBot, so stop the running one first.
if (Test-Path (Join-Path $Root ".openbot-ready")) {
  & $Bash -c "cd '$($Root -replace '\\','/')' && bash scripts/stop.sh --keep-computers"
}
& $Bash -c "cd '$($Root -replace '\\','/')' && bash scripts/start.sh"
if ($LASTEXITCODE -ne 0) { Stop-Here "OpenBot didn't start. Send Claude the last lines above." }

# Marks setup as done, so the OpenBot icon starts it straight away from now on.
Set-Content -Path (Join-Path $Root ".openbot-ready") -Value (Get-Date -Format o)
Set-Content -Path (Join-Path $Root ".openbot-started") -Value (Get-Date -Format o)
Start-Process "http://localhost:3010"
Write-Host ""
Write-Host "OpenBot is running. It opened in your browser at http://localhost:3010" -ForegroundColor Green
Read-Host "Press Enter to close this window (OpenBot keeps running)"
