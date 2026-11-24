$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $projectRoot '.local-data/postgres'
$logFile = Join-Path $projectRoot '.local-data/postgres.log'
$pgCtl = 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe'
$pgIsReady = 'C:\Program Files\PostgreSQL\17\bin\pg_isready.exe'

if (-not (Test-Path -LiteralPath $pgCtl)) {
  throw 'PostgreSQL 17 não foi encontrado em C:\Program Files\PostgreSQL\17.'
}
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
  throw 'O banco pessoal local ainda não foi inicializado nesta pasta.'
}

& $pgIsReady -h 127.0.0.1 -p 5435 -q
if ($LASTEXITCODE -eq 0) {
  Write-Output 'Já existe um banco ativo na porta 5435.'
  exit 0
}

& $pgCtl -D $dataDir -l $logFile -o '-h 127.0.0.1 -p 5435' -w start
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar o banco pessoal Trilara.' }
