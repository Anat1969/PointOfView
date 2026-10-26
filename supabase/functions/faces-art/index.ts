// POINT OF VIEW: art for the starter decks (faces portraits and coaching card images).
// render: paints with fal from a prompt, stores in faces-media under art/ and updates image_path on the row.
// sheet: a contact sheet of small thumbnails for visual review (JPEG as base64).

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
const MODELS = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"];

function falKey(): string | undefined {
  const d = Deno.env.get("FAL_API_KEY") ?? Deno.env.get("FAL_KEY");
  if (d?.trim()) return d.trim();
  for (const n of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(n) || /^SUPABASE_/i.test(n)) continue;
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
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
  const key = falKey();
  if (!key) return json({ error: "no fal key" }, 500);
  const width = Number(body.w ?? 768), height = Number(body.h ?? 1072);
  let url = "", last = "";
  for (const m of MODELS) {
    const r = await fetch(`https://fal.run/${m}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: { width, height }, num_images: 1, enable_safety_checker: true, output_format: "jpeg", seed: body.seed }),
    });
    const d = await r.json().catch(() => null);
    url = d?.images?.[0]?.url ?? "";
    if (r.ok && url) break;
    last = `${m} ${r.status} ${JSON.stringify(d?.detail ?? d).slice(0, 200)}`;
  }
  if (!url) return json({ error: last }, 502);
  const img = await fetch(url);
  const path = `art/${kind}/${id}-${Date.now()}.jpg`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB, "Content-Type": "image/jpeg", "Cache-Control": "31536000" },
    body: await img.arrayBuffer(),
  });
  if (!up.ok) return json({ error: `upload ${up.status}` }, 500);
  if (body.apply !== false) await rest(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ image_path: path }) });
  await rest("faces_visions", { method: "POST", body: JSON.stringify({ session_id: id, game: "art", prompt_en: prompt, image_path: path, model: "fal" }) });
  return json({ path });
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
  const jpg = await out.encodeJPEG(72);
  let bin = "";
  for (let i = 0; i < jpg.length; i += 0x8000) bin += String.fromCharCode(...jpg.subarray(i, i + 0x8000));
  return json({ b64: btoa(bin) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "sheet") return await sheet(body);
    if (body.action === "batch") {
      // one by one inside a single invocation, so cold starts do not pile up
      const out: unknown[] = [];
      for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, 8)) {
        const r = await render(it);
        out.push(await r.json());
      }
      return json({ results: out });
    }
    return await render(body);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
