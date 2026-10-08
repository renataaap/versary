# Cria uma copia nova, sem segredos e sem alterar a instalacao original.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $projectRoot 'entrega/Versary_DEMO'
if (Test-Path -LiteralPath $destination) { throw 'A pasta de entrega ja existe. Preserve-a ou escolha outro nome antes de gerar novamente.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$files = @('src','public','scripts','node_modules','.next','.runtime','demonstracao','package.json','package-lock.json','next.config.mjs','tsconfig.json','eslint.config.mjs','postcss.config.mjs','next-env.d.ts','README.md','DEMONSTRACAO.md','INICIAR_VERSARY.bat','CONFIGURAR_VERSARY.bat','.env.example')
foreach ($file in $files) { $source = Join-Path $projectRoot $file; if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $destination $file) -Recurse } }
[IO.File]::WriteAllText((Join-Path $destination '.env.local'), "SQLITE_PATH=data/versary.sqlite`r`n")
$pythonSource = Join-Path $projectRoot '.venv/Scripts'
$pythonDestination = Join-Path $destination '.venv/Scripts'
New-Item -ItemType Directory -Path $pythonDestination -Force | Out-Null
Get-ChildItem -LiteralPath $pythonSource -File | Where-Object { $_.Extension -in '.exe','.dll','.pyd','.zip','._pth','.txt' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $pythonDestination }
$siteDestination = Join-Path $pythonDestination 'Lib/site-packages'
New-Item -ItemType Directory -Path $siteDestination -Force | Out-Null
foreach($module in @('openpyxl','xlrd','et_xmlfile')) { Copy-Item -LiteralPath (Join-Path $pythonSource "Lib/site-packages/$module") -Destination (Join-Path $siteDestination $module) -Recurse }
$python = Join-Path $pythonSource 'python.exe'
$priorSqlitePath = $env:SQLITE_PATH
try {
    $env:SQLITE_PATH = Join-Path $projectRoot 'data/versary.sqlite'
    & $python (Join-Path $projectRoot 'scripts/manage_sqlite.py') backup --output (Join-Path $destination 'data/versary.sqlite')
    if($LASTEXITCODE -ne 0) { throw 'Falha ao criar backup SQLite para entrega.' }
} finally { $env:SQLITE_PATH = $priorSqlitePath }
Write-Output "Entrega criada: $destination"