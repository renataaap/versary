"""Administra o SQLite do Versary sem apagar ou substituir dados existentes."""
import argparse
import json
import os
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent.parent

def database_path():
    value = os.environ.get("SQLITE_PATH")
    if value is None:
        env_file = ROOT / ".env.local"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8-sig").splitlines():
                key, separator, setting = line.partition("=")
                if separator and key.strip() == "SQLITE_PATH":
                    value = setting.strip().strip("\"'")
                    break
    path = Path(value or "data/versary.sqlite")
    return path if path.is_absolute() else ROOT / path

def connect(path, create=False):
    if create:
        path.parent.mkdir(parents=True, exist_ok=True)
    elif not path.is_file():
        raise FileNotFoundError(f"Banco não encontrado: {path}. Execute init.")
    connection = sqlite3.connect(path, timeout=5)
    connection.execute("PRAGMA busy_timeout=5000")
    connection.execute("PRAGMA foreign_keys=ON")
    if create:
        connection.execute("PRAGMA journal_mode=WAL")
    return connection

def initialize(connection):
    with connection:
        connection.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        connection.execute("CREATE TABLE IF NOT EXISTS dataset_catalog (table_name TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)))")
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS dataset_one_active ON dataset_catalog(active) WHERE active=1")
        tables = [r[0] for r in connection.execute("SELECT name FROM sqlite_schema WHERE type='table' AND substr(name,1,7)='import_' ORDER BY name")]
        active = connection.execute("SELECT table_name FROM dataset_catalog WHERE active=1").fetchone()
        if not active and len(tables)>1:
            raise ValueError("Há múltiplas tabelas existentes. Escolha o dataset ativo explicitamente; nenhum dado foi apagado.")
        if not tables:
            connection.execute("CREATE TABLE IF NOT EXISTS import_dados (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
            tables = ["import_dados"]
        for table in tables:
            connection.execute("INSERT OR IGNORE INTO dataset_catalog(table_name) VALUES (?)", (table,))
        if not active:
            connection.execute("UPDATE dataset_catalog SET active=1 WHERE table_name=?", (tables[0],))
        connection.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES (1)")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "check", "status", "backup", "activate"])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--table")
    args = parser.parse_args()
    path = database_path().resolve()
    connection = connect(path, args.command=="init")
    try:
        if args.command=="init":
            initialize(connection)
        elif args.command=="backup":
            if not args.output:
                parser.error("backup exige --output")
            output = args.output.resolve()
            if output.exists():
                raise FileExistsError("O destino já existe; backup não sobrescreve arquivos.")
            output.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(output) as destination:
                connection.backup(destination)
        elif args.command=="activate":
            if not args.table:
                parser.error("activate exige --table")
            if not connection.execute("SELECT 1 FROM dataset_catalog WHERE table_name=?",(args.table,)).fetchone():
                raise ValueError("Dataset não cadastrado.")
            with connection:
                connection.execute("UPDATE dataset_catalog SET active=0 WHERE active=1")
                connection.execute("UPDATE dataset_catalog SET active=1 WHERE table_name=?",(args.table,))
        integrity = [r[0] for r in connection.execute("PRAGMA integrity_check")]
        foreign_keys = list(connection.execute("PRAGMA foreign_key_check"))
        if integrity != ["ok"] or foreign_keys:
            raise ValueError(f"Falha de integridade: {integrity}, {foreign_keys}")
        tables = []
        for (name,) in connection.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
            quoted = '"' + name.replace('"','""') + '"'
            tables.append({"name":name,"rows":connection.execute(f"SELECT COUNT(*) FROM {quoted}").fetchone()[0]})
        print(json.dumps({"path":str(path),"integrity":integrity,"journal_mode":connection.execute("PRAGMA journal_mode").fetchone()[0],"tables":tables},ensure_ascii=False))
    finally:
        connection.close()

if __name__ == "__main__":
    try:
        main()
    except (OSError, sqlite3.Error, ValueError) as error:
        raise SystemExit(str(error)) from error