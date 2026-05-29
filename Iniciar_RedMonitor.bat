@echo off
title RedMonitor - Iniciar Servidor Local
color 0b

:: Cambiar al directorio donde esta el lote
cd /d "%~dp0"

echo ==========================================================
echo               REDMONITOR NETWORK SYSTEM
echo ==========================================================
echo.
echo [+] Detectando entorno del sistema...

:: Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] ERROR: Node.js no esta instalado en tu sistema.
    echo     Por favor descarga e instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Verificar si existe node_modules
if not exist node_modules (
    echo [+] No se encontro la carpeta node_modules.
    echo [+] Instalando dependencias necesarias (esto puede tardar un momento)...
    :: Usamos call para que continue el script .bat tras ejecutarse npm
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Hubo un problema instalando las dependencias.
        pause
        exit /b
    )
)

echo [+] Iniciando el servidor de desarrollo en http://localhost:3000 ...

:: Abrir el navegador por defecto automaticamente despues de 2 segundos
start "" "http://localhost:3000"

:: Lanzar el servidor de Vite
call npm run dev

pause
