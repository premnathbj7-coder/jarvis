@echo off
REM ============================================================
REM  Removes the JARVIS virtual environment. Your data (notes,
REM  tasks, memory, logs under data\) is left untouched.
REM ============================================================
setlocal

cd /d "%~dp0\.."

echo This will remove the virtual environment (venv\).
echo Your data under data\ will NOT be deleted.
set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    exit /b 0
)

rmdir /s /q venv
echo Virtual environment removed.
pause
