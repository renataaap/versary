"""Create a new self-contained Windows x64 demo copy, without local secrets."""
from pathlib import Path
import os
import shutil
import sqlite3

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "entrega" / "Versary_DEMO"

def main():
    if DEST.exists():
        raise FileExistsError("A entrega já existe; não será sobrescrita.")
    DEST.mkdir(parents=True)
    files = ["src", "public", "scripts", "node_modules", ".next", ".runtime", "demonstracao", "package.json", "package-lock.json", "next.config.mjs", "tsconfig.json", "eslint.config.mjs", "postcss.config.mjs", "next-env.d.ts", "README.md", "DEMONSTRACAO.md", "INICIAR_VERSARY.bat", "CONFIGURAR_VERSARY.bat", ".env.example"]
    for name in files:
        source = ROOT / name
        if source.is_dir():
            ignore = shutil.ignore_patterns("dev", "cache", "__pycache__", "*.tsbuildinfo", "*test.cjs", "python-sqlite-tools*") if name == ".next" else shutil.ignore_patterns("__pycache__")
            shutil.copytree(source, DEST / name, ignore=ignore)
        elif source.exists():
            shutil.copy2(source, DEST / name)
    (DEST / ".env.local").write_text("SQLITE_PATH=data/versary.sqlite\n",encoding="utf-8")
    source = ROOT / ".venv" / "Scripts"
    target = DEST / ".venv" / "Scripts"
    target.mkdir(parents=True)
    for file in source.iterdir():
        if file.is_file() and file.suffix in {".exe", ".dll", ".pyd", ".zip", "._pth", ".txt"}:
            shutil.copy2(file, target / file.name)
    site = target / "Lib" / "site-packages"
    site.mkdir(parents=True)
    for module in ["openpyxl", "xlrd", "et_xmlfile"]:
        shutil.copytree(source / "Lib" / "site-packages" / module, site / module, ignore=shutil.ignore_patterns("__pycache__"))
    database = DEST / "data" / "versary.sqlite"
    database.parent.mkdir()
    with sqlite3.connect(ROOT / "data" / "versary.sqlite") as original, sqlite3.connect(database) as backup:
        original.backup(backup)
    print(f"Entrega criada: {DEST}")

if __name__ == "__main__":
    main()