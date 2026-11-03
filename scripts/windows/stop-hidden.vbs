' Stops OpenBot with no window. Used by the "Stop OpenBot" desktop shortcut.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
shell.CurrentDirectory = root
bash = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Git\bin\bash.exe"
If fso.FileExists(root & "\.git-bash-path") Then bash = Trim(Replace(Replace(fso.OpenTextFile(root & "\.git-bash-path").ReadAll, vbCr, ""), vbLf, ""))
shell.Run """" & bash & """ -c ""bash scripts/stop.sh > stop-log.txt 2>&1""", 0, True
If WScript.Arguments.Count = 0 Then MsgBox "OpenBot is stopped.", 64, "OpenBot"
