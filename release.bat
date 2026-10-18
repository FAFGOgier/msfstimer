@echo off
rem Stage the package and zip it for distribution: release\timer-panel-<version>.zip
rem The zip holds a single timer-panel\ folder, ready to extract into Community.
rem The version is read from timer-panel\manifest.json (package_version).
setlocal
set "ROOT=%~dp0"
set "STAGE=%ROOT%dist\timer-panel"
set "OUTDIR=%ROOT%release"

call "%ROOT%deploy.bat" stage
if errorlevel 1 (echo staging failed & exit /b 1)

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw '%ROOT%timer-panel\manifest.json' | ConvertFrom-Json).package_version"`) do set "VERSION=%%v"
if "%VERSION%"=="" (echo could not read package_version from manifest.json & exit /b 1)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set "ZIP=%OUTDIR%\timer-panel-%VERSION%.zip"
if exist "%ZIP%" del /Q "%ZIP%"

rem Windows' bundled bsdtar writes a standard zip (forward slashes); PowerShell 5.1's Compress-Archive does not.
"%SystemRoot%\System32\tar.exe" -a -c -f "%ZIP%" -C "%ROOT%dist" timer-panel
if errorlevel 1 (echo zip failed & exit /b 1)

echo Created %ZIP%
exit /b 0
