:: ===========================================================================
:: переходим в каталог запуска скрипта
::@SetLocal EnableDelayedExpansion
:: this_file_path - путь к текущему бат/bat/cmd файлу
@SET this_file_path=%~dp0

:: this_disk - диск на котором находится текущий бат/bat/cmd файл
@SET this_disk=%this_file_path:~0,2%

:: переходим в текущий каталог
@%this_disk%
CD "%this_file_path%\"


:: ===========================================================================
:: задаем основные пути для запуска скрипта

:: пути к компилятору go
@SET GOROOT=c:\pg\app\go
@SET GIT_PATH=c:\pg\app\Git
@SET PYTHON_PATH=c:\pg\app\python26
::@SET MINGW_PATH=c:\pg\app\mingw64
@SET MSYS_PATH=c:\pg\app\msys64
@SET MSYS_PATHS=%MSYS_PATH%\mingw64\bin;%MSYS_PATH%\usr\bin;
@SET NODEJS_PATH=c:\pg\app\nodejs

:: пути к исходным кодам программы на go
@SET GOPATH=%this_file_path%\..


@SET PATH=%PYTHON_PATH%;
@SET PATH=%GOROOT%;%GOROOT%\bin;%PATH%;
@SET PATH=%GOPATH%;%PATH%;
@SET PATH=%GIT_PATH%;%GIT_PATH%\bin;%PATH%;
::@SET PATH=%MINGW_PATH%;%MINGW_PATH%\bin;%MINGW_PATH%\mingw32;%MINGW_PATH%\mingw32\bin;%PATH%;
@SET PATH=%this_file_path%\..\bin;%PATH%;
@SET PATH=%MSYS_PATHS%;%PATH%;
@SET PATH=%NODEJS_PATH%;%NODEJS_PATH%\bin;%PATH%

:: ===========================================================================

