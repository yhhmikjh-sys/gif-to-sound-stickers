// Runs on WhatsApp Web: a floating panel with saved stickers. Clicking one drops it into the open chat;
// WhatsApp then shows its normal preview where you press Send.
(() => {
  const btn = document.createElement("button");
  btn.textContent = "🔊 StikDesi";
  Object.assign(btn.style, { position: "fixed", right: "20px", bottom: "90px", zIndex: 99999, padding: "10px 16px", borderRadius: "999px", border: "2px solid #111", background: "#25D366", color: "#fff", fontWeight: "700", cursor: "pointer", boxShadow: "3px 3px 0 #111" });
  const panel = document.createElement("div");
  Object.assign(panel.style, { position: "fixed", right: "20px", bottom: "140px", zIndex: 99999, width: "320px", maxHeight: "60vh", overflow: "auto", background: "#fff", color: "#111", border: "2px solid #111", borderRadius: "16px", padding: "10px", display: "none", fontFamily: "sans-serif", boxShadow: "4px 4px 0 #111" });
  document.body.append(btn, panel);

  const toast = (t) => { const p = panel.querySelector("[data-msg]"); if (p) p.textContent = t; };

  function dropIntoChat(s) {
    const box = document.querySelector('footer div[contenteditable="true"]');
    if (!box) { toast("Pehle koi chat kholo, phir sticker chuno."); return; }
    const [head, b64] = s.dataUrl.split(",");
    const mime = head.slice(5, head.indexOf(";"));
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], `${s.title}.${mime.includes("webm") ? "webm" : "mp4"}`, { type: mime });
    const dt = new DataTransfer();
    dt.items.add(file);
    box.focus();
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    panel.style.display = "none";
  }

  function render() {
    chrome.storage.local.get({ stickers: [] }, ({ stickers }) => {
      panel.innerHTML = '<b>Sound stickers</b><p data-msg style="font-size:12px;color:#555;margin:4px 0 8px">Chat kholo → sticker par click → GIF switch on → Send</p>';
      if (!stickers.length) panel.insertAdjacentHTML("beforeend", '<p style="font-size:13px">Abhi koi sticker nahi. StikDesi par sticker bana ke "Send to extension" dabao.</p>');
      const grid = document.createElement("div");
      Object.assign(grid.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" });
      for (const s of stickers) {
        const card = document.createElement("div");
        Object.assign(card.style, { border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden", position: "relative" });
        const v = document.createElement("video");
        Object.assign(v, { src: s.dataUrl, muted: true, loop: true, autoplay: true, playsInline: true });
        Object.assign(v.style, { width: "100%", aspectRatio: "1", objectFit: "contain", cursor: "pointer", display: "block", background: "#fff" });
        v.title = s.title;
        v.onclick = () => dropIntoChat(s);
        const del = document.createElement("button");
        del.textContent = "✕";
        Object.assign(del.style, { position: "absolute", top: "4px", right: "4px", border: "none", borderRadius: "999px", background: "#0008", color: "#fff", cursor: "pointer" });
        del.onclick = () => chrome.storage.local.set({ stickers: stickers.filter((x) => x.id !== s.id) }, render);
        const t = document.createElement("div");
        t.textContent = s.title;
        Object.assign(t.style, { fontSize: "11px", padding: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
        card.append(v, del, t);
        grid.append(card);
      }
      panel.append(grid);
    });
  }

  btn.onclick = () => { const open = panel.style.display === "none"; panel.style.display = open ? "block" : "none"; if (open) render(); };
  chrome.storage.onChanged.addListener(() => panel.style.display !== "none" && render());
})();
