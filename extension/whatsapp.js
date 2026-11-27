// WhatsApp Web panel: Public shows every published sticker; Viewer shows the signed-in user's and locally saved stickers.
(() => {
  const btn = document.createElement("button");
  btn.textContent = "🔊 StikDesi";
  Object.assign(btn.style, { position: "fixed", right: "20px", bottom: "90px", zIndex: 99999, padding: "10px 16px", borderRadius: "999px", border: "2px solid #111", background: "#25D366", color: "#fff", fontWeight: "700", cursor: "pointer", boxShadow: "3px 3px 0 #111" });
  const panel = document.createElement("div");
  Object.assign(panel.style, { position: "fixed", right: "20px", bottom: "140px", zIndex: 99999, width: "330px", maxHeight: "65vh", overflow: "auto", background: "#fff", color: "#111", border: "2px solid #111", borderRadius: "16px", padding: "12px", display: "none", fontFamily: "sans-serif", boxShadow: "4px 4px 0 #111" });
  panel.innerHTML = '<b style="font-size:16px">Sound stickers</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0 8px"><button data-tab="public">Public</button><button data-tab="viewer">Your stickers</button></div><p data-msg style="font-size:12px;color:#555;margin:4px 0 8px"></p><div data-list></div>';
  document.body.append(btn, panel);

  let activeTab = "public";
  let renderId = 0;
  const publicState = { items: [], nextOffset: 0, loaded: false, loading: false };
  const message = (text) => { panel.querySelector("[data-msg]").textContent = text; };
  const list = () => panel.querySelector("[data-list]");

  function paintTabs() {
    for (const tab of panel.querySelectorAll("[data-tab]")) {
      const active = tab.dataset.tab === activeTab;
      Object.assign(tab.style, { padding: "8px", border: "2px solid #111", borderRadius: "999px", background: active ? "#25D366" : "#fff", color: active ? "#fff" : "#111", fontWeight: "700", cursor: "pointer" });
    }
  }

  function autoSend() {
    const started = Date.now();
    const interval = setInterval(() => {
      const icon = [...document.querySelectorAll('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')].find((el) => !el.closest("footer"));
      const send = icon?.closest('div[role="button"], button') || document.querySelector('div[role="button"][aria-label="Send"]:not(footer *)');
      if (send) { clearInterval(interval); send.click(); }
      else if (Date.now() - started > 15000) clearInterval(interval);
    }, 300);
  }

  const blobCache = new Map();
  function blobUrl(src) {
    if (!blobCache.has(src)) blobCache.set(src, fetch(src).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => URL.createObjectURL(b)));
    return blobCache.get(src);
  }
  async function videoSrc(s) { return blobUrl(s.dataUrl || s.url); }
  async function showVideoFrame(img, s) {
    try {
      const v = document.createElement("video"); v.muted = true; v.src = await videoSrc(s);
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
      v.currentTime = 0.1; await new Promise((res) => (v.onseeked = res));
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0); img.src = c.toDataURL("image/jpeg", 0.8);
    } catch {}
  }
  const player = document.createElement("video");
  let playingBtn = null;
  async function togglePlay(s, btn) {
    if (playingBtn === btn && !player.paused) { player.pause(); btn.textContent = "🔊"; playingBtn = null; return; }
    if (playingBtn) playingBtn.textContent = "🔊";
    playingBtn = btn; btn.textContent = "…";
    try {
      player.src = await videoSrc(s); player.currentTime = 0; await player.play(); btn.textContent = "⏸";
      player.onended = () => { btn.textContent = "🔊"; playingBtn = null; };
    } catch { btn.textContent = "🔊"; message("Sound play nahi hua."); }
  }

  async function toFile(s) {
    if (s.dataUrl) {
      const [head, b64] = s.dataUrl.split(",");
      const mime = head.slice(5, head.indexOf(";"));
      return new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], `${s.title}.${mime.includes("webm") ? "webm" : "mp4"}`, { type: mime });
    }
    const blob = await (await fetch(await blobUrl(s.url))).blob();
    const mime = s.mime || blob.type || (s.isGif ? "image/gif" : "video/mp4");
    const extension = mime.includes("webm") ? "webm" : mime.includes("gif") ? "gif" : "mp4";
    return new File([blob], `${s.title}.${extension}`, { type: mime });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function mediaInput() {
    return [...document.querySelectorAll('input[type="file"]')].find((i) => /video|image\/\*/.test(i.accept || "") && !/document|application/.test(i.accept || ""));
  }
  async function viaMediaPicker(transfer) {
    let input = mediaInput();
    if (!input) {
      const attach = document.querySelector('footer [aria-label="Attach"], footer span[data-icon="plus-rounded"], footer span[data-icon="plus"], footer span[data-icon="attach-menu-plus"], footer span[data-icon="clip"]');
      const btn = attach?.closest('button, div[role="button"]') || attach;
      if (!btn) return false;
      btn.click();
      for (let i = 0; i < 15 && !(input = mediaInput()); i++) await wait(100);
      if (!input) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return false; }
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return true;
  }
  async function turnOnGif() {
    for (let i = 0; i < 30; i++) {
      const gif = [...document.querySelectorAll('span[data-icon*="gif"], [aria-label*="GIF"]')].find((el) => !el.closest("footer") && !el.closest("#stikdesi-panel"));
      if (gif) { const b = gif.closest('button, div[role="button"]') || gif; if (b.getAttribute("aria-pressed") !== "true") b.click(); return; }
      await wait(200);
    }
  }

  // Real sticker with sound: WebP + Ogg/Opus (saved at Create, or built here for older stickers),
  // handed to wa-native.js which sends it through WhatsApp Web. Falls back to a silent pasted WebP sticker.
  async function waFiles(s) {
    if (s.stickerUrl && s.soundUrl) {
      const [w, o] = await Promise.all([s.stickerUrl, s.soundUrl].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })));
      return { webp: w, ogg: o, seconds: s.soundSeconds || 3 };
    }
    if (s.isGif) return null;
    const src = await videoSrc(s);
    const { ogg, seconds } = await WAF.oggFrom(await (await fetch(src)).arrayBuffer());
    const webp = WAF.tagWebp(new Uint8Array(await (await makeWebpSticker(src)).arrayBuffer()), await WAF.sha(ogg));
    return { webp: webp.buffer, ogg: ogg.buffer, seconds };
  }
  function sendNative(files) {
    const id = Math.random().toString(36).slice(2);
    return new Promise((res) => {
      const t = setTimeout(() => { window.removeEventListener("message", on); res({ ok: false, error: "timeout" }); }, 60000);
      function on(e) {
        if (e.source !== window || e.data?.type !== "STIKDESI_NATIVE_DONE" || e.data.id !== id) return;
        clearTimeout(t); window.removeEventListener("message", on); res(e.data);
      }
      window.addEventListener("message", on);
      window.postMessage({ type: "STIKDESI_NATIVE", id, ...files }, location.origin);
    });
  }

  async function sendAsSticker(s) {
    const box = document.querySelector('footer div[contenteditable="true"]');
    if (!box) { message("Pehle koi chat kholo, phir sticker chuno."); return; }
    message("Sound sticker bhej raha hoon…");
    try {
      const files = await waFiles(s);
      if (files) {
        const r = await sendNative(files);
        if (r.ok) { message("✅ Sound sticker bhej diya."); panel.style.display = "none"; return; }
        message("Sound wala sticker nahi gaya (" + r.error + "), bina sound ke bhej raha hoon…");
      }
    } catch (e) { message("Sound wala sticker nahi bana, bina sound ke bhej raha hoon…"); }
    let file;
    try {
      const webp = s.stickerUrl ? await (await fetch(s.stickerUrl)).blob() : s.isGif ? await gifToWebp(s) : await makeWebpSticker(await videoSrc(s));
      file = new File([webp], "sticker.webp", { type: "image/webp" });
    } catch { message("Sticker nahi bana, dobara try karo."); return; }
    const t = new DataTransfer(); t.items.add(file);
    box.focus();
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: t, bubbles: true, cancelable: true }));
    panel.style.display = "none";
    autoSend();
  }
  async function gifToWebp(s) {
    // A plain GIF has no video; draw it through an <img> sampled as a single still sticker.
    const img = new Image(); img.src = await blobUrl(s.url);
    await img.decode();
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const k = Math.min(512 / img.width, 512 / img.height);
    c.getContext("2d").drawImage(img, (512 - img.width * k) / 2, (512 - img.height * k) / 2, img.width * k, img.height * k);
    return await new Promise((r) => c.toBlob(r, "image/webp", 0.8));
  }

  async function dropIntoChat(s) {
    const box = document.querySelector('footer div[contenteditable="true"]');
    if (!box) { message("Pehle koi chat kholo, phir sticker chuno."); return; }
    message("Bhej raha hoon…");
    let file;
    try { file = await toFile(s); } catch { message("Sticker load nahi hua, dobara try karo."); return; }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    // Prefer WhatsApp's own "Photos & videos" picker so the file is sent as media (playing GIF with sound), not as a document.
    if (!(await viaMediaPicker(transfer))) {
      box.focus();
      box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
    }
    panel.style.display = "none";
    if (!s.isGif) await turnOnGif();
    autoSend();
  }

  function addGrid(stickers, local = []) {
    if (!stickers.length) {
      const empty = document.createElement("p");
      empty.style.fontSize = "13px";
      empty.textContent = activeTab === "public" ? "Abhi koi public sticker nahi." : "Abhi koi sticker nahi. Website par sign in karke sticker banao.";
      list().append(empty);
      return;
    }
    const grid = document.createElement("div");
    Object.assign(grid.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" });
    for (const s of stickers) {
      const card = document.createElement("div");
      Object.assign(card.style, { border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden", position: "relative" });
      // WhatsApp's page blocks outside media links, so load files as blob: URLs (fetched by the extension).
      const media = document.createElement("img");
      Object.assign(media.style, { width: "100%", aspectRatio: "1", objectFit: "contain", cursor: "pointer", display: "block", background: "#f4f4f4" });
      media.alt = media.title = s.title;
      media.onclick = () => sendAsSticker(s);
      const previewSrc = s.dataUrl ? null : (s.gif || (s.isGif ? s.url : null));
      if (previewSrc) blobUrl(previewSrc).then((u) => (media.src = u)).catch(() => {});
      else showVideoFrame(media, s);
      if (!s.isGif) {
        const play = document.createElement("button");
        play.textContent = "🔊";
        play.setAttribute("aria-label", "Play sound");
        Object.assign(play.style, { position: "absolute", left: "6px", top: "6px", width: "32px", height: "32px", border: "none", borderRadius: "999px", background: "#25D366", color: "#fff", cursor: "pointer", fontSize: "15px" });
        play.onclick = (e) => { e.stopPropagation(); void togglePlay(s, play); };
        card.append(play);
        const st = document.createElement("button");
        st.textContent = "GIF 🔊";
        st.setAttribute("aria-label", "Send as GIF with sound");
        Object.assign(st.style, { position: "absolute", right: "6px", top: "6px", padding: "4px 8px", border: "none", borderRadius: "999px", background: "#111", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: "700" });
        st.onclick = (e) => { e.stopPropagation(); void dropIntoChat(s); };
        card.append(st);
      }
      const title = document.createElement("div");
      title.textContent = s.title;
      Object.assign(title.style, { fontSize: "11px", padding: "5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
      card.append(media, title);
      if (s.dataUrl) {
        const del = document.createElement("button");
        del.textContent = "✕";
        del.setAttribute("aria-label", "Remove local sticker");
        Object.assign(del.style, { position: "absolute", top: "4px", right: "4px", border: "none", borderRadius: "999px", background: "#0008", color: "#fff", cursor: "pointer" });
        del.onclick = () => chrome.storage.local.set({ stickers: local.filter((x) => x.id !== s.id) }, render);
        card.append(del);
      }
      grid.append(card);
    }
    list().append(grid);
  }

  async function renderViewer(id) {
    let mine = [];
    try { mine = await sbMyStickers(); } catch {
      if (id !== renderId) return;
      message("Apne stickers dekhne ke liye sign in / sign up karo.");
      const f = document.createElement("div");
      f.innerHTML = '<input data-e type="email" placeholder="Email"><input data-p type="password" placeholder="Password (6+)"><button data-in>Sign in</button><button data-up>Sign up</button><p data-err style="font-size:12px;color:#c00"></p>';
      for (const el of f.querySelectorAll("input")) Object.assign(el.style, { width: "100%", boxSizing: "border-box", padding: "8px", border: "2px solid #111", borderRadius: "10px", marginTop: "6px" });
      for (const el of f.querySelectorAll("button")) Object.assign(el.style, { width: "100%", padding: "8px", border: "2px solid #111", borderRadius: "999px", background: el.dataset.in !== undefined ? "#25D366" : "#fff", color: el.dataset.in !== undefined ? "#fff" : "#111", fontWeight: "700", cursor: "pointer", marginTop: "6px" });
      const err = (t) => (f.querySelector("[data-err]").textContent = t);
      const em = () => f.querySelector("[data-e]").value, pw = () => f.querySelector("[data-p]").value;
      f.querySelector("[data-in]").onclick = async () => { err(""); try { await sbSignIn(em(), pw()); render(); } catch (e) { err(e.message); } };
      f.querySelector("[data-up]").onclick = async () => { err(""); try { (await sbSignUp(em(), pw())) ? render() : err("Email check karo, link se confirm karo, phir Sign in."); } catch (e) { err(e.message); } };
      list().innerHTML = ""; list().append(f);
      return;
    }
    const { stickers: local } = await chrome.storage.local.get({ stickers: [] });
    if (id !== renderId) return;
    message("Aapke banaye stickers — click karte hi send hoga.");
    addGrid([...mine, ...local], local);
  }

  function paintPublic() {
    list().innerHTML = "";
    addGrid(publicState.items);
    if (publicState.nextOffset !== null) {
      const more = document.createElement("button");
      more.textContent = publicState.loading ? "Loading…" : "More public stickers";
      more.disabled = publicState.loading;
      Object.assign(more.style, { width: "100%", marginTop: "10px", padding: "8px", border: "2px solid #111", borderRadius: "999px", background: "#fff", fontWeight: "700", cursor: "pointer" });
      more.onclick = () => loadPublic(false);
      list().append(more);
    }
  }

  async function loadPublic(reset) {
    if (publicState.loading) return;
    if (reset) { publicState.items = []; publicState.nextOffset = 0; publicState.loaded = false; }
    publicState.loading = true;
    message("Published stickers — kisi bhi chat mein bhejo.");
    paintPublic();
    try {
      const result = await sbPublicStickers(publicState.nextOffset || 0);
      publicState.items.push(...result.items);
      publicState.nextOffset = result.nextOffset;
      publicState.loaded = true;
    } catch (e) {
      message(e.message || "Public stickers load nahi hue.");
    } finally {
      publicState.loading = false;
      if (activeTab === "public") paintPublic();
    }
  }

  function render() {
    const id = ++renderId;
    paintTabs();
    list().innerHTML = "";
    if (activeTab === "public") {
      if (publicState.loaded) { message("Published stickers — kisi bhi chat mein bhejo."); paintPublic(); }
      else void loadPublic(true);
    } else void renderViewer(id);
  }

  for (const tab of panel.querySelectorAll("[data-tab]")) tab.onclick = () => { activeTab = tab.dataset.tab; render(); };
  btn.onclick = () => { const open = panel.style.display === "none"; panel.style.display = open ? "block" : "none"; if (open) render(); };
  chrome.storage.onChanged.addListener(() => { if (panel.style.display !== "none" && activeTab === "viewer") render(); });
})();
