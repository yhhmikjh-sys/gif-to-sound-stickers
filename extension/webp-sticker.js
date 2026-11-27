// Builds a 512x512 animated WebP from a sticker video in the browser (canvas WebP frames muxed into an
// ANIM container). WhatsApp Web sends pasted WebP files as real stickers instead of documents.
// WhatsApp rejects animated stickers over ~500 KB, so step quality down until it fits.
async function makeWebpSticker(videoUrl) {
  let out;
  for (const [fps, quality] of [[10, 0.55], [8, 0.4], [6, 0.3], [5, 0.2]]) {
    out = await encodeWebp(videoUrl, { fps, quality });
    if (out.size <= 480 * 1024) break;
  }
  return out;
}

async function encodeWebp(videoUrl, { fps, quality, maxSeconds = 6 }) {
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.src = videoUrl;
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error("video")); });
  const dur = Math.min(maxSeconds, isFinite(v.duration) && v.duration > 0 ? v.duration : 3);
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const frames = [];
  const step = 1 / fps;
  for (let t = 0; t < dur - 0.01; t += step) {
    v.currentTime = t;
    await new Promise((r) => (v.onseeked = r));
    g.clearRect(0, 0, 512, 512);
    const s = Math.min(512 / v.videoWidth, 512 / v.videoHeight);
    const w = v.videoWidth * s, h = v.videoHeight * s;
    g.drawImage(v, (512 - w) / 2, (512 - h) / 2, w, h);
    const b = await new Promise((r) => c.toBlob(r, "image/webp", quality));
    frames.push(new Uint8Array(await b.arrayBuffer()));
  }
  if (!frames.length) throw new Error("no frames");
  return new Blob([muxAnimatedWebp(frames, Math.round(1000 / fps))], { type: "image/webp" });
}

function muxAnimatedWebp(frames, ms) {
  const le = (n, bytes) => { const a = new Uint8Array(bytes); for (let i = 0; i < bytes; i++) a[i] = (n >> (8 * i)) & 255; return a; };
  const str = (s) => new TextEncoder().encode(s);
  const cat = (parts) => { const n = parts.reduce((x, p) => x + p.length, 0); const o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
  const chunk = (id, data) => cat([str(id), le(data.length, 4), data, data.length & 1 ? new Uint8Array(1) : new Uint8Array(0)]);
  // Pull the ALPH/VP8/VP8L chunks out of each single-frame WebP.
  const inner = (f) => {
    const out = []; let i = 12;
    while (i + 8 <= f.length) {
      const id = String.fromCharCode(...f.slice(i, i + 4));
      const size = f[i + 4] | (f[i + 5] << 8) | (f[i + 6] << 16) | (f[i + 7] << 24);
      if (id === "ALPH" || id === "VP8 " || id === "VP8L") out.push(f.slice(i, i + 8 + size + (size & 1)));
      i += 8 + size + (size & 1);
    }
    return cat(out);
  };
  const W = 511, H = 511; // canvas size minus one, 24-bit
  const vp8x = chunk("VP8X", cat([new Uint8Array([0x02, 0, 0, 0]), le(W, 3), le(H, 3)])); // animation + alpha flags
  const anim = chunk("ANIM", cat([le(0, 4), le(0, 2)])); // transparent bg, loop forever
  const anmf = frames.map((f) => chunk("ANMF", cat([le(0, 3), le(0, 3), le(W, 3), le(H, 3), le(ms, 3), new Uint8Array([0]), inner(f)])));
  const body = cat([str("WEBP"), vp8x, anim, ...anmf]);
  return cat([str("RIFF"), le(body.length, 4), body]);
}
