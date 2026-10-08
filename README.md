# Versary — Guia de demonstração

**Apresentação:** 08/10/2026  
**Projeto:** sistema de manutenção industrial  
**Ambiente:** notebook Windows da escola

> Este guia é para **executar e apresentar** o Versary. Ele não confirma que a migração para SQLite ou que as dependências já estejam concluídas. Verifique tudo no computador de origem antes de copiar.

## 1. O que o projeto demonstra

O Versary é uma aplicação Next.js voltada à consulta de dados de manutenção industrial. As funcionalidades presentes no projeto incluem dashboard, máquinas, classificação de falhas, análises (Pareto, Jack-Knife e outros gráficos), importação de planilhas Excel e predições com Python. **Algumas funções dependem de dados importados e de scripts Python instalados e configurados.**

A interface usa identidade visual inspirada na Coca-Cola FEMSA, com abertura animada. O projeto do Figma foi usado como referência visual; o front é implementado no Next.js.

## 2. Preparação HOJE — no computador em que funciona

- [ ] Confirmar que o projeto aberto é a pasta **`versary`**, e não uma versão antiga.
- [ ] Confirmar que a migração para SQLite foi realmente concluída; caso contrário, o projeto ainda poderá depender de MySQL.
- [ ] Abrir `/dashboard` e verificar se os indicadores carregam com dados importados.
- [ ] Testar `/maquinas`, `/pareto`, `/jackknife`, `/outrosgraficos`, `/classificacaofalhas`, `/tabelas` e `/predicoes` conforme o que estiver implementado.
- [ ] Testar uma importação Excel e confirmar que os registros persistem após reiniciar o servidor.
- [ ] Verificar a abertura animada e o botão **Pular**.
- [ ] Executar `npx tsc --noEmit`, `npm run lint` (se existir) e `npm run build`; anotar erros.
- [ ] Gravar um vídeo curto de demonstração como plano B.
- [ ] Copiar projeto, planilha de teste e materiais de apresentação para um pendrive ou armazenamento acessível na escola.

**Atenção:** se o banco SQLite já tiver dados úteis, faça uma cópia de segurança antes de qualquer teste de importação. Não envie senhas ou `.env.local` para repositórios públicos.

## 3. Requisitos no notebook da escola

| Requisito | Para que serve | Como verificar no terminal |
| --- | --- | --- |
| Node.js + npm | Executar Next.js | `node -v` e `npm -v` |
| Python | Processar Excel e executar ML, se essas funções forem usadas | `python --version` ou `py --version` |
| Bibliotecas Python | Importação/predições | `python -m pip install -r requirements.txt` (apenas se necessário e permitido) |
| Arquivos do projeto e dependências npm | Executar a aplicação | `package.json` e `node_modules` ou acesso para `npm install` |
| SQLite configurado | Armazenar os registros sem MySQL | Confirmar o arquivo e a configuração `SQLITE_PATH` no código |

**Sem Node.js, o Next.js não inicia.** Sem Python funcional, importação e predições que executam scripts Python podem falhar. Instalação de dependências normalmente exige internet; não conte com isso na escola. Não tente contornar restrições administrativas do notebook.

## 4. Copiar o projeto

1. No computador de origem, identifique a pasta real do Versary.
2. Copie o projeto para o notebook, incluindo `src`, `public`, `scripts`, `package.json`, arquivo de lock, planilhas de demonstração e o banco SQLite **se ele já tiver sido criado e for necessário**.
3. Não copie arquivos com credenciais reais sem necessidade. Configure o `.env.local` localmente conforme o adaptador de banco **efetivamente implementado**.
4. Se a instalação das dependências já foi testada, preserve uma cópia do ambiente de execução; copiar `node_modules` ou `.next` entre computadores não garante compatibilidade.
5. Evite caminhos fixos como `C:\Temp\renatinha\versary` no código ou nos scripts.

## 5. Como iniciar no Windows

Abra o terminal na pasta onde está o `package.json`:

```bash
node -v
npm -v
```

Se as dependências ainda não estiverem instaladas **e houver internet**:

```bash
npm install
```

Para execução de desenvolvimento (mais simples para diagnosticar):

```bash
npm run dev
```

Abra a URL informada pelo terminal, normalmente `http://localhost:3000`. Se a porta 3000 estiver ocupada, use a porta que o Next.js realmente mostrar.

**Alternativa de produção local**, somente depois de gerar uma build com sucesso nesse ambiente:

```bash
npm run build
npm run start
```

Não execute os dois modos simultaneamente na mesma porta.

### Banco SQLite

Se a migração estiver concluída, confirme com o Codex ou com os arquivos atuais do projeto:

- qual script Python inicializa o banco;
- se a variável `SQLITE_PATH` é necessária;
- se o banco está em `data/versary.sqlite`;
- se o arquivo já contém registros de demonstração.

**Não execute um comando de inicialização inventado:** o nome do script depende do que realmente foi implementado. Um banco vazio não produz indicadores automaticamente.

## 6. Roteiro sugerido para a apresentação (5–8 minutos)

1. **Abertura e identidade visual (30 s):** mostrar a animação Coca-Cola e explicar que o front foi reimplementado em Next.js com referência no protótipo Figma.
2. **Objetivo (30 s):** centralizar consultas e análises de registros de manutenção industrial.
3. **Dashboard (1 min):** mostrar os indicadores disponíveis e explicar que são calculados a partir dos dados carregados.
4. **Máquinas (1 min):** consultar a lista e abrir um detalhe, se houver dados.
5. **Análises (1–2 min):** apresentar Pareto, Jack-Knife, filtros e outros gráficos que estiverem operacionais.
6. **Classificação (1 min):** mostrar o fluxo de classificação e esclarecer quais alterações são locais ao navegador, se ainda estiverem em `localStorage`.
7. **Importação/predição (1 min):** demonstrar somente se Python, dependências e arquivos já tiverem sido testados naquele notebook; caso contrário, usar vídeo gravado e explicar a limitação.
8. **Encerramento (30 s):** destacar Next.js, processamento Python e SQLite, **se a migração já estiver concluída**.

Se usar registros fictícios, identifique-os como **dados de demonstração**, nunca como dados reais da fábrica.

## 7. Problemas frequentes e o que fazer

| Mensagem ou sintoma | Possível causa | Ação segura |
| --- | --- | --- |
| `npm: command not found` | Node.js/npm ausentes ou fora do PATH | Verificar `node -v`, instalação e reiniciar terminal |
| `spawn python EACCES` | O Windows tentou executar Python sem permissão ou um atalho inválido | Verificar `python --version`, `where.exe python` e configuração do executável |
| Python abre Microsoft Store | Alias de `WindowsApps`, sem Python funcional | Instalar Python permitido pelo ambiente e desativar alias conflitante |
| Indicadores não carregam e pedem `MYSQL_*` | Aplicação ainda usa adaptador MySQL ou migração incompleta | Não assumir SQLite pronto; verificar API e adaptador ativos |
| Dashboard vazio | Banco sem registros ou consulta sem dados | Importar planilha válida ou usar banco de demonstração previamente preparado |
| Hydration mismatch | Servidor e cliente geram HTML inicial diferente | Registrar erro e corrigir lógica de renderização; não mascarar com `suppressHydrationWarning` |
| Logo não desenha | `prefers-reduced-motion: reduce` ativo | Verificar preferência de movimento; preservar acessibilidade |
| Porta ocupada | Outro servidor usando a porta | Abrir a URL/porta que o terminal informar |

## 8. Plano B para o dia

Se o notebook não permitir executar Node.js ou Python:

- Apresente o **vídeo previamente gravado** do Versary funcionando.
- Use capturas de tela do dashboard, máquinas e análises.
- Leve o ZIP/projeto e a documentação para explicar arquitetura e implementação.
- Seja transparente sobre quais funcionalidades foram demonstradas ao vivo e quais foram mostradas em gravação.

## 9. Checklist de saída de casa

- [ ] Projeto Versary copiado e conferido.
- [ ] Banco SQLite com dados de demonstração, **se já estiver funcional**.
- [ ] Planilha Excel compatível com o importador.
- [ ] Vídeo de reserva acessível offline.
- [ ] Prints principais salvos.
- [ ] Versões de Node/Python anotadas.
- [ ] Teste de abertura, login, dashboard e navegação realizado.
- [ ] Cabos, carregador e pendrive preparados.

---

**Regra para amanhã:** priorize mostrar um fluxo estável e verdadeiro. Não faça migrações estruturais ou instalações arriscadas minutos antes da apresentação.
