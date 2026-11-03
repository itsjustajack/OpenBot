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
$Model = "qwen3:8b"

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

$Bash = "$env:ProgramFiles\Git\bin\bash.exe"
if (-not (Test-Path $Bash)) { Stop-Here "Couldn't find Git Bash at $Bash. Restart the PC and run this again." }

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
& $Bash -c "cd '$($Root -replace '\\','/')' && bash scripts/start.sh"
if ($LASTEXITCODE -ne 0) { Stop-Here "OpenBot didn't start. Send Claude the last lines above." }

Start-Process "http://localhost:3010"
Write-Host ""
Write-Host "OpenBot is running. It opened in your browser at http://localhost:3010" -ForegroundColor Green
Read-Host "Press Enter to close this window (OpenBot keeps running)"
