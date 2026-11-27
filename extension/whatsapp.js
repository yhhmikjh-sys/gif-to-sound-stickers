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

  async function toFile(s) {
    if (s.dataUrl) {
      const [head, b64] = s.dataUrl.split(",");
      const mime = head.slice(5, head.indexOf(";"));
      return new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], `${s.title}.${mime.includes("webm") ? "webm" : "mp4"}`, { type: mime });
    }
    const blob = await (await fetch(s.url)).blob();
    const mime = s.mime || blob.type || (s.isGif ? "image/gif" : "video/mp4");
    const extension = mime.includes("webm") ? "webm" : mime.includes("gif") ? "gif" : "mp4";
    return new File([blob], `${s.title}.${extension}`, { type: mime });
  }

  async function dropIntoChat(s) {
    const box = document.querySelector('footer div[contenteditable="true"]');
    if (!box) { message("Pehle koi chat kholo, phir sticker chuno."); return; }
    message("Bhej raha hoon…");
    let file;
    try { file = await toFile(s); } catch { message("Sticker load nahi hua, dobara try karo."); return; }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    box.focus();
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
    panel.style.display = "none";
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
      const media = document.createElement(s.isGif ? "img" : "video");
      media.src = s.dataUrl || s.url;
      if (!s.isGif) Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true });
      Object.assign(media.style, { width: "100%", aspectRatio: "1", objectFit: "contain", cursor: "pointer", display: "block", background: "#fff" });
      media.title = s.title;
      media.onclick = () => dropIntoChat(s);
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
