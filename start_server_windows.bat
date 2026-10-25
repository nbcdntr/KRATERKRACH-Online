@echo off
cd /d "%~dp0"
echo KRATERKRACH Wi-Fi multiplayer server
echo.
py -3 -c "import aiohttp" 2>nul
if errorlevel 1 (
 echo Installing aiohttp for Python ...
 py -3 -m pip install "aiohttp>=3.9,<4"
 if errorlevel 1 (
  echo Python not found or installation failed.
  echo Install Python from https://www.python.org/downloads/windows/
  pause
  exit /b 1
 )
)
py -3 server.py
if errorlevel 1 echo Check that port 8765 is available, and Python is installed.
pause
