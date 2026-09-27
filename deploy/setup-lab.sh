#!/usr/bin/env bash
# Ejecutar UNA VEZ en el servidor de lab (Ubuntu/Debian) para dejarlo
# preparado. Uso:
#   ssh gorke@192.168.1.144 'bash ~/juegos-deploy/setup-lab.sh'
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
  echo "==> ufw activo, abriendo el puerto 8090 ..."
  sudo ufw allow 8090/tcp
fi

echo ""
echo "Listo. El sitio se servirá en http://$(hostname -I | awk '{print $1}'):8090"
echo "Ahora sube los ficheros con deploy/deploy.sh desde tu máquina de desarrollo."
