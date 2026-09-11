$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
node scripts/start-excursion.mjs
exit $LASTEXITCODE
