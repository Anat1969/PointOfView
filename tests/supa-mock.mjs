// מוק ל-Supabase: PostgREST, RPC ואחסון, עם בדיקת מפתח עריכה כמו ה-RLS האמיתי
export const TEST_KEY = 'test-editor-key-1234567890';
const EXPR = ['שמחה', 'עצב', 'הפתעה', 'כעס', 'מחשבה', 'שלווה', 'צחוק', 'דאגה', 'חיוך עקום', 'עייפות'];
export const COACH_WORDS = ['אפשרות', 'מעבר', 'פתיחות', 'צעד', 'חיבור', 'אופק', 'שורשים', 'מסע', 'עלייה', 'שער', 'מנוחה', 'אמת', 'גבולות', 'הזדמנות', 'ויתור', 'בהירות', 'סבלנות', 'תנועה', 'איזון', 'החלטה', 'נקודת מבט', 'מרחב', 'זמן', 'אור', 'צל', 'עומק', 'קלילות', 'אחיזה', 'שחרור', 'כיוון', 'מפגש', 'קשב', 'דמיון', 'כוונה', 'משאב', 'תמיכה', 'תעוזה', 'ספקנות', 'ציפייה', 'התחדשות', 'פשטות', 'מורכבות', 'יציבות', 'זרימה', 'משמעות', 'ערכים', 'חזון', 'מחויבות', 'הודיה', 'שקט פנימי', 'קשר', 'גמישות', 'למידה', 'טעות', 'הצלחה', 'חשש', 'משאלה', 'מקום', 'דרך חדשה', 'נשימה', 'ראייה', 'נוכחות', 'השראה', 'פריחה', 'בחירה חופשית'];
const WORDS = ['אומץ', 'פחד', 'געגוע', 'שמחה', 'בדידות', 'שייכות', 'אמון', 'ספק', 'חופש', 'גבול', 'כעס', 'סליחה', 'תקווה', 'אכזבה', 'סקרנות', 'שקט', 'מנוחה', 'תנועה', 'שינוי', 'הרגל', 'בית', 'דרך', 'משפחה', 'חברות', 'אהבה', 'קנאה', 'גאווה', 'בושה', 'הכרת תודה', 'אחריות', 'שליטה', 'שחרור', 'חלום', 'זיכרון', 'עתיד', 'רגע', 'משחק', 'יצירה', 'כוח', 'פגיעות', 'הקשבה', 'שתיקה', 'מגע', 'מרחק', 'צמיחה', 'סיום', 'התחלה', 'בחירה', 'נדיבות', 'אני'];

export function createDb() {
  return {
    faces_faces: Array.from({ length: 60 }, (_, i) => ({ id: `starter-${i + 1}`, name: `${String(i + 1).padStart(2, '0')} · ${EXPR[i % 10]}`, image_path: null, starter: i + 1, sort: i + 1 })),
    faces_words: WORDS.map((text, i) => ({ id: `starter-w${i + 1}`, text, sort: i + 1 })),
    faces_settings: [{ id: 1, blanks: 8 }],
    faces_coach_cards: COACH_WORDS.map((word, i) => ({ id: `coach-${i + 1}`, word, image_path: null, starter: i + 1, sort: i + 1 })),
    files: new Map(),
    visions: [],
    visionFiles: new Map(),
    visionImage: null,
    requests: [],
    offline: false,
  };
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export async function mockSupabase(ctx, db) {
  // ai-menu.js: AI_MENU_JS points to a local copy when the network is closed
  if (process.env.AI_MENU_JS) await ctx.route('https://appofapp-gh.vercel.app/ai-menu.js', (r) => r.fulfill({ path: process.env.AI_MENU_JS, contentType: 'application/javascript' }));
  await ctx.route('https://ktqmwpbzcnzkhjskqisy.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    // עריכה חופשית לכולם (בקשת ענת): faces_is_admin() מחזירה true
    const isEditor = true;
    db.requests.push(`${method} ${url.pathname}${url.search}`);
    if (db.offline) return route.fulfill({ status: 503, body: 'down' });

    if (url.pathname === '/rest/v1/rpc/faces_can_edit') return json(route, isEditor);

    // תמונת ההתחייבות: הפונקציה האמיתית בונה פרומפט ב-Claude ומצלמת ב-fal. כאן מחזירים תמונה קבועה
    if (url.pathname === '/functions/v1/faces-vision') {
      if (!isEditor) return json(route, { error: 'יצירת תמונה זמינה במכשיר שנכנס עם מפתח עריכה (לוגו A&I).' }, 403);
      const body = JSON.parse(req.postData() ?? '{}');
      db.visions.push(body);
      const path = `visions/${body.sessionId}-${db.visions.length}.jpg`;
      db.visionFiles.set(path, db.visionImage);
      return json(route, { path, distill: 'הצעד הראשון כבר מואר', prompt: 'פרומפט בדיקה, Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --no text, words, writing, frame divisions', title: 'הדלת שנפתחה' });
    }

    const rest = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
    if (rest) {
      const table = db[rest[1]];
      if (!table) return json(route, { message: 'no table' }, 404);
      const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
      const match = (r) => idEq == null || String(r.id) === idEq;
      if (method === 'GET') return json(route, table.filter(match).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)));
      if (!isEditor) return json(route, { message: 'new row violates row-level security policy' }, 403);
      if (method === 'POST') {
        const body = req.postDataJSON();
        const rows = Array.isArray(body) ? body : [body];
        if ((rest[1] === 'faces_faces' || rest[1] === 'faces_coach_cards') && table.length + rows.length > 99) return json(route, { message: 'faces_faces limit 99' }, 400);
        table.push(...rows);
        return route.fulfill({ status: 201, body: '' });
      }
      if (method === 'PATCH') {
        const body = req.postDataJSON();
        table.filter(match).forEach((r) => Object.assign(r, body));
        return route.fulfill({ status: 204, body: '' });
      }
      if (method === 'DELETE') {
        db[rest[1]] = table.filter((r) => !match(r));
        return route.fulfill({ status: 204, body: '' });
      }
    }

    const pub = url.pathname.match(/^\/storage\/v1\/object\/public\/faces-media\/(.+)$/);
    if (pub && method === 'GET') {
      const f = db.files.get(decodeURIComponent(pub[1]));
      const f2 = f ?? db.visionFiles.get(decodeURIComponent(pub[1]));
      return f2 ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: f2 }) : route.fulfill({ status: 404, body: '' });
    }
    const obj = url.pathname.match(/^\/storage\/v1\/object\/faces-media(?:\/(.+))?$/);
    if (obj) {
      if (!isEditor) return json(route, { message: 'unauthorized' }, 403);
      if (method === 'POST' && obj[1]) {
        db.files.set(decodeURIComponent(obj[1]), req.postDataBuffer());
        return json(route, { Key: `faces-media/${obj[1]}` });
      }
      if (method === 'DELETE') {
        const { prefixes } = req.postDataJSON();
        prefixes.forEach((p) => db.files.delete(p));
        return json(route, prefixes.map((name) => ({ name })));
      }
    }
    return json(route, { message: 'unmocked' }, 404);
  });
}
