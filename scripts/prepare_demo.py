"""Create an isolated, explicitly labelled demo dataset; never delete real data."""
import argparse
import json
import sys
from pathlib import Path
from openpyxl import Workbook
sys.path.insert(0, str(Path(__file__).resolve().parent))
from manage_sqlite import ROOT, database_path, connect, initialize

TABLE = "import_demonstracao"
HEADERS = ["Data", "Turno", "Ordem", "Linha", "Chave da parada", "Equipamento", "Material", "Minutos de parada", "Observações", "Origem"]
COLUMNS = ["data", "turno", "ordem", "linha", "chave_da_parada", "equipamento", "material", "minutos_de_parada", "observacoes", "origem"]
MACHINES = ["Enchedora", "Rotuladora", "Empacotadora", "Transportador", "Paletizadora", "Lavadora"]
CAUSES = ["Falha de enchimento", "Enrosco de rótulos", "Enrosco de pacotes", "Falha de correia", "Falha de formação de camada", "Falha de bomba"]

def records(count, offset=0):
    rows = []
    for i in range(offset, offset+count):
        machine = i % 6
        minutes = [42, 18, 27, 9, 55, 14][machine] + (i//6)*3
        rows.append([f"2026-10-{1+i%7:02d} 08:00:00", "A" if i%2==0 else "B", f"DEMO-{i+1:04d}", f"DEMO Linha {1+machine%2}", f"DEMO {MACHINES[machine]}", f"DEMO {MACHINES[machine]}", "DEMO PET 2L", minutes, CAUSES[machine], "DADOS DE DEMONSTRAÇÃO — fictícios"])
    return rows

def excel(path, rows):
    if path.exists():
        return
    workbook = Workbook()
    workbook.remove(workbook.active)
    for line in (1,2):
        sheet = workbook.create_sheet(f"DEMO Linha {line}")
        sheet.append(HEADERS)
        for row in rows:
            if row[3] == f"DEMO Linha {line}":
                sheet.append(row)
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
    workbook.save(path)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--activate", action="store_true", help="Seleciona explicitamente o dataset demonstrativo, sem excluir o anterior.")
    args = parser.parse_args()
    connection = connect(database_path(), create=True)
    try:
        initialize(connection)
        with connection:
            connection.execute('CREATE TABLE IF NOT EXISTS import_demonstracao (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, '+', '.join('"'+c+'" TEXT' for c in COLUMNS)+')')
            connection.execute("INSERT OR IGNORE INTO dataset_catalog(table_name) VALUES (?)",(TABLE,))
            count = connection.execute("SELECT COUNT(*) FROM import_demonstracao").fetchone()[0]
            if count == 0:
                connection.executemany('INSERT INTO import_demonstracao ('+','.join(COLUMNS)+') VALUES ('+','.join('?' for _ in COLUMNS)+')', records(36))
            if args.activate:
                connection.execute("UPDATE dataset_catalog SET active=0 WHERE active=1")
                connection.execute("UPDATE dataset_catalog SET active=1 WHERE table_name=?",(TABLE,))
        directory = ROOT / "demonstracao"
        directory.mkdir(exist_ok=True)
        excel(directory / "DADOS_DE_DEMONSTRACAO.xlsx", records(36))
        excel(directory / "IMPORTAR_DEMONSTRACAO.xlsx", records(6,36))
        print(json.dumps({"dataset":TABLE,"rows":connection.execute("SELECT COUNT(*) FROM import_demonstracao").fetchone()[0],"minutes":connection.execute("SELECT SUM(CAST(minutos_de_parada AS INTEGER)) FROM import_demonstracao").fetchone()[0],"active":bool(args.activate)},ensure_ascii=False))
    finally:
        connection.close()

if __name__ == "__main__":
    main()
