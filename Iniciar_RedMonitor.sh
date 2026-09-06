#!/usr/bin/env bash

echo "=========================================================="
echo "              REDMONITOR NETWORK SYSTEM"
echo "              Iniciador de Servidor Local"
echo "=========================================================="
echo ""

# Ir al directorio donde se encuentra este script
cd "$(dirname "$0")"

# 1. Verificar si Node.js está instalado
if ! command -v node >/dev/null 2>&1; then
  echo "[X] ERROR: Node.js no está instalado en tu sistema."
  echo "    Es indispensable para ejecutar RedMonitor en tu red local."
  echo "    Por favor descarga e instala Node.js (v18 o superior):"
  echo "    - Debian/Ubuntu: sudo apt install -y nodejs npm"
  echo "    - Arch Linux: sudo pacman -S nodejs npm"
  echo "    - macOS: brew install node"
  echo "    - O visita: https://nodejs.org/"
  echo ""
  exit 1
fi

echo "[+] Node.js detectado: $(node -v)"

# 2. Verificar dependencias de npm
if [ ! -d "node_modules" ]; then
  echo "[+] Carpeta 'node_modules' no encontrada. Instalando dependencias..."
  npm install
  if [ $? -ne 0 ]; then
    echo "[X] Error al ejecutar 'npm install'. Verifica tu conexión a internet o permisos."
    exit 1
  fi
fi

# 3. Detectar la dirección IP local de este equipo
LOCAL_IP="localhost"
if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I | awk '{print $1}')
elif command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7}' | tr -d ' \n')
fi

if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="127.0.0.1"
fi

echo ""
echo "=========================================================="
echo "  ACCESO A REDMONITOR EN TU RED LOCAL (LAN / WI-FI):"
echo "=========================================================="
echo "  1. Acceso en este equipo:"
echo "     👉 http://localhost:3000"
echo ""
echo "  2. Acceso desde tu teléfono móvil u otra PC en la misma red:"
echo "     👉 http://${LOCAL_IP}:3000"
echo ""
echo "  * NOTA DE RED & CORTAFUEGOS (FIREWALL):"
echo "    Si no abre desde otro dispositivo en la red Wi-Fi, asegúrate"
echo "    de permitir el puerto 3000 TCP en tu cortafuegos (ufw, iptables o Windows Firewall):"
echo "    sudo ufw allow 3000/tcp"
echo "=========================================================="
echo ""
echo "[+] Iniciando RedMonitor en modo Servidor de Red Local..."
echo ""

npm run dev
