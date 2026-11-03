; The OpenBot installer for Windows: one OpenBot.exe-style setup that puts OpenBot in the user's own
; folder, adds an "OpenBot" icon to the Start menu and the desktop, and opens it at the end.
; The last page runs scripts\windows\setup.ps1 in a window that stays open; the icon does the same
; until setup has finished once.
; Built by .github/workflows/pc-app.yml with Inno Setup; SourceDir is the checked-out repository.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{7B4F2C1E-9C3A-4E51-9D7A-0B6E5F1A2C33}
AppName=OpenBot
AppVersion={#AppVersion}
AppPublisher=Jack
DefaultDirName={localappdata}\OpenBot\app
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=OpenBot-Setup
SetupIconFile=desktop\src-tauri\icons\icon.ico
OutputDir=installer\windows\Output
UninstallDisplayIcon={app}\openbot.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SourceDir=..\..

[Files]
Source: "*"; DestDir: "{app}"; Excludes: ".git\*,node_modules\*,installer\windows\Output\*,.env,start-log.txt,stop-log.txt,setup-log.txt,.git-bash-path,.openbot-ready,.openbot-started"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "desktop\src-tauri\icons\icon.ico"; DestDir: "{app}"; DestName: "openbot.ico"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\OpenBot"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\open.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\openbot.ico"
Name: "{userdesktop}\OpenBot"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\open.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\openbot.ico"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\windows\setup.ps1"""; WorkingDir: "{app}"; Description: "Set up OpenBot now (gets Docker, Ollama and your offline AI; 10 to 20 minutes)"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\stop-hidden.vbs"" /quiet"; Flags: runhidden waituntilterminated; RunOnceId: "StopOpenBot"
