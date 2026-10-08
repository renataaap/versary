@echo off
setlocal
cd /d "%~dp0"
if exist ".runtime\node\node.exe" set "PATH=%CD%\.runtime\node;%PATH%"
where node >nul 2>nul
if errorlevel 1 goto no_node
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
 echo [ERRO] Utilize Node.js 24 LTS de 64 bits para esta distribuicao.
 goto fail
)
if exist ".venv\Scripts\python.exe" (
 set "PYTHON_PATH=%CD%\.venv\Scripts\python.exe"
) else (
 if not defined PYTHON_PATH set "PYTHON_PATH=python"
)
if not defined SQLITE_PATH set "SQLITE_PATH=data/versary.sqlite"
node scripts\verify_runtime.mjs
if errorlevel 1 goto fail
"%PYTHON_PATH%" scripts\manage_sqlite.py init
if errorlevel 1 goto fail
"%PYTHON_PATH%" scripts\manage_sqlite.py check
if errorlevel 1 goto fail
if /i "%~1"=="--check" exit /b 0
if not exist ".next\BUILD_ID" (
 echo [ERRO] Build de producao ausente. Execute CONFIGURAR_VERSARY.bat.
 goto fail
)
echo.
if not defined VERSARY_PORT set "VERSARY_PORT=3000"
echo Versary: http://127.0.0.1:%VERSARY_PORT%
 echo Login de demonstracao: Talita / 1234 ou acesso visitante.
echo Dataset demonstrativo: import_demonstracao. Dados ficticios identificados.
echo Mantenha esta janela aberta. Ctrl+C encerra o servidor.
call npm run start -- --hostname 127.0.0.1 --port %VERSARY_PORT%
if errorlevel 1 goto fail
exit /b 0
:no_node
echo [ERRO] Node.js ausente. Prepare Node.js 24 LTS ou copie .runtime da distribuicao Windows x64.
:fail
echo Consulte DEMONSTRACAO.md. Nenhum download ou instalacao foi executado.
if /i not "%~1"=="--check" pause
exit /b 1