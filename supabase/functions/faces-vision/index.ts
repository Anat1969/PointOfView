// POINT OF VIEW: תמונת ההתחייבות.
// מקבל סשן (נושא, קלפים, תובנה, התחייבות) ובונה פרומפט לפי השיטה של ענת
// (משפט זיקוק, פרומפט בעברית למידג'רני, ופרומפט באנגלית למחולל), ואז תמונה ריבועית
// שנשמרת בדלי faces-media תחת visions/.
// רק שירותים חינמיים (בקשת ענת, בלי fal): הפרומפט ב-Claude אם המפתח תקין, אחרת Gemini בשכבה החינמית,
// אחרת מודל טקסט של Cloudflare, אחרת תבנית. התמונה: Cloudflare flux, ואם המכסה נגמרה Pollinations.
// הפרומפט חוזר תמיד, גם כשהתמונה לא נוצרה, כדי שאפשר יהיה להעתיק אותו וליצור ידנית.
// mode: "prompt" בונה פרומפט בלי תמונה. פתוח לכולם, בלי מפתח. הגנה: עד 40 בקשות בשעה.
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const MODEL = "claude-opus-5-5";
const PER_HOUR = 40;
const BUCKET = "faces-media";

class UserError extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

const SYSTEM = `אתה ארכיטקט של פרומפטים ויזואליים. אתה הופך סשן של משחק קלפים טיפולי (נושא, קלפים, תובנה והתחייבות לפעולה) לתמונה אחת ששווה אלף מילים: תמונה שמניעה את האדם לבצע את ההתחייבות שלו.

מה התמונה מציגה:
- את הרגע שבו ההתחייבות כבר מתקיימת: המקום, החומר והאור של הצעד הראשון שנעשה. לא את הבעיה ולא את התקיעות.
- מתח אחד ברור בין קצוות (אור וצל, סגור ופתוח, כבד וקל) שמגלם את המעבר מהנושא אל ההתחייבות.
- מילות הקלפים ותחושת הפנים שנבחרו נכנסות כאיכויות של חומר, אור ומרחב, לא כסמלים מילוליים ולא ככיתוב.
- מקום ממשי ומוחשי, צילום אדריכלי תיעודי. דמות אדם רק אם היא נחוצה, קטנה או מגב, בלי פנים מזוהות.

תהליך החשיבה לפני הכתיבה: מה הרעיון המרכזי, ואם היה לו צבע, אור, מרקם, תנועה וזמן, מה הם.
כל פרט בפרומפט תורם לתמונה. לא מוסיפים דבר רק כי הוא נשמע מרשים.

הפלט:
- distill: משפט זיקוק אחד בעברית טבעית שמבטא את התובנה של התמונה. עד 20 מילים.
- prompt_he: פרומפט בעברית בלבד לפי חמש שכבות: (1) הנושא והרגע, (2) המקום והחומר, (3) האור ושעת היום, (4) הקומפוזיציה וזווית המצלמה, (5) האווירה והמתח. משפטים קצרים מופרדים בפסיקים. בסוף הפרומפט, מילה במילה: "Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --no text, words, writing, frame divisions"
- prompt_en: אותה תמונה באנגלית עשירה ומדויקת למחולל תמונות (בסגנון: weathered brutalist concrete with moss veins, diffused golden hour light filtering through...). בסוף, מילה במילה: "Documentary realism, Professional architecture photography, 1:1. No text, No words, No writing, No frame divisions"
- title: שם קצר לתמונה בעברית, 2 עד 4 מילים.
בלי אימוג'י ובלי סימני קריאה.`;

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["distill", "prompt_he", "prompt_en", "title"],
  properties: { distill: str, prompt_he: str, prompt_en: str, title: str },
};

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}

/** מפתחות חינמיים: סודות הפונקציה או הטבלה הפרטית faces_secrets (RLS בלי מדיניות, רק service role) */
let secretCache: Record<string, string> | null = null;
async function secret(name: string): Promise<string | undefined> {
  const env = Deno.env.get(name)?.trim();
  if (env) return env;
  if (!secretCache) {
    secretCache = {};
    try { for (const r of await rest("faces_secrets?select=name,value")) secretCache[r.name] = r.value; } catch { /* none */ }
  }
  return secretCache[name];
}
const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n).trim();

function describe(b: Record<string, unknown>) {
  const game = b.game === "coaching" ? "משחק האימון (קלפי תמונה ומילה, מפת שלוש תחנות)" : "פנים (קלפי פנים וקלפי השתקפות במילה, בזוגות)";
  const cards = Array.isArray(b.cards) ? b.cards.slice(0, 9) : [];
  const lines = cards.map((c: Record<string, unknown>) =>
    `- ${clip(c.position, 60)}: ${clip(c.kind, 20)}${c.word ? ` "${clip(c.word, 40)}"` : ""}${c.mood ? `, הבעת הפנים: ${clip(c.mood, 60)}` : ""}${c.note ? `. מה עלה: ${clip(c.note, 400)}` : ""}`
  );
  const a = (b.action ?? {}) as Record<string, unknown>;
  return `המשחק: ${game}
הנושא: ${clip(b.topic, 600) || "לא נכתב"}
הקלפים:
${lines.join("\n") || "- אין"}
התובנה: ${clip(b.insight, 600) || "לא נכתבה"}
${b.focus ? `כרטיס המיקוד או הפנים שילוו את הפעולה: ${clip(b.focus, 200)}\n` : ""}ההתחייבות: ${clip(a.what, 500) || "לא נכתבה"}
מתי: ${clip(a.when, 120) || "לא נקבע"}
איך אדע שעשיתי: ${clip(a.measure, 300) || "לא נקבע"}
${b.variant ? `\nזו גרסה נוספת: בחר זווית, חומר או שעה אחרים מהגרסה הקודמת ("${clip(b.variant, 300)}").` : ""}`;
}

type Img = { bytes: Uint8Array; type: string; engine: string };

/** Cloudflare Workers AI, flux schnell, במכסה החינמית היומית */
async function viaCloudflareImage(prompt: string): Promise<Img> {
  const acct = await secret("CF_ACCOUNT_ID"), token = await secret("CF_API_TOKEN");
  if (!acct || !token) throw new Error("cloudflare: no keys");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 4 }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.result?.image) throw new Error(`cloudflare ${r.status}`);
  return { bytes: fromB64(d.result.image), type: "image/jpeg", engine: "cloudflare:flux-1-schnell" };
}

/** Pollinations, חינמי ובלי מפתח, כשהמכסה של Cloudflare נגמרה */
async function viaPollinationsImage(prompt: string): Promise<Img> {
  const seed = Math.floor(Math.random() * 1e6);
  const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1800))}?width=1024&height=1024&model=flux&nologo=true&private=true&seed=${seed}`);
  const type = r.headers.get("content-type") ?? "";
  if (!r.ok || !type.startsWith("image/")) throw new Error(`pollinations ${r.status}`);
  return { bytes: new Uint8Array(await r.arrayBuffer()), type, engine: "pollinations:flux" };
}

/** תמונה מהמנוע החינמי הראשון שעונה. לא זורק: בלי תמונה מחזירים null והפרומפט נשאר */
async function render(prompt: string): Promise<{ img: Img | null; tried: string[] }> {
  const tried: string[] = [];
  for (const f of [viaCloudflareImage, viaPollinationsImage]) {
    try { return { img: await f(prompt), tried }; } catch (e) { tried.push(String(e instanceof Error ? e.message : e)); }
  }
  return { img: null, tried };
}

async function persist(img: Img, sessionId: string): Promise<string> {
  const ext = img.type.includes("png") ? "png" : img.type.includes("webp") ? "webp" : "jpg";
  const path = `visions/${sessionId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB, "Content-Type": img.type, "Cache-Control": "31536000" },
    body: img.bytes,
  });
  if (!up.ok) throw new Error(`upload ${up.status}`);
  return path;
}

type Out = { distill: string; prompt_he: string; prompt_en: string; title: string };
const TAIL_HE = "Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --no text, words, writing, frame divisions";
const TAIL_EN = "Documentary realism, Professional architecture photography, 1:1. No text, No words, No writing, No frame divisions";

function valid(o: unknown): o is Out {
  const x = o as Record<string, unknown>;
  return !!x && ["distill", "prompt_he", "prompt_en", "title"].every((k) => typeof x[k] === "string" && (x[k] as string).trim().length > 0);
}

function finish(o: Out): Out {
  const he = o.prompt_he.includes("Documentary realism") ? o.prompt_he : `${o.prompt_he.trim().replace(/[.,]$/, "")}, ${TAIL_HE}`;
  const en = o.prompt_en.includes("Documentary realism") ? o.prompt_en : `${o.prompt_en.trim().replace(/[.,]$/, "")}, ${TAIL_EN}`;
  return { ...o, prompt_he: he, prompt_en: en };
}

/** 1. Claude עם פלט מובנה */
async function viaClaude(brief: string): Promise<{ out: Out; model: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!apiKey) throw new Error("no anthropic key");
  const client = new Anthropic({ apiKey });
  const resp = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: brief }],
  } as never);
  // deno-lint-ignore no-explicit-any
  const r = resp as any;
  if (r.stop_reason === "refusal") throw new Error("refusal");
  const text = r.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const out = JSON.parse(text);
  if (!valid(out)) throw new Error("bad shape");
  return { out, model: r.model ?? MODEL };
}

const ASK_JSON = `${SYSTEM}

החזר JSON בלבד, אובייקט אחד עם המפתחות distill, prompt_he, prompt_en, title. בלי טקסט לפני או אחרי.`;
function parseOut(text: string): Out | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    return valid(o) ? o : null;
  } catch {
    return null;
  }
}

/** 2. Gemini בשכבה החינמית (טקסט בלבד) */
const GEMINI_TEXT = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
async function viaGemini(brief: string): Promise<{ out: Out; model: string }> {
  const key = Deno.env.get("GEMINI_API_KEY")?.trim() || Deno.env.get("GOOGLE_API_KEY")?.trim();
  if (!key) throw new Error("no gemini key");
  let last = "";
  for (const model of GEMINI_TEXT) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ASK_JSON }] },
        contents: [{ role: "user", parts: [{ text: brief }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    });
    const d = await r.json().catch(() => null);
    const text = (d?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    const out = r.ok ? parseOut(text) : null;
    if (out) return { out, model: `gemini:${model}` };
    last = `${model} ${r.status}`;
  }
  throw new Error(last);
}

/** 2ב. מודל טקסט של Cloudflare, באותה מכסה חינמית */
async function viaCloudflareText(brief: string): Promise<{ out: Out; model: string }> {
  const acct = await secret("CF_ACCOUNT_ID"), token = await secret("CF_API_TOKEN");
  if (!acct || !token) throw new Error("cloudflare: no keys");
  const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "system", content: ASK_JSON }, { role: "user", content: brief }], max_tokens: 1500 }),
  });
  const d = await r.json().catch(() => null);
  const raw = d?.result?.response;
  const out = typeof raw === "string" ? parseOut(raw) : valid(raw) ? raw : null;
  if (!r.ok || !out) throw new Error(`cloudflare text ${r.status}`);
  return { out, model: `cloudflare:${model}` };
}

/** 3. תבנית קבועה: תמונה של סף ואור, כשאין מודל שפה זמין */
function viaTemplate(b: Record<string, unknown>): { out: Out; model: string } {
  const a = (b.action ?? {}) as Record<string, unknown>;
  const what = clip(a.what, 200) || clip(b.insight, 200);
  return {
    model: "template",
    out: {
      title: "הצעד הראשון",
      distill: clip(b.insight, 160) || `הצעד כבר התחיל: ${what}`,
      prompt_he: `הרגע שבו ${what} כבר קורה, סף של דלת פתוחה בבית אמיתי, קיר בטון חשוף ועץ חם, אור בוקר נמוך שנכנס באלכסון ופוגש את הרצפה, קומפוזיציה לפי חוק השלישים וקווים שמובילים אל הפתח, מתח בין הצל שבפנים לאור שבחוץ`,
      prompt_en: "a quiet threshold moment in a real lived-in home, an open door between shadowed interior and bright morning outside, raw exposed concrete wall and warm oak floor, low raking morning light cutting diagonally across the floor and reaching the doorway, rule of thirds, leading lines toward the opening, calm anticipatory stillness, tension between interior shadow and exterior light, eye-level 35mm",
    },
  };
}

async function compose(brief: string, body: Record<string, unknown>) {
  let r: { out: Out; model: string } | null = null;
  for (const f of [viaClaude, viaGemini, viaCloudflareText]) {
    try {
      r = await f(brief);
      break;
    } catch {
      /* the next free option */
    }
  }
  r ??= viaTemplate(body);
  return { out: finish(r.out), model: r.model };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = clip(body.sessionId, 64).replace(/[^\w-]/g, "");
    if (!sessionId) throw new UserError("סשן לא תקין");
    const a = (body.action ?? {}) as Record<string, unknown>;
    if (!clip(a.what, 10) && !clip(body.insight, 10)) throw new UserError("כדאי לכתוב קודם התחייבות או תובנה, כדי שיהיה ממה לבנות תמונה.");

    const since = new Date(Date.now() - 3600_000).toISOString();
    const recent = await rest(`faces_visions?select=id&game=neq.art&created_at=gte.${since}`);
    if ((recent?.length ?? 0) >= PER_HOUR) throw new UserError("נוצרו הרבה תמונות בשעה האחרונה. אפשר לנסות שוב מאוחר יותר.", 429);

    const { out, model } = await compose(describe(body), body);
    const base = { distill: out.distill, prompt: out.prompt_he, promptEn: out.prompt_en, title: out.title, source: model };
    if (body.mode === "prompt") return json({ ...base, path: null });

    // התמונה: מנועים חינמיים בלבד. כשאין תמונה, הפרומפט חוזר בכל זאת
    const { img, tried } = await render(out.prompt_en);
    let path: string | null = null;
    let imageError = "";
    if (img) {
      try {
        path = await persist(img, sessionId);
      } catch (e) {
        imageError = `שמירת התמונה נכשלה (${e}). הפרומפט מוכן להעתקה.`;
      }
    } else {
      console.log("no image:", tried.join(" | "));
      imageError = "המחוללים החינמיים לא החזירו תמונה כרגע, כנראה בגלל המכסה היומית. הפרומפט מוכן להעתקה, ואפשר להעלות תמונה שיצרת בעצמך.";
    }
    await rest("faces_visions", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        game: body.game === "coaching" ? "coaching" : "faces",
        distill: out.distill,
        prompt_he: out.prompt_he,
        prompt_en: out.prompt_en,
        image_path: path,
        model: `${model} / ${img?.engine ?? "none"}`,
      }),
    });
    return json({ ...base, path, imageError: imageError || undefined });
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
