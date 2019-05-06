::получаем curpath:
@SET curpath=%~dp0
::задаем основные переменные окружения
@CALL "%curpath%/set_path.bat"

SET PATH=%PATH%;%WINDIR%\system32
SET chrome_path=C:\Program Files (x86)\Google\Chrome\Application
SET CROMEPORT=9300
SET APPPORT=9301

@TITLE loader:%APPPORT%

@CLS
@echo ==== start ===================================================================
START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%CROMEPORT%" --remote-debugging-port=%CROMEPORT% --disable-gpu --headless

@echo wait 5 seconds..
@ping 127.0.0.1 -n 6 > nul

::START /D "%curpath%" /B node app.js --port %APPPORT%  --cdp_port=%CROMEPORT%  --max_pageclients=5
node app.js --port %APPPORT%  --cdp_port=%CROMEPORT%  --max_pageclients=5
@echo ==== end   ===================================================================
@pause
