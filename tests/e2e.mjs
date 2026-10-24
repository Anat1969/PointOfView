// בדיקת קצה לקצה מול vite preview, עם מוק ל-Supabase: צפייה, עריכה, ללא רשת, נייד והתקנה
import { chromium } from 'playwright';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_KEY, createDb, mockSupabase } from './supa-mock.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'screenshots';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
mkdirSync(OUT, { recursive: true });
const FIX = join(OUT, 'fixtures');
mkdirSync(FIX, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const count = (p, sel) => p.locator(sel).count();
const waitCount = (p, sel, n) => p.waitForFunction(([s, k]) => document.querySelectorAll(s).length === k, [sel, n]);

const browser = await chromium.launch({ executablePath: CHROME });
const db = createDb();
// ה-service worker מסתיר בקשות מהמוק, ולכן חסום כאן. ההתקנה נבדקת בנפרד עם service worker פעיל
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
await mockSupabase(ctx, db);
const page = await ctx.newPage();
const errors = [];
let expectNetErrors = false;
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() !== 'error' || m.text().includes('fonts.g')) return;
  if (expectNetErrors && m.text().includes('Failed to load resource')) return;
  errors.push(m.text());
});

// ---------- תמונות בדיקה ----------
await page.goto(BASE);
const shots = await page.evaluate(async () => {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const c = document.createElement('canvas');
    c.width = 500; c.height = 700;
    const g = c.getContext('2d');
    const hue = (i * 47) % 360;
    const grd = g.createLinearGradient(0, 0, 500, 700);
    grd.addColorStop(0, `hsl(${hue},25%,78%)`); grd.addColorStop(1, `hsl(${hue},20%,35%)`);
    g.fillStyle = grd; g.fillRect(0, 0, 500, 700);
    g.fillStyle = `hsl(${(hue + 30) % 360},30%,${60 + i * 3}%)`;
    g.beginPath(); g.ellipse(250, 300, 120, 160, 0, 0, Math.PI * 2); g.fill();
    out.push(c.toDataURL(i % 2 ? 'image/png' : 'image/jpeg', 0.9));
  }
  return out;
});
const files = shots.map((d, i) => {
  const p = join(FIX, `face-${i + 1}.${d.startsWith('data:image/png') ? 'png' : 'jpg'}`);
  writeFileSync(p, Buffer.from(d.split(',')[1], 'base64'));
  return p;
});
const bad = join(FIX, 'notes.txt');
writeFileSync(bad, 'not an image');
const fakeJpg = join(FIX, 'broken.jpg');
writeFileSync(fakeJpg, 'broken');

// ---------- דף הכלים ----------
await page.waitForSelector('.game-box');
ok(await count(page, '.game-box') === 2, 'suite: two tools (Faces, coaching game)');
await page.locator('.fan-card img').first().waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '00-suite.png') });
await page.getByRole('button', { name: 'כניסה לFaces' }).click();
ok(page.url().endsWith('#/faces'), 'suite: Faces box opens the Faces game');

// ---------- דף הבית של Faces, צפייה בלבד ----------
await page.waitForSelector('.ring-card img');
ok(await count(page, '.ring-card img') >= 12, 'home: 3D ring shows starter portraits');
ok(await page.getByText('60 מתוך 99 פנים').isVisible(), 'home: library counts from Supabase');
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '01-home.png') });
ok((await page.locator('a.brand').getAttribute('href')) === '#/', 'brand links home');
ok(await page.locator('.topbar').getByText('העתקת קישור').count() === 0, 'top bar: links hidden until the A&I logo opens');
await page.locator('ai-menu .logo').click();
await page.screenshot({ path: join(OUT, '01b-studio-menu.png') });
ok((await page.getByRole('menuitem', { name: 'שיחת הפיתוח' }).getAttribute('href')).includes('claude.ai/code/session_'), 'A&I: dev chat link');
ok((await page.getByRole('menuitem', { name: 'פרויקט המחקר' }).getAttribute('href')).includes('claude.ai/chat/'), 'A&I: research link');
await page.getByRole('menuitem', { name: 'העתקת קישור' }).click();
await page.getByText('הקישור הועתק').waitFor();
ok(await page.locator('ai-menu .panel').waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false), 'A&I: menu closes after copy');
ok((await page.evaluate(() => navigator.clipboard.readText())).startsWith(BASE), 'copy link copies current URL');

await page.getByRole('link', { name: 'ספריית פנים' }).first().click();
await waitCount(page, '.face-grid li', 60);
ok(true, 'faces (viewer): 60 starter portraits');
ok(!(await page.getByRole('button', { name: 'העלאת תמונות' }).isVisible()), 'faces (viewer): no upload');
ok(await count(page, '.face-grid button') === 0, 'faces (viewer): no delete');
ok(await page.getByText('ספרייה משותפת לכל המכשירים').isVisible(), 'faces (viewer): shared library note');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '02-faces.png') });

await page.getByRole('link', { name: 'השתקפויות' }).first().click();
await waitCount(page, '.word-tile', 50);
ok(await count(page, '#word-input') === 0 && await count(page, '.word-tile input') === 0, 'reflections (viewer): 50 words, read-only');
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '03-reflections.png') });

// ---------- סשן: שולחן בשטח הגלוי ----------
const fitsViewport = async (p, label) => {
  const r = await p.evaluate(() => {
    const board = document.querySelector('.board')?.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.table-card')].map((c) => c.getBoundingClientRect());
    const inside = cards.every((c) => board && c.top >= board.top - 1 && c.bottom <= board.bottom + 1 && c.left >= board.left - 1 && c.right <= board.right + 1);
    const overlap = cards.some((a, i) => cards.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    return { scroll: document.documentElement.scrollHeight - window.innerHeight, inside, overlap, n: cards.length, w: cards[0]?.width ?? 0 };
  });
  ok(r.scroll <= 0 && r.inside && !r.overlap, `${label}: ${r.n} cards fit the visible screen, no scroll, no overlap (scroll ${r.scroll}, card ${Math.round(r.w)}px)`);
};
await page.locator('a.brand').click();
await page.waitForSelector('.game-box');
ok(page.url().endsWith('#/'), 'brand returns to the tools page');
await page.goto(`${BASE}/#/faces`);
await page.getByRole('button', { name: /סשן חדש/ }).click();
await page.getByText('השולחן ריק').waitFor();
ok(page.url().includes('#/faces/session/'), 'session: new session route');
ok(await page.getByRole('radio', { name: 'זוגות' }).getAttribute('aria-checked') === 'true', 'session: default form is pairs');
await page.getByLabel('שם הסשן').fill('סשן בדיקה');
await page.getByRole('button', { name: /שליפת זוג/ }).click();
await page.getByRole('button', { name: /שליפת זוג/ }).click();
await waitCount(page, '.table-card', 4);
ok(await count(page, '.unit-pair') === 2, 'session: pairs laid out as pairs (face + reflection)');
const pairKinds = await page.locator('.unit-pair').first().locator('.card-tag').allInnerTexts();
ok(pairKinds.join(',') === 'פנים,השתקפות', `session: pair order face then reflection (${pairKinds})`);
await page.locator('.table-card').first().click();
await page.locator('.drawer textarea').fill('מבט שמזכיר לי את סבתא');
const firstFace = await page.locator('.table-card').first().locator('img').getAttribute('src');
await page.locator('.drawer').getByRole('button', { name: 'החלפת הקלף' }).click();
await page.waitForTimeout(400);
const replaced = await page.locator('.table-card').first().locator('img').getAttribute('src');
ok(replaced && replaced !== firstFace, 'session: replace swaps the card');
ok((await page.locator('.drawer textarea').inputValue()) === 'מבט שמזכיר לי את סבתא', 'session: note kept on replace');
ok(await count(page, '.unit-pair') === 2, 'session: replaced card stays in its pair');
ok(await page.locator('.table-card').first().locator('.note-flag').isVisible(), 'session: note flag on card');
await page.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
for (let i = 0; i < 10; i++) await page.getByRole('button', { name: /שליפת זוג/ }).click();
await waitCount(page, '.table-card', 24);
await page.waitForTimeout(900);
await fitsViewport(page, 'desktop 12 pairs');
await page.screenshot({ path: join(OUT, '04-session-pairs.png') });
await page.getByRole('radio', { name: 'חופשי' }).click();
await page.waitForTimeout(1500);
ok(await count(page, '.unit-pair') === 0, 'session: free form lays cards singly');
await fitsViewport(page, 'desktop free 24 cards');
await page.getByRole('radio', { name: 'זוגות' }).click();
await page.locator('.table-card').nth(5).click();
await page.waitForTimeout(1200);
const covered = await page.evaluate(() => {
  const d = document.querySelector('.drawer').getBoundingClientRect();
  return [...document.querySelectorAll('.table-card')].filter((c) => { const r = c.getBoundingClientRect(); return r.left < d.right && d.left < r.right && r.top < d.bottom && d.top < r.bottom; }).length;
});
ok(covered === 0, `session: note panel covers no card (${covered})`);
await fitsViewport(page, 'desktop with note panel open');
ok(await page.locator('.drawer').getByRole('button', { name: 'הסרה' }).count() === 0, 'session: no remove button');
await page.screenshot({ path: join(OUT, '04c-session-note.png') });
await page.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
await page.getByRole('button', { name: 'פרטים וסיכום' }).click();
await page.locator('.drawer').getByRole('radio', { name: 'קבוצתי' }).click();
await page.getByPlaceholder('משתתפים').fill('דנה, יואב');
await page.locator('#summary').fill('תובנה: לשים לב לגעגוע');
await page.screenshot({ path: join(OUT, '04b-session-details.png') });
await page.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
await page.getByRole('button', { name: 'שמירה' }).click();
await page.getByText('הסשן נשמר').waitFor();
ok(await page.getByRole('button', { name: 'נשמר' }).isDisabled(), 'session: saved confirmation');

await page.getByRole('radio', { name: 'פנים' }).click();
ok(await count(page, '.mini-reflection') === 0 && await count(page, '.mini-face') === 1, 'session: faces form shows only the face deck');
for (let i = 0; i < 70; i++) {
  const btn = page.locator('.mini-face');
  if (await btn.isDisabled()) break;
  await btn.click();
}
ok(await page.getByText('החפיסה נגמרה').isVisible(), 'session: exhausted deck state');
await page.waitForTimeout(800);
await fitsViewport(page, 'desktop 71 cards');
await page.getByRole('button', { name: 'פרטים וסיכום' }).click();
await page.locator('.drawer').getByRole('button', { name: 'ביטול שינויים' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול שינויים' }).click();
await waitCount(page, '.table-card', 24);
ok(await page.getByRole('radio', { name: 'זוגות' }).getAttribute('aria-checked') === 'true', 'session: discard changes reverts');

// ---------- תצוגת קבוצה ----------
await page.getByRole('button', { name: 'תצוגת קבוצה' }).click();
await page.locator('.carousel-card.current').waitFor();
ok((await page.locator('.counter').innerText()).includes('01 / 12'), `present: counts pairs as units (${await page.locator('.counter').innerText()})`);
ok(await page.locator('.carousel-card.current .card-face').count() === 2, 'present: pair shown together');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
ok((await page.locator('.counter').innerText()).includes('02'), `present: ArrowLeft advances (${await page.locator('.counter').innerText()}, focus ${await page.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className)})`);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
ok((await page.locator('.counter').innerText()).includes('01'), 'present: ArrowRight goes back');
await page.getByRole('button', { name: 'הבא' }).click();
await page.getByRole('button', { name: 'הבא' }).click();
ok((await page.locator('.counter').innerText()).includes('03'), 'present: next button');
await page.getByRole('button', { name: 'הקודם' }).click();
await page.getByRole('button', { name: 'הצגת הערות' }).click();
await page.keyboard.press('Home');
await page.waitForTimeout(900);
ok(await page.locator('.present-note').isVisible(), 'present: note shown');
await page.screenshot({ path: join(OUT, '05-present.png') });
await page.getByRole('button', { name: 'מסך מלא' }).click();
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.getByRole('link', { name: 'חזרה לסשן' }).click();
await page.locator('.stage-bar').waitFor();
ok(true, 'present: back to session');

// ---------- היסטוריה ----------
await page.getByRole('link', { name: 'היסטוריה' }).first().click();
await page.locator('.history li').first().waitFor();
await page.getByRole('button', { name: 'שכפול' }).click();
await waitCount(page, '.history li', 2);
ok(await page.getByText('סשן בדיקה (עותק)').isVisible(), 'history: duplicate');
for (const [name, ext] of [['JSON', 'json'], ['CSV', 'csv'], ['ייצוא הכל JSON', 'json'], ['ייצוא הכל CSV', 'csv']]) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name, exact: true }).first().click()]);
  const p = join(OUT, `export.${ext}`);
  await dl.saveAs(p);
  const body = readFileSync(p, 'utf8');
  ok(dl.suggestedFilename().endsWith(ext) && body.includes('סשן בדיקה'), `history: export ${name} (${dl.suggestedFilename()})`);
  if (ext === 'csv') ok(body.includes('מבט שמזכיר לי את סבתא') && /· (שמחה|עצב|הפתעה|כעס|מחשבה|שלווה|צחוק|דאגה|חיוך עקום|עייפות)/.test(body), `history: ${name} includes notes and face names`);
}
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, '06-history.png') });
await page.getByRole('button', { name: 'מחיקה' }).first().click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.history li', 1);
ok(true, 'history: delete with confirm');
await page.getByRole('button', { name: 'פתיחה' }).click();
await page.locator('.table-card').first().waitFor();
ok((await page.getByLabel('שם הסשן').inputValue()) === 'סשן בדיקה', 'history: open loads session');
await page.reload();
await page.locator('.table-card img').first().waitFor();
ok(true, 'persistence: session survives reload');

// ---------- משחק האימון: צפייה ושולחן בארבעה שלבים ----------
await page.goto(`${BASE}/#/coaching`);
await page.locator('.ring-card img').first().waitFor();
ok(await count(page, '.ring-caption') >= 12, 'coaching: home ring shows image + word cards');
ok(await page.getByText('65 מתוך 99 קלפים').isVisible(), 'coaching: library count from Supabase');
await page.getByRole('link', { name: 'ספריית קלפים' }).click();
await waitCount(page, '.face-grid li', 65);
ok(await count(page, '.coach-band input') === 0 && await count(page, '.coach-del') === 0, 'coaching library (viewer): 65 cards, read-only');
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '09-coach-library.png') });
await page.getByRole('link', { name: 'משחק האימון' }).click();
await page.getByRole('button', { name: /סשן חדש/ }).click();
await page.locator('.lanes').waitFor();
ok(page.url().includes('#/coaching/session/'), 'coaching: new session route');
ok(await page.getByRole('radio', { name: 'ארבעה שלבים' }).getAttribute('aria-checked') === 'true', 'coaching: default form is four stages');
ok(await count(page, '.lane') === 4, 'coaching: four lanes');
await page.getByLabel('שם הסשן').fill('אימון בדיקה');
for (let i = 0; i < 6; i++) await page.locator('.mini-coach').click();
await page.waitForTimeout(400);
const perLane = await page.locator('.lane').evaluateAll((ls) => ls.map((l) => l.querySelectorAll('.table-card').length));
ok(perLane.join(',') === '2,2,1,1', `coaching: deck fills the stages in order (${perLane})`);
await page.getByRole('button', { name: 'שליפה לשלב עשייה' }).click();
await page.getByRole('button', { name: 'שליפה לשלב עשייה' }).click();
await page.waitForTimeout(400);
ok((await page.locator('.lane').nth(3).locator('.table-card').count()) === 3, 'coaching: lane draw button adds to its stage');
await page.waitForTimeout(900);
await fitsViewport(page, 'coaching four stages');
await page.locator('.lane').nth(2).locator('.table-card').first().click();
ok(await page.locator('.drawer-q').innerText() === 'מה הכי חשוב כאן? מה התובנה?', 'coaching: note panel shows the stage question');
await page.locator('.drawer textarea').fill('התובנה: להאט');
const beforeWord = await page.locator('.lane').nth(2).locator('.coach-word').first().innerText();
await page.locator('.drawer').getByRole('button', { name: 'החלפת הקלף' }).click();
await page.waitForTimeout(400);
ok((await page.locator('.lane').nth(2).locator('.coach-word').first().innerText()) !== beforeWord, 'coaching: replace keeps the card in its stage');
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '10-coach-stages.png') });
await page.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
await page.getByRole('button', { name: 'שמירה' }).click();
await page.getByText('הסשן נשמר').waitFor();
await page.getByRole('radio', { name: 'חופשי' }).click();
await page.locator('.board-grid').waitFor();
ok(await count(page, '.lane') === 0 && await count(page, '.table-card') === 8, 'coaching: free form lays all cards on one table');
await page.getByRole('radio', { name: 'ארבעה שלבים' }).click();
await page.getByRole('button', { name: 'תצוגת קבוצה' }).click();
await page.locator('.carousel-card.current').waitFor();
ok((await page.locator('.counter').innerText()).includes('01 / 04'), 'coaching present: one unit per stage');
ok((await page.locator('.carousel-card.current .stage-chip').innerText()) === 'עצירה', 'coaching present: stage label');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '11-coach-present.png') });
await page.getByRole('link', { name: 'חזרה לסשן' }).click();
await page.getByRole('link', { name: 'היסטוריה' }).click();
await page.locator('.history li').first().waitFor();
ok(await page.getByText('אימון בדיקה').isVisible() && !(await page.getByText('סשן בדיקה').isVisible()), 'coaching history shows only coaching sessions');
const [cdl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV', exact: true }).first().click()]);
const cpath = join(OUT, 'coach-export.csv');
await cdl.saveAs(cpath);
const cbody = readFileSync(cpath, 'utf8');
ok(cbody.includes('משחק האימון') && cbody.includes('עצירה') && cbody.includes('התובנה: להאט'), 'coaching export: game, stage and note');
await page.goto(`${BASE}/#/faces/history`);
await page.locator('.history li').first().waitFor();
ok(!(await page.getByText('אימון בדיקה').isVisible()), 'faces history does not show coaching sessions');

// ---------- מצב עריכה ----------
const writesBefore = db.requests.filter((r) => !r.startsWith('GET') && !r.includes('/rpc/')).length;
ok(writesBefore === 0, 'viewer made no write requests');
ok(await count(page, '.face-grid button') === 0, 'viewer: no edit controls');
await page.locator('ai-menu .logo').click();
page.once('dialog', (d) => d.accept('short'));
await page.getByRole('menuitem', { name: /כניסה לעריכה/ }).click();
await page.getByText('מפתח העריכה קצר מדי').waitFor();
ok(true, 'A&I: short key rejected');
await page.screenshot({ path: join(OUT, '06b-studio-viewer.png') });
await page.locator('ai-menu .logo').click();
page.once('dialog', (d) => d.accept(TEST_KEY));
await page.getByRole('menuitem', { name: /כניסה לעריכה/ }).click();
await page.waitForLoadState('load');
await page.goto(`${BASE}/#/faces/library`);
await page.getByText('מצב עריכה').waitFor();
ok(true, 'A&I: key entry turns on edit mode');
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: /מצב עריכה פעיל/ }).click();
await page.keyboard.press('Escape');
await waitCount(page, '.face-grid button', 0);
ok(!(await page.getByRole('button', { name: 'העלאת תמונות' }).isVisible()), 'A&I: edit mode off hides edit controls');
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: 'הפעלת מצב עריכה' }).click();
await page.screenshot({ path: join(OUT, '06c-studio-editor.png') });
await page.locator('ai-menu .logo').click();
await page.getByRole('menuitem', { name: 'עריכת ספריית פנים' }).click();
await page.getByText('מצב עריכה. כל שינוי').waitFor();
await page.goto(`${BASE}/?key=${TEST_KEY}#/faces/library`);
await page.getByText('מצב עריכה. כל שינוי').waitFor();
ok(!page.url().includes('key='), 'edit: key link removed from address bar');
await page.getByTestId('face-input').setInputFiles([...files, bad, fakeJpg]);
await waitCount(page, '.face-grid li', 67);
ok(db.faces_faces.length === 67 && db.files.size === 7, `edit: 7 images uploaded to storage and table (${db.faces_faces.length}, ${db.files.size})`);
const errText = await page.locator('.error-panel').innerText();
ok(errText.includes('notes.txt') && errText.includes('broken.jpg'), 'edit: error panel lists bad files');
await page.locator('.error-panel').getByRole('button', { name: 'סגירה' }).click();
await page.locator('.face-grid li').last().locator('img').waitFor();
await page.locator('.face-grid li').last().scrollIntoViewIfNeeded();
ok(await page.waitForFunction(() => { const i = [...document.querySelectorAll('.face-grid li img')].pop(); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).then(() => true, () => false), 'edit: uploaded image served from storage');
await page.locator('.face-grid li').last().getByRole('button', { name: /מחיקת/ }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול' }).click();
ok(await count(page, '.face-grid li') === 67, 'edit: cancel keeps image');
await page.locator('.face-grid li').last().getByRole('button', { name: /מחיקת/ }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.face-grid li', 66);
await page.waitForTimeout(300);
ok(db.faces_faces.length === 66 && db.files.size === 6, 'edit: delete removes row and file');
await page.getByRole('button', { name: 'מחיקת 01 · שמחה' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.face-grid li', 65);
await page.getByRole('button', { name: /החזרת דיוקנאות הפתיחה \(1\)/ }).click();
await page.getByText('1 דיוקנאות הוחזרו').waitFor();
ok(db.faces_faces.length === 66, 'edit: restore starter portraits');
await page.screenshot({ path: join(OUT, '07-faces-edit.png') });

await page.getByRole('link', { name: 'השתקפויות' }).first().click();
await page.getByRole('button', { name: 'הוספה' }).waitFor();
ok(await page.getByRole('button', { name: 'הוספה' }).isDisabled(), 'edit: add disabled when 50 words');
await page.getByRole('button', { name: 'מחיקת אני' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.word-tile', 49);
ok(db.faces_words.length === 49, 'edit: delete word');
await page.getByRole('button', { name: 'הוספה' }).click();
ok(await page.getByText('יש להזין מילה.').isVisible(), 'edit: empty input error');
await page.locator('#word-input').fill('אומץ');
await page.getByRole('button', { name: 'הוספה' }).click();
ok(await page.getByText('המילים כבר קיימות ברשימה.').isVisible(), 'edit: duplicate guarded');
await page.locator('#word-input').fill('ענווה');
await page.getByRole('button', { name: 'הוספה' }).click();
await waitCount(page, '.word-tile', 50);
ok(db.faces_words.some((w) => w.text === 'ענווה'), 'edit: add word');
await page.getByLabel('עריכת המילה תנועה').fill('תנועה פנימית');
await page.getByLabel('עריכת המילה תנועה').press('Enter');
await page.waitForTimeout(300);
ok(db.faces_words.some((w) => w.text === 'תנועה פנימית'), 'edit: rename word saved');
await page.getByRole('button', { name: 'פחות' }).click();
await page.waitForTimeout(300);
ok(db.faces_settings[0].blanks === 7 && (await page.locator('.stepper .mono').innerText()) === '7', 'edit: blanks saved');
await page.getByRole('button', { name: 'יותר' }).click();

// ---------- עריכת קלפי האימון ----------
await page.goto(`${BASE}/#/coaching/library`);
await page.getByText('מצב עריכה. כל שינוי').waitFor();
await page.getByTestId('coach-input').setInputFiles(files.slice(0, 2));
await waitCount(page, '.face-grid li', 67);
ok(db.faces_coach_cards.length === 67 && [...db.files.keys()].filter((k) => k.startsWith('coach/')).length === 2, 'coach edit: images uploaded under coach/');
await page.getByLabel('עריכת המילה face-1').fill('הקשבה עמוקה');
await page.getByLabel('עריכת המילה face-1').press('Enter');
await page.waitForTimeout(300);
ok(db.faces_coach_cards.some((c) => c.word === 'הקשבה עמוקה'), 'coach edit: word on uploaded card saved');
await page.getByRole('button', { name: 'מחיקת אפשרות' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.face-grid li', 66);
await page.getByRole('button', { name: /החזרת קלפי הפתיחה \(1\)/ }).click();
await page.getByText('1 קלפים הוחזרו').waitFor();
ok(db.faces_coach_cards.length === 67, 'coach edit: delete and restore starter card');
await page.screenshot({ path: join(OUT, '12-coach-edit.png') });

// ---------- ללא רשת ----------
expectNetErrors = true;
db.offline = true;
await page.goto(`${BASE}/#/faces/library`);
await page.reload();
await page.getByText('אין חיבור לספרייה המשותפת').waitFor();
ok(await count(page, '.face-grid li') === 66, 'offline: cached library still shown');
ok(await count(page, '.face-grid button') === 0, 'offline: editing disabled');
db.offline = false;
await page.reload();
await page.getByText('מצב עריכה').waitFor();
expectNetErrors = false;
ok(true, 'offline: recovers when back online');

await page.locator('a.brand').click();
await page.waitForTimeout(1300);
await page.screenshot({ path: join(OUT, '08-home-full.png') });

// ---------- נייד ----------
const m = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mockSupabase(m, db);
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
await mp.goto(BASE);
const ls = await page.evaluate(() => JSON.stringify({ 'faces.sessions': localStorage.getItem('faces.sessions') }));
await mp.evaluate((d) => Object.entries(JSON.parse(d)).forEach(([k, v]) => localStorage.setItem(k, v)), ls);
const noHScroll = async (label) => {
  const w = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(w[0] <= w[1] && w[1] === 390, `${label}: no horizontal scroll (${w[0]} <= ${w[1]})`);
};
for (const [hash, name] of [['#/', 'suite'], ['#/faces', 'home'], ['#/faces/library', 'faces'], ['#/faces/words', 'reflections'], ['#/faces/history', 'history'], ['#/coaching', 'coach-home'], ['#/coaching/library', 'coach-library']]) {
  await mp.goto(BASE + '/' + hash);
  await mp.reload();
  await mp.waitForTimeout(1000);
  await noHScroll(`mobile ${name}`);
  await mp.screenshot({ path: join(OUT, `m-${name}.png`) });
}
const sid = JSON.parse(JSON.parse(ls)['faces.sessions']).find((x) => (x.game ?? 'faces') === 'faces').id;
await mp.goto(`${BASE}/#/faces/session/${sid}`);
await mp.reload();
await mp.locator('.table-card img').first().waitFor();
await mp.waitForTimeout(900);
await noHScroll('mobile session');
const mScroll = await mp.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await mp.locator('.table-card').first().click();
await mp.waitForTimeout(900);
const mCovered = await mp.evaluate(() => { const d = document.querySelector('.drawer').getBoundingClientRect(); return [...document.querySelectorAll('.table-card')].filter((c) => { const r = c.getBoundingClientRect(); return r.top < d.bottom && d.top < r.bottom - 1; }).length; });
ok(mCovered === 0, `mobile: note panel covers no card (${mCovered})`);
await mp.screenshot({ path: join(OUT, 'm-session-note.png') });
await mp.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
await mp.waitForTimeout(700);
const mInside = await mp.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(); return [...document.querySelectorAll('.table-card')].every((c) => { const r = c.getBoundingClientRect(); return r.top >= b.top - 1 && r.bottom <= b.bottom + 1; }); });
ok(mScroll <= 0 && mInside, `mobile session: table fits the visible screen (scroll ${mScroll})`);
await mp.screenshot({ path: join(OUT, 'm-session.png') });
await mp.goto(`${BASE}/#/faces/present/${sid}`);
await mp.waitForTimeout(900);
await noHScroll('mobile present');
await mp.screenshot({ path: join(OUT, 'm-present.png') });
const csid = JSON.parse(JSON.parse(ls)['faces.sessions']).find((x) => x.game === 'coaching').id;
await mp.goto(`${BASE}/#/coaching/session/${csid}`);
await mp.reload();
await mp.locator('.lane .table-card img').first().waitFor();
await mp.waitForTimeout(1000);
await noHScroll('mobile coaching stages');
const cScroll = await mp.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const cInside = await mp.evaluate(() => [...document.querySelectorAll('.lane')].every((l) => { const b = l.getBoundingClientRect(); return [...l.querySelectorAll('.table-card')].every((c) => { const r = c.getBoundingClientRect(); return r.bottom <= b.bottom + 1 && r.left >= b.left - 1 && r.right <= b.right + 1; }); }));
ok(cScroll <= 0 && cInside, `mobile coaching: four lanes fit the visible screen (scroll ${cScroll})`);
await mp.screenshot({ path: join(OUT, 'm-coach-stages.png') });
await mp.goto(`${BASE}/#/faces/present/${sid}`);
await mp.waitForTimeout(600);
await mp.getByRole('button', { name: 'תפריט', exact: true }).tap();
await mp.getByRole('link', { name: 'ספריית פנים' }).tap();
await mp.waitForTimeout(500);
ok(mp.url().endsWith('#/faces/library'), 'mobile: menu navigation');

// ---------- התקנה ----------
{
  const pc = await chromium.launchPersistentContext(mkdtempSync(join(OUT, 'profile-')), { executablePath: CHROME });
  await mockSupabase(pc, createDb());
  const pp = pc.pages()[0] ?? (await pc.newPage());
  await pp.goto(BASE);
  await pp.evaluate(() => navigator.serviceWorker.ready);
  await pp.reload();
  await pp.waitForTimeout(1500);
  const cdp = await pc.newCDPSession(pp);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`);
  await pc.close();
}

ok(errors.length === 0, `no console/page errors ${errors.length ? JSON.stringify(errors) : ''}`);
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
