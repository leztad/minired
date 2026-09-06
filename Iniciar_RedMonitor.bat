@echo off
title RedMonitor - Servidor de Red Local
color 0b

:: Cambiar al directorio donde reside este archivo
cd /d "%~dp0"

echo ==========================================================
echo               REDMONITOR NETWORK SYSTEM
echo             Iniciador en Red Local (LAN / Wi-Fi)
echo ==========================================================
echo.
echo [+] Verificando requisitos del sistema...

:: 1. Verificar si Node.js esta instalado
node -v >nul 2>nul
if errorlevel 1 goto NoNode

:: 2. Verificar si existe la carpeta node_modules
if not exist node_modules goto NoModules

:StartDev
:: 3. Detectar la IP local IPv4 del equipo
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "LOCAL_IP=%%i"
    goto :FoundIP
)
:FoundIP
if defined LOCAL_IP (
    set "LOCAL_IP=%LOCAL_IP: =%"
)

:: 4. Verificar si el puerto 3000 ya esta ocupado
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo [!] AVISO: El puerto 3000 parece estar ya en uso por otro proceso.
    echo     Si RedMonitor ya esta corriendo, puedes abrirlo en el navegador.
    echo     Si es otra aplicacion, puedes cerrar esa aplicacion o usar otro puerto.
    echo.
)

echo.
echo ==========================================================
echo   ACCESOS EN TU RED LOCAL (LAN):
echo ==========================================================
echo   1. En este mismo computador:
echo      http://localhost:3000
echo.
echo   2. Desde celulares u otras computadoras en la misma Wi-Fi:
echo      http://%LOCAL_IP%:3000
echo.
echo   * CORTAFUEGOS (FIREWALL DE WINDOWS):
echo     Si al abrir http://%LOCAL_IP%:3000 desde otro dispositivo
echo     la pagina no carga o da tiempo de espera agotado:
echo     1. Abre 'Firewall de Windows Defender con seguridad avanzada'.
echo     2. Reglas de Entrada -> Nueva Regla -> Puerto -> TCP -> 3000 -> Permitir conexion.
echo ==========================================================
echo.
echo [+] Iniciando el servidor RedMonitor...
echo [+] Abriendo navegador local...

start "" "http://localhost:3000"
call npm run dev
if errorlevel 1 goto DevError
goto End

:NoNode
echo.
echo [X] ERROR: Node.js no esta instalado en este equipo.
echo     Es indispensable para ejecutar RedMonitor en tu red local.
echo     Descargalo gratis desde: https://nodejs.org/ (version LTS recomendada).
echo.
pause
exit /b

:NoModules
echo.
echo [+] No se encontro la carpeta node_modules.
echo [+] Instalando dependencias de npm automaticamente...
echo [+] Esto puede tomar 1 o 2 minutos. Por favor espera...
call npm install
if errorlevel 1 goto InstallError
goto StartDev

:InstallError
echo.
echo [X] ERROR: No se pudieron instalar las dependencias con 'npm install'.
echo     Verifica tu conexion a internet y permisos de carpeta.
echo.
pause
exit /b

:DevError
echo.
echo [X] ERROR: El servidor RedMonitor se detuvo inesperadamente.
echo     Posibles causas:
echo     1. El puerto 3000 ya esta ocupado por otro programa.
echo     2. Error de sintaxis o modulo no encontrado en npm.
echo.
pause
exit /b

:End
pause
