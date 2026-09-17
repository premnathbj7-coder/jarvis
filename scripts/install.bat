@echo off
REM ============================================================
REM  JARVIS Installer — creates a virtual environment and
REM  installs all dependencies from requirements.txt.
REM ============================================================
setlocal

cd /d "%~dp0\.."

echo Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Failed to create virtual environment. Ensure Python 3.10+ is installed and on PATH.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo Some optional dependencies (e.g. PyAudio, pvporcupine) may have failed
    echo to build. JARVIS will still run with reduced voice features.
)

if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Remember to add your AI_API_KEY to .env before running JARVIS.
)

echo.
echo Installation complete. Run start.bat to launch JARVIS.
pause
