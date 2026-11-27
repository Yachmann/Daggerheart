// Ilustrações das Formas Bestiais (SVG de traço, viewBox 96x96). Cor e tamanho vêm do CSS (currentColor).
// Estilo igual ao de emblemas.js: sem preenchimento sólido, só uma forma de fundo translúcida por ilustração.
const BG = `fill="currentColor" opacity=".18" stroke="none"`;
const DOT = `fill="currentColor" stroke="none"`;
const MIR = d => `<g transform="matrix(-1 0 0 1 96 0)">${d}</g>`;

// Juba/folhagem recortada: n lóbulos em volta de (cx,cy) com raio r.
const lobos = (cx, cy, r, n, k = 1) => {
  const pt = i => { const a = (2 * Math.PI * i) / n - Math.PI / 2; return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]; };
  const ch = 2 * r * Math.sin(Math.PI / n) * 0.62 * k;
  let d = `M${pt(0).join(" ")}`;
  for (let i = 1; i <= n; i++) d += `A${ch.toFixed(1)} ${ch.toFixed(1)} 0 0 1 ${pt(i % n).join(" ")}`;
  return d + "z";
};

// Tubo (corpo de serpente/cauda): contorno de espessura constante via máscara (id único por ilustração).
const tubo = (id, d, w = 13) =>
  `<mask id="ilu-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><rect width="96" height="96" fill="#fff"/><path d="${d}" stroke="#000" stroke-width="${w - 6.4}" fill="none"/></mask>` +
  `<path d="${d}" stroke-width="${w}" mask="url(#ilu-${id})"/>`;

const pata = (y = 0, s = 1) => {
  const t = `transform="translate(${(48 * (1 - s)).toFixed(1)} ${(y + 48 * (1 - s)).toFixed(1)}) scale(${s})"`;
  return `<g ${t}><path d="M34 70c0-9 6-14 14-14s14 5 14 14c0 8-6 12-14 12s-14-4-14-12z" ${BG}/>` +
    `<path d="M34 70c0-9 6-14 14-14s14 5 14 14c0 8-6 12-14 12s-14-4-14-12z"/>` +
    `<ellipse cx="22" cy="56" rx="6" ry="8" transform="rotate(-24 22 56)"/><ellipse cx="36" cy="40" rx="6" ry="8.5" transform="rotate(-8 36 40)"/>` +
    `<ellipse cx="60" cy="40" rx="6" ry="8.5" transform="rotate(8 60 40)"/><ellipse cx="74" cy="56" rx="6" ry="8" transform="rotate(24 74 56)"/></g>`;
};
const I = {
  "Agile Scout": // raposa
    `<path d="M48 84C22 70 10 54 12 30l6-20 20 18c6-2 14-2 20 0L78 10l6 20c2 24-10 40-36 54z" ${BG}/>` +
    `<path d="M48 84C22 70 10 54 12 30l6-20 20 18c6-2 14-2 20 0L78 10l6 20c2 24-10 40-36 54z"/>` +
    `<path d="M20 20l8 10M76 20l-8 10"/><path d="M30 44l10 5M66 44l-10 5"/><path d="M26 56l-8 4 6 4M70 56l8 4-6 4"/><path d="M34 64c6 6 22 6 28 0"/>` +
    `<path d="M44 74h8l-4 6z" ${DOT}/><path d="M48 62v12"/>`,

  "Household Friend": // gato
    `<path d="M16 8l20 20q12-4 24 0L80 8l4 36c2 24-12 38-36 38S10 68 12 44z" ${BG}/>` +
    `<path d="M16 8l20 20q12-4 24 0L80 8l4 36c2 24-12 38-36 38S10 68 12 44z"/>` +
    `<ellipse cx="34" cy="48" rx="5" ry="6.5"/><ellipse cx="62" cy="48" rx="5" ry="6.5"/>` +
    `<path d="M33 46v4M63 46v4"/><path d="M44 60h8l-4 5z" ${DOT}/><path d="M48 65v4q-5 5-10 1M48 69q5 5 10 1"/>` +
    `<path d="M4 54l16 3M4 66l16-3M92 54l-16 3M92 66l-16-3"/>`,

  "Nimble Grazer": // cervo
    `<path d="M34 42q14-5 28 0l-3 26q-11 14-22 0z" ${BG}/>` +
    `<path d="M34 42q14-5 28 0l-3 26q-11 14-22 0z"/>` +
    `<path d="M35 44l-17-6 5 14 12 2M61 44l17-6-5 14-12 2"/>` +
    `<path d="M37 42C33 30 30 20 24 8M30 24l-14-3M33 31l-12 2M27 14l8-4M25 12l-6-2"/>` +
    MIR(`<path d="M37 42C33 30 30 20 24 8M30 24l-14-3M33 31l-12 2M27 14l8-4M25 12l-6-2"/>`) +
    `<circle cx="40" cy="54" r="2" ${DOT}/><circle cx="56" cy="54" r="2" ${DOT}/><path d="M45 74h6l-3 4z" ${DOT}/>`,

  "Pack Predator": // lobo uivando
    `<path d="M22 90C20 70 24 56 32 46L30 20 46 34C60 28 72 16 86 6L90 12 64 38 88 26 90 32C80 42 68 48 62 54C56 60 52 70 56 90z" ${BG}/>` +
    `<path d="M22 90C20 70 24 56 32 46L30 20 46 34C60 28 72 16 86 6L90 12 64 38 88 26 90 32C80 42 68 48 62 54C56 60 52 70 56 90"/>` +
    `<path d="M56 62l-8 2 8 6-8 4"/><path d="M48 40l6 3"/><path d="M38 28l2 8"/><circle cx="87" cy="10" r="0.01"/>`,

  "Aquatic Scout": // peixe
    `<path d="M10 48Q34 22 62 40l22-14v44L62 56Q34 74 10 48z" ${BG}/>` +
    `<path d="M10 48Q34 22 62 40l22-14v44L62 56Q34 74 10 48z"/>` +
    `<path d="M36 33l6-10 10 12M38 63l6 8 8-9"/><path d="M44 36q-8 12 0 24"/><circle cx="24" cy="46" r="2.4" ${DOT}/>` +
    `<path d="M56 42q4 6 0 12M66 42q4 6 0 12" />`,

  "Stalking Arachnid": // aranha
    `<ellipse cx="48" cy="60" rx="14" ry="18" ${BG}/>` +
    `<ellipse cx="48" cy="60" rx="14" ry="18"/><ellipse cx="48" cy="34" rx="9" ry="9"/>` +
    `<path d="M40 30l-4-8M56 30l4-8"/>` +
    `<path d="M40 32Q26 14 10 18M39 38Q20 30 6 44M36 52Q22 50 8 68M40 66Q30 76 24 88"/>` +
    MIR(`<path d="M40 32Q26 14 10 18M39 38Q20 30 6 44M36 52Q22 50 8 68M40 66Q30 76 24 88"/>`) +
    `<path d="M48 50v20M42 56l6 6 6-6" />`,

  "Armored Sentry": // tatu
    `<path d="M14 66Q14 28 52 26Q86 28 86 66z" ${BG}/>` +
    `<path d="M14 66Q14 28 52 26Q86 28 86 66z"/>` +
    `<path d="M32 30Q27 48 28 66M46 27Q43 46 44 66M60 27Q60 46 62 66M74 32Q76 48 76 66"/>` +
    `<path d="M14 66l-8-6 6-12 14-12"/><path d="M14 66l8 6M36 66v14M66 66v14M30 80h12M60 80h12"/>` +
    `<path d="M86 62q8 4 6 14" /><circle cx="12" cy="57" r="2" ${DOT}/>`,

  "Powerful Beast": // urso
    `<circle cx="22" cy="24" r="12" ${BG}/>` +
    `<circle cx="22" cy="24" r="12"/><circle cx="74" cy="24" r="12"/>` +
    `<path d="M24 28M16 52Q14 24 48 22Q82 24 80 52Q82 82 48 84Q14 82 16 52z" />` +
    `<path d="M14 22M28 24a4 4 0 0 1 0 0"/>` +
    `<ellipse cx="48" cy="64" rx="15" ry="12"/><path d="M42 58h12l-6 7z" ${DOT}/><path d="M48 65v6q-5 3-9 0M48 71q5 3 9 0"/>` +
    `<circle cx="34" cy="46" r="3" ${DOT}/><circle cx="62" cy="46" r="3" ${DOT}/>`,

  "Mighty Strider": // cavalo
    `<path d="M66 8l-6 16Q42 28 28 50Q16 60 22 74Q28 82 38 76l6-8Q58 68 66 56Q72 74 68 88h16Q90 64 82 40Q76 20 66 8z" ${BG}/>` +
    `<path d="M66 8l-6 16Q42 28 28 50Q16 60 22 74Q28 82 38 76l6-8Q58 68 66 56Q72 74 68 88h16Q90 64 82 40Q76 20 66 8z"/>` +
    `<path d="M66 8Q80 12 74 22Q88 22 78 34Q92 38 80 46Q90 54 80 62"/>` +
    `<circle cx="50" cy="40" r="2.4" ${DOT}/><path d="M24 70l5-2M44 34Q54 36 60 30" />`,

  "Striking Serpent": // serpente
    tubo("serp", "M12 82C30 94 76 92 78 72C80 54 32 62 30 42C28 28 44 24 52 24", 12) +
    `<path d="M46 32Q44 16 58 12Q74 10 82 20Q72 32 56 32z" ${BG}/><path d="M46 32Q44 16 58 12Q74 10 82 20Q72 32 56 32z"/>` +
    `<path d="M82 20l8-2M86 19l4 5"/><circle cx="62" cy="19" r="2.2" ${DOT}/><path d="M60 32l-1 6M70 31l1 6"/>`,

  "Pouncing Predator": // felino saltando
    `<path d="M22 44Q40 36 58 36L66 32 70 22 76 32Q84 32 92 40L84 48Q76 50 68 50L86 68 80 74 56 60Q44 58 32 58L16 72 8 66 22 52z" ${BG}/>` +
    `<path d="M22 44Q40 36 58 36L66 32 70 22 76 32Q84 32 92 40L84 48Q76 50 68 50L86 68 80 74 56 60Q44 58 32 58L16 72 8 66 22 52z"/>` +
    `<path d="M22 44Q8 40 8 24Q12 16 20 20"/><circle cx="80" cy="38" r="1.8" ${DOT}/><path d="M84 44l-4 2M12 70l-4 4M18 72l-2 6"/>`,

  "Winged Beast": // morcego
    `<path d="M48 40Q72 16 92 24Q86 34 86 44Q78 40 74 52Q66 44 60 60Q56 52 48 58Q40 52 36 60Q30 44 22 52Q18 40 10 44Q10 34 4 24Q24 16 48 40z" ${BG}/>` +
    `<path d="M44 36Q22 16 4 24Q10 34 10 44Q18 40 22 52Q30 44 36 60Q40 52 46 56"/>` +
    MIR(`<path d="M44 36Q22 16 4 24Q10 34 10 44Q18 40 22 52Q30 44 36 60Q40 52 46 56"/>`) +
    `<ellipse cx="48" cy="54" rx="6" ry="12"/><circle cx="48" cy="34" r="8"/><path d="M42 29l-3-9 8 4M54 29l3-9-8 4"/>` +
    `<circle cx="45" cy="34" r="1.5" ${DOT}/><circle cx="51" cy="34" r="1.5" ${DOT}/>`,

  "Great Predator": // leão
    `<path d="${lobos(48, 48, 40, 12)}" ${BG}/>` +
    `<path d="${lobos(48, 48, 40, 12)}"/>` +
    `<path d="M30 40Q30 28 48 28Q66 28 66 40Q68 64 48 72Q28 64 30 40z"/>` +
    `<circle cx="29" cy="30" r="0.01"/><path d="M33 36l-4-8M63 36l4-8"/>` +
    `<circle cx="40" cy="46" r="2.4" ${DOT}/><circle cx="56" cy="46" r="2.4" ${DOT}/><path d="M43 54h10l-5 6z" ${DOT}/><path d="M48 60v5q-5 4-9 0M48 65q5 4 9 0"/><path d="M40 46l-6-5M56 46l6-5"/>`,

  "Mighty Lizard": // lagarto
    `<ellipse cx="48" cy="46" rx="14" ry="20" ${BG}/>` +
    `<ellipse cx="48" cy="46" rx="14" ry="20"/>` +
    `<path d="M48 6Q60 10 58 22Q56 30 48 32Q40 30 38 22Q36 10 48 6z"/><circle cx="43" cy="16" r="1.8" ${DOT}/><circle cx="53" cy="16" r="1.8" ${DOT}/>` +
    `<path d="M36 38L22 32L14 40M22 32L16 26M14 40L8 42M14 40L10 34"/><path d="M36 56L22 62L14 54M22 62L16 70M14 54L8 52M14 54L10 60"/>` +
    MIR(`<path d="M36 38L22 32L14 40M22 32L16 26M14 40L8 42M14 40L10 34"/><path d="M36 56L22 62L14 54M22 62L16 70M14 54L8 52M14 54L10 60"/>`) +
    `<path d="M40 64Q38 82 62 92Q48 78 56 64"/><path d="M48 34v26M42 42l6 4 6-4M42 54l6 4 6-4"/>`,

  "Great Winged Beast": // coruja
    `<path d="M20 20l12 8q16-6 32 0l12-8 4 38Q80 86 48 88Q16 86 16 58z" ${BG}/>` +
    `<path d="M20 20l12 8q16-6 32 0l12-8 4 38Q80 86 48 88Q16 86 16 58z"/>` +
    `<circle cx="34" cy="44" r="11"/><circle cx="62" cy="44" r="11"/><circle cx="34" cy="44" r="3.4" ${DOT}/><circle cx="62" cy="44" r="3.4" ${DOT}/>` +
    `<path d="M44 52h8l-4 12z"/><path d="M34 68l6 4 8-4 8 4 6-4M38 78l5 3 5-3 5 3 5-3"/>`,

  "Aquatic Predator": // tubarão
    `<path d="M6 58Q26 42 56 46Q66 48 74 54L90 36Q86 54 90 72L72 60Q38 74 6 58z" ${BG}/>` +
    `<path d="M6 58Q26 42 56 46Q66 48 74 54L90 36Q86 54 90 72L72 60Q38 74 6 58z"/>` +
    `<path d="M44 45L54 24L62 48M40 66L32 82L50 68"/>` +
    `<path d="M10 60Q22 64 36 59"/><path d="M14 61l2 5 3-4 3 5 3-4 3 4M38 52q-3 4 0 8M44 51q-3 4 0 8"/><circle cx="22" cy="54" r="2" ${DOT}/>`,

  "Legendary Beast": // pata + coroa 3 + raios
    pata(18, 0.82) +
    `<path d="M32 30V12l8 8 8-12 8 12 8-8v18z" ${BG}/><path d="M32 30V12l8 8 8-12 8 12 8-8v18z"/>` +
    `<path d="M20 22l-8-8M18 32H8M76 22l8-8M78 32h10M48 2v0"/>`,

  "Legendary Hybrid": // grifo
    `<path d="M30 56Q36 46 56 48Q76 48 82 60Q82 72 72 74L38 74Q26 70 30 56z" ${BG}/>` +
    `<path d="M30 56Q36 46 56 48Q76 48 82 60Q82 72 72 74L38 74Q26 70 30 56z"/>` +
    `<circle cx="24" cy="30" r="12"/><path d="M13 27L2 33 12 39"/><circle cx="22" cy="28" r="2" ${DOT}/><path d="M22 19l-2-9 10 7"/>` +
    `<path d="M32 40Q38 44 38 52M20 42Q24 50 30 56M25 46l6 2"/>` +
    `<path d="M50 50Q46 22 70 8Q92 6 90 18Q92 30 82 34Q86 42 74 46Q70 52 62 54"/><path d="M62 28L80 22M58 38L82 32"/>` +
    `<path d="M34 74v8l-8 6h12M44 74v8l-6 6" /><path d="M68 74v14h10M80 68v20h10"/><path d="M82 62Q94 60 92 46M92 46l-6-4M92 46l3-8"/>`,

  "Massive Behemoth": // elefante
    `<path d="M34 24Q10 14 8 40Q10 62 30 62Q30 46 34 24zM62 24Q86 14 88 40Q86 62 66 62Q66 46 62 24z" ${BG}/>` +
    `<path d="M34 24Q10 14 8 40Q10 62 30 62M62 24Q86 14 88 40Q86 62 66 62"/>` +
    `<path d="M34 22Q48 14 62 22Q66 40 60 54Q56 62 54 78Q54 88 44 86Q40 78 44 66Q38 60 34 50Q30 36 34 22z"/>` +
    `<path d="M36 56Q22 62 20 78Q24 82 28 76M60 56Q74 62 76 78Q72 82 68 76"/><circle cx="40" cy="38" r="2" ${DOT}/><circle cx="56" cy="38" r="2" ${DOT}/><path d="M44 66h8"/>`,

  "Terrible Lizard": // dragão/dinossauro
    `<path d="M12 62Q10 30 40 26Q64 24 90 46L88 54L30 56z" ${BG}/>` +
    `<path d="M12 62Q10 30 40 26Q64 24 90 46L88 54l-4 6-4-6-4 6-4-6-4 6-4-6-4 6-4-6-4 6-4-6L30 56"/>` +
    `<path d="M24 62Q36 84 72 78L88 68M74 66l-3-6M64 68l-3-6M54 68l-3-6"/>` +
    `<path d="M30 28Q22 14 8 12M42 26Q38 12 32 6"/><path d="M12 62L6 70 14 72 8 82 18 80"/>` +
    `<path d="M42 38l10 4"/><circle cx="48" cy="40" r="2.2" ${DOT}/><circle cx="80" cy="44" r="1.6" ${DOT}/>`,

  "Mythic Aerial Hunter": // ave de rapina em mergulho
    `<path d="M48 88L42 66 36 40 12 12Q30 24 42 28L48 10 54 28Q66 24 84 12L60 40 54 66z" ${BG}/>` +
    `<path d="M48 88L42 66Q40 54 36 40L12 12Q30 24 42 28L48 10 54 28Q66 24 84 12L60 40Q56 54 54 66z"/>` +
    `<path d="M24 22l8 10M72 22l-8 10"/><path d="M42 66Q48 72 54 66"/><path d="M45 78l3 10 3-10" />` +
    `<path d="M44 46l4 10 4-10"/><circle cx="46" cy="30" r="1.4" ${DOT}/><circle cx="50" cy="30" r="1.4" ${DOT}/>`,

  "Epic Aquatic Beast": // cauda de leviatã emergindo
    `<path d="M48 62Q48 46 50 44Q38 46 22 24Q36 20 48 34Q60 20 74 24Q58 46 46 44z" ${BG}/>` +
    `<path d="M48 70Q46 50 48 38Q36 42 20 22Q36 18 48 32Q60 18 76 22Q60 42 48 38"/>` +
    `<path d="M8 66q10-8 20 0t20 0t20 0t20 0M8 80q10-8 20 0t20 0t20 0t20 0"/><path d="M20 12v0M72 10l4-4M80 18l6-2M16 14l-4-4"/>`,

  "Mythic Beast": // pata + coroa 5 + raios duplos
    pata(22, 0.78) +
    `<path d="M26 32V14l11 10 11-16 11 16 11-10v18z" ${BG}/><path d="M26 32V14l11 10 11-16 11 16 11-10v18z"/>` +
    `<path d="M14 24l-8-8M12 32H2M82 24l8-8M84 32h10M22 12l-4-8M74 12l4-8M12 40l-6 4M84 40l6 4"/>`,

  "Mythic Hybrid": // quimera
    `<path d="${lobos(48, 62, 20, 10)}" ${BG}/>` +
    `<path d="${lobos(48, 62, 20, 10)}"/>` +
    `<circle cx="48" cy="62" r="10"/><circle cx="44" cy="60" r="1.5" ${DOT}/><circle cx="52" cy="60" r="1.5" ${DOT}/><path d="M46 66h4l-2 3z" ${DOT}/>` +
    `<path d="M14 24Q18 14 28 18L30 32Q26 44 20 42Q10 34 14 24z" ${BG}/><path d="M14 24Q18 14 28 18L30 32Q26 44 20 42Q10 34 14 24z"/>` +
    `<path d="M16 19Q6 10 12 2M26 17Q26 6 34 4"/><path d="M20 42l-2 8"/><circle cx="23" cy="28" r="1.5" ${DOT}/>` +
    `<path d="M26 42Q30 54 40 62M18 44Q18 60 32 72"/>` +
    tubo("chi", "M62 64C80 62 82 50 72 44C64 38 72 30 76 28", 7) +
    `<path d="M70 28Q72 16 82 16Q90 18 88 26Q80 32 70 28z" ${BG}/><path d="M70 28Q72 16 82 16Q90 18 88 26Q80 32 70 28z"/><circle cx="80" cy="22" r="1.5" ${DOT}/><path d="M88 26l5 1"/>`,

};

export const ilustracao = (id, cls = "") =>
  `<svg class="ilu ${cls}" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${I[id] || pata(8, 1.1)}</svg>`;
