#!/usr/bin/env bash
# Ejecutar UNA VEZ, directamente en tu WSL2/Ubuntu (el "lab" ahora vive
# ahí, no en una máquina aparte), para dejarlo preparado. Uso:
#   ./deploy/setup-lab.sh
set -euo pipefail

SITE_NAME="juegos"
WEB_ROOT="/var/www/juegos"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> nginx no está instalado, instalando..."
  sudo apt update
  sudo apt install -y nginx
else
  echo "==> nginx ya está instalado."
fi

echo "==> Creando $WEB_ROOT ..."
sudo mkdir -p "$WEB_ROOT"
sudo chown -R "$USER":"$USER" "$WEB_ROOT"

echo "==> Instalando configuración del site ..."
sudo cp "$SCRIPT_DIR/nginx-juegos.conf" "/etc/nginx/sites-available/$SITE_NAME"
sudo ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"

echo "==> Comprobando configuración de nginx ..."
sudo nginx -t

if systemctl is-active --quiet nginx; then
  echo "==> nginx ya estaba activo, recargando ..."
  sudo systemctl reload nginx
else
  echo "==> nginx no estaba arrancado, arrancándolo y habilitándolo ..."
  sudo systemctl enable --now nginx
fi

if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  echo "==> ufw activo, abriendo el puerto 80 ..."
  sudo ufw allow 80/tcp
fi

echo ""
echo "Listo. El sitio responderá en http://mente-activa-wsl.local (puerto 80)."
echo "Recuerda añadir '127.0.0.1 mente-activa-wsl.local' al hosts de Windows si aún no lo has hecho."
echo "Ahora sube los ficheros con deploy/deploy.sh desde tu máquina de desarrollo."
