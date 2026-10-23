// בדיקת קצה לקצה מול vite preview: כל כפתור, כל דף, נייד ושולחן עבודה
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'screenshots';
mkdirSync(OUT, { recursive: true });
const FIX = join(OUT, 'fixtures');
mkdirSync(FIX, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('fonts.g') && errors.push(m.text()));

// תמונות בדיקה: דיוקנאות מופשטים מצוירים על canvas
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
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.beginPath(); g.arc(205, 280, 12, 0, 7); g.arc(295, 280, 12, 0, 7); g.fill();
    g.fillRect(215, 380 + (i % 3) * 6, 70, 6);
    out.push(c.toDataURL(i % 2 ? 'image/png' : 'image/jpeg', 0.9));
  }
  return out;
});
const files = shots.map((d, i) => {
  const ext = d.startsWith('data:image/png') ? 'png' : 'jpg';
  const p = join(FIX, `face-${i + 1}.${ext}`);
  writeFileSync(p, Buffer.from(d.split(',')[1], 'base64'));
  return p;
});
const bad = join(FIX, 'notes.txt');
writeFileSync(bad, 'not an image');
const fakeJpg = join(FIX, 'broken.jpg');
writeFileSync(fakeJpg, 'broken');

const noHScroll = async (p, label) => {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(w[0] <= w[1], `${label}: no horizontal scroll (${w[0]} <= ${w[1]})`);
};

// ---------- דף הבית ----------
await page.waitForSelector('.hero h1');
ok(await page.locator('.ring-card').count() >= 14, 'home: 3D ring rendered');
await page.screenshot({ path: join(OUT, '01-home-empty.png') });
ok((await page.locator('a.brand').getAttribute('href')) === '#/', 'brand links home');
ok((await page.getByRole('link', { name: 'שיחת הפיתוח' }).getAttribute('href')).includes('claude.ai/code/session_'), 'dev chat link');
ok((await page.getByRole('link', { name: 'פרויקט המחקר' }).getAttribute('href')).includes('claude.ai/chat/'), 'research link');
await page.getByRole('button', { name: 'העתקת קישור' }).click();
await page.getByText('הקישור הועתק').waitFor();
ok((await page.evaluate(() => navigator.clipboard.readText())).startsWith(BASE), 'copy link copies current URL');

// אין שגיאות התקנה: נבדק בפרופיל רגיל (לא גלישה בסתר), אחרי רישום ה-service worker
{
  const { mkdtempSync } = await import('node:fs');
  const dir = mkdtempSync(join(OUT, 'profile-'));
  const pc = await chromium.launchPersistentContext(dir, { executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
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
const manifest = await (await page.request.get(BASE + '/manifest.webmanifest')).json();
ok(manifest.icons.some((i) => i.sizes === '512x512') && manifest.icons.some((i) => i.sizes === '192x192'), 'manifest icons 192 + 512');

// ---------- ספריית פנים ----------
await page.getByRole('link', { name: 'ספריית פנים' }).first().click();
await page.getByText('הספרייה ריקה').waitFor();
ok(true, 'faces: empty state');
await page.getByTestId('face-input').setInputFiles([...files, bad, fakeJpg]);
await page.getByText('הלא הועלו', { exact: false }).or(page.getByText('קבצים לא הועלו')).first().waitFor();
await page.waitForFunction(() => document.querySelectorAll('.face-grid li').length === 7);
ok(await page.locator('.face-grid li').count() === 7, 'faces: 7 uploaded');
const errText = await page.locator('.error-panel').innerText();
ok(errText.includes('notes.txt') && errText.includes('broken.jpg'), 'faces: error panel lists bad files');
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, '02-faces.png') });
await page.locator('.error-panel').getByRole('button', { name: 'סגירה' }).click();
await page.locator('.face-grid li').last().getByRole('button', { name: /מחיקת/ }).click();
await page.getByRole('alertdialog').waitFor();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול' }).click();
ok(await page.locator('.face-grid li').count() === 7, 'faces: cancel keeps image');
await page.locator('.face-grid li').last().getByRole('button', { name: /מחיקת/ }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.getByText('התמונה נמחקה').waitFor();
await page.waitForFunction(() => document.querySelectorAll('.face-grid li').length === 6);
ok(true, 'faces: delete with confirm');

// ---------- השתקפויות ----------
await page.getByRole('link', { name: 'השתקפויות' }).first().click();
await page.getByText('הרשימה ריקה').waitFor();
await page.getByRole('button', { name: 'הוספה' }).click();
ok(await page.getByText('יש להזין מילה.').isVisible(), 'reflections: empty input error');
await page.locator('#word-input').fill('אומץ, געגוע, סקרנות, שקט, תנועה');
await page.getByRole('button', { name: 'הוספה' }).click();
await page.waitForFunction(() => document.querySelectorAll('.word-tile').length === 5);
await page.locator('#word-input').fill('אומץ');
await page.getByRole('button', { name: 'הוספה' }).click();
ok(await page.getByText('המילים כבר קיימות ברשימה.').isVisible(), 'reflections: duplicate guarded');
await page.getByLabel('עריכת המילה תנועה').fill('תנועה פנימית');
await page.getByRole('button', { name: 'פחות' }).click();
await page.getByRole('button', { name: 'פחות' }).click();
ok((await page.locator('.stepper .mono').innerText()) === '6', 'reflections: blanks stepper');
await page.getByRole('button', { name: 'יותר' }).click();
await page.getByRole('button', { name: 'מחיקת שקט' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.waitForFunction(() => document.querySelectorAll('.word-tile').length === 4);
ok(true, 'reflections: delete with confirm');
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '03-reflections.png') });

// ---------- סשן ----------
await page.locator('a.brand').click();
await page.getByRole('button', { name: /סשן חדש/ }).click();
await page.getByText('השולחן ריק').waitFor();
ok(page.url().includes('#/session/'), 'session: new session route');
await page.getByLabel('שם הסשן').fill('סשן בדיקה');
await page.getByRole('radio', { name: 'קבוצתי' }).click();
await page.getByPlaceholder('משתתפים').fill('דנה, יואב');
await page.getByRole('button', { name: /שליפת פנים/ }).click();
await page.getByRole('button', { name: /שליפת השתקפות/ }).click();
await page.getByRole('button', { name: 'שליפת זוג' }).click();
await page.waitForFunction(() => document.querySelectorAll('.slot').length === 4);
ok(true, 'session: draw face, reflection, pair');
const firstFace = await page.locator('.slot').first().locator('img').getAttribute('src');
await page.locator('.slot').first().locator('textarea').fill('מבט שמזכיר לי את סבתא');
await page.locator('.slot').first().getByRole('button', { name: 'החלפה' }).click();
await page.waitForTimeout(400);
const replaced = await page.locator('.slot').first().locator('img').getAttribute('src');
ok(replaced && replaced !== firstFace, 'session: replace swaps the card');
ok((await page.locator('.slot').first().locator('textarea').inputValue()) === 'מבט שמזכיר לי את סבתא', 'session: note kept on replace');
await page.getByRole('button', { name: /שליפת פנים/ }).click();
await page.waitForFunction(() => document.querySelectorAll('.slot').length === 5);
await page.locator('.slot').last().getByRole('button', { name: 'הסרה' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'הסרה' }).click();
await page.waitForFunction(() => document.querySelectorAll('.slot').length === 4);
ok(true, 'session: remove with confirm');
await page.locator('#summary').fill('תובנה: לשים לב לגעגוע');
await page.getByRole('button', { name: 'שמירה' }).click();
await page.getByText('הסשן נשמר').waitFor();
ok(await page.getByRole('button', { name: 'נשמר' }).isDisabled(), 'session: saved confirmation');
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '04-session.png'), fullPage: true });

// מיצוי חפיסה: כל הפנים
for (let i = 0; i < 8; i++) {
  const btn = page.getByRole('button', { name: /שליפת פנים/ });
  if (await btn.isDisabled()) break;
  await btn.click();
}
ok(await page.getByText('כל הפנים נשלפו').isVisible(), 'session: exhausted deck state');
await page.getByRole('button', { name: 'ביטול שינויים' }).click();
await page.getByRole('alertdialog').getByRole('button', { name: 'ביטול שינויים' }).click();
await page.waitForFunction(() => document.querySelectorAll('.slot').length === 4);
ok(true, 'session: discard changes reverts');

// ---------- תצוגת קבוצה ----------
await page.getByRole('button', { name: 'תצוגת קבוצה' }).click();
await page.locator('.carousel-card.current').waitFor();
ok((await page.locator('.counter').innerText()).includes('01 / 04'), 'present: starts at 1');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(500);
ok((await page.locator('.counter').innerText()).includes('02'), 'present: ArrowLeft advances');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
ok((await page.locator('.counter').innerText()).includes('01'), 'present: ArrowRight goes back');
await page.getByRole('button', { name: 'הבא' }).click();
await page.getByRole('button', { name: 'הבא' }).click();
ok((await page.locator('.counter').innerText()).includes('03'), 'present: next button');
await page.getByRole('button', { name: 'הקודם' }).click();
await page.getByRole('button', { name: 'הצגת הערות' }).click();
ok(await page.getByRole('button', { name: 'הסתרת הערות' }).isVisible(), 'present: notes toggle');
await page.keyboard.press('Home');
await page.waitForTimeout(900);
ok(await page.locator('.present-note').isVisible(), 'present: note shown');
await page.screenshot({ path: join(OUT, '05-present.png') });
await page.getByRole('button', { name: 'מסך מלא' }).click();
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.getByRole('link', { name: 'חזרה לסשן' }).click();
await page.locator('.session-head').waitFor();
ok(true, 'present: back to session');

// ---------- היסטוריה ----------
await page.getByRole('link', { name: 'היסטוריה' }).first().click();
await page.locator('.history li').first().waitFor();
await page.getByRole('button', { name: 'שכפול' }).click();
await page.waitForFunction(() => document.querySelectorAll('.history li').length === 2);
ok(await page.getByText('סשן בדיקה (עותק)').isVisible(), 'history: duplicate');
for (const [name, ext] of [['JSON', 'json'], ['CSV', 'csv'], ['ייצוא הכל JSON', 'json'], ['ייצוא הכל CSV', 'csv']]) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name, exact: true }).first().click()]);
  const p = join(OUT, `export.${ext}`);
  await dl.saveAs(p);
  const body = readFileSync(p, 'utf8');
  ok(dl.suggestedFilename().endsWith(ext) && body.includes('סשן בדיקה'), `history: export ${name} (${dl.suggestedFilename()}, ${body.length} chars)`);
  if (ext === 'csv') ok(body.includes('מבט שמזכיר לי את סבתא'), `history: ${name} includes notes`);
}
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '06-history.png') });
await page.getByRole('button', { name: 'מחיקה' }).first().click();
await page.getByRole('alertdialog').getByRole('button', { name: 'מחיקה' }).click();
await page.waitForFunction(() => document.querySelectorAll('.history li').length === 1);
ok(true, 'history: delete with confirm');
await page.getByRole('button', { name: 'פתיחה' }).click();
await page.locator('.slot').first().waitFor();
ok((await page.getByLabel('שם הסשן').inputValue()) === 'סשן בדיקה', 'history: open loads session');

// התמדה אחרי רענון
await page.reload();
await page.locator('.slot').first().waitFor();
ok(await page.locator('.slot img').first().waitFor({ timeout: 5000 }).then(() => true, () => false), 'persistence: images reload from IndexedDB');

await page.locator('a.brand').click();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, '07-home-full.png') });

// ---------- נייד ----------
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
await mp.goto(BASE);
// מעתיק את הנתונים מהקונטקסט הראשון כדי לבדוק דפים מלאים
const ls = await page.evaluate(() => JSON.stringify(localStorage));
await mp.evaluate((d) => Object.entries(JSON.parse(d)).forEach(([k, v]) => localStorage.setItem(k, v)), ls);
await mp.reload();
for (const [hash, name] of [['#/', 'home'], ['#/faces', 'faces'], ['#/reflections', 'reflections'], ['#/history', 'history']]) {
  await mp.goto(BASE + '/' + hash);
  await mp.reload();
  await mp.waitForTimeout(900);
  await noHScroll(mp, `mobile ${name}`);
  await mp.screenshot({ path: join(OUT, `m-${name}.png`) });
}
const sid = JSON.parse(JSON.parse(ls)['faces.sessions'])[0].id;
await mp.goto(`${BASE}/#/session/${sid}`);
await mp.locator('.slot').first().waitFor();
ok(true, 'mobile: saved session opens');
await mp.waitForTimeout(1000);
await noHScroll(mp, 'mobile session');
await mp.screenshot({ path: join(OUT, 'm-session.png'), fullPage: true });
await mp.goto(`${BASE}/#/present/${sid}`);
await mp.waitForTimeout(900);
await noHScroll(mp, 'mobile present');
await mp.screenshot({ path: join(OUT, 'm-present.png') });
await mp.getByRole('button', { name: 'תפריט' }).tap();
await mp.getByRole('link', { name: 'ספריית פנים' }).tap();
await mp.waitForTimeout(500);
ok(mp.url().endsWith('#/faces'), 'mobile: menu navigation');
await mp.screenshot({ path: join(OUT, 'm-menu.png') });

ok(errors.length === 0, `no console/page errors ${errors.length ? JSON.stringify(errors) : ''}`);
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
