"""CLI:  python -m mapa gerar <arquivo.json | -> [--area-transferencia] [--preview] [--px N] [--sem-site]
       python -m mapa validar <arquivo.json | ->
       python -m mapa catalogo [--salvar]"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from . import catalogo
from .spec import SpecErro, extrair, validar


def _ler(args):
    if args.area_transferencia:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Clipboard -Raw"],
                           capture_output=True, text=True, encoding="utf-8")
        return r.stdout
    if args.arquivo in (None, "-"):
        return sys.stdin.read()
    return Path(args.arquivo).read_text(encoding="utf-8-sig")


def _specs(texto):
    achados = extrair(texto)
    if not achados:
        try:
            o = json.loads(texto)
            if isinstance(o, dict):
                achados = [o]
        except json.JSONDecodeError:
            pass
    return achados


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(prog="mapa", description="Gerador de battlemaps de Daggerheart")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for nome in ("gerar", "validar"):
        p = sub.add_parser(nome)
        p.add_argument("arquivo", nargs="?")
        p.add_argument("--area-transferencia", action="store_true", help="le o JSON da area de transferencia (pode colar a resposta inteira da IA)")
        if nome == "gerar":
            p.add_argument("--preview", action="store_true", help="resolucao baixa, so para conferir o layout")
            p.add_argument("--px", type=int, help="pixels por quadrado (padrao: o do JSON, normalmente 100)")
            p.add_argument("--sem-site", action="store_true", help="nao grava em mapas/ (so a versao de impressao)")
    c = sub.add_parser("catalogo")
    c.add_argument("--salvar", action="store_true", help="grava catalogo-mapas.md na raiz do projeto")
    args = ap.parse_args()

    if args.cmd == "catalogo":
        md = catalogo.markdown()
        if args.salvar:
            dest = Path(__file__).resolve().parent.parent / "catalogo-mapas.md"
            dest.write_text(md, encoding="utf-8")
            print("gravado:", dest)
        else:
            print(md)
        return 0

    specs = _specs(_ler(args))
    if not specs:
        print("Nao achei nenhum JSON com \"formato\": \"daggerheart-mapa\".")
        return 2
    codigo = 0
    for bruto in specs:
        titulo = bruto.get("nome", "(sem nome)") if isinstance(bruto, dict) else "(invalido)"
        print(f"Mapa: {titulo}")
        try:
            if args.cmd == "validar":
                s = validar(bruto)
                for a in s.get("_avisos", []):
                    print("  aviso:", a)
                print("  ok")
                continue
            from .saida import gerar
            t = time.time()
            r = gerar(bruto, px=args.px, preview=args.preview, site=not args.sem_site)
            print(f"  pronto em {time.time() - t:.0f}s:")
            for a in r["arquivos"]:
                print("   ", a)
        except SpecErro as e:
            codigo = 1
            print(f"  {len(e.erros)} problema(s) no JSON:")
            for m in e.erros:
                print("   -", m)
    return codigo


sys.exit(main())
