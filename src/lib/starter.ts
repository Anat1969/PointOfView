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

type Pt = [number, number];
const f = (v: number) => Math.round(v * 10) / 10;
const P = ([x, y]: Pt) => `${f(x)} ${f(y)}`;

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const IRIS = ['#5a3a22', '#3b2416', '#6b4a2a', '#3f5f7a', '#4f6b45', '#7a6a3a'];

/** הגדרות הבעה: עיניים, גבות, פה ופרטים */
type ExprSpec = {
  eye: 'open' | 'smile' | 'calm' | 'wide' | 'squint' | 'tired';
  look: Pt;
  brow: [number, number];
  browLift: number;
  mouth: { corner: number; curve: number; open: number; width: number; asym: number; teeth?: boolean };
  blush?: boolean;
  tear?: boolean;
  lines?: boolean;
};
const SPEC: Record<Expr, ExprSpec> = {
  שמחה: { eye: 'squint', look: [0, 0], brow: [-2, 0], browLift: -2, mouth: { corner: -12, curve: 10, open: 6, width: 44, asym: 0, teeth: true }, blush: true },
  עצב: { eye: 'open', look: [0, 4], brow: [-12, 4], browLift: 0, mouth: { corner: 9, curve: -5, open: 0, width: 34, asym: 0 }, tear: true },
  הפתעה: { eye: 'wide', look: [0, 0], brow: [-14, -12], browLift: -12, mouth: { corner: 0, curve: 0, open: 26, width: 18, asym: 0 }, lines: true },
  כעס: { eye: 'squint', look: [0, 0], brow: [14, -4], browLift: 4, mouth: { corner: 5, curve: -2, open: 0, width: 32, asym: 0 } },
  מחשבה: { eye: 'open', look: [-7, -5], brow: [-8, 4], browLift: -2, mouth: { corner: 2, curve: 1, open: 0, width: 26, asym: 5 } },
  שלווה: { eye: 'calm', look: [0, 0], brow: [0, 0], browLift: 0, mouth: { corner: -5, curve: 4, open: 0, width: 32, asym: 0 } },
  צחוק: { eye: 'smile', look: [0, 0], brow: [-4, -2], browLift: -4, mouth: { corner: -16, curve: 12, open: 24, width: 50, asym: 0, teeth: true }, blush: true, lines: false },
  דאגה: { eye: 'open', look: [3, 2], brow: [-14, 6], browLift: -4, mouth: { corner: 6, curve: -3, open: 3, width: 30, asym: 2 }, lines: true },
  'חיוך עקום': { eye: 'open', look: [5, 0], brow: [-6, 4], browLift: -2, mouth: { corner: -2, curve: 3, open: 0, width: 34, asym: 12 } },
  עייפות: { eye: 'tired', look: [0, 3], brow: [2, 4], browLift: 4, mouth: { corner: 3, curve: 0, open: 4, width: 28, asym: 0 } },
};

/** דיוקן מאויר בהבעה מוגדרת. n הוא מספר קבוע, ולכן אותו דיוקן חוזר תמיד */
export function faceSvg(n: number): string {
  const r = rng(n + 17);
  const expr = starterExpr(n);
  const sp = SPEC[expr];
  const skin = SKIN[(n * 7 + Math.floor(r() * 3)) % SKIN.length];
  const hair = pickFrom(r, HAIR);
  const cloth = pickFrom(r, CLOTH);
  const iris = pickFrom(r, IRIS);
  const [bg1, bg2] = BG[n % BG.length];
  const hairStyle = Math.floor(r() * 7);
  const collar = Math.floor(r() * 4);
  const rx = 108 + r() * 22;
  const ry = 140 + r() * 18;
  const cx = 250;
  const cy = 318;
  const eyeY = cy - 6 + r() * 8;
  const eyeDX = 44 + r() * 8;
  const tilt = (r() - 0.5) * 7;
  const glasses = r() < 0.18;
  const beard = r() < 0.22 ? (r() < 0.5 ? 'full' : 'stubble') : '';
  const freckles = r() < 0.15;
  const earring = r() < 0.2;
  const shadow = shade(skin, -42);
  const deep = shade(skin, -70);
  const lip = mix(skin.slice(0, 7), '#b5525a', 0.42);
  const lipLow = mix(skin.slice(0, 7), '#c86a6f', 0.32);
  const ink = '#2a1f1a';
  const browC = hair === '#e4e0da' || hair === '#d8b98a' ? shade(hair, -70) : shade(hair, -12);
  const uid = `p${n}`;
  const sy = Math.round(cy + ry + 66);

  // ---- עיניים ----
  const eye = (side: 1 | -1) => {
    const x = cx + side * eyeDX;
    const y = eyeY;
    const o = { open: 13.5, wide: 19, squint: 8.5, tired: 12, smile: 0, calm: 0 }[sp.eye];
    if (sp.eye === 'smile' || sp.eye === 'calm') {
      const d = sp.eye === 'smile' ? `M${x - 20} ${y + 3} Q${x} ${y - 13} ${x + 20} ${y + 3}` : `M${x - 20} ${y - 1} Q${x} ${y + 9} ${x + 20} ${y - 1}`;
      return `<path d="${d}" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M${x + side * 18} ${y + (sp.eye === 'smile' ? 2 : 0)} l${side * 6} ${-4}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
        ${sp.eye === 'smile' ? `<path d="M${x - 14} ${y + 12} Q${x} ${y + 18} ${x + 14} ${y + 12}" stroke="${shadow}" stroke-width="2.5" fill="none" opacity=".6"/>` : ''}`;
    }
    const almond = `M${x - 25} ${y} Q${x - 4} ${y - o * 1.45} ${x + 25} ${y - 1} Q${x + 2} ${y + o * 0.95} ${x - 25} ${y} Z`;
    const [lx, ly] = sp.look;
    const cid = `${uid}e${side > 0 ? 'r' : 'l'}`;
    const tired = sp.eye === 'tired' ? `<path d="M${x - 23} ${y - 1} Q${x} ${y - o * 1.5} ${x + 23} ${y - 2} L${x + 23} ${y + 1} Q${x} ${y - 3} ${x - 23} ${y + 2} Z" fill="${shade(skin, -18)}"/>` : '';
    return `<clipPath id="${cid}"><path d="${almond}"/></clipPath>
      <path d="M${x - 20} ${y - o - 4} Q${x} ${y - o * 1.7 - 9} ${x + 20} ${y - o - 4}" stroke="${shadow}" stroke-width="3" fill="none" opacity=".45"/>
      <path d="${almond}" fill="#f7f3ee"/>
      <g clip-path="url(#${cid})">
        <circle cx="${x + lx}" cy="${y + 1 + ly}" r="13.5" fill="url(#${uid}iris)"/>
        <circle cx="${x + lx}" cy="${y + 1 + ly}" r="6" fill="#140e0b"/>
        <circle cx="${x + lx + 4}" cy="${y - 3 + ly}" r="2.6" fill="#fff" opacity=".9"/>
        <path d="M${x - 24} ${y - o * 0.4} Q${x} ${y - o * 1.6} ${x + 24} ${y - o * 0.4}" stroke="#000" stroke-opacity=".18" stroke-width="7" fill="none"/>
      </g>
      ${tired}
      <path d="M${x - 26} ${y + 1} Q${x - 4} ${y - o * 1.5} ${x + 26} ${y - 1}" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M${x + side * 24} ${y - 1} l${side * 8} ${-6}" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${x - 17} ${y + o * 0.75} Q${x} ${y + o * 1.1} ${x + 17} ${y + o * 0.7}" stroke="${shadow}" stroke-width="2" fill="none" opacity=".55"/>
      ${sp.eye === 'squint' ? `<path d="M${x - 16} ${y + 9} Q${x} ${y + 4} ${x + 16} ${y + 8}" stroke="${shadow}" stroke-width="2.5" fill="none" opacity=".7"/>` : ''}`;
  };

  // ---- גבות: צורה מלאה ומחודדת ----
  const brow = (side: 1 | -1) => {
    const [inner, outer] = sp.brow;
    const y0 = eyeY - 36 + sp.browLift;
    const xi = cx + side * (eyeDX - 22);
    const xo = cx + side * (eyeDX + 28);
    const a: Pt = [xi, y0 + inner];
    const top: Pt = [cx + side * (eyeDX + 2), y0 - 9 + (inner + outer) / 3];
    const b: Pt = [xo, y0 + 4 + outer];
    return `<path d="M${P(a)} Q${P(top)} ${P(b)} Q${P([top[0], top[1] + 8])} ${P([a[0], a[1] + 9])} Z" fill="${browC}"/>`;
  };

  // ---- פה ----
  const m = sp.mouth;
  const my = cy + 84;
  const L: Pt = [cx - m.width, my + m.corner + m.asym];
  const R: Pt = [cx + m.width, my + m.corner - m.asym];
  const midY = my + m.curve;
  let mouth: string;
  if (m.open > 0) {
    const low = midY + m.open * 1.6;
    const inner = `M${P(L)} Q${cx} ${midY - 4} ${P(R)} Q${cx} ${low} ${P(L)} Z`;
    mouth = `<clipPath id="${uid}m"><path d="${inner}"/></clipPath>
      <path d="${inner}" fill="#4a1c1c"/>
      <g clip-path="url(#${uid}m)">
        ${m.teeth ? `<rect x="${cx - m.width}" y="${midY - 8}" width="${m.width * 2}" height="${m.open * 0.55 + 6}" fill="#f6f1ea"/>` : ''}
        <ellipse cx="${cx}" cy="${low + 2}" rx="${m.width * 0.55}" ry="${m.open * 0.55}" fill="#c4626a"/>
      </g>
      <path d="M${P(L)} Q${cx - m.width / 2} ${midY - 12} ${cx} ${midY - 7} Q${cx + m.width / 2} ${midY - 12} ${P(R)} Q${cx} ${midY - 3} ${P(L)} Z" fill="${lip}"/>
      <path d="M${P(L)} Q${cx} ${low + 9} ${P(R)} Q${cx} ${low + 1} ${P(L)} Z" fill="${lipLow}"/>`;
  } else {
    mouth = `<path d="M${P(L)} Q${cx - m.width / 2} ${midY - 13} ${cx} ${midY - 7} Q${cx + m.width / 2} ${midY - 13} ${P(R)} Q${cx} ${midY} ${P(L)} Z" fill="${lip}"/>
      <path d="M${P(L)} Q${cx} ${midY + 17} ${P(R)} Q${cx} ${midY} ${P(L)} Z" fill="${lipLow}"/>
      <ellipse cx="${cx + 4}" cy="${midY + 7}" rx="${m.width * 0.35}" ry="2.5" fill="#fff" opacity=".22"/>
      <path d="M${P(L)} Q${cx} ${midY} ${P(R)}" stroke="#4a1f1f" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }
  const smileLines = m.corner < -8 ? `<path d="M${L[0] - 8} ${L[1] - 26} Q${L[0] - 16} ${L[1] - 6} ${L[0] - 6} ${L[1] + 8}" stroke="${shadow}" stroke-width="2.5" fill="none" opacity=".45"/><path d="M${R[0] + 8} ${R[1] - 26} Q${R[0] + 16} ${R[1] - 6} ${R[0] + 6} ${R[1] + 8}" stroke="${shadow}" stroke-width="2.5" fill="none" opacity=".45"/>` : '';

  // ---- שיער ----
  const top = cy - ry;
  const hg = `url(#${uid}hair)`;
  const hairBack = [
    '',
    `<path d="M${cx - rx - 24} ${cy - 30} Q${cx - rx - 40} ${cy + 200} ${cx - rx + 4} ${cy + 250} L${cx + rx - 4} ${cy + 250} Q${cx + rx + 40} ${cy + 200} ${cx + rx + 24} ${cy - 30} Z" fill="${hg}"/>`,
    '',
    `<circle cx="${cx + 6}" cy="${top - 30}" r="50" fill="${hg}"/><circle cx="${cx - 8}" cy="${top - 44}" r="18" fill="#fff" opacity=".08"/>`,
    '',
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 15) * Math.PI;
      return `<circle cx="${f(cx - Math.cos(a) * (rx + 8))}" cy="${f(cy - Math.sin(a) * (ry + 4) + 24)}" r="46" fill="${hg}"/>`;
    }).join(''),
    `<path d="M${cx - rx - 18} ${cy - 40} Q${cx - rx - 30} ${cy + 110} ${cx - rx + 2} ${cy + 150} L${cx + rx - 2} ${cy + 150} Q${cx + rx + 30} ${cy + 110} ${cx + rx + 18} ${cy - 40} Z" fill="${hg}"/>`,
  ][hairStyle];
  const hairFront = [
    `<path d="M${cx - rx - 6} ${cy - 24} Q${cx - rx + 4} ${top - 34} ${cx} ${top - 24} Q${cx + rx - 4} ${top - 34} ${cx + rx + 6} ${cy - 24} Q${cx + rx - 14} ${top + 30} ${cx + 30} ${top + 40} Q${cx - 30} ${top + 56} ${cx - rx - 6} ${cy - 24} Z" fill="${hg}"/>`,
    `<path d="M${cx - rx - 10} ${cy + 6} Q${cx - rx - 2} ${top - 44} ${cx + 12} ${top - 28} Q${cx + rx + 14} ${top - 22} ${cx + rx + 10} ${cy + 6} Q${cx + rx - 18} ${top + 44} ${cx - 16} ${top + 52} Q${cx - rx + 8} ${top + 64} ${cx - rx - 10} ${cy + 6} Z" fill="${hg}"/>`,
    hair === '#e4e0da' ? `<path d="M${cx - rx + 4} ${cy - 30} Q${cx - rx + 10} ${top + 10} ${cx - 30} ${top + 4}" stroke="${hair}" stroke-width="10" fill="none" opacity=".7"/>` : `<path d="M${cx - rx + 2} ${top + 64} Q${cx} ${top - 20} ${cx + rx - 2} ${top + 64} Q${cx} ${top + 16} ${cx - rx + 2} ${top + 64} Z" fill="${hg}" opacity=".95"/>`,
    `<path d="M${cx - rx - 4} ${cy - 18} Q${cx - rx} ${top - 30} ${cx} ${top - 24} Q${cx + rx} ${top - 30} ${cx + rx + 4} ${cy - 18} Q${cx + rx - 26} ${top + 24} ${cx} ${top + 30} Q${cx - rx + 26} ${top + 24} ${cx - rx - 4} ${cy - 18} Z" fill="${hg}"/>`,
    `<path d="M${cx - rx - 2} ${cy - 44} Q${cx - rx + 4} ${top - 30} ${cx + 34} ${top - 22} Q${cx + rx + 8} ${top - 4} ${cx + rx + 2} ${cy - 44} Q${cx + rx - 36} ${top + 26} ${cx - 46} ${top + 48} Q${cx - rx + 12} ${top + 60} ${cx - rx - 2} ${cy - 44} Z" fill="${hg}"/>`,
    Array.from({ length: 10 }, (_, i) => `<circle cx="${f(cx - rx + 14 + i * ((rx * 2 - 28) / 9))}" cy="${f(top + 20 + Math.abs(4.5 - i) * 6)}" r="32" fill="${hg}"/>`).join(''),
    `<path d="M${cx - rx - 8} ${cy - 6} Q${cx - rx - 2} ${top - 36} ${cx} ${top - 28} Q${cx + rx + 2} ${top - 36} ${cx + rx + 8} ${cy - 6} L${cx + rx - 4} ${cy - 46} Q${cx} ${top + 42} ${cx - rx + 4} ${cy - 46} Z" fill="${hg}"/>`,
  ][hairStyle];
  const strands = true
    ? ''
    : Array.from({ length: 5 }, (_, i) => `<path d="M${f(cx - 60 + i * 26)} ${f(top - 6 + Math.abs(2 - i) * 5)} Q${f(cx - 50 + i * 26)} ${f(top + 18)} ${f(cx - 66 + i * 28)} ${f(top + 40)}" stroke="#fff" stroke-opacity=".12" stroke-width="3" fill="none"/>`).join('');

  // ---- בגדים ----
  const torso = `M30 ${sy + 220} C36 ${sy + 60} 116 ${sy + 12} 250 ${sy} C384 ${sy + 12} 464 ${sy + 60} 470 ${sy + 220} Z`;
  const collarSvg = [
    `<path d="M${cx - 62} ${sy + 4} Q${cx} ${sy + 48} ${cx + 62} ${sy + 4}" stroke="${shade(cloth, -30)}" stroke-width="12" fill="none"/>`,
    `<path d="M${cx - 50} ${sy} L${cx} ${sy + 78} L${cx + 50} ${sy} Z" fill="url(#${uid}neck)"/><path d="M${cx - 52} ${sy - 2} L${cx} ${sy + 80} L${cx + 52} ${sy - 2}" stroke="${shade(cloth, -30)}" stroke-width="7" fill="none"/>`,
    `<path d="M${cx - 44} ${sy - 6} L${cx - 6} ${sy + 48} L${cx - 70} ${sy + 38} Z" fill="${shade(cloth, 40)}"/><path d="M${cx + 44} ${sy - 6} L${cx + 6} ${sy + 48} L${cx + 70} ${sy + 38} Z" fill="${shade(cloth, 40)}"/>`,
    `<rect x="${cx - 48}" y="${cy + ry - 26}" width="96" height="${sy - (cy + ry) + 44}" rx="22" fill="${shade(cloth, 8)}"/><path d="M${cx - 48} ${cy + ry - 6} h96 M${cx - 48} ${cy + ry + 8} h96" stroke="#000" stroke-opacity=".12" stroke-width="3"/>`,
  ][collar];

  const beardSvg = beard === 'full'
    ? `<path d="M${cx - rx + 8} ${cy + 6} Q${cx - rx + 16} ${cy + ry + 14} ${cx} ${cy + ry + 22} Q${cx + rx - 16} ${cy + ry + 14} ${cx + rx - 8} ${cy + 6} Q${cx + 44} ${my + 44} ${cx} ${my + 40} Q${cx - 44} ${my + 44} ${cx - rx + 8} ${cy + 6} Z" fill="${hg}" opacity=".95"/><path d="M${cx - 40} ${my - 12} Q${cx} ${my - 26} ${cx + 40} ${my - 12} Q${cx} ${my - 16} ${cx - 40} ${my - 12} Z" fill="${hg}"/>`
    : beard === 'stubble'
      ? `<path d="M${cx - rx + 10} ${cy + 20} Q${cx - rx + 20} ${cy + ry + 8} ${cx} ${cy + ry + 12} Q${cx + rx - 20} ${cy + ry + 8} ${cx + rx - 10} ${cy + 20} Q${cx + 30} ${my + 30} ${cx} ${my + 28} Q${cx - 30} ${my + 30} ${cx - rx + 10} ${cy + 20} Z" fill="url(#${uid}stub)" opacity=".55"/>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="500" height="700">
<defs>
  <linearGradient id="${uid}bg" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
  <radialGradient id="${uid}light" cx=".22" cy=".12" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="${uid}sk" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="${shade(skin, 22)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shadow}"/></radialGradient>
  <linearGradient id="${uid}side" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="${deep}" stop-opacity="0"/><stop offset="1" stop-color="${deep}" stop-opacity=".35"/></linearGradient>
  <linearGradient id="${uid}neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset=".45" stop-color="${shadow}"/><stop offset="1" stop-color="${shade(skin, -10)}"/></linearGradient>
  <linearGradient id="${uid}hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hair, 34)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${shade(hair, -26)}"/></linearGradient>
  <linearGradient id="${uid}cl" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(cloth, 30)}"/><stop offset="1" stop-color="${shade(cloth, -34)}"/></linearGradient>
  <radialGradient id="${uid}iris" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${shade(iris, 60)}"/><stop offset=".7" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, -40)}"/></radialGradient>
  <pattern id="${uid}stub" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${shade(hair, -20)}"/><circle cx="5" cy="4.5" r=".9" fill="${shade(hair, -20)}"/></pattern>
  <filter id="${uid}grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${n}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
  <filter id="${uid}soft"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<g filter="url(#${uid}grain)">
<rect width="500" height="700" fill="url(#${uid}bg)"/>
<rect x="${f(300 + r() * 80)}" y="40" width="${f(90 + r() * 60)}" height="520" fill="#fff" opacity=".12" transform="skewX(-12)"/>
<rect width="500" height="700" fill="url(#${uid}light)"/>
<ellipse cx="${cx + 18}" cy="${cy + 40}" rx="${rx + 30}" ry="${ry + 50}" fill="#000" opacity=".16" filter="url(#${uid}soft)"/>
<g transform="translate(0 26) translate(250 330) scale(1.15) translate(-250 -330) rotate(${f(tilt)} 250 420)">
  <path d="${torso}" fill="url(#${uid}cl)"/>
  <path d="M${cx - 150} ${sy + 40} Q${cx - 100} ${sy + 80} ${cx - 120} ${sy + 140}" stroke="#000" stroke-opacity=".12" stroke-width="4" fill="none"/>
  <path d="M${cx - 40} ${cy + ry - 40} L${cx - 46} ${sy + 10} Q${cx} ${sy + 28} ${cx + 46} ${sy + 10} L${cx + 40} ${cy + ry - 40} Z" fill="url(#${uid}neck)"/>
  ${collarSvg}
  ${hairBack}
  <ellipse cx="${f(cx - rx + 2)}" cy="${f(eyeY + 24)}" rx="19" ry="29" fill="${shade(skin, -12)}"/>
  <path d="M${f(cx - rx - 4)} ${f(eyeY + 10)} q-6 14 2 28" stroke="${deep}" stroke-width="3" fill="none" opacity=".5"/>
  <ellipse cx="${f(cx + rx - 2)}" cy="${f(eyeY + 24)}" rx="19" ry="29" fill="${shade(skin, -22)}"/>
  ${earring ? `<circle cx="${f(cx - rx)}" cy="${f(eyeY + 56)}" r="5" fill="#e9d8a6" stroke="#b49a58" stroke-width="1.5"/>` : ''}
  <ellipse cx="${cx}" cy="${cy}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${uid}sk)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${uid}side)"/>
  <ellipse cx="${cx - 34}" cy="${cy - 70}" rx="40" ry="22" fill="#fff" opacity=".12"/>
  ${beardSvg}
  ${hairFront}
  ${strands}
  ${sp.lines ? `<path d="M${cx - 44} ${eyeY - 64} Q${cx} ${eyeY - 72} ${cx + 44} ${eyeY - 64} M${cx - 34} ${eyeY - 54} Q${cx} ${eyeY - 60} ${cx + 34} ${eyeY - 54}" stroke="${shadow}" stroke-width="2" fill="none" opacity=".45"/>` : ''}
  ${sp.blush ? `<ellipse cx="${cx - eyeDX - 10}" cy="${eyeY + 48}" rx="24" ry="13" fill="#e2786e" opacity=".26" filter="url(#${uid}soft)"/><ellipse cx="${cx + eyeDX + 10}" cy="${eyeY + 48}" rx="24" ry="13" fill="#e2786e" opacity=".26" filter="url(#${uid}soft)"/>` : ''}
  ${freckles ? Array.from({ length: 16 }, (_, i) => `<circle cx="${f(cx - 66 + (i % 8) * 18 + (i > 7 ? 8 : 0))}" cy="${f(eyeY + 36 + (i > 7 ? 11 : 0) + (i % 3) * 2)}" r="2.2" fill="${deep}" opacity=".45"/>`).join('') : ''}
  ${brow(-1)}${brow(1)}
  ${eye(-1)}${eye(1)}
  ${sp.tear ? `<path d="M${cx - eyeDX - 8} ${eyeY + 16} q-9 20 0 27 q9 -7 0 -27" fill="#a9cdea" opacity=".9"/><circle cx="${cx - eyeDX - 10}" cy="${eyeY + 34}" r="2" fill="#fff"/>` : ''}
  <path d="M${cx + 6} ${eyeY + 8} Q${cx - 2} ${eyeY + 40} ${cx - 10} ${eyeY + 56}" stroke="${shadow}" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
  <path d="M${cx - 6} ${eyeY + 14} Q${cx - 8} ${eyeY + 36} ${cx - 3} ${eyeY + 50}" stroke="#fff" stroke-width="3" fill="none" opacity=".25" stroke-linecap="round"/>
  <path d="M${cx - 18} ${eyeY + 58} Q${cx - 14} ${eyeY + 66} ${cx} ${eyeY + 64} Q${cx + 14} ${eyeY + 66} ${cx + 18} ${eyeY + 58}" stroke="${deep}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="${cx - 9}" cy="${eyeY + 60}" rx="4" ry="2.4" fill="${deep}" opacity=".6"/><ellipse cx="${cx + 9}" cy="${eyeY + 60}" rx="4" ry="2.4" fill="${deep}" opacity=".6"/>
  ${smileLines}
  ${mouth}
  ${glasses ? `<g><circle cx="${cx - eyeDX}" cy="${eyeY}" r="31" fill="#fff" opacity=".08"/><circle cx="${cx + eyeDX}" cy="${eyeY}" r="31" fill="#fff" opacity=".08"/><g fill="none" stroke="#1f1f22" stroke-width="5"><circle cx="${cx - eyeDX}" cy="${eyeY}" r="31"/><circle cx="${cx + eyeDX}" cy="${eyeY}" r="31"/><path d="M${cx - eyeDX + 31} ${eyeY - 4} Q${cx} ${eyeY - 16} ${cx + eyeDX - 31} ${eyeY - 4}"/><path d="M${cx - eyeDX - 31} ${eyeY - 4} L${cx - rx + 4} ${eyeY - 10}"/></g><path d="M${cx - eyeDX - 18} ${eyeY - 14} l14 -8" stroke="#fff" stroke-width="3" opacity=".5"/><path d="M${cx + eyeDX - 18} ${eyeY - 14} l14 -8" stroke="#fff" stroke-width="3" opacity=".5"/></g>` : ''}
</g>
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
