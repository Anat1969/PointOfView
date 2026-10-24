// ערכת פתיחה מקורית: דיוקנאות מאוירים שנוצרים מקוד (מילות הפתיחה נזרעו ב-Supabase)
import type { Face } from './types';

export const STARTER_FACE_COUNT = 60;


const EXPRESSIONS = ['שמחה', 'עצב', 'הפתעה', 'כעס', 'מחשבה', 'שלווה', 'צחוק', 'דאגה', 'חיוך עקום', 'עייפות'] as const;
type Expr = (typeof EXPRESSIONS)[number];

const SKIN = ['#f3d6c1', '#eac3a6', '#dcae8c', '#c99572', '#b47e5a', '#9c6845', '#835436', '#6b4129', '#f0cdb4', '#d5a07c'];
const HAIR = ['#1f1a17', '#3a2a20', '#5a3d2b', '#8a5a36', '#b88a5a', '#d8b98a', '#9a9590', '#e4e0da', '#2b2f3a', '#6b2f22'];
const CLOTH = ['#23466b', '#6f6658', '#3f3a33', '#5c6b5a', '#8a4b3c', '#2f3540', '#a08a6a', '#4a5f78', '#7a6f86', '#33424a'];
const BG: [string, string][] = [
  ['#e9e5df', '#bfb7ab'], ['#dfe5ea', '#9fb0c2'], ['#e6e1d8', '#a89a84'], ['#e2e6e1', '#a3b0a0'],
  ['#ece3df', '#c0a79c'], ['#dedde3', '#a5a3b3'], ['#e8e6e1', '#8f8a82'], ['#dde4e6', '#8ea3a8'],
];

function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickFrom = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export const starterExpr = (n: number): Expr => EXPRESSIONS[(n - 1) % EXPRESSIONS.length];

/** דיוקן מאויר בהבעה מוגדרת. n הוא מספר קבוע, ולכן אותו דיוקן חוזר תמיד */
export function faceSvg(n: number): string {
  const r = rng(n + 17);
  const expr = starterExpr(n);
  const skin = SKIN[(n * 7 + Math.floor(r() * 3)) % SKIN.length];
  const hair = pickFrom(r, HAIR);
  const cloth = pickFrom(r, CLOTH);
  const [bg1, bg2] = BG[n % BG.length];
  const hairStyle = Math.floor(r() * 7);
  const rx = 112 + r() * 26;
  const ry = 148 + r() * 22;
  const cx = 250;
  const cy = 318;
  const eyeY = cy - 10 + r() * 10;
  const eyeDX = 46 + r() * 10;
  const tilt = (r() - 0.5) * 8;
  const glasses = r() < 0.18;
  const beard = r() < 0.2;
  const freckles = r() < 0.15;
  const dark = shade(skin, -38);
  const line = '#2a221d';

  // גבות ועיניים לפי ההבעה
  const brow = (side: 1 | -1) => {
    const x = cx + side * eyeDX;
    const y = eyeY - 38;
    const inner = { שמחה: 2, עצב: -10, הפתעה: -12, כעס: 12, מחשבה: side === 1 ? -8 : 4, שלווה: 0, צחוק: -2, דאגה: -12, 'חיוך עקום': side === 1 ? -8 : 2, עייפות: 4 }[expr];
    const lift = expr === 'הפתעה' ? -12 : 0;
    return `<path d="M${x + side * 26} ${y + lift} Q${x} ${y - 8 + lift} ${x - side * 24} ${y + inner + lift}" stroke="${shade(hair, -10)}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  };
  const eye = (side: 1 | -1) => {
    const x = cx + side * eyeDX;
    if (expr === 'צחוק' || expr === 'שלווה') {
      const d = expr === 'צחוק' ? `M${x - 18} ${eyeY + 4} Q${x} ${eyeY - 14} ${x + 18} ${eyeY + 4}` : `M${x - 18} ${eyeY} Q${x} ${eyeY + 10} ${x + 18} ${eyeY}`;
      return `<path d="${d}" stroke="${line}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    }
    const open = { הפתעה: 17, עייפות: 7, כעס: 10, דאגה: 13 }[expr as string] ?? 12;
    const look = expr === 'מחשבה' ? -7 : 0;
    const lid = expr === 'עייפות' ? `<path d="M${x - 20} ${eyeY - 2} Q${x} ${eyeY - 12} ${x + 20} ${eyeY - 2}" stroke="${dark}" stroke-width="5" fill="none"/>` : '';
    return `<ellipse cx="${x}" cy="${eyeY}" rx="20" ry="${open}" fill="#fbfaf7"/>
      <circle cx="${x + look}" cy="${eyeY + (expr === 'מחשבה' ? -4 : 1)}" r="${Math.min(open, 10)}" fill="${line}"/>
      <circle cx="${x + look + 3}" cy="${eyeY - 3}" r="3" fill="#fff" opacity=".85"/>${lid}`;
  };
  const my = cy + 82;
  const mouth = {
    שמחה: `<path d="M${cx - 42} ${my} Q${cx} ${my + 36} ${cx + 42} ${my}" stroke="${line}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    עצב: `<path d="M${cx - 34} ${my + 18} Q${cx} ${my - 8} ${cx + 34} ${my + 18}" stroke="${line}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    הפתעה: `<ellipse cx="${cx}" cy="${my + 10}" rx="17" ry="24" fill="#5a2a24"/>`,
    כעס: `<path d="M${cx - 34} ${my + 10} L${cx + 34} ${my + 6}" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`,
    מחשבה: `<path d="M${cx - 22} ${my + 8} Q${cx + 4} ${my + 2} ${cx + 26} ${my + 10}" stroke="${line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    שלווה: `<path d="M${cx - 30} ${my + 4} Q${cx} ${my + 18} ${cx + 30} ${my + 4}" stroke="${line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    צחוק: `<path d="M${cx - 48} ${my - 4} Q${cx} ${my + 5} ${cx + 48} ${my - 4} Q${cx} ${my + 62} ${cx - 48} ${my - 4} Z" fill="#5a2a24"/><path d="M${cx - 40} ${my} Q${cx} ${my + 8} ${cx + 40} ${my} L${cx + 36} ${my + 10} Q${cx} ${my + 16} ${cx - 36} ${my + 10} Z" fill="#fbfaf7"/>`,
    דאגה: `<path d="M${cx - 32} ${my + 12} Q${cx - 16} ${my + 2} ${cx} ${my + 12} Q${cx + 16} ${my + 22} ${cx + 32} ${my + 10}" stroke="${line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    'חיוך עקום': `<path d="M${cx - 30} ${my + 10} Q${cx + 10} ${my + 16} ${cx + 38} ${my - 6}" stroke="${line}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    עייפות: `<path d="M${cx - 24} ${my + 10} L${cx + 24} ${my + 12}" stroke="${line}" stroke-width="6" stroke-linecap="round"/>`,
  }[expr];
  const blush = expr === 'שמחה' || expr === 'צחוק'
    ? `<ellipse cx="${cx - eyeDX - 14}" cy="${eyeY + 46}" rx="22" ry="12" fill="#e0786a" opacity=".28"/><ellipse cx="${cx + eyeDX + 14}" cy="${eyeY + 46}" rx="22" ry="12" fill="#e0786a" opacity=".28"/>`
    : '';
  const tear = expr === 'עצב' ? `<path d="M${cx - eyeDX - 4} ${eyeY + 20} q-8 18 0 24 q8 -6 0 -24" fill="#9cc3e6" opacity=".9"/>` : '';

  const top = cy - ry;
  const hairBack = [
    '',
    `<path d="M${cx - rx - 22} ${cy - 20} Q${cx - rx - 30} ${cy + 220} ${cx - rx + 10} ${cy + 250} L${cx + rx - 10} ${cy + 250} Q${cx + rx + 30} ${cy + 220} ${cx + rx + 22} ${cy - 20} Z" fill="${hair}"/>`,
    '',
    `<circle cx="${cx}" cy="${top - 34}" r="52" fill="${hair}"/>`,
    '',
    Array.from({ length: 14 }, (_, i) => {
      const a = (i / 13) * Math.PI;
      return `<circle cx="${cx - Math.cos(a) * (rx + 6)}" cy="${cy - Math.sin(a) * (ry + 2) + 20}" r="46" fill="${hair}"/>`;
    }).join(''),
    `<path d="M${cx - rx - 16} ${cy - 30} Q${cx - rx - 26} ${cy + 120} ${cx - rx + 4} ${cy + 140} L${cx + rx - 4} ${cy + 140} Q${cx + rx + 26} ${cy + 120} ${cx + rx + 16} ${cy - 30} Z" fill="${hair}"/>`,
  ][hairStyle];
  const hairFront = [
    `<path d="M${cx - rx - 4} ${cy - 30} Q${cx - rx + 10} ${top - 30} ${cx} ${top - 22} Q${cx + rx - 10} ${top - 30} ${cx + rx + 4} ${cy - 30} Q${cx + 40} ${top + 40} ${cx - rx - 4} ${cy - 30} Z" fill="${hair}"/>`,
    `<path d="M${cx - rx - 8} ${cy} Q${cx - rx} ${top - 40} ${cx + 10} ${top - 26} Q${cx + rx + 10} ${top - 20} ${cx + rx + 8} ${cy} Q${cx + rx - 20} ${top + 40} ${cx - 20} ${top + 50} Q${cx - rx + 10} ${top + 60} ${cx - rx - 8} ${cy} Z" fill="${hair}"/>`,
    hair === '#e4e0da' ? '' : `<path d="M${cx - rx + 14} ${top + 52} Q${cx} ${top - 12} ${cx + rx - 14} ${top + 52} Q${cx} ${top + 20} ${cx - rx + 14} ${top + 52} Z" fill="${hair}" opacity=".9"/>`,
    `<path d="M${cx - rx - 2} ${cy - 20} Q${cx - rx} ${top - 26} ${cx} ${top - 20} Q${cx + rx} ${top - 26} ${cx + rx + 2} ${cy - 20} Q${cx + rx - 30} ${top + 26} ${cx} ${top + 30} Q${cx - rx + 30} ${top + 26} ${cx - rx - 2} ${cy - 20} Z" fill="${hair}"/>`,
    `<path d="M${cx - rx} ${cy - 40} Q${cx - rx + 6} ${top - 24} ${cx + 30} ${top - 18} Q${cx + rx + 6} ${top} ${cx + rx} ${cy - 40} Q${cx + rx - 40} ${top + 30} ${cx - 50} ${top + 46} Q${cx - rx + 14} ${top + 56} ${cx - rx} ${cy - 40} Z" fill="${hair}"/>`,
    Array.from({ length: 9 }, (_, i) => `<circle cx="${cx - rx + 20 + i * ((rx * 2 - 40) / 8)}" cy="${top + 22 + Math.abs(4 - i) * 6}" r="34" fill="${hair}"/>`).join(''),
    `<path d="M${cx - rx - 6} ${cy - 10} Q${cx - rx} ${top - 30} ${cx} ${top - 24} Q${cx + rx} ${top - 30} ${cx + rx + 6} ${cy - 10} L${cx + rx - 6} ${cy - 40} Q${cx} ${top + 40} ${cx - rx + 6} ${cy - 40} Z" fill="${hair}"/>`,
  ][hairStyle];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="500" height="700">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
  <radialGradient id="sk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${shade(skin, 18)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -26)}"/></radialGradient>
  <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(cloth, 22)}"/><stop offset="1" stop-color="${shade(cloth, -30)}"/></linearGradient>
</defs>
<rect width="500" height="700" fill="url(#bg)"/>
<circle cx="${120 + r() * 260}" cy="${120 + r() * 120}" r="${140 + r() * 80}" fill="#fff" opacity=".18"/>
<g transform="rotate(${tilt} 250 400)">
  <path d="M40 760 Q60 560 250 545 Q440 560 460 760 Z" fill="url(#cl)"/>
  <rect x="${cx - 38}" y="${cy + ry - 30}" width="76" height="90" rx="30" fill="${dark}"/>
  ${hairBack}
  <ellipse cx="${cx - rx + 2}" cy="${eyeY + 22}" rx="20" ry="30" fill="${shade(skin, -14)}"/>
  <ellipse cx="${cx + rx - 2}" cy="${eyeY + 22}" rx="20" ry="30" fill="${shade(skin, -14)}"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sk)"/>
  ${beard ? `<path d="M${cx - rx + 10} ${cy + 10} Q${cx - rx + 20} ${cy + ry + 10} ${cx} ${cy + ry + 18} Q${cx + rx - 20} ${cy + ry + 10} ${cx + rx - 10} ${cy + 10} Q${cx + 40} ${my + 40} ${cx} ${my + 40} Q${cx - 40} ${my + 40} ${cx - rx + 10} ${cy + 10} Z" fill="${hair}" opacity=".92"/>` : ''}
  ${hairFront}
  ${blush}
  ${freckles ? Array.from({ length: 12 }, (_, i) => `<circle cx="${cx - 60 + (i % 6) * 24 + (i > 5 ? 10 : 0)}" cy="${eyeY + 38 + (i > 5 ? 12 : 0)}" r="2.6" fill="${shade(skin, -60)}" opacity=".55"/>`).join('') : ''}
  ${brow(-1)}${brow(1)}
  ${eye(-1)}${eye(1)}
  ${tear}
  <path d="M${cx + 4} ${eyeY + 16} Q${cx - 14} ${eyeY + 52} ${cx - 4} ${eyeY + 60} Q${cx + 8} ${eyeY + 64} ${cx + 16} ${eyeY + 58}" stroke="${shade(skin, -55)}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${mouth}
  ${glasses ? `<g fill="none" stroke="#1f1f22" stroke-width="6"><circle cx="${cx - eyeDX}" cy="${eyeY}" r="32"/><circle cx="${cx + eyeDX}" cy="${eyeY}" r="32"/><path d="M${cx - eyeDX + 32} ${eyeY - 4} Q${cx} ${eyeY - 16} ${cx + eyeDX - 32} ${eyeY - 4}"/></g>` : ''}
</g>
</svg>`;
}

export const starterFaceId = (n: number) => `starter-${n}`;
export const starterIndex = (id: string) => (id.startsWith('starter-') ? Number(id.slice(8)) : 0);

const urlCache = new Map<string, string>();
export function starterUrl(id: string): string | undefined {
  const n = starterIndex(id);
  if (!n) return undefined;
  if (!urlCache.has(id)) urlCache.set(id, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceSvg(n)));
  return urlCache.get(id);
}

export function starterFaces(): Face[] {
  return Array.from({ length: STARTER_FACE_COUNT }, (_, i) => ({
    id: starterFaceId(i + 1),
    name: `${String(i + 1).padStart(2, '0')} · ${starterExpr(i + 1)}`,
    starter: i + 1,
    image_path: null,
    sort: i + 1,
  }));
}
