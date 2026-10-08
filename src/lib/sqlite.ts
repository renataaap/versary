import Database from "better-sqlite3";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

type ImportedRow = Record<string, unknown>;
const identifier = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error("Identificador de banco inválido.");
  return '"' + value + '"';
};
function openDatabase() {
  // Runtime data is initialized externally by Python, not bundled with the server.
  const path = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.SQLITE_PATH || "data/versary.sqlite");
  if (!existsSync(path)) throw new Error("Banco SQLite não encontrado. Execute python scripts/manage_sqlite.py init.");
  const db = new Database(path, { fileMustExist: true, timeout: 5000 });
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    db.pragma("journal_mode = WAL");
    return db;
  } catch (error) { db.close(); throw error; }
}
function activeTable(db: Database.Database): string {
  const record = db.prepare("SELECT table_name FROM dataset_catalog WHERE active=1").get() as { table_name: string } | undefined;
  if (!record) throw new Error("Nenhum dataset ativo. Inicialize o banco ou selecione o dataset pelo administrador Python.");
  identifier(record.table_name);
  return record.table_name;
}
function tableColumns(db: Database.Database, table: string) {
  return (db.prepare('PRAGMA table_info(' + identifier(table) + ')').all() as {name:string}[])
    .filter(({name}) => name !== "id" && name !== "created_at")
    .map(({name}) => ({column_name:name}));
}
export async function saveImportedTable(_requestedTableName: string, columns: string[], rows: ImportedRow[]) {
  const normalizedColumns = columns.map((column, index) => {
    const base = column
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .toLowerCase()
      .replace(/^(\d)/, "_$1");
    return base || `coluna_${index + 1}`;
  });
  const usedColumnNames = new Set(["id", "created_at"]);
  const uniqueColumns = normalizedColumns.map((column) => {
    let name = column;
    let suffix = 2;
    while (usedColumnNames.has(name)) {
      name = `${column}_${suffix}`;
      suffix += 1;
    }
    usedColumnNames.add(name);
    return name;
  });

  const db = openDatabase();
  try {
    return db.transaction(() => {
      const tableName = activeTable(db);
      const existing = new Set(tableColumns(db, tableName).map(({column_name}) => column_name));
      for (const column of uniqueColumns) {
        if (!existing.has(column)) db.exec('ALTER TABLE ' + identifier(tableName) + ' ADD COLUMN ' + identifier(column) + ' TEXT NULL');
      }
      if (rows.length && !uniqueColumns.length) throw new Error("A importação precisa conter colunas.");
      if (rows.length) {
        const insert = db.prepare('INSERT INTO ' + identifier(tableName) + ' (' + uniqueColumns.map(identifier).join(', ') + ') VALUES (' + uniqueColumns.map(() => '?').join(', ') + ')');
        for (const row of rows) insert.run(...columns.map(column => row[column] == null ? null : String(row[column])));
      }
      return { tableName, columns: uniqueColumns, totalRows: rows.length };
    }).immediate();
  } finally { db.close(); }
}
export async function getLatestImportedTable() {
  const db = openDatabase();
  try {
    const tableName = activeTable(db);
    return {
      tableName,
      columns: tableColumns(db, tableName).map(({column_name}) => column_name),
      rows: db.prepare('SELECT * FROM ' + identifier(tableName) + ' ORDER BY id ASC LIMIT 1000').all(),
    };
  } finally { db.close(); }
}
export async function getUniqueMachines() {
  const db = openDatabase();

  try {
    const table = activeTable(db);
    const columns = tableColumns(db, table);
    if (!columns.length) return [];
    const normalize = (value: string) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const machineColumn = columns.find(({ column_name }) =>
      /chave.*parada|parada.*chave/.test(normalize(column_name)),
    )?.column_name;
    if (!machineColumn) {
      throw new Error("A tabela importada não possui uma coluna de chave da parada.");
    }
    const lineColumn = columns.find(({ column_name }) =>
      /linha|line/.test(normalize(column_name)),
    )?.column_name;
    const lineSelection = lineColumn
      ? `${identifier(lineColumn)} AS production_line`
      : "NULL AS production_line";
    const rows = db.prepare(
      `SELECT ${identifier(machineColumn)} AS machine_key, ${lineSelection}
       FROM ${identifier(table)}
       WHERE ${identifier(machineColumn)} IS NOT NULL`,
    ).all() as { machine_key: unknown; production_line: unknown }[];

    const uniqueMachines = new Map<string, Set<string>>();
    for (const row of rows) {
      const name = String(row.machine_key ?? "").trim();
      if (!name) continue;

      const lines = uniqueMachines.get(name) ?? new Set<string>();
      const line = String(row.production_line ?? "").trim();
      if (line) lines.add(line);
      uniqueMachines.set(name, lines);
    }

    return Array.from(uniqueMachines, ([name, lines]) => ({
      name,
      lines: Array.from(lines).sort((first, second) => first.localeCompare(second, "pt-BR")),
    })).sort((first, second) => first.name.localeCompare(second.name, "pt-BR", { numeric: true }));
  } finally {
    db.close();
  }
}

export async function getMachineStopDetails(machineName: string) {
  const db = openDatabase();

  try {
    const table = activeTable(db);
    const columns = tableColumns(db, table);
    if (!columns.length) return [];
    const normalize = (value: string) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const machineColumn = columns.find(({ column_name }) =>
      /chave.*parada|parada.*chave/.test(normalize(column_name)),
    )?.column_name;
    if (!machineColumn) {
      throw new Error("A tabela importada não possui uma coluna de chave da parada.");
    }

    const causeColumn = columns.find(({ column_name }) =>
      column_name !== machineColumn
      && /observa|subchave|chave_\d+|tipo.*parada|causa|motivo|defeito|falha|descricao/.test(normalize(column_name)),
    )?.column_name;
    const minutesColumn = columns.find(({ column_name }) =>
      /minut.*parada|total.*minuto|tempo|minute|duration|duracao/.test(normalize(column_name)),
    )?.column_name;
    const lineColumn = columns.find(({ column_name }) =>
      /linha|line/.test(normalize(column_name)),
    )?.column_name;
    const dateColumn = columns.find(({ column_name }) =>
      !/manutencao|maintenance/.test(normalize(column_name))
      && /data|date|inicio|abertura|ocorrencia/.test(normalize(column_name)),
    )?.column_name;
    const selectColumn = (column: string | undefined, alias: string) =>
      column ? `${identifier(column)} AS ${identifier(alias)}` : `NULL AS ${identifier(alias)}`;

    const rows = db.prepare(
      `SELECT
         ${selectColumn(causeColumn, "cause")},
         ${selectColumn(minutesColumn, "minutes")},
         ${selectColumn(lineColumn, "line")},
         ${selectColumn(dateColumn, "occurred_at")}
       FROM ${identifier(table)}
       WHERE ${identifier(machineColumn)} = ?`,
    ).all(machineName) as { cause: unknown; minutes: unknown; line: unknown; occurred_at: unknown }[];

    return rows.map((row) => ({
      cause: row.cause === null || row.cause === undefined ? "" : String(row.cause).trim(),
      minutes: row.minutes === null || row.minutes === undefined ? "" : String(row.minutes).trim(),
      line: row.line === null || row.line === undefined ? "" : String(row.line).trim(),
      occurredAt: row.occurred_at === null || row.occurred_at === undefined
        ? ""
        : String(row.occurred_at).trim(),
    }));
  } finally {
    db.close();
  }
}
