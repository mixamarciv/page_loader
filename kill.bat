::получаем curpath:
@curpath=%~dp0
::задаем основные переменные окружения
@CALL "%curpath%/set_path.bat"

SET PATH=%PATH%;%WINDIR%\system32;%WINDIR%\System32\WindowsPowerShell\v1.0\;
SET chrome_path=C:\Program Files (x86)\Google\Chrome\Application
SET CROMEPORT=9300
SET APPPORT=9301

@TITLE loader:%APPPORT%

@CLS
@echo ==== start ===================================================================
::START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%CROMEPORT%" --remote-debugging-port=%CROMEPORT% --disable-gpu --headless

::taskkill /f /fi "USERNAME eq NT AUTHORITY\SYSTEM" /im chrome.exe
powershell Get-Process chrome ^| Where-Object {$_.Path -like '*_p9300*'} ^| Stop-Process

@echo ==== end   ===================================================================
@pause
