Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d d:\SSM\skyline-survey && pm2 start ecosystem.config.js && pm2 save", 0, False
