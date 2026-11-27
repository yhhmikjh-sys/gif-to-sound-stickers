const $ = (id) => document.getElementById(id);
const msg = (t) => ($("msg").textContent = t);
async function show() {
  const s = await sbSession();
  $("out").hidden = !!s; $("inside").hidden = !s;
  if (!s) return;
  $("who").textContent = `Signed in: ${s.email || ""}`;
  try { const list = await sbMyStickers(); $("count").textContent = list.length ? `${list.length} sticker aapke account mein hain.` : "Abhi koi sticker nahi. Website par sign in karke sticker banao."; }
  catch (e) { if (e.message === "signed-out") return show(); $("count").textContent = e.message; }
}
$("in").onclick = async () => { msg(""); try { await sbSignIn($("email").value, $("pw").value); show(); } catch (e) { msg(e.message); } };
$("up").onclick = async () => { msg(""); try { (await sbSignUp($("email").value, $("pw").value)) ? show() : msg("Email check karo, link dabake confirm karo, phir Sign in."); } catch (e) { msg(e.message); } };
$("out-btn").onclick = async () => { await sbSignOut(); show(); };
$("wa2").onclick = () => chrome.tabs.create({ url: "https://web.whatsapp.com/" });
$("wa").onclick = () => chrome.tabs.create({ url: "https://web.whatsapp.com/" });
show();
