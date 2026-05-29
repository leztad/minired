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
:: Detectar la IP local IPv4 del computador para la conexion movil
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "LOCAL_IP=%%i"
    goto :FoundIP
)
:FoundIP
:: Limpiar espacios en blanco de la IP
if defined LOCAL_IP (
    set "LOCAL_IP=%LOCAL_IP: =%"
)

echo.
echo ==========================================================
echo   COMO ACCEDER DESDE TU CELULAR:
echo ==========================================================
echo   1. Aseguramiento de red:
echo      Tanto tu computadora como tu celular DEBEN estar
echo      conectados a la misma red Wi-Fi.
echo.
echo   2. Abre este enlace en el navegador de tu celular:
echo      http://%LOCAL_IP%:3000
echo.
echo   * NOTA SOBRE SEGURIDAD (Firewall):
echo     Si la pagina se queda cargando en el movil, es probable
echo     que el Cortafuegos/Firewall de Windows este bloqueando la
echo     conexion entrante. Asegurate de darle permisos "Privados"
echo     o permitir el trafico en el puerto 3000.
echo ==========================================================
echo.
echo [+] Iniciando el servidor de desarrollo...
echo [+] Abriendo navegador en esta computadora...

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
