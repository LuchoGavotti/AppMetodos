@echo off
setlocal EnableExtensions

REM Proyecto
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"
set "PY_CMD="

echo ==============================
echo Validaciones previas
echo ==============================

if not exist "%BACKEND_DIR%\main.py" (
	echo ERROR: No existe %BACKEND_DIR%\main.py
	goto :error
)

if not exist "%FRONTEND_DIR%\package.json" (
	echo ERROR: No existe %FRONTEND_DIR%\package.json
	goto :error
)

call :check_command npm
if errorlevel 1 goto :error

call :check_command node
if errorlevel 1 goto :error

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

call :check_port 8000
call :check_port 3000

echo.
echo ==============================
echo Backend: entorno y dependencias
echo ==============================

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
	echo Creando entorno virtual en backend\.venv ...
	"%PY_CMD%" -m venv "%BACKEND_DIR%\.venv"
	if errorlevel 1 (
		echo ERROR: No se pudo crear el entorno virtual.
		goto :error
	)
)

set "BACKEND_PY=%BACKEND_DIR%\.venv\Scripts\python.exe"

"%BACKEND_PY%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
	echo ERROR: Fallo al actualizar herramientas base de pip.
	goto :error
)

"%BACKEND_PY%" -m pip install -e "%BACKEND_DIR%"
if errorlevel 1 (
	echo ERROR: Fallo al instalar/actualizar dependencias del backend.
	goto :error
)

echo.
echo ==============================
echo Frontend: dependencias
echo ==============================

pushd "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
	popd
	echo ERROR: Fallo npm install en frontend.
	goto :error
)

call npm update
if errorlevel 1 (
	popd
	echo ERROR: Fallo npm update en frontend.
	goto :error
)
popd

echo.
echo ==============================
echo Arrancando servicios
echo ==============================

echo Abriendo terminal del backend...
start "Backend - AppMetodos" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%BACKEND_DIR%'; & '%BACKEND_PY%' -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Abriendo terminal del frontend...
start "Frontend - AppMetodos" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%FRONTEND_DIR%'; npm run dev"

echo Esperando a que el frontend quede disponible en localhost:3000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0; $i -lt 40; $i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200){$ok=$true; break} } catch {}; Start-Sleep -Milliseconds 500 }; if($ok){ exit 0 } else { exit 1 }"

if errorlevel 1 (
	echo No se pudo confirmar frontend activo, abriendo navegador de todos modos...
) else (
	echo Frontend activo. Abriendo navegador...
)

start "" "http://localhost:3000"

echo Listo.
exit /b 0

:check_command
where /q %1
if errorlevel 1 (
	echo ERROR: No se encontro el comando requerido: %1
	exit /b 1
)
exit /b 0

:check_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%1 .*LISTENING"') do (
	echo ADVERTENCIA: El puerto %1 ya esta en uso por PID %%p
	goto :eof
)
exit /b 0

:error
echo.
echo Se detuvo el arranque por errores de validacion o actualizacion.
exit /b 1
