// Runs in WhatsApp Web's own page (MAIN world). Sends a real sticker with sound to the open chat using
// WhatsApp Web's internal modules: upload the Ogg/Opus sound, then send the WebP as a sticker with stickerAudio.
// These modules are not a public API; if WhatsApp changes them this throws and the extension falls back to a silent sticker.
(() => {
  const SOUND_PROPS = ["sound_stickers_consumption_enabled", "sound_stickers_creation_enabled", "sound_stickers_audio_playing_enabled"];
  const mod = (name) => {
    if (typeof window.importNamespace === "function") { try { const m = window.importNamespace(name); if (m) return m; } catch {} }
    return window.require(name);
  };
  const dflt = (name) => { const m = mod(name); return m && m.default !== undefined ? m.default : m; };
  const b64 = (v) => { if (v == null || typeof v === "string") return v; const u = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer || v); let s = ""; for (const b of u) s += String.fromCharCode(b); return btoa(s); };

  function enableSoundStickers() {
    try {
      const AB = mod("WAWebABProps");
      if (!AB.getABPropConfigValue.__stikdesi) {
        const orig = AB.getABPropConfigValue;
        const f = function (name) { return SOUND_PROPS.includes(name) ? true : orig.apply(this, arguments); };
        f.__stikdesi = true; AB.getABPropConfigValue = f;
      }
    } catch {}
    try {
      const G = mod("WAWebSoundStickerGating");
      G.isSoundStickerConsumptionEnabled = () => true;
      G.isSoundStickerCreationEnabled = () => true;
      G.isSoundStickerPlaybackEnabled = () => true;
    } catch {}
  }

  async function uploadSound(ogg, seconds, chat) {
    const params = { blob: ogg, type: mod("WAWebMmsMediaTypes").MEDIA_TYPES.AUDIO, signal: new AbortController().signal, uploadQpl: new Proxy({}, { get: () => () => undefined }), uploadOrigin: 1, fileOrigin: undefined, userUploadAttemptCount: 0, forwardedFromWeb: false, isViewOnce: false, isHdPhoto: false };
    try { params.uploadOrigin = dflt("WAWebMediaGetUploadOriginForChat")(chat); } catch {}
    let res;
    try { res = await dflt("WAWebUploadManagerMainThread").encryptAndUpload(params, dflt("WAWebCreateMediaUploadMetrics")(params)); }
    catch { res = await dflt("WAWebUploadManager").encryptAndUpload(params); }
    const bytes = new Uint8Array(await ogg.arrayBuffer());
    const hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))));
    const audio = { deprecatedMms3Url: res.url || undefined, directPath: res.directPath, mediaKey: b64(res.mediaKey), mediaKeyTimestamp: res.mediaKeyTimestamp, filehash: hash, encFilehash: b64(res.encFilehash), size: bytes.length, mimetype: "audio/ogg; codecs=opus", duration: seconds };
    try { if (mod("WAWebSoundStickerUtils").isCompleteStickerAudio(audio) === false) throw new Error("audio rejected"); } catch (e) { if (e.message === "audio rejected") throw e; }
    return audio;
  }

  async function sendSoundSticker(webp, ogg, seconds) {
    const chat = mod("WAWebChatCollection").ChatCollection.getActive();
    if (!chat) throw new Error("no-chat");
    enableSoundStickers();
    const stickerAudio = await uploadSound(ogg, seconds, chat);
    const opaque = await dflt("WAWebMediaOpaqueData").createFromData(webp, "image/webp");
    const MediaPrep = dflt("WAWebMediaPrep");
    const prep = new MediaPrep("sticker", Promise.resolve({ type: "sticker", mediaBlob: opaque, mimetype: "image/webp", size: webp.size, fullWidth: 512, fullHeight: 512, isAnimated: true, emojis: ["🔊"] }));
    const res = await prep.sendToChat({ chat, options: { stickerAudio } });
    const OK = mod("WAWebSendMsgResultAction").SendMsgResult.OK;
    if (res && res.messageSendResult !== OK) throw new Error("send failed: " + res.messageSendResult);
  }

  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.data?.type !== "STIKDESI_NATIVE") return;
    const { id, webp, ogg, seconds } = e.data;
    try {
      if (typeof window.require !== "function") throw new Error("wa-not-ready");
      await sendSoundSticker(new Blob([webp], { type: "image/webp" }), new Blob([ogg], { type: "audio/ogg; codecs=opus" }), Number(seconds) || 1);
      window.postMessage({ type: "STIKDESI_NATIVE_DONE", id, ok: true }, location.origin);
    } catch (err) {
      console.warn("[StikDesi] native sound sticker failed", err);
      window.postMessage({ type: "STIKDESI_NATIVE_DONE", id, ok: false, error: String(err?.message || err) }, location.origin);
    }
  });
})();
