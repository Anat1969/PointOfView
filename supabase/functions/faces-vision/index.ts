// POINT OF VIEW: תמונת ההתחייבות.
// מקבל סשן (נושא, קלפים, תובנה, התחייבות), Claude בונה פרומפט לפי השיטה של ענת
// (משפט זיקוק, פרומפט בעברית למידג'רני, ופרומפט באנגלית למחולל), fal מייצר תמונה
// ריבועית, והיא נשמרת בדלי faces-media תחת visions/ עם כתובת קבועה.
// הרשאה: מפתח עריכה בכותרת x-editor-key (sha256 ב-faces_editor_keys). סודות משותפים: ANTHROPIC_API_KEY, FAL_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-editor-key",
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
const FAL_MODELS = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"];

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

async function hasEditorKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-editor-key") ?? "";
  if (key.length < 16) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const rows = await rest(`faces_editor_keys?select=key_hash&key_hash=eq.${hash}`);
  return Array.isArray(rows) && rows.length > 0;
}

function falKey(): string | undefined {
  const direct = Deno.env.get("FAL_API_KEY") ?? Deno.env.get("FAL_KEY");
  if (direct?.trim()) return direct.trim();
  for (const name of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(name) || /^SUPABASE_/i.test(name)) continue;
    const v = Deno.env.get(name)?.trim();
    if (v) return v;
  }
  return undefined;
}

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

async function render(prompt: string, key: string): Promise<string> {
  let last = "";
  for (const model of FAL_MODELS) {
    const r = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: "square_hd", num_images: 1, enable_safety_checker: true, output_format: "jpeg" }),
    });
    const data = await r.json().catch(() => null);
    const url = data?.images?.[0]?.url;
    if (r.ok && url) return url;
    last = `${model} ${r.status} ${JSON.stringify(data?.detail ?? data ?? "").slice(0, 200)}`;
  }
  throw new UserError(`המחולל לא החזיר תמונה (${last})`, 502);
}

async function persist(url: string, sessionId: string): Promise<string> {
  const img = await fetch(url);
  if (!img.ok) throw new UserError("לא הצלחתי להוריד את התמונה מהמחולל", 502);
  const type = img.headers.get("content-type") ?? "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `visions/${sessionId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB, "Content-Type": type, "Cache-Control": "31536000" },
    body: await img.arrayBuffer(),
  });
  if (!up.ok) throw new UserError(`שמירת התמונה נכשלה (${up.status})`, 500);
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

/** 2. מודל שפה דרך fal, כשהמפתח של Claude לא זמין */
const FAL_LLMS = ["anthropic/claude-sonnet-4.5", "google/gemini-2.5-flash", "openai/gpt-4o"];
async function viaFal(brief: string, key: string): Promise<{ out: Out; model: string }> {
  let last = "";
  for (const model of FAL_LLMS) {
    try {
      const r = await fetch("https://fal.run/fal-ai/any-llm", {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system_prompt: `${SYSTEM}\n\nהחזר JSON בלבד, אובייקט אחד עם המפתחות distill, prompt_he, prompt_en, title. בלי טקסט לפני או אחרי.`,
          prompt: brief,
        }),
      });
      const data = await r.json().catch(() => null);
      const text = String(data?.output ?? "");
      const m = text.match(/\{[\s\S]*\}/);
      if (r.ok && m) {
        const out = JSON.parse(m[0]);
        if (valid(out)) return { out, model: `fal:${model}` };
      }
      last = `${model} ${r.status} ${text.slice(0, 120)}`;
    } catch (e) {
      last = `${model} ${e}`;
    }
  }
  throw new Error(last);
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

async function compose(brief: string, falK: string, body: Record<string, unknown>) {
  let r;
  try {
    r = await viaClaude(brief);
  } catch {
    try {
      r = await viaFal(brief, falK);
    } catch {
      r = viaTemplate(body);
    }
  }
  return { out: finish(r.out), model: r.model };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!(await hasEditorKey(req))) throw new UserError("יצירת תמונה זמינה במכשיר שנכנס עם מפתח עריכה (לוגו A&I).", 403);
    const body = await req.json().catch(() => ({}));
    const sessionId = clip(body.sessionId, 64).replace(/[^\w-]/g, "");
    if (!sessionId) throw new UserError("סשן לא תקין");
    const a = (body.action ?? {}) as Record<string, unknown>;
    if (!clip(a.what, 10) && !clip(body.insight, 10)) throw new UserError("כדאי לכתוב קודם התחייבות או תובנה, כדי שיהיה ממה לבנות תמונה.");

    const since = new Date(Date.now() - 3600_000).toISOString();
    const recent = await rest(`faces_visions?select=id&created_at=gte.${since}`);
    if ((recent?.length ?? 0) >= PER_HOUR) throw new UserError("נוצרו הרבה תמונות בשעה האחרונה. אפשר לנסות שוב מאוחר יותר.", 429);

    const fk = falKey();
    if (!fk) throw new UserError("מפתח fal לא מוגדר בשרת", 500);
    const brief = describe(body);
    const { out, model } = await compose(brief, fk, body);

    const falUrl = await render(out.prompt_en, fk);
    const path = await persist(falUrl, sessionId);
    await rest("faces_visions", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        game: body.game === "coaching" ? "coaching" : "faces",
        distill: out.distill,
        prompt_he: out.prompt_he,
        prompt_en: out.prompt_en,
        image_path: path,
        model,
      }),
    });
    return json({ path, distill: out.distill, prompt: out.prompt_he, title: out.title, source: model });
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
