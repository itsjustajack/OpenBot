' Starts OpenBot with no windows left open, then opens it in the browser.
' Used by the "Start OpenBot" desktop shortcut. What start-up prints goes to start-log.txt in the
' OpenBot folder; if it fails, a small box says so and where to look.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
programs = shell.ExpandEnvironmentStrings("%ProgramFiles%")
bash = programs & "\Git\bin\bash.exe"
If fso.FileExists(root & "\.git-bash-path") Then bash = Trim(Replace(Replace(fso.OpenTextFile(root & "\.git-bash-path").ReadAll, vbCr, ""), vbLf, ""))
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
noBrowser = WScript.Arguments.Count > 0
If fso.FileExists(root & "\.openbot-started") Then fso.DeleteFile root & "\.openbot-started"
result = shell.Run("""" & bash & """ -c ""bash scripts/start.sh > start-log.txt 2>&1""", 0, True)
If result = 0 Then
  fso.CreateTextFile(root & "\.openbot-started", True).Close
  If Not noBrowser Then shell.Run "http://localhost:3010", 1, False
Else
  MsgBox "OpenBot didn't start. Send Claude the file start-log.txt from " & root, 48, "OpenBot"
End If
