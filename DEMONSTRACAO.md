# Versary — demonstração em 08/10/2026

A distribuição alvo é Windows x64. Node 24.19.0 e Python portátil 3.13.7 são preparados junto do projeto; não há necessidade de MySQL Server ou instalação global para o fluxo básico. A escola precisa permitir executar `.exe`, `.bat` e o módulo nativo SQLite, e gravar na pasta. Não é possível garantir permissões de outro computador sem testá-lo.

## Copiar e executar

Copie a pasta `entrega/Versary_DEMO` INTEIRA para uma pasta gravável do notebook, por exemplo Documentos. Não execute de dentro de um ZIP nem de uma pasta somente leitura. Evite usar diretamente um pendrive lento.

1. Execute `INICIAR_VERSARY.bat --check` em um terminal para verificar os runtimes. Sem argumento, ele inicia o servidor após verificar banco e dependências.
2. Se a build copiada não funcionar no destino, execute `CONFIGURAR_VERSARY.bat`: ele gera uma build local, sem instalar ou baixar pacotes. Node/npm e node_modules já devem estar presentes.
3. Execute `INICIAR_VERSARY.bat` e abra **http://127.0.0.1:3000**.
4. Login: **Talita / 1234**; visitante permite consultar sem editar. Essas credenciais são as existentes no protótipo, sem autenticação nova.
5. Mantenha a janela aberta. Para encerrar, pressione Ctrl+C.

O launcher usa `%~dp0` para localizar o projeto, prefere `.runtime/node` e `.venv/Scripts/python.exe`, resolve caminhos no runtime e não instala nada. Se a porta 3000 estiver ocupada, encerre a outra instância. Use sempre o mesmo endereço: classificações são salvas no localStorage por origem do navegador.

## Dados demonstrativos

O banco `data/versary.sqlite` contém `import_demonstracao`: **36 registros fictícios, seis máquinas, duas linhas, 1.260 minutos**. Os nomes começam com DEMO e a coluna Origem contém DADOS DE DEMONSTRAÇÃO. `import_dados` continua separado e não é apagado. O dataset ativo é usado tanto na leitura quanto na importação.

- `demonstracao/DADOS_DE_DEMONSTRACAO.xlsx`: os 36 registros iniciais em duas abas.
- `demonstracao/IMPORTAR_DEMONSTRACAO.xlsx`: seis registros adicionais, também em duas abas. Importe este arquivo na apresentação. Cada importação ACRESCENTA registros; repetir o upload repete os eventos. Após uma importação, haverá 42 registros e 1.533 minutos.
- Os IDs existentes não mudam. A classificação manual continua no navegador, associada ao dataset/id; não é transportada automaticamente para outro navegador.

Roteiro: abertura → login → dashboard → máquinas → detalhe de uma máquina → Pareto → Jack-Knife → outros gráficos → classificação manual → Inserir dados → escolher IMPORTAR_DEMONSTRACAO.xlsx → Importar → voltar ao dashboard.

A identificação DEMO aparece nos dados; não há redesign nem modificação das fórmulas. A página Tabelas já tinha um estado vazio fixo e não faz parte do roteiro de dados. Não apresentar esses números como produção real.

## Banco e administração

`SQLITE_PATH=data/versary.sqlite` é o único caminho de banco; Node e Python usam a raiz do projeto. A distribuição usa uma `.env.local` mínima, sem credenciais/copiar segredos da instalação original.

```bat
.venv\Scripts\python.exe scripts\manage_sqlite.py check
.venv\Scripts\python.exe scripts\manage_sqlite.py status
.venv\Scripts\python.exe scripts\manage_sqlite.py backup --output demonstracao\backup.sqlite
.venv\Scripts\python.exe scripts\prepare_demo.py --activate
```

`init` e a preparação de demonstração são idempotentes, sem limpar registros. O backup não sobrescreve arquivos. Não copiar só o `.sqlite` enquanto o servidor estiver aberto: WAL pode conter gravações; use backup Python. Importações têm transação e rollback. Fontes, imagens, código, SQLite e scripts ficam locais.

## Dependências e modo offline

- Windows x64; navegador moderno (Edge 111+ ou equivalente); pasta gravável.
- Node **24 LTS x64**, distribuição preparada com **24.19.0**. O módulo better-sqlite3 instalado precisa ser compatível com a ABI do Node. Não trocar só o executável por outra versão principal.
- Next **16.3.5**, React **19.2.8**, demais dependências de `package-lock.json`, inclusive better-sqlite3 **13.0.3**. Copiar node_modules e .runtime para iniciar sem download.
- Python **3.10+**, preparado com **3.13.7**, módulos padrão sqlite3 e openpyxl **3.1.5**, xlrd **2.0.2**, et_xmlfile **2.0.0** para Excel.
- Na configuração a partir dos fontes, `npm ci` e `pip install` exigem internet ou caches/wheels completos. Fazer isso antes de ir à escola; não depender desses comandos offline.
- A build não é universal: os binários são Windows x64 e a build deve ser refeita no destino se necessário. Não usar esta distribuição no Linux/macOS/Windows ARM.
- Não são exigidas permissões de administrador pelo launcher; uma política da escola pode bloquear execução de binários, bibliotecas nativas ou scripts.

## Machine Learning

Os scripts de treinamento e predição e as duas planilhas reais foram preservados. **ML não está garantido para a apresentação**: pandas/scikit-learn exigem bibliotecas nativas, e uma política de Controle de Aplicativo deste computador bloqueou DLLs. A distribuição básica inclui somente Python/Excel; não inclui um modelo treinado válido nem resultados simulados.

Para habilitar ML, em um ambiente permitido, instale as dependências de `requirements.txt`, treine com `scripts/train_failure_classifier.py` e copie `scripts/resultado_modelo_falhas` completo. Os arquivos .joblib e métricas são resolvidos relativamente aos scripts/raiz, sem caminho fixo. Esse preparo deve ocorrer antes da apresentação, com execução e versão das dependências conferidas. O GET de predições pode treinar automaticamente se o modelo estiver ausente/desatualizado; não abrir essa página durante o roteiro básico sem preparar o ML.

## Resultados de validação

Consulte o relatório final do trabalho: testes são realizados em bancos/cópias isolados, para não duplicar os dados entregues. A build e o navegador são testados com conexões externas bloqueadas mantendo localhost; isso não substitui um teste físico no notebook da escola.
### Validação executada em 07/10/2026

- `npx tsc --noEmit`, `npm run lint` e `npm run build`: passaram.
- Cópia em outra pasta, usando Node/Python portáteis e launcher real: passou.
- Build refeita dentro da cópia com conexões externas bloqueadas e localhost permitido: passou sem download.
- Edge: abertura/Pular, login, dashboard populado, seis máquinas, detalhe/gráficos, Pareto, Jack-Knife, outros gráficos, classificação com reload e importação pela interface: passaram, sem erros JavaScript/hydration ou respostas HTTP com erro.
- Upload das duas abas: 36 → 42 registros, 1.260 → 1.533 minutos, IDs preservados. Reinício do servidor manteve os dados.
- Integridade SQLite, WAL, inicialização repetida, backup e rollback: passaram. Banco ausente gera erro e não cria substituto silencioso.
- A entrega continua com 36 registros iniciais; testes usaram bancos separados preservados fora da entrega.
- `.xls`/`.xld`: sem teste completo de upload; xlrd importado/verificado. O roteiro utiliza `.xlsx`, que foi testado.
- ML: não validado com sucesso; DLLs bloqueadas no computador original. Distribuição básica sem pandas/modelo, scripts e planilhas reais preservados.
- Sem teste físico no notebook da escola nem desconexão física da rede; o teste offline bloqueou conexões externas dos processos Node e requisições externas do navegador.

### Arquivos desta preparação

Criados: `INICIAR_VERSARY.bat`, `CONFIGURAR_VERSARY.bat`, `DEMONSTRACAO.md`, `scripts/prepare_demo.py`, `scripts/verify_runtime.mjs`, `scripts/create_demo_package.py`, duas planilhas em `demonstracao/`, runtimes locais e `entrega/Versary_DEMO`.

Alterados: `scripts/parse_excel.py` (Excel sem pandas), `.gitignore`, `eslint.config.mjs` e `tsconfig.json` (cópias/runtimes gerados), `next.config.mjs` (raiz calculada pela localização do projeto), `src/app/maquinas/[machine]/page.tsx` (decodificação do nome). O empacotamento passou de PowerShell para Python, pois scripts PowerShell estavam bloqueados neste computador.

Na migração precedente: `src/lib/sqlite.ts`, `scripts/manage_sqlite.py`, quatro APIs de dados/importação, `.env.example`, `.env.local`, `README.md`, `package.json` e `package-lock.json`. Adaptador MySQL e mysql2 mantidos. Nenhum redesenho, mudança de animação ou de fórmula foi feito nesta preparação.