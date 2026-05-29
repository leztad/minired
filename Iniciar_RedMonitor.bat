@echo off
title RedMonitor - Iniciar Servidor Local
color 0b

:: Cambiar al directorio del lote
cd /d "%~dp0"

echo ==========================================================
echo               REDMONITOR NETWORK SYSTEM
echo ==========================================================
echo.
echo [+] Detectando entorno del sistema...

:: Verificar si Node.js esta instalado de forma mas robusta
node -v >nul 2>nul
if errorlevel 1 goto NoNode

:: Verificar si existe la carpeta node_modules
if not exist node_modules goto NoModules

:StartDev
echo [+] Iniciando el servidor de desarrollo...
echo [+] Abriendo navegador automaticamente...
start "" "http://localhost:3000"
call npm run dev
if errorlevel 1 goto DevError
goto End

:NoNode
echo.
echo [X] ERROR: Node.js no esta instalado en tu sistema.
echo     Es indispensable para ejecutar RedMonitor localmente.
echo     Por favor descarga e instala Node.js desde: https://nodejs.org/
echo.
pause
exit /b

:NoModules
echo.
echo [+] No se encontro la carpeta node_modules.
echo [+] Instalando las dependencias del proyecto automaticamente...
echo [+] Esto puede tomar de 1 a 2 minutos. Por favor espera...
call npm install
if errorlevel 1 goto InstallError
goto StartDev

:InstallError
echo.
echo [X] ERROR: No se pudieron instalar las dependencias con 'npm install'.
echo     Por favor, abre una consola (cmd), ve a este directorio y ejecuta
echo     'npm install' manualmente para ver el error detallado.
echo.
pause
exit /b

:DevError
echo.
echo [X] ERROR: El servidor de desarrollo (Vite) se detuvo inesperadamente.
echo     Revisa los mensajes de arriba para identificar el problema.
echo.
pause
exit /b

:End
pause
