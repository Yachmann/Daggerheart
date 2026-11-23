@echo off
rem Gerar mapa: copie a resposta inteira da IA e de dois cliques neste arquivo.
rem Le o JSON da area de transferencia, valida e desenha (leva de 15 s a 1 min). Resultado em mapas/ (site) e mapas-hd/ (impressao).
cd /d "%~dp0"
python -m mapa gerar --area-transferencia %*
echo.
pause
