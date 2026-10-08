# Diagnóstico de Machine Learning — 07/10/2026

O treinamento e as predições não podem executar neste ambiente: a política de
Controle de Aplicativo bloqueia extensões nativas tanto de pandas quanto de
scikit-learn. Substituir apenas pandas por openpyxl não resolve este bloqueio.
Nenhuma política foi alterada, biblioteca reinstalada ou resultado simulado.

## Dependências testadas separadamente

Os testes executaram cada importação em um subprocesso independente usando
`.venv/Scripts/python.exe`, Python 3.13.7, Windows x64, o runtime local escolhido
pelo launcher quando disponível. Importar o pacote com sucesso não constitui um
teste completo de todas as suas extensões nativas.

| Pacote | Versão instalada | Resultado |
| --- | --- | --- |
| numpy | 2.5.3 | Importação passou |
| scikit-learn (`sklearn`) | 1.9.1 | Bloqueio de `sklearn.utils.sparsefuncs_fast` |
| joblib | 1.6.0 | Importação passou |
| pandas | 3.0.6 | Bloqueio de `pandas._libs.lib` |
| openpyxl | 3.1.5 | Importação passou |
| scipy | 1.18.1 | Importação passou |

Ambas as falhas exibem `ImportError: DLL load failed ... Uma política de Controle
de Aplicativo bloqueou este arquivo`. O teste separado de sklearn confirma que
o problema não se limita à importação direta de pandas no treinamento.

## Arquitetura e dependências necessárias

- `train_failure_classifier.py`: pandas lê as duas planilhas, limpa valores,
  deduplica pares texto/rótulo, preserva rótulos conflitantes, contabiliza fontes
  e exporta métricas CSV. O modelo usa TF-IDF de palavras e caracteres,
  FeatureUnion e LogisticRegression. GroupShuffleSplit agrupa pelo texto para
  evitar compartilhar a mesma observação entre treino e teste. Após avaliação,
  treina um segundo pipeline com todos os exemplos válidos e salva com joblib.
- `predict_failure_classifier.py`: pandas lê todas as abas e exporta Excel;
  importa funções do treinamento, carregando também suas dependências. O
  pipeline joblib produz as classificações; openpyxl é o motor da exportação.
- `src/lib/failure-classifier.ts`: seleciona PYTHON_PATH ou o Python local,
  verifica versão/fingerprints das fontes e pode treinar automaticamente um
  modelo ausente/desatualizado. O runtime científico também é necessário para
  carregar e executar um modelo já treinado.
- `src/app/api/predicoes/route.ts`: GET prepara o modelo e POST recebe Excel e
  devolve o arquivo de predições. Falhas do Python são retornadas como HTTP 503;
  nenhuma predição é inventada para compensar indisponibilidade.
- `requirements.txt`: fixa pandas, scikit-learn, openpyxl e xlrd. NumPy, SciPy,
  joblib, narwhals e threadpoolctl são dependências do scikit-learn instalado.
  xlrd suporta o Excel antigo `.xls`; openpyxl suporta `.xlsx`.

Pandas poderia ser substituído no processamento tabular por openpyxl e
estruturas Python após resolver a disponibilidade real do runtime científico.
NumPy/SciPy/scikit-learn continuam necessários ao algoritmo existente; joblib
continua necessário para os modelos. Não houve reescrita apressada do ML.

## Execuções realizadas

Treinamento com as fontes reais configuradas, usando saída isolada:

```bat
.venv\Scripts\python.exe scripts\train_failure_classifier.py --output-dir .next/ml-diagnostic-output
```

Predição com a planilha real de Jundiaí e saída isolada:

```bat
.venv\Scripts\python.exe scripts\predict_failure_classifier.py --input "scripts/planilhas treinamento/apontamentos Jundiai.xlsx" --output .next/ml-diagnostic-output/predicoes.xlsx
```

Ambos encerraram com código 1 na importação de pandas, antes de ler as planilhas,
treinar, carregar o modelo ou gerar Excel. Portanto não há treinamento, métricas,
predição ou Excel de saída novos validados. Nenhum arquivo `.joblib` foi encontrado
sob `scripts` na inspeção; nenhum modelo foi sobrescrito.

`npx tsc --noEmit`, `npm run lint` e `npm run build` passaram, sem warnings
reportados. Esses comandos validam o projeto Next.js, mas não removem o bloqueio
do runtime Python. Somente este relatório foi criado; os cinco arquivos
analisados, a importação Excel, SQLite e o frontend foram preservados.

## Alternativa segura para 08/10/2026

Apresentar dashboard, máquinas, gráficos, importação Excel e classificação
manual já disponíveis, informando explicitamente que ML está indisponível neste
computador. Não apresentar classificação manual como inferência automática.

Para demonstrar ML de verdade, preparar antecipadamente um computador autorizado
onde todas as dependências e extensões do modelo funcionem. Usar as planilhas
reais e treinar em uma pasta de saída nova; validar métricas, uma predição e o
Excel antes da apresentação. Guardar cópia de qualquer modelo anterior antes de
promover um novo. Utilizar versões compatíveis no treinamento e na inferência.
Copiar somente o `.joblib` para este computador não basta: sklearn permanece
bloqueado e a distribuição básica em `entrega/Versary_DEMO` não contém o runtime
completo de ML. Uma liberação de bibliotecas, se necessária, cabe à administração
autorizada da política, sem desativação ou contorno pelo projeto.
