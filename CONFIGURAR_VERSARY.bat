@echo off
setlocal
cd /d "%~dp0"
call INICIAR_VERSARY.bat --check
if errorlevel 1 goto fail
if exist ".runtime\node\node.exe" set "PATH=%CD%\.runtime\node;%PATH%"
echo Gerando build local de producao, sem instalar dependencias...
call npm run build
if errorlevel 1 goto fail
echo Build pronta. Execute INICIAR_VERSARY.bat.
pause
exit /b 0
:fail
echo Falha na configuracao. Consulte DEMONSTRACAO.md.
pause
exit /b 1