' Stops OpenBot with no window. Used by the "Stop OpenBot" desktop shortcut.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
shell.CurrentDirectory = root
bash = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Git\bin\bash.exe"
If fso.FileExists(root & "\.git-bash-path") Then bash = Trim(Replace(Replace(fso.OpenTextFile(root & "\.git-bash-path").ReadAll, vbCr, ""), vbLf, ""))
' No saved path yet (setup still running, or an older setup): try the other usual places for Git Bash.
If Not fso.FileExists(bash) Then
  For Each place In Array(shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Git\bin\bash.exe", shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Git\bin\bash.exe")
    If fso.FileExists(place) Then bash = place
  Next
End If
If Not fso.FileExists(bash) Then
  MsgBox "OpenBot can't find Git Bash yet. If the 'Setting up OpenBot' window is still open, let it finish first. Otherwise open OpenBot from the Start menu to run setup again.", 48, "OpenBot"
  WScript.Quit
End If
shell.Run """" & bash & """ -c ""bash scripts/stop.sh > stop-log.txt 2>&1""", 0, True
If WScript.Arguments.Count = 0 Then MsgBox "OpenBot is stopped.", 64, "OpenBot"
