' Starts OpenBot with no windows left open, then opens it in the browser.
' Used by the "Start OpenBot" desktop shortcut. What start-up prints goes to start-log.txt in the
' OpenBot folder; if it fails, a small box says so and where to look.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
programs = shell.ExpandEnvironmentStrings("%ProgramFiles%")
bash = programs & "\Git\bin\bash.exe"
docker = programs & "\Docker\Docker\Docker Desktop.exe"

' Docker has to be running first; start it quietly if it isn't.
If shell.Run("cmd /c docker info >nul 2>&1", 0, True) <> 0 Then
  If fso.FileExists(docker) Then shell.Run """" & docker & """", 0, False
  For i = 1 To 60
    WScript.Sleep 5000
    If shell.Run("cmd /c docker info >nul 2>&1", 0, True) = 0 Then Exit For
  Next
End If

shell.CurrentDirectory = root
result = shell.Run("""" & bash & """ -c ""bash scripts/start.sh > start-log.txt 2>&1""", 0, True)
If result = 0 Then
  shell.Run "http://localhost:3010", 1, False
Else
  MsgBox "OpenBot didn't start. Send Claude the file start-log.txt from " & root, 48, "OpenBot"
End If
