// בדיקת קצה לקצה מול vite preview, עם מוק ל-Supabase: צפייה, עריכה, ללא רשת, נייד והתקנה
import { chromium } from 'playwright';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb, mockSupabase } from './supa-mock.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'screenshots';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
mkdirSync(OUT, { recursive: true });
const FIX = join(OUT, 'fixtures');
const isoDay = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const DUE_SOON = isoDay(2);
const DUE_LATE = isoDay(-1);
mkdirSync(FIX, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const count = (p, sel) => p.locator(sel).count();
const waitCount = (p, sel, n) => p.waitForFunction(([s, k]) => document.querySelectorAll(s).length === k, [sel, n]);


// זיהוי דיבור מדומה: לדפדפן בבדיקה אין מיקרופון. מחזיר תמלול ביניים ואז תמלול סופי
const fakeSpeech = () => {
  class FakeRec {
    start() {
      window.__recStarts = (window.__recStarts || 0) + 1;
      setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'מה' } }] }), 40);
      setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: window.__say || 'מה שעלה לי מהקלף' } }] }), 120);
    }
    stop() { setTimeout(() => this.onend?.(), 40); }
    abort() {}
  }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
};
const browser = await chromium.launch({ executablePath: CHROME });
const db = createDb();
// ה-service worker מסתיר בקשות מהמוק, ולכן חסום כאן. ההתקנה נבדקת בנפרד עם service worker פעיל
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
await mockSupabase(ctx, db);
await ctx.addInitScript(fakeSpeech);
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
ok(await count(page, '.game-box') === 2, 'suite: two tools (פנים, coaching game)');
await page.locator('.fan-card img').first().waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '00-suite.png') });
await page.getByRole('button', { name: 'כניסה לפנים' }).click();
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
await page.locator('.faces-journey').waitFor();
ok(page.url().includes('#/faces/session/'), 'session: new session route');
ok(await page.getByRole('radio', { name: 'מסע שלוש מראות' }).getAttribute('aria-checked') === 'true', 'faces: default form is the three-mirror journey');
await page.getByRole('radio', { name: 'זוגות' }).click();
await page.getByText('השולחן ריק').waitFor();
ok(true, 'faces: pairs form still available as a free table');
await page.getByLabel('שם הסשן', { exact: true }).fill('סשן בדיקה');
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
// הקלטה ותמלול: התמלול נכתב לתוך השדה, ונוסף לטקסט שכבר הוקלד
await page.getByRole('button', { name: 'הקלטה להערה' }).click();
await page.locator('.dictate-live').waitFor();
ok(await page.locator('.dictate-live').isVisible(), 'dictation: live transcript shown while recording');
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'סיום הקלטה להערה' }).click();
await page.waitForFunction(() => document.querySelector('.drawer textarea').value.includes('מה שעלה לי מהקלף'));
ok((await page.locator('.drawer textarea').inputValue()) === 'מבט שמזכיר לי את סבתא מה שעלה לי מהקלף', 'dictation: note appended after typed text');
ok(await page.locator('.dictate-live').waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false), 'dictation: live transcript closes after stop');
await page.evaluate(() => (window.__say = 'סשן הקלטה'));
await page.getByRole('button', { name: 'הקלטה לשם הסשן' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'סיום הקלטה לשם הסשן' }).click();
await page.waitForFunction(() => document.querySelector('.stage-title').value === 'סשן הקלטה');
ok(true, 'dictation: session title replaced by transcript');
await page.getByLabel('שם הסשן', { exact: true }).fill('סשן בדיקה');
await page.evaluate(() => (window.__say = 'מה שעלה לי מהקלף'));
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
await page.evaluate(() => (window.__say = 'והצעד הבא'));
await page.getByRole('button', { name: 'הקלטה לסיכום' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'סיום הקלטה לסיכום' }).click();
await page.waitForFunction(() => document.querySelector('#summary').value === 'תובנה: לשים לב לגעגוע והצעד הבא');
ok(true, 'dictation: summary appended');
await page.locator('#summary').fill('תובנה: לשים לב לגעגוע');
await page.screenshot({ path: join(OUT, '04b-session-details.png') });
await page.locator('.drawer').getByRole('button', { name: 'סגירה' }).click();
await page.getByRole('button', { name: 'שמירה' }).click();
await page.getByText('הסשן נשמר').waitFor();
ok(await page.getByRole('button', { name: 'נשמר' }).isDisabled(), 'session: saved confirmation');

await page.getByRole('radio', { name: 'פנים בלבד' }).click();
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

// ---------- קיר ההתחייבויות ----------
await page.getByRole('link', { name: 'קיר ההתחייבויות' }).first().click();
await page.locator('.wall li').first().waitFor();
ok(await count(page, '.wall li') === 1, 'wall: saved session hangs on the wall');
ok(await page.getByRole('button', { name: /שכפול|JSON|CSV/ }).count() === 0, 'wall: no duplicate or export buttons');
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '06-history.png') });
await page.locator('.wall-open').first().click();
await page.locator('.table-card').first().waitFor();
ok((await page.getByLabel('שם הסשן', { exact: true }).inputValue()) === 'סשן בדיקה', 'wall: clicking the card opens the session');
await page.reload();
await page.locator('.table-card img').first().waitFor();
ok(true, 'persistence: session survives reload');

// ---------- משחק האימון: תהליך מודרך במפת שלוש תחנות ----------
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
await page.locator('.journey').waitFor();
ok(page.url().includes('#/coaching/session/'), 'coaching: new session route');
ok(await page.getByRole('radio', { name: 'מפת שלוש תחנות' }).getAttribute('aria-checked') === 'true', 'coaching: default form is the three-station map');
ok(await page.getByRole('button', { name: /02 בחירה עיוורת/ }).isDisabled(), 'journey: step 2 locked until a topic is set');
await page.getByLabel('שם הסשן', { exact: true }).fill('אימון בדיקה');
// שלב 1: נושא, גם בהקלטה
await page.evaluate(() => (window.__say = 'הפחד לפתוח עסק עצמאי'));
await page.getByRole('button', { name: 'הקלטה לנושא' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'סיום הקלטה לנושא' }).click();
await page.waitForFunction(() => document.querySelector('textarea[aria-label="הנושא"]').value === 'הפחד לפתוח עסק עצמאי');
ok(true, 'journey step 1: topic by dictation');
await page.screenshot({ path: join(OUT, '10a-journey-topic.png') });
await page.getByRole('button', { name: 'המשך לבחירת הקלפים' }).click();
// שלב 2: בחירה עיוורת של שלושה קלפים הפוכים
await waitCount(page, '.back-card', 65);
ok(await count(page, '.map-empty') === 3, 'journey step 2: 65 face-down cards and 3 empty positions');
await page.locator('.back-card').nth(5).click();
await page.locator('.back-card').nth(20).click();
ok(await page.locator('.blind h2').innerText() === 'שלוף קלף לעמדה 3: החוסם / מה שביניהם', 'journey step 2: next position named');
await page.locator('.back-card').nth(40).click();
await waitCount(page, '.back-card', 62);
ok(await page.locator('.back-card').first().isDisabled(), 'journey step 2: deck locked after three cards');
ok(await count(page, '.step-btn:disabled') === 3, 'journey: steps 3 to 5 locked until the cards are flipped');
const flipBefore = await page.locator('.map-flip').first().evaluate((e) => getComputedStyle(e).transform);
await page.getByRole('button', { name: 'הפיכת הקלפים' }).click();
await page.waitForTimeout(1800);
const flipAfter = await page.locator('.map-flip').first().evaluate((e) => getComputedStyle(e).transform);
ok(flipBefore !== flipAfter, 'journey step 2: cards flip only after all three are placed');
await fitsViewport(page, 'journey blind draw');
await page.screenshot({ path: join(OUT, '10b-journey-blind.png') });
await page.getByRole('button', { name: 'המשך לחקירת התחנות' }).click();
// שלב 3: שלוש התחנות ובניית התובנה
await page.locator('.station-panel').waitFor();
ok((await page.locator('.station-panel h2').innerText()) === 'איפה אני נמצא כרגע בנושא?', 'journey step 3: station 1 is "me"');
ok(await count(page, '.questions li') === 2 && (await page.locator('.inspiration').innerText()).length > 10, 'journey step 3: leading questions and an inspiration line');
await page.getByLabel('מה מתגבש בתחנה 1').fill('אף אחד לא תומך בהחלטות שלי');
await page.getByRole('button', { name: 'לתחנה 2' }).click();
ok((await page.locator('.station-panel h2').innerText()) === 'מה המטרה, או מי הצד השני?', 'journey step 3: station 2 is the other / desired state');
await page.getByLabel('מה מתגבש בתחנה 2').fill('אני מחפש עצמאות');
await page.getByRole('button', { name: 'לתחנה 3' }).click();
ok((await page.locator('.station-panel h2').innerText()) === 'מה מונע ממני להגיע לשם?', 'journey step 3: station 3 is the blocker');
await page.getByLabel('מה מתגבש בתחנה 3').fill('הפחד לאכזב את ההורים');
await page.screenshot({ path: join(OUT, '10c-journey-station.png') });
await page.getByRole('button', { name: 'בניית התובנה' }).click();
ok((await page.locator('.station-notes').innerText()).includes('אני מחפש עצמאות'), 'journey step 3: insight view gathers the three stations');
await page.getByLabel('התובנה', { exact: true }).fill('אני תקוע כי אני מחויב לציפיות של אחרים ולא לחופש שלי');
await page.locator('.map-slot').first().click();
ok((await page.locator('.station-panel h2').innerText()) === 'איפה אני נמצא כרגע בנושא?', 'journey step 3: clicking a map card opens its station');
await page.getByRole('tab', { name: 'התובנה' }).click();
await page.getByRole('button', { name: 'המשך למנוף לפעולה' }).click();
// שלב 4: כרטיס מיקוד והתחייבות
await waitCount(page, '.focus-card', 16);
ok((await page.locator('.insight-quote').innerText()).includes('מחויב לציפיות'), 'journey step 4: insight carried to the action step');
await page.getByRole('button', { name: 'שמירה והמשך לתמונת ההתחייבות' }).click();
await page.getByText('כדאי לבחור קודם כרטיס מיקוד').waitFor();
ok(true, 'journey step 4: save asks for a focus card first');
await page.locator('.focus-card').first().click();
ok((await page.locator('.commit h2').innerText()) === 'מהו הדבר הקטן ביותר שאוכל לעשות כבר מחר?', 'journey step 4: chosen focus card leads the commitment');
await page.locator('#act-what').fill('לקבוע פגישת ייעוץ של חצי שעה עם רואה חשבון');
await page.locator('#act-when').fill('ביום ראשון ב-10:00');
await page.locator('#act-measure').fill('הפגישה ביומן');
await page.locator('#act-due').fill(DUE_SOON);
ok(await count(page, '.checks .ok') === 3, 'journey step 4: concrete, measurable and time-bound all marked');
await fitsViewport(page, 'journey action step');
await page.screenshot({ path: join(OUT, '10d-journey-action.png') });
await page.getByRole('button', { name: 'שמירה והמשך לתמונת ההתחייבות' }).click();
await page.getByText('הסשן נשמר').waitFor();
await page.locator('.vision-step').waitFor();
ok(true, 'journey: process saved, step 5 opens');
ok(await page.getByRole('button', { name: 'יצירת התמונה' }).isEnabled() && await page.getByText('מפתח עריכה').count() === 0, 'vision: image creation open to everyone, no key');
ok((await page.locator('.vision-what').innerText()).includes('רואה חשבון'), 'vision: commitment shown inside the card frame');
await page.screenshot({ path: join(OUT, '10e-journey-vision-viewer.png') });
await page.reload();
await page.locator('.vision-step').waitFor();
await page.getByRole('button', { name: /04 מנוף לפעולה/ }).click();
await page.locator('.commit').waitFor();
ok((await page.locator('#act-when').inputValue()) === 'ביום ראשון ב-10:00' && (await page.locator('#act-due').inputValue()) === DUE_SOON, 'journey: step and commitment survive reload');
await page.getByRole('radio', { name: 'חופשי' }).click();
await page.locator('.board-grid').waitFor();
ok(await count(page, '.table-card') === 3, 'coaching: free form shows the chosen cards on one table');
await page.getByRole('radio', { name: 'מפת שלוש תחנות' }).click();
await page.getByRole('button', { name: 'תצוגת קבוצה' }).click();
await page.locator('.carousel-card.current').waitFor();
ok((await page.locator('.counter').innerText()).includes('01 / 03'), 'coaching present: one unit per station');
ok((await page.locator('.carousel-card.current .stage-chip').innerText()) === 'אני', 'coaching present: station label');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '11-coach-present.png') });
await page.getByRole('link', { name: 'חזרה לסשן' }).click();
await page.getByRole('link', { name: 'קיר ההתחייבויות' }).click();
await page.locator('.wall li').first().waitFor();
ok(await count(page, '.wall li') === 1 && (await page.locator('.wall').innerText()).includes('אימון בדיקה'), 'coaching wall shows only coaching sessions');
ok((await page.locator('.wall-next').innerText()).includes('רואה חשבון') && (await page.locator('.wall-next .due').innerText()) === 'עוד 2 ימים', 'wall: the next step waiting for me, with days left');
await page.goto(`${BASE}/#/faces/history`);
await page.locator('.wall li').first().waitFor();
ok(!(await page.locator('.wall').innerText()).includes('אימון בדיקה'), 'faces wall does not show coaching sessions');

// ---------- מצב עריכה ----------
const writesBefore = db.requests.filter((r) => !r.startsWith('GET') && !r.includes('/rpc/')).length;
ok(writesBefore === 0, 'viewer made no write requests');
ok(await count(page, '.face-grid button') === 0, 'viewer: no edit controls');
await page.locator('ai-menu .logo').click();
ok(await page.getByRole('menuitem', { name: /כניסה לעריכה|ניתוק/ }).count() === 0, 'A&I: no key entry and no disconnect, editing is free');
await page.screenshot({ path: join(OUT, '06b-studio-viewer.png') });
await page.getByRole('menuitem', { name: 'עריכת ספריית פנים' }).click();
await page.getByText('מצב עריכה. כל שינוי').waitFor();
ok(true, 'A&I: one click opens the library in edit mode, no key');
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
await page.locator('#word-input').fill('');
await page.evaluate(() => (window.__say = 'ענווה'));
await page.getByRole('button', { name: 'הקלטה למילה חדשה' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: 'סיום הקלטה למילה חדשה' }).click();
await page.waitForFunction(() => document.querySelector('#word-input').value === 'ענווה');
ok(true, 'dictation: new reflection word');
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

// ---------- מסע פנים: שלוש מראות, התחייבות ותמונה ----------
db.visionImage = readFileSync(files[0]);
await page.goto(`${BASE}/#/faces`);
await page.getByRole('button', { name: /סשן חדש/ }).click();
await page.locator('.faces-journey').waitFor();
await page.getByLabel('שם הסשן', { exact: true }).fill('מסע בדיקה');
ok(await count(page, '.step-btn') === 5 && await page.getByRole('button', { name: /02 הנחת הזוגות/ }).isDisabled(), 'faces journey: five steps, step 2 locked until a topic is set');
await page.getByLabel('הנושא', { exact: true }).fill('איך אני נוכחת בבית אחרי העבודה');
await page.getByRole('button', { name: 'המשך להנחת הזוגות' }).click();
await waitCount(page, '.open-face', 66);
ok(await count(page, '.mirror') === 3 && (await page.locator('.blind h2').innerText()).includes('מרגישות כמוך עכשיו'), 'faces journey step 2: faces open for choice, three mirrors');
await page.waitForTimeout(1200);
await fitsViewport(page, 'faces journey open faces');
await page.screenshot({ path: join(OUT, '13a-faces-pairs.png') });
for (let i = 0; i < 3; i++) {
  await page.locator('.open-face').nth(3 + i).click();
  await page.locator('.back-card.back-refl').first().waitFor();
  ok(i > 0 || (await page.locator('.blind h2').innerText()).includes('שלוף השתקפות הפוכה'), 'faces journey step 2: after a face, a reflection is drawn blind');
  await page.locator('.back-card.back-refl').nth(7 + i).click();
  await page.waitForTimeout(300);
}
await page.getByRole('button', { name: 'המשך לחקירת המראות' }).waitFor();
ok(await page.locator('.mirror .card-face.face').count() === 3 && await page.locator('.mirror .card-face.reflection').count() === 3, 'faces journey step 2: three pairs of face and reflection');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '13b-faces-pairs-done.png') });
await page.getByRole('button', { name: 'המשך לחקירת המראות' }).click();
await page.locator('.station-panel').waitFor();
ok((await page.locator('.station-panel h2').innerText()) === 'איך אני נראה מבפנים, עכשיו?', 'faces journey step 3: mirror 1 is the face of now');
await page.getByLabel('מה עולה במראה 1').fill('עייפות שמסתירה געגוע');
await page.getByRole('button', { name: 'למראה 2' }).click();
await page.getByLabel('מה עולה במראה 2').fill('כעס על עצמי');
await page.getByRole('button', { name: 'למראה 3' }).click();
ok((await page.locator('.station-panel h2').innerText()) === 'איך ייראו הפנים שלי אחרי הצעד?', 'faces journey step 3: mirror 3 is the face I want to meet');
await page.getByLabel('מה עולה במראה 3').fill('שקט שמגיע מהחלטה');
await page.screenshot({ path: join(OUT, '13c-faces-mirror.png') });
await page.getByRole('button', { name: 'בניית התובנה' }).click();
await page.getByLabel('התובנה', { exact: true }).fill('הגעגוע הוא ההזמנה לעצור בפתח');
await page.getByRole('button', { name: 'המשך למנוף לפעולה' }).click();
await waitCount(page, '.companion', 3);
await page.locator('.companion').nth(2).click();
ok((await page.locator('.commit h2').innerText()) === 'צעד אחד, עם הפנים שאני רוצה לפגוש', 'faces journey step 4: the chosen face leads the commitment');
await page.locator('#act-what').fill('עשר דקות בלי טלפון בכניסה הביתה');
await page.locator('#act-when').fill('כל ערב השבוע');
await page.locator('#act-due').fill(DUE_LATE);
await page.locator('#act-measure').fill('סימון ביומן כל ערב');
await fitsViewport(page, 'faces journey action step');
await page.screenshot({ path: join(OUT, '13d-faces-action.png') });
await page.getByRole('button', { name: 'שמירה והמשך לתמונת ההתחייבות' }).click();
await page.locator('.vision-step').waitFor();
ok(await page.getByRole('button', { name: 'יצירת התמונה' }).isEnabled(), 'vision (editor): image creation enabled');
await page.getByRole('button', { name: 'יצירת התמונה' }).click();
await page.locator('.vision-photo img').waitFor();
ok(await page.waitForFunction(() => { const i = document.querySelector('.vision-photo img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).then(() => true, () => false), 'vision: image appears inside the card frame');
ok((await page.locator('.vision-distill').innerText()) === 'הצעד הראשון כבר מואר', 'vision: distilled sentence on the card');
const vp = db.visions[0];
ok(vp && vp.topic.includes('נוכחת בבית') && vp.cards.length === 6 && vp.cards.some((c) => c.mood) && vp.action.what.includes('בלי טלפון') && vp.focus === 'הפנים שאני רוצה לפגוש', 'vision: the prompt is built from the whole session (topic, pairs, moods, commitment)');
await page.locator('.vision-prompt-text').waitFor();
await page.getByRole('button', { name: 'העתקה באנגלית' }).waitFor();
ok((await page.locator('.vision-prompt-text').innerText()).includes('Documentary realism, Professional architecture photography, 1:1') && await page.getByRole('button', { name: 'העתקת הפרומפט' }).isVisible() && await page.getByRole('button', { name: 'העתקה באנגלית' }).isVisible(), 'vision: prompt always shown, with copy buttons (Hebrew and English)');
// מכסה שנגמרה: הפרומפט חוזר, התמונה הקודמת נשארת, ואין שגיאה אדומה
const firstSrc = await page.locator('.vision-photo img').getAttribute('src');
db.visionFail = true;
await page.getByRole('button', { name: 'תמונה אחרת' }).click();
await page.locator('.vision-side .status-line[role=status]').waitFor();
ok((await page.locator('.vision-side .status-line[role=status]').innerText()).includes('הפרומפט מוכן להעתקה') && await page.locator('.vision-side .status-line.error').count() === 0 && (await page.locator('.vision-photo img').getAttribute('src')) === firstSrc && await page.locator('.vision-prompt-text').isVisible(), 'vision: when no free engine returns an image, the prompt still arrives and nothing breaks');
db.visionFail = false;
await page.getByRole('button', { name: 'פרומפט חדש' }).click();
await page.waitForFunction(() => !document.querySelector('.vision-side button[disabled]'));
ok(db.visions.at(-1).mode === 'prompt' && (await page.locator('.vision-photo img').getAttribute('src')) === firstSrc, 'vision: prompt only, without touching the image');
// תמונה שנוצרה ידנית נכנסת למסגרת
await page.locator('input[aria-label="העלאת תמונה משלי"]').setInputFiles(files[0]);
await page.waitForFunction(() => (document.querySelector('.vision-photo img')?.getAttribute('src') ?? '').includes('visions/own-'), null, { timeout: 8000 }).catch(() => {});
ok((await page.locator('.vision-photo img').getAttribute('src') ?? '').includes('visions/own-'), 'vision: my own image (made from the prompt) goes into the card frame');
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, '13e-faces-vision.png') });
await page.getByRole('link', { name: 'קיר ההתחייבויות' }).click();
await waitCount(page, '.wall li', 2);
ok((await page.locator('.wall li').first().innerText()).includes('בלי טלפון') && await page.locator('.wall li').first().locator('.vision-photo img').count() === 1, 'wall: the overdue commitment comes first, with its image in the card frame');
ok((await page.locator('.wall-next .due').innerText()) === 'המועד עבר אתמול', 'wall: overdue marked');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '13f-wall.png') });
await page.locator('.wall li').first().getByRole('button', { name: 'עשיתי' }).click();
await page.getByLabel('מה קרה כשעשיתי?').fill('הבית נשמע אחרת');
await page.getByRole('button', { name: 'סגירת המעגל' }).click();
await page.getByText('המעגל נסגר').waitFor();
await page.waitForTimeout(1800);
ok(await page.locator('.vision-stamp').count() === 1 && (await page.locator('.wall li').last().innerText()).includes('הבית נשמע אחרת') && (await page.locator('.wall-meter').innerText()).includes('1 בוצעו'), 'wall: closing the loop stamps the card and moves it to the end');
await page.screenshot({ path: join(OUT, '13g-wall-done.png') });
await page.locator('.wall li').last().getByRole('button', { name: 'מחיקה' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await waitCount(page, '.wall li', 1);
ok(true, 'wall: delete with confirm');

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
await m.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
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
const sid = JSON.parse(JSON.parse(ls)['faces.sessions']).find((x) => (x.game ?? 'faces') === 'faces' && x.form === 'pairs').id;
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
await mp.getByRole('button', { name: 'הקלטה להערה' }).tap();
await mp.getByText('הדפדפן הזה לא תומך בהקלטה ותמלול').waitFor();
ok(true, 'dictation: unsupported browser explains instead of failing');
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
await mp.locator('.vision-step').waitFor();
await mp.waitForTimeout(800);
await noHScroll('mobile vision step');
await mp.screenshot({ path: join(OUT, 'm-vision.png') });
await mp.getByRole('button', { name: /04 מנוף לפעולה/ }).tap();
await mp.locator('.commit').waitFor();
await mp.waitForTimeout(800);
await noHScroll('mobile coaching journey');
const cScroll = await mp.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
ok(cScroll <= 0, `mobile coaching: the journey step fits the screen, the page does not scroll (scroll ${cScroll})`);
await mp.screenshot({ path: join(OUT, 'm-coach-journey.png') });
await mp.getByRole('button', { name: /03 חקירת התחנות/ }).tap();
await mp.locator('.station-panel').waitFor();
await mp.waitForTimeout(600);
await noHScroll('mobile coaching stations');
await mp.screenshot({ path: join(OUT, 'm-coach-stations.png') });
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
