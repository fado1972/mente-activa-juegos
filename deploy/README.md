# Despliegue en el servidor de lab

Sitio: **Mente Activa** (`192.168.1.144`, usuario `gorke`, nginx ya instalado).

## Primera vez (configurar el servidor)

Desde tu WSL2/Ubuntu, con la clave SSH ya copiada al servidor:

```bash
# 1. Copiar esta carpeta deploy/ al servidor
scp -r deploy gorke@192.168.1.144:~/juegos-deploy

# 2. Ejecutar el script de configuración en el servidor
ssh gorke@192.168.1.144 'bash ~/juegos-deploy/setup-lab.sh'
```

Esto deja nginx sirviendo un site nuevo en el puerto **8090**, con el
document root en `/var/www/juegos` (vacío por ahora).

## Cada vez que quieras publicar cambios

Desde la raíz del proyecto, en tu WSL2/Ubuntu:

```bash
./deploy/deploy.sh
```

Esto sincroniza todo el proyecto (menos la carpeta `deploy/`) hacia
`/var/www/juegos` en el servidor y recarga nginx. Tarda un par de
segundos; solo copia lo que ha cambiado.

De paso, añade automáticamente `?v=<timestamp>` a los `.css`/`.js`
referenciados en cada `.html` (sobre una copia temporal, tu repo local
no se toca). Así el navegador siempre coge la versión nueva de esos
archivos aunque estén en caché 30 días.

Después, abre en el navegador:

```
http://192.168.1.144:8090
```

## Notas

- Si `rsync` no está disponible en tu WSL2: `sudo apt install rsync`.
- Si cambias el puerto en `nginx-juegos.conf`, actualiza también el
  mensaje final de `deploy.sh` (o simplemente recuerda el puerto nuevo).
- Este servidor es tu entorno de pruebas/staging, no el hosting público
  final — cuando la web esté lista para el mundo, hablamos de dominio
  y hosting definitivo (Cloudflare Pages, como fawno.com, es una opción
  natural dado que ya la conoces).
