@echo off
rem Stage the package without Build\, regenerate layout.json there, then copy it to Community.
rem   deploy.bat          stage + copy to Community
rem   deploy.bat stage    stage only (dist\timer-panel)
rem The Community folder defaults to the MSFS 2024 one; override with FC_COMMUNITY.
setlocal
set "ROOT=%~dp0"
if "%FC_COMMUNITY%"=="" set "FC_COMMUNITY=G:\FS2020\MSFS2024\Community"
set "STAGE=%ROOT%dist\timer-panel"

if exist "%STAGE%" rmdir /S /Q "%STAGE%"
robocopy "%ROOT%timer-panel" "%STAGE%" /E /XD Build /XF .gitignore layout.json >nul
if errorlevel 8 (echo robocopy to staging failed & exit /b 1)

rem The generator needs an existing layout.json to rewrite.
echo {"content":[]}> "%STAGE%\layout.json"
"%ROOT%MSFSLayoutGenerator.exe" "%STAGE%\layout.json"
if errorlevel 1 (echo layout generation failed & exit /b 1)

if /I "%1"=="stage" (echo Staged in %STAGE% & exit /b 0)

robocopy "%STAGE%" "%FC_COMMUNITY%\timer-panel" /MIR >nul
if errorlevel 8 (echo robocopy to Community failed & exit /b 1)
echo Installed in %FC_COMMUNITY%\timer-panel
exit /b 0
