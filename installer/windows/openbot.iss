; The OpenBot installer for Windows: one OpenBot.exe-style setup that puts OpenBot in the user's own
; folder, adds an "OpenBot" icon to the Start menu and the desktop, and opens it at the end.
; The first time the icon is opened it offers "Set up OpenBot", which runs scripts\windows\setup.ps1.
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
Source: "*"; DestDir: "{app}"; Excludes: ".git\*,node_modules\*,installer\windows\Output\*,.env,start-log.txt,stop-log.txt,.openbot-ready,.openbot-started"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "desktop\src-tauri\icons\icon.ico"; DestDir: "{app}"; DestName: "openbot.ico"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\OpenBot"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\open.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\openbot.ico"
Name: "{userdesktop}\OpenBot"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\open.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\openbot.ico"

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\open.vbs"""; Description: "Open OpenBot"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\windows\stop-hidden.vbs"" /quiet"; Flags: runhidden waituntilterminated; RunOnceId: "StopOpenBot"
