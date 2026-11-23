"""Exportacao: PNG em alta (impressao, com e sem grade) e JPG leve para o site + indice mapas/index.json."""
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

from PIL import Image

from .render import Mapa
from .spec import validar

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / "mapas"
HD = RAIZ / "mapas-hd"


def slug(nome):
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "mapa"


def _web(im, largura=2000, qualidade=86):
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.Resampling.LANCZOS)
    return im


def gerar(spec_bruto, px=None, preview=False, site=True, log=print):
    """Valida, desenha todas as fases e grava os arquivos. Devolve dict com caminhos."""
    spec = validar(spec_bruto)
    for a in spec.pop("_avisos", []):
        log(f"  aviso: {a}")
    nome = slug(spec["nome"])
    if preview:
        px = px or 40
    mapa = Mapa(spec, px)
    hd_dir = HD / nome
    hd_dir.mkdir(parents=True, exist_ok=True)
    fases_out, arquivos = [], []
    grade = None
    for f in spec["fases"]:
        log(f"  desenhando fase \"{f['id']}\"" + (f" ({f['nome']})" if f.get("nome") else "") + "...")
        im = mapa.render(f["id"])
        if preview:
            p = hd_dir / f"preview_{f['id']}.jpg"
            im.save(p, quality=88)
            arquivos.append(p)
            continue
        base = f"{nome}_{f['id']}"
        p1 = hd_dir / f"{base}_sem_grade.png"
        im.save(p1, dpi=mapa.dpi())
        grade = grade or mapa.grade()
        p2 = hd_dir / f"{base}_com_grade.png"
        Image.alpha_composite(im.convert("RGBA"), grade).convert("RGB").save(p2, dpi=mapa.dpi())
        arquivos += [p1, p2]
        fases_out.append({"id": f["id"], "nome": f.get("nome") or f["id"], "_im": im})
    if preview:
        return {"slug": nome, "arquivos": arquivos}

    if site:
        pasta = SITE / nome
        pasta.mkdir(parents=True, exist_ok=True)
        meta = []
        for f in fases_out:
            _web(f["_im"]).save(pasta / f"{f['id']}.jpg", quality=86, optimize=True)
            meta.append({"id": f["id"], "nome": f["nome"], "imagem": f"mapas/{nome}/{f['id']}.jpg"})
        th = fases_out[0]["_im"]
        th.resize((640, round(th.height * 640 / th.width)), Image.Resampling.LANCZOS).save(pasta / "thumb.jpg", quality=80)
        (pasta / "spec.json").write_text(json.dumps({k: v for k, v in spec.items() if k != "_avisos"}, ensure_ascii=False, indent=2), encoding="utf-8")
        idx_path = SITE / "index.json"
        idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"mapas": []}
        entrada = {
            "id": nome, "nome": spec["nome"], "descricao": spec.get("descricao", ""), "grade": spec["grade"],
            "cm_por_quadrado": spec["cm_por_quadrado"], "fases": meta, "thumb": f"mapas/{nome}/thumb.jpg",
            "spec": f"mapas/{nome}/spec.json", "criado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        idx["mapas"] = [m for m in idx["mapas"] if m["id"] != nome] + [entrada]
        idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
        log(f"  site: {pasta}")
    for f in fases_out:
        f.pop("_im", None)
    return {"slug": nome, "arquivos": arquivos}
