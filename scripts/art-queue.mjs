// ממלא את תור faces_art_queue בקבוצות של 8, במנוע החינמי (Cloudflare), לשליחה בגלים עם faces_art_tick
// שימוש: node scripts/art-queue.mjs faces 14,15,16,26-60   |   node scripts/art-queue.mjs coach 5-65
import { COACH_SCENES, FACE_STYLE, COACH_STYLE, facePrompt } from './art-data.mjs';
const [kind = 'faces', spec = '1-999', engine = 'cloudflare'] = process.argv.slice(2);
const wanted = new Set(spec.split(',').flatMap((p) => {
  const [a, b = a] = p.split('-').map(Number);
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}));
const items = kind === 'faces'
  ? Array.from({ length: 60 }, (_, i) => ({ kind: 'face', id: `starter-${i + 1}`, prompt: `${facePrompt(i)}. @S` }))
  : COACH_SCENES.map((scene, i) => ({ kind: 'coach', id: `coach-${i + 1}`, prompt: `${scene}. @S` }));
const pick = items.filter((_, i) => wanted.has(i + 1));
const esc = (s) => s.replace(/'/g, "''");
const rows = [];
// הסגנון נכתב פעם אחת ומוחלף ב-SQL, כדי שהפקודה תישאר קצרה
const style = kind === 'faces' ? FACE_STYLE : COACH_STYLE;
for (let i = 0; i < pick.length; i += 8) rows.push(`('${esc(JSON.stringify({ action: 'batch', engine, items: pick.slice(i, i + 8) }))}')`);
console.log(`insert into faces_art_queue (body)\nselect replace(t, '@S', '${esc(style)}')::jsonb from (values\n${rows.join(',\n')}) v(t);`);
