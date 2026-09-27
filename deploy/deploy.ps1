# Despliega el proyecto al servidor de lab desde PowerShell, sin
# necesidad de arrancar WSL. Requiere el cliente OpenSSH de Windows
# (ssh.exe / scp.exe) que ya usas para las sesiones SSH de VS Code.
#
# Uso (desde la carpeta del proyecto, o desde donde sea):
#   .\deploy\deploy.ps1

$ErrorActionPreference = "Stop"

$LabHost = "192.168.1.144"
$LabUser = "gorke"
$LabPath = "/var/www/juegos"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$Version = Get-Date -Format "yyyyMMddHHmmss"
$Staging = Join-Path $env:TEMP "juegos-deploy-$Version"

Write-Host "==> Preparando copia con cache-busting (v=$Version) ..."
New-Item -ItemType Directory -Path $Staging | Out-Null

# Copia todo el proyecto menos la carpeta deploy/ (robocopy es lo mas
# fiable en Windows para copiar arboles de carpetas con exclusiones).
robocopy $ProjectRoot $Staging /E /XD deploy | Out-Null
if ($LASTEXITCODE -ge 8) {
    throw "robocopy fallo copiando el proyecto a la carpeta temporal (codigo $LASTEXITCODE)"
}

# Anade "?v=<version>" a los .css/.js locales referenciados en cada
# .html de la copia temporal (el proyecto original no se toca).
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem -Path $Staging -Filter "*.html" -Recurse | ForEach-Object {
    $text = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $text = $text -replace '(href="[^"]+\.css)(")', ('$1?v=' + $Version + '$2')
    $text = $text -replace '(src="[^"]+\.js)(")',  ('$1?v=' + $Version + '$2')
    [System.IO.File]::WriteAllText($_.FullName, $text, $Utf8NoBom)
}

Write-Host "==> Vaciando el contenido actual en el servidor ..."
# gorke es dueno de /var/www/juegos (y de todo lo de dentro), asi que
# esto no necesita sudo. Solo se borra el CONTENIDO, no la carpeta.
ssh "${LabUser}@${LabHost}" "rm -rf ${LabPath}/*"
if ($LASTEXITCODE -ne 0) {
    throw "El ssh para vaciar el servidor fallo (codigo $LASTEXITCODE). Nada se ha subido todavia, es seguro reintentar."
}

Write-Host "==> Subiendo archivos nuevos ..."
Get-ChildItem -Path $Staging | ForEach-Object {
    scp -r -q $_.FullName "${LabUser}@${LabHost}:${LabPath}/"
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo subiendo '$($_.Name)' (codigo $LASTEXITCODE). El servidor puede haber quedado a medias: reintenta el deploy."
    }
}

Write-Host "==> Comprobando y recargando nginx en el servidor ..."
ssh "${LabUser}@${LabHost}" "sudo nginx -t && sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) {
    throw "El reload de nginx fallo (codigo $LASTEXITCODE). Revisa la config o hazlo a mano: ssh ${LabUser}@${LabHost} 'sudo nginx -t && sudo systemctl reload nginx'"
}

Remove-Item -Recurse -Force $Staging

Write-Host ""
Write-Host "Publicado (v=$Version). Abre: http://${LabHost}:8090"
