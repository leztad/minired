@echo off
title RedMonitor - Creador de Instalador de Escritorio Nativo (Tauri)
color 0a

:: Cambiar al directorio del lote
cd /d "%~dp0"

echo ==========================================================
echo               REDMONITOR DESKTOP BUILDER
echo ==========================================================
echo  Este script guiara la compilacion de la aplicacion nativa
echo  y creara el instalador con acceso directo en el escritorio.
echo ==========================================================
echo.

:: 1. Verificar Node.js
echo [+] Verificando Node.js...
node -v >nul 2>nul
if not errorlevel 1 goto node_ok
echo [X] ERROR: Node.js no esta instalado o no se encuentra en el PATH.
echo     Por favor descarga e instala Node.js desde: https://nodejs.org/
echo     Es obligatorio para procesar el frontend y correr los comandos.
echo.
pause
exit /b
:node_ok
echo [OK] Node.js detectado con exito.

:: 2. Verificar Rust y Cargo
echo.
echo [+] Verificando el compilador de Rust (indispensable para Tauri)...

:: Intentar detectar si Rust se acaba de instalar en la ruta por defecto y agregarlo al PATH de esta sesion de forma segura
if not exist "%USERPROFILE%\.cargo\bin" goto skip_cargo_path
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"
:skip_cargo_path

cargo --version >nul 2>nul
if not errorlevel 1 goto rust_ok
echo [!] Rust y Cargo no fueron detectados de forma global.
echo     Si acabas de instalar Rust:
echo     1. CIERRA ESTA VENTANA NEGRA por completo.
echo     2. Abre una nueva ventana negra (Terminal o CMD) o vuelve a abrir este archivo.
echo        Windows necesita actualizar la configuracion de rutas (PATH).
echo.
echo     Si aun no lo has instalado, presiona una tecla para descargar Rustup:
echo.
pause
start "" "https://www.rust-lang.org/es/tools/install"
exit /b
:rust_ok
echo [OK] Rust y Cargo detectados con exito.

:: 3. Instalar Node Modules
echo.
if exist node_modules goto node_modules_ok
echo [+] No se encontro la carpeta node_modules. Instalando dependencias de Node...
call npm install
if not errorlevel 1 goto node_install_ok
echo [X] ERROR: No se pudieron instalar las dependencias de Node.
pause
exit /b
:node_install_ok
goto node_modules_done
:node_modules_ok
echo [+] Las dependencias de Node (node_modules) ya estan listas.
:node_modules_done

:: 4. Generar Iconos del Sistema (Tauri Icon Command)
echo.
echo [+] Generando Iconos de Alta Resolucion (.ico, .icns, .png) a partir de la imagen...
echo     Esto usara el comando de Tauri CLI para crear los iconos optimizados.
call npm run tauri:icon
if not errorlevel 1 goto icon_ok
echo [!] Advertencia: No se pudieron generar los iconos automaticamente. 
echo     Es posible que necesites correr 'npm install' primero. Intentaremos continuar...
goto icon_done
:icon_ok
echo [OK] Iconos nativos creados y colocados en 'src-tauri/icons/'.
:icon_done

:: 5. Ejecutar la compilacion de Tauri (Tauri Build)
echo.
echo ==========================================================
echo  INICIANDO COMPILACION DEL INSTALADOR DE REDMONITOR...
echo  (Esto compilara el codigo en Rust y empaquetara todo)
echo  Por favor espera, este proceso puede tomar de 2 a 5 minutos.
echo ==========================================================
echo.
call npm run tauri:build
if not errorlevel 1 goto build_ok
echo.
echo [X] ERROR: La compilacion de Tauri ha fallado.
echo     Asegurate de tener instalados los prerrequisitos de C++ para tu sistema operativo:
echo     - En Windows: "Visual Studio C++ Build Tools" y la opcion "Desarrollo de escritorio con C++"
echo.
pause
exit /b
:build_ok

echo.
echo ==========================================================
echo   ¡COMPILACION COMPLETADA CON EXITO!
echo ==========================================================
echo.
echo   El instalador de RedMonitor se ha generado correctamente.
echo   Una vez que lo ejecutes en tu computadora, realizara la:
echo     1. Instalacion del sistema en Archivos de Programa.
echo     2. Creacion automatica de un Acceso Directo con Icono
echo        en tu Escritorio.
echo.
echo [+] Abriendo la carpeta con el instalador ejecutable (.exe) creado...
echo.

:: Abrir la carpeta del instalador generado
if exist "src-tauri\target\release\bundle\nsis" goto open_nsis
explorer "src-tauri\target\release\bundle"
goto open_done
:open_nsis
explorer "src-tauri\target\release\bundle\nsis"
:open_done

pause
