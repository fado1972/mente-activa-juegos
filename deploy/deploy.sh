#!/usr/bin/env bash
# Publica el proyecto en el "lab" local dentro de tu propio WSL2/Ubuntu
# y recarga nginx. Ya no hace falta ningún servidor aparte: nginx corre
# en la misma máquina donde ejecutas este script.
#
# Primera vez: ejecuta antes "./deploy/setup-lab.sh" (una sola vez)
# para instalar nginx y dejar el site configurado en el puerto 8090.
#
# Cache-busting: antes de publicar, copia el proyecto a una carpeta
# temporal y añade "?v=<timestamp>" a los enlaces locales de .css/.js
# en cada .html. Así el navegador coge siempre la versión nueva sin
# tener que bajar el tiempo de caché (que sigue en 30 días). El repo
# local no se toca para nada, solo la copia que se publica.
#
# Uso:
#   ./deploy/deploy.sh
set -euo pipefail

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

echo "==> Publicando $STAGING_DIR -> $LAB_PATH (local) ..."
rsync -a --delete "$STAGING_DIR"/ "$LAB_PATH"/

echo "==> Comprobando y recargando nginx ..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Publicado (v=$VERSION). Abre: http://localhost:8090"
