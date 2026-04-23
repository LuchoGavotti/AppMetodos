@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"
set "PY_CMD="

echo ==============================
echo Inicio rapido AppMetodos
echo ==============================

if not exist "%BACKEND_DIR%\main.py" (
  echo ERROR: No existe %BACKEND_DIR%\main.py
  goto :error
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo ERROR: No existe %FRONTEND_DIR%\package.json
  goto :error
)

where /q npm
if errorlevel 1 (
  echo ERROR: npm no esta disponible en PATH.
  goto :error
)

where /q node
if errorlevel 1 (
  echo ERROR: node no esta disponible en PATH.
  goto :error
)

if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
  set "BACKEND_PY=%BACKEND_DIR%\.venv\Scripts\python.exe"
) else (
  where /q python
  if not errorlevel 1 set "PY_CMD=python"
  if not defined PY_CMD (
    where /q py
    if not errorlevel 1 set "PY_CMD=py"
  )
  if not defined PY_CMD (
    echo ERROR: No se encontro Python: comando python o py no disponible en PATH.
    goto :error
  )
  set "BACKEND_PY=%PY_CMD%"
)

echo Abriendo terminal del backend...
start "Backend - AppMetodos" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%BACKEND_DIR%'; & '%BACKEND_PY%' -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Abriendo terminal del frontend...
start "Frontend - AppMetodos" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%FRONTEND_DIR%'; npm run dev"

echo Esperando a que el frontend quede disponible en localhost:3000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0; $i -lt 20; $i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200){$ok=$true; break} } catch {}; Start-Sleep -Milliseconds 500 }; if($ok){ exit 0 } else { exit 1 }"

start "" "http://localhost:3000"
echo Listo.
exit /b 0

:error
echo.
echo Se detuvo el inicio rapido por validaciones.
exit /b 1
