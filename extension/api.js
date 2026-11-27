// StikDesi account access for the extension (publishable key only; the user's own session decides what they can see).
const SB_URL = "https://c--70890fbc-f582-4dd0-8c61-da9b7b9595a9-prod.lovable.cloud";
const SB_KEY = "sb_publishable_XyfWBeTvO9-rBj5uDWFhjw_snMx2s96";

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
  const rows = await sbFetch("/rest/v1/my_stickers?select=id,title,video_path,mime&order=created_at.desc&limit=100");
  if (!rows.length) return [];
  const signed = await sbFetch("/storage/v1/object/sign/sticker-videos", { method: "POST", body: JSON.stringify({ expiresIn: 3600, paths: rows.map((r) => r.video_path) }) });
  const byPath = new Map(signed.map((x) => [x.path, x.signedURL]));
  return rows.map((r) => ({ id: r.id, title: r.title, mime: r.mime, url: byPath.get(r.video_path) ? SB_URL + "/storage/v1" + byPath.get(r.video_path) : null })).filter((r) => r.url);
}
