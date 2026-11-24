"""O 'traco' dos mapas: paletas, biomas e climas. Tudo que e cor/estilo mora aqui, nao no JSON da IA."""

# a, b: rampa de cor do ruido grande; p: manchas; pk: forca das manchas; g: granulacao
MATERIAIS = {
    "grama": dict(a=(52, 78, 44), b=(100, 128, 64), p=(118, 98, 66), pk=0.45, g=40),
    "terra": dict(a=(122, 100, 70), b=(158, 132, 94), p=(96, 80, 56), pk=0.25, g=30),
    "areia": dict(a=(206, 176, 112), b=(234, 208, 150), p=(190, 150, 96), pk=0.30, g=26),
    "neve": dict(a=(210, 220, 234), b=(248, 251, 255), p=(172, 192, 220), pk=0.35, g=14),
    "lama": dict(a=(70, 58, 40), b=(108, 92, 60), p=(44, 50, 34), pk=0.50, g=26),
    "cascalho": dict(a=(128, 122, 112), b=(170, 162, 150), p=(98, 92, 84), pk=0.35, g=46),
    "musgo": dict(a=(40, 62, 36), b=(80, 110, 50), p=(28, 42, 26), pk=0.50, g=30),
    "cinzas": dict(a=(52, 50, 50), b=(90, 86, 84), p=(28, 26, 26), pk=0.40, g=24),
    "gelo": dict(a=(170, 204, 224), b=(226, 243, 252), p=(126, 172, 204), pk=0.40, g=16),
}
# materiais com textura propria (nao usam a rampa acima)
MATERIAIS_ESPECIAIS = ["pedra", "madeira", "marmore", "agua", "abismo", "lava"]
TODOS_MATERIAIS = list(MATERIAIS) + MATERIAIS_ESPECIAIS

BIOMAS = {
    "floresta": dict(chao=dict(a=(46, 72, 40), b=(92, 122, 60), p=(110, 92, 62), pk=0.40, g=40), clima="dia",
                     parede=(100, 96, 90), lajes=(104, 150), copa=((28, 56, 32), (92, 128, 60)), arbusto=((34, 62, 34), (100, 134, 64))),
    "planicie": dict(chao=dict(a=(80, 112, 54), b=(132, 160, 82), p=(138, 118, 76), pk=0.35, g=36), clima="dia",
                     parede=(120, 114, 106), lajes=(110, 156), copa=((40, 78, 38), (118, 158, 72)), arbusto=((52, 88, 40), (126, 160, 76))),
    "deserto": dict(chao=dict(a=(206, 176, 112), b=(234, 208, 150), p=(190, 150, 96), pk=0.30, g=26), clima="dia",
                    parede=(164, 138, 104), lajes=(150, 190), copa=((72, 84, 40), (140, 150, 78)), arbusto=((84, 92, 44), (150, 156, 84))),
    "neve": dict(chao=dict(a=(214, 224, 238), b=(250, 252, 255), p=(172, 192, 220), pk=0.35, g=12), clima="dia",
                 parede=(120, 124, 132), lajes=(120, 170), copa=((26, 58, 52), (84, 124, 110)), arbusto=((40, 72, 62), (100, 138, 120))),
    "pantano": dict(chao=dict(a=(52, 66, 40), b=(88, 104, 58), p=(60, 48, 32), pk=0.55, g=34), clima="entardecer",
                    parede=(88, 86, 78), lajes=(90, 130), copa=((30, 50, 30), (82, 106, 56)), arbusto=((38, 56, 30), (92, 112, 58))),
    "caverna": dict(chao=dict(a=(44, 40, 40), b=(84, 78, 74), p=(30, 28, 32), pk=0.40, g=30), clima="subterraneo",
                    parede=(74, 70, 68), lajes=(80, 120), copa=((28, 56, 32), (92, 128, 60)), arbusto=((34, 62, 34), (100, 134, 64))),
    "masmorra": dict(chao=dict(a=(24, 24, 30), b=(46, 46, 54), p=(16, 16, 22), pk=0.40, g=16), clima="subterraneo",
                     parede=(78, 80, 92), lajes=(70, 112), copa=((28, 56, 32), (92, 128, 60)), arbusto=((34, 62, 34), (100, 134, 64))),
    "cidade": dict(chao=dict(a=(116, 100, 78), b=(156, 138, 106), p=(100, 86, 64), pk=0.30, g=24), clima="dia",
                   parede=(158, 142, 118), lajes=(130, 176), copa=((40, 78, 38), (118, 158, 72)), arbusto=((52, 88, 40), (126, 160, 76))),
    "vulcanico": dict(chao=dict(a=(40, 34, 34), b=(80, 68, 62), p=(24, 20, 20), pk=0.45, g=26), clima="entardecer",
                      parede=(72, 62, 60), lajes=(60, 104), copa=((44, 38, 28), (100, 88, 54)), arbusto=((48, 42, 30), (104, 90, 56))),
}

# tint multiplica a cor final; escuridao (0..1) escurece o que nao esta perto de uma fonte de luz
CLIMAS = {
    "dia": dict(tint=(1.0, 1.0, 1.0), escuridao=0.0),
    "entardecer": dict(tint=(1.0, 0.90, 0.78), escuridao=0.10),
    "noite": dict(tint=(0.58, 0.66, 0.92), escuridao=0.40),
    "subterraneo": dict(tint=(0.90, 0.92, 1.0), escuridao=0.45),
}

PISO_PADRAO = {"masmorra": "pedra", "caverna": "pedra", "cidade": "madeira", "vulcanico": "pedra"}

# cores de 'forma' livre: (claro, escuro)
FORMAS = {
    "pedra": (122, 118, 112), "madeira": (118, 82, 50), "metal": (96, 100, 108),
    "tecido": (168, 36, 36), "terra": (126, 102, 72),
}

# pisos aceitos em sala (superficies que fazem sentido como piso interno)
PISOS = ["pedra", "madeira", "marmore", "terra", "areia", "grama", "lama", "neve", "cascalho", "musgo", "cinzas", "gelo"]
