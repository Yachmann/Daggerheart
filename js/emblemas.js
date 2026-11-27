// Emblemas das classes (SVG de traço, viewBox 64x64). A cor e o tamanho vêm do CSS (.emblema em css/temas-classe.css).
const G = {
  Bard: `<ellipse cx="22" cy="46" rx="10" ry="7.5"/><path d="M31 46V12M31 12c14 3 16 17 14 24-3-8-8-11-14-12"/>`,
  Druid: `<path d="M9 55C9 28 26 9 55 9c0 29-18 46-46 46z"/><path d="M9 55 41 23M24 40h-9M32 32h-2l1-9M40 24l-1-9"/>`,
  Guardian: `<path d="M32 6l22 8v18c0 14-10 22-22 26C20 54 10 46 10 32V14z"/><path d="M32 18v32M20 28h24"/>`,
  Ranger: `<path d="M32 6l15 23h-8l12 18H13l12-18h-8z"/><path d="M32 47v11"/>`,
  Rogue: `<path d="M32 5l6 33H26z"/><path d="M19 38h26M32 38v16"/><circle cx="32" cy="58" r="3"/>`,
  Seraph: `<ellipse cx="32" cy="12" rx="12" ry="5"/><path d="M29 24C17 20 7 26 5 40c9-4 15-2 20 5-2-8 0-15 4-21z"/><path d="M29 24C17 20 7 26 5 40c9-4 15-2 20 5-2-8 0-15 4-21z" transform="matrix(-1 0 0 1 64 0)"/>`,
  Sorcerer: `<path d="M32 4l6 22 22 6-22 6-6 22-6-22-22-6 22-6z"/><circle cx="32" cy="32" r="4"/>`,
  Warrior: `<path d="M12 12l36 36M38 54l16-16M48 48l7 7"/><path d="M52 12L16 48M26 54L10 38M16 48l-7 7"/>`,
  Wizard: `<path d="M32 5l17 41H15z"/><path d="M7 51h50M24 34h16"/><path d="M32 16l2 5 5 .5-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3 5-.5z"/>`,
  // Expansão Hope & Fear
  Assassin: `<path d="M32 4c-10 10-14 22-14 30l14 8 14-8c0-8-4-20-14-30z"/><path d="M32 42v18M24 52h16"/>`,
  Brawler: `<path d="M16 30V18a5 5 0 0110 0v-2a5 5 0 0110 0v2a5 5 0 0110 0v14c0 12-6 20-16 20S16 44 16 32"/><path d="M20 54h24"/>`,
  Warlock: `<path d="M32 6c-14 0-22 10-22 22 0 8 4 13 8 16v10h28V44c4-3 8-8 8-16C54 16 46 6 32 6z"/><circle cx="24" cy="28" r="4"/><circle cx="40" cy="28" r="4"/><path d="M28 44v6M36 44v6"/>`,
  Witch: `<path d="M8 50h48"/><path d="M16 50c0-12 6-22 16-34 10 12 16 22 16 34"/><path d="M26 34l12 4M24 42l16 2"/><path d="M32 8l4 6"/>`,
};
export const emblema = id => G[id] ? `<svg class="emblema" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${G[id]}</svg>` : "";
