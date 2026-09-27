#!/usr/bin/env bash
# Sincroniza el proyecto hacia el servidor de lab y recarga nginx.
# Ejecutar desde tu WSL2/Ubuntu, en la raíz del proyecto o desde
# cualquier sitio (el script se localiza solo).
#
# Cache-busting: antes de subir, copia el proyecto a una carpeta
# temporal y añade "?v=<timestamp>" a los enlaces locales de .css/.js
# en cada .html. Así el navegador coge siempre la versión nueva sin
# tener que bajar el tiempo de caché (que sigue en 7 días). El repo
# local no se toca para nada, solo la copia que se sube.
#
# Uso:
#   ./deploy/deploy.sh
set -euo pipefail

LAB_HOST="192.168.1.144"
LAB_USER="gorke"
LAB_PATH="/var/www/juegos"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION="$(date +%Y%m%d%H%M%S)"
STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

echo "==> Preparando copia con cache-busting (v=$VERSION) ..."
rsync -a --exclude 'deploy' "$PROJECT_ROOT"/ "$STAGING_DIR"/

# Añade ?v=VERSION a los .css/.js locales referenciados en cada .html
# (no toca URLs externas con http:// o https://, ni añade el parámetro
# dos veces si ya estuviera presente).
find "$STAGING_DIR" -name '*.html' -print0 | while IFS= read -r -d '' file; do
  sed -i -E \
    -e "s/(href=\"[^\"]+\.css)(\")/\1?v=${VERSION}\2/g" \
    -e "s/(src=\"[^\"]+\.js)(\")/\1?v=${VERSION}\2/g" \
    "$file"
done

echo "==> Sincronizando $STAGING_DIR -> $LAB_USER@$LAB_HOST:$LAB_PATH ..."
rsync -avz --delete \
  "$STAGING_DIR"/ "$LAB_USER@$LAB_HOST:$LAB_PATH"/

echo "==> Comprobando y recargando nginx en el servidor ..."
# -t: fuerza un pseudo-terminal para que sudo pueda pedir la contraseña
# si el cache de sudo del servidor ya ha caducado (15 min por defecto).
ssh -t "$LAB_USER@$LAB_HOST" "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "Publicado (v=$VERSION). Abre: http://$LAB_HOST:8090"
