@echo off
rem Remove generated files: dist\ (staging), release\ (zips) and the SDK scratch folder Build\_Temp.
rem Tracked files (including the built .spb) and MSFSLayoutGenerator.exe are left alone.
setlocal
set "ROOT=%~dp0"
for %%d in ("%ROOT%dist" "%ROOT%release" "%ROOT%timer-panel\Build\_Temp") do (
  if exist "%%~d" (rmdir /S /Q "%%~d" & echo Removed %%~d)
)
exit /b 0
