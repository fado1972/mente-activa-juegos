# Lab de pruebas (local, dentro de tu WSL2)

Sitio: **Mente Activa**. El "lab" ya no es una máquina aparte: nginx
corre directamente en tu WSL2/Ubuntu, sirviendo en
`http://mente-activa-wsl.local` (puerto 80) con document root en
`/var/www/juegos`. Así no hace falta tener nada encendido aparte de tu
propio PC.

nginx escucha en el 80 pero solo responde a ese `server_name`
concreto, así que si en el futuro añades otro proyecto (por ejemplo
fawno-web) en el mismo nginx, cada uno tiene su propio nombre y su
propio fichero en `sites-available` sin pisarse entre sí.

(El servidor físico `fawno-lab` / `192.168.1.144` se dejó de usar para
este proyecto por no compensar tenerlo encendido solo para esto; sigue
existiendo para el resto de la práctica de DevOps si hace falta.)

## Primera vez (configurar nginx en WSL2)

1. Añade el alias al `hosts` de Windows (`C:\Windows\System32\drivers\etc\hosts`,
   abierto como administrador): `127.0.0.1 mente-activa-wsl.local`.
2. Desde tu WSL2/Ubuntu, en la raíz del proyecto:

   ```bash
   ./deploy/setup-lab.sh
   ```

   Esto instala nginx si falta, crea `/var/www/juegos` y deja el site
   activo respondiendo a `mente-activa-wsl.local` en el puerto 80.

## Cada vez que quieras publicar cambios

Desde tu WSL2/Ubuntu, en la raíz del proyecto:

```bash
./deploy/deploy.sh
```

Copia el proyecto a `/var/www/juegos` (con `rsync`, solo lo que ha
cambiado) y recarga nginx. Añade automáticamente `?v=<timestamp>` a los
`.css`/`.js` referenciados en cada `.html` sobre una copia temporal —
tu repo local no se toca. Así el navegador siempre coge la versión
nueva aunque esos archivos estén en caché 30 días.

Después, abre en el navegador:

```
http://mente-activa-wsl.local
```

## `deploy.ps1` (en pausa)

Se creó para desplegar al servidor físico sin arrancar WSL2. Ahora que
el lab vive dentro de WSL2, ya no aplica (WSL2 hace falta sí o sí para
llegar a él) — se deja en el repo por si en el futuro se retoma un
servidor de lab aparte.

## Notas

- Si cambias el puerto en `nginx-juegos.conf`, actualiza también el
  mensaje final de `deploy.sh`.
- Este lab es tu entorno de pruebas, no el hosting público final: la
  web ya está publicada de verdad en `https://juegos.fawno.com`
  (Cloudflare, desde el repo `mente-activa-juegos`).
