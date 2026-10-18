@echo off
rem Rebuild the SPB with the MSFS SDK and copy it to InGamePanels.
rem Needs the MSFS_SDK environment variable (set by the SDK installer, e.g. C:\MSFS SDK\).
setlocal
set "ROOT=%~dp0"
if "%MSFS_SDK%"=="" (echo MSFS_SDK is not set & exit /b 1)

"%MSFS_SDK%Tools\bin\fspackagetool.exe" "%ROOT%timer-panel\Build\timer-panel.xml"
if errorlevel 1 (echo fspackagetool failed & exit /b 1)
copy /Y "%ROOT%timer-panel\Build\Packages\timer-panel\Build\timer-panel.spb" "%ROOT%timer-panel\InGamePanels" >nul
exit /b %errorlevel%
