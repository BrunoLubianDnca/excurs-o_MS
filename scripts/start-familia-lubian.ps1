$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverRoot = Join-Path $projectRoot 'server'
$entryPoint = Join-Path $serverRoot 'dist\index.js'

if (-not (Test-Path -LiteralPath $entryPoint)) {
  throw 'A aplicação ainda não foi compilada. Execute npm run build primeiro.'
}

$env:PORT = '3001'
$env:HOST = '127.0.0.1'
$env:NODE_ENV = 'production'
$env:COOKIE_SECURE = 'false'
$env:DEFAULT_LANGUAGE = 'br'
$env:TZ = 'America/Campo_Grande'

Set-Location -LiteralPath $serverRoot
node --require tsconfig-paths/register dist/index.js
