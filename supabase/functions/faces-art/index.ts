// POINT OF VIEW: art for the starter decks (faces portraits and coaching card images).
// render: paints a card from a prompt, stores it in faces-media under art/ and links it to the card.
//   Free engines only (Anat does not pay): Gemini image with a reference image from the existing series,
//   so the style stays one; Pollinations (flux) as a keyless fallback.
// batch: renders up to 8 items one after another. sheet: a contact sheet for visual review.
// probe: which engines are available (names only, never values).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const BUCKET = "faces-media";
const PER_HOUR = 200;
const GEMINI_MODELS = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"];

function envKey(re: RegExp): string | undefined {
  for (const n of Object.keys(Deno.env.toObject())) {
    if (!re.test(n) || /^SUPABASE_/i.test(n)) continue;
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
}
const geminiKey = () => Deno.env.get("GEMINI_API_KEY")?.trim() || Deno.env.get("GOOGLE_API_KEY")?.trim() || envKey(/gemini|google_ai|genai/i);

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Gemini: new card in the exact style of a reference card from the same series */
async function viaGemini(prompt: string, refPath: string | undefined, key: string): Promise<{ bytes: Uint8Array; type: string; engine: string }> {
  const parts: unknown[] = [];
  if (refPath) {
    const ref = await fetch(`${SB_URL}/storage/v1/object/public/${BUCKET}/${refPath}`);
    if (ref.ok) parts.push({ inline_data: { mime_type: "image/jpeg", data: toB64(await ref.arrayBuffer()) } });
  }
  parts.push({
    text: refPath
      ? `Create a NEW image for the same series as the reference image. Match the reference exactly in medium, technique, brushwork or photographic treatment, color palette, lighting, background, framing and finish, so both look made by the same artist. Do not copy the reference subject. Portrait orientation 3:4. New subject: ${prompt}`
      : prompt,
  });
  let last = "";
  for (const model of GEMINI_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: "3:4" } } }),
    });
    const d = await r.json().catch(() => null);
    const img = d?.candidates?.[0]?.content?.parts?.find((p: Record<string, unknown>) => p.inline_data || p.inlineData);
    const inline = img?.inline_data ?? img?.inlineData;
    if (r.ok && inline?.data) return { bytes: fromB64(inline.data), type: inline.mime_type ?? inline.mimeType ?? "image/png", engine: `gemini:${model}` };
    last += ` [${model} ${r.status} ${JSON.stringify(d?.error?.message ?? d?.candidates?.[0]?.finishReason ?? d).slice(0, 160)}]`;
  }
  throw new Error(last);
}

/** Pollinations (flux), free and keyless */
async function viaPollinations(prompt: string, w: number, h: number, seed: number) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1800))}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=false`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`pollinations ${r.status}`);
  return { bytes: new Uint8Array(await r.arrayBuffer()), type: r.headers.get("content-type") ?? "image/jpeg", engine: "pollinations:flux" };
}

async function render(body: Record<string, unknown>) {
  const kind = body.kind === "coach" ? "coach" : "face";
  const table = kind === "coach" ? "faces_coach_cards" : "faces_faces";
  const id = String(body.id ?? "").replace(/[^\w-]/g, "");
  const prompt = String(body.prompt ?? "").slice(0, 3000);
  if (!id || !prompt) return json({ error: "id and prompt required" }, 400);
  const [row] = await rest(`${table}?id=eq.${id}&select=id`);
  if (!row) return json({ error: "no such card" }, 404);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await rest(`faces_visions?select=id&game=eq.art&created_at=gte.${since}`);
  if ((recent?.length ?? 0) >= PER_HOUR) return json({ error: "rate" }, 429);

  const w = Number(body.w ?? 768), h = Number(body.h ?? 1072), seed = Number(body.seed ?? 1);
  const engine = String(body.engine ?? "auto");
  const gk = geminiKey();
  let out: { bytes: Uint8Array; type: string; engine: string } | null = null;
  const errors: string[] = [];
  if ((engine === "auto" || engine === "gemini") && gk) {
    try { out = await viaGemini(prompt, body.ref ? String(body.ref) : undefined, gk); } catch (e) { errors.push(String(e)); }
  }
  if (!out && (engine === "auto" || engine === "pollinations")) {
    try { out = await viaPollinations(prompt, w, h, seed); } catch (e) { errors.push(String(e)); }
  }
  if (!out) return json({ error: errors.join(" | ") || "no engine" }, 502);

  const ext = out.type.includes("png") ? "png" : out.type.includes("webp") ? "webp" : "jpg";
  const path = `art/${kind}/${id}-${Date.now()}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB, "Content-Type": out.type, "Cache-Control": "31536000" },
    body: out.bytes,
  });
  if (!up.ok) return json({ error: `upload ${up.status}` }, 500);
  if (body.apply !== false) await rest(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ image_path: path }) });
  await rest("faces_visions", { method: "POST", body: JSON.stringify({ session_id: id, game: "art", prompt_en: prompt, image_path: path, model: out.engine }) });
  return json({ path, engine: out.engine });
}

async function sheet(body: Record<string, unknown>) {
  // loaded only for the review sheet, so rendering never depends on it
  const { Image, decode } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");
  const paths = (Array.isArray(body.paths) ? body.paths : []).slice(0, 30).map(String);
  const w = Math.min(200, Number(body.w ?? 110)), cols = Math.max(1, Number(body.cols ?? 6));
  const h = Math.round(w * Number(body.ratio ?? 1.4));
  const rows = Math.ceil(paths.length / cols);
  const out = new Image(cols * w, rows * h);
  out.fill(0xffffffff);
  for (let i = 0; i < paths.length; i++) {
    const r = await fetch(`${SB_URL}/storage/v1/object/public/${BUCKET}/${paths[i]}`);
    if (!r.ok) continue;
    const im = (await decode(new Uint8Array(await r.arrayBuffer()))) as InstanceType<typeof Image>;
    im.cover(w, h);
    out.composite(im, (i % cols) * w, Math.floor(i / cols) * h);
  }
  const jpg = await out.encodeJPEG(Number(body.q ?? 72));
  return json({ b64: toB64(jpg.buffer as ArrayBuffer) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "probe") {
      const names = Object.keys(Deno.env.toObject()).filter((n) => /gemini|google|genai|fal|openai|replicate|hugging|stability/i.test(n));
      let poll = 0;
      try { poll = (await fetch("https://image.pollinations.ai/prompt/test?width=64&height=64&nologo=true")).status; } catch { poll = -1; }
      return json({ names, gemini: !!geminiKey(), pollinations: poll });
    }
    if (body.action === "models") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${geminiKey()}`);
      const d = await r.json().catch(() => null);
      return json({ status: r.status, models: (d?.models ?? []).map((m: { name: string }) => m.name).filter((n: string) => /image|imagen|flash/i.test(n)), error: d?.error?.message });
    }
    if (body.action === "sheet") return await sheet(body);
    if (body.action === "batch") {
      // one by one inside a single invocation, so cold starts do not pile up
      const out: unknown[] = [];
      for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, 8)) {
        const r = await render({ ...it, engine: body.engine ?? it.engine, ref: it.ref ?? (it.kind === "coach" ? body.refCoach : body.refFace) });
        out.push(await r.json());
      }
      return json({ results: out });
    }
    return await render(body);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
