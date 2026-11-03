' What the OpenBot icon in the Start menu runs.
'
' First time (not set up yet): shows a small "Set up OpenBot" box, and on Yes runs the setup window,
' which installs everything and starts OpenBot.
' After that: starts OpenBot quietly, opens it in its own window, and stops it when that window closes.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
shell.CurrentDirectory = root
here = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(root & "\.openbot-ready") Then
  answer = MsgBox("OpenBot is installed. One last step: set it up. This gets what it needs to run (Docker, Git, Bun, Node.js and Ollama for your offline AI) and downloads the offline AI model, about 5 GB." & vbCrLf & vbCrLf & "Set it up now? (A blue window shows each step. The first time takes 10 to 20 minutes.)", 36, "Set up OpenBot")
  If answer <> 6 Then WScript.Quit
  shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & here & "\setup.ps1""", 1, True
  WScript.Quit
End If

' Start quietly (no-op if it is already running), then open the window.
shell.Run "wscript """ & here & "\start-hidden.vbs"" /no-browser", 0, True
If Not fso.FileExists(root & "\.openbot-started") Then WScript.Quit

edge = shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then edge = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
If fso.FileExists(edge) Then
  ' Its own profile folder makes this a separate Edge that runs until the OpenBot window is closed.
  profile = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\OpenBot\window"
  shell.Run """" & edge & """ --app=http://localhost:3010 --user-data-dir=""" & profile & """ --no-first-run", 1, True
  shell.Run "wscript """ & here & "\stop-hidden.vbs"" /quiet", 0, True
Else
  shell.Run "http://localhost:3010", 1, False
End If
