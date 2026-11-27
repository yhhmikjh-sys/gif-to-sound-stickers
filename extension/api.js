// StikDesi account access for the extension (publishable key only; the user's own session decides what they can see).
const SB_URL = "https://c--1021934e-13af-434c-b52f-e88cbd1f3cbd-prod.lovable.cloud";
const SB_KEY = "sb_publishable_QFGgry-yenjfVIMEq7PnBQ_mtXCCOfq";

async function sbSession() { return (await chrome.storage.local.get({ session: null })).session; }
async function sbSave(s) { await chrome.storage.local.set({ session: s ? { access_token: s.access_token, refresh_token: s.refresh_token, email: s.user?.email ?? s.email } : null }); }

async function sbAuth(grant, body) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=${grant}`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || "Sign in failed");
  await sbSave(j);
  return j;
}
const sbSignIn = (email, password) => sbAuth("password", { email, password });
async function sbSignUp(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.msg || j.error_description || "Sign up failed");
  if (j.access_token) { await sbSave(j); return true; }
  return false; // needs email confirmation
}
const sbSignOut = () => sbSave(null);

async function sbFetch(path, init = {}, retry = true) {
  const s = await sbSession();
  if (!s) throw new Error("signed-out");
  const r = await fetch(SB_URL + path, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (r.status === 401 && retry) {
    try { await sbAuth("refresh_token", { refresh_token: s.refresh_token }); } catch { await sbSignOut(); throw new Error("signed-out"); }
    return sbFetch(path, init, false);
  }
  if (!r.ok) throw new Error(`Load failed (${r.status})`);
  return r.json();
}

// The signed-in user's stickers with short-lived file links.
async function sbMyStickers() {
  const rows = await sbFetch("/rest/v1/my_stickers?select=id,title,gif_url,video_path,mime,sticker_path,sound_path,sound_seconds&order=created_at.desc&limit=100");
  if (!rows.length) return [];
  const signed = await sbFetch("/storage/v1/object/sign/sticker-videos", { method: "POST", body: JSON.stringify({ expiresIn: 3600, paths: rows.flatMap((r) => [r.video_path, r.sticker_path, r.sound_path].filter(Boolean)) }) });
  const byPath = new Map(signed.map((x) => [x.path, x.signedURL]));
  const full = (p) => (p && byPath.get(p) ? SB_URL + "/storage/v1" + byPath.get(p) : null);
  return rows.map((r) => ({ id: r.id, title: r.title, gif: r.gif_url, mime: r.mime, url: full(r.video_path), stickerUrl: full(r.sticker_path), soundUrl: full(r.sound_path), soundSeconds: r.sound_seconds })).filter((r) => r.url);
}

// Published stickers are readable without an account. Only root-level public files are exposed by storage policy.
async function sbPublicStickers(offset = 0) {
  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
  const path = `/rest/v1/public_stickers?select=id,title,gif_url,video_url,sticker_path,sound_path,sound_seconds&order=created_at.desc&limit=30&offset=${Math.max(0, offset)}`;
  const r = await fetch(SB_URL + path, { headers });
  if (!r.ok) throw new Error(`Public stickers load failed (${r.status})`);
  const rows = await r.json();
  const paths = rows.flatMap((x) => [x.video_url, x.sticker_path, x.sound_path]).filter(Boolean);
  const byPath = new Map();
  if (paths.length) {
    const signedResponse = await fetch(`${SB_URL}/storage/v1/object/sign/sticker-videos`, { method: "POST", headers, body: JSON.stringify({ expiresIn: 3600, paths }) });
    if (!signedResponse.ok) throw new Error(`Public files load failed (${signedResponse.status})`);
    const signed = await signedResponse.json();
    for (const x of signed) if (x.signedURL) byPath.set(x.path, SB_URL + "/storage/v1" + x.signedURL);
  }
  return {
    items: rows.map((x) => ({
      id: `public-${x.id}`,
      title: x.title,
      gif: x.gif_url,
      url: x.video_url ? byPath.get(x.video_url) : x.gif_url,
      isGif: !x.video_url,
      stickerUrl: x.sticker_path ? byPath.get(x.sticker_path) : null,
      soundUrl: x.sound_path ? byPath.get(x.sound_path) : null,
      soundSeconds: x.sound_seconds,
    })).filter((x) => x.url),
    nextOffset: rows.length === 30 ? offset + 30 : null,
  };
}
