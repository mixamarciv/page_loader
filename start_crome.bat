::получаем curpath:
@curpath=%~dp0
::задаем основные переменные окружения
@CALL "%curpath%/set_path.bat"

SET PATH=C:\Program Files (x86)\Google\Chrome\Application;%PATH%
SET PATH=C:\Program Files\Google\Chrome\Application;%PATH%

SET chrome_path=C:\Program Files (x86)\Google\Chrome\Application

@CLS
@echo ==== start ===================================================================
::chrome --headless --remote-debugging-port=9300 --disable-gpu

SET PORT=9300
START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%PORT%" --remote-debugging-port=%PORT% --disable-gpu --headless

SET PORT=9310
START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%PORT%" --remote-debugging-port=%PORT% --disable-gpu --headless

SET PORT=9320
START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%PORT%" --remote-debugging-port=%PORT% --disable-gpu --headless




SET PORT=9400
START /D "%chrome_path%" /B chrome.exe --user-data-dir="C:\pg\chrome\profile_p%PORT%" --remote-debugging-port=%PORT% --disable-gpu --headless

@echo ==== end   ===================================================================
@PAUSE
