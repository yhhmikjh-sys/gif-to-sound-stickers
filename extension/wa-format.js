// Fallback for stickers saved before Create made WhatsApp files: build the Ogg/Opus sound from the MP4
// and add WhatsApp's EXIF sticker metadata (with "sound-sha256") to the WebP. Mirrors src/lib/wa-sticker-format.ts.
const WAF = (() => {
  const RATE = 48000, te = new TextEncoder();
  const cat = (parts) => { const o = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
  const le = (n, b) => { const a = new Uint8Array(b); for (let i = 0; i < b; i++) a[i] = Math.floor(n / 2 ** (8 * i)) & 255; return a; };
  const riffChunk = (id, d) => cat([te.encode(id), le(d.length, 4), d, new Uint8Array(d.length & 1)]);
  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
  function page(type, granule, serial, seq, packets) {
    const lace = []; for (const p of packets) { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); }
    const pg = cat([te.encode("OggS"), new Uint8Array([0, type]), le(granule, 8), le(serial, 4), le(seq, 4), le(0, 4), new Uint8Array([lace.length]), new Uint8Array(lace), ...packets]);
    let c = 0; for (const b of pg) c = ((c << 8) ^ CRC[((c >>> 24) ^ b) & 255]) >>> 0;
    pg.set(le(c, 4), 22); return pg;
  }
  async function oggFrom(buf, maxSeconds = 6) {
    const decoded = await new OfflineAudioContext(1, RATE, RATE).decodeAudioData(buf.slice(0));
    const seconds = Math.min(maxSeconds, decoded.duration);
    const octx = new OfflineAudioContext(1, Math.max(1, Math.round(seconds * RATE)), RATE);
    const src = octx.createBufferSource(); src.buffer = decoded; src.connect(octx.destination); src.start(0, 0, seconds);
    const pcm = (await octx.startRendering()).getChannelData(0);
    const packets = []; let preSkip = 312, err = null;
    const enc = new AudioEncoder({
      output: (c, meta) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); packets.push(b); const d = meta?.decoderConfig?.description; if (d) { const u = d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength); if (u.length >= 12) preSkip = u[10] | (u[11] << 8); } },
      error: (e) => { err = e; },
    });
    enc.configure({ codec: "opus", sampleRate: RATE, numberOfChannels: 1, bitrate: 48000 });
    for (let i = 0; i < pcm.length; i += 48000) { const n = Math.min(48000, pcm.length - i); const ad = new AudioData({ format: "f32-planar", sampleRate: RATE, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round((i / RATE) * 1e6), data: new Float32Array(pcm.subarray(i, i + n)) }); enc.encode(ad); ad.close(); }
    await enc.flush(); enc.close(); if (err) throw err;
    const serial = (Math.random() * 2 ** 32) >>> 0, vendor = te.encode("StikDesi");
    const pages = [page(2, 0, serial, 0, [cat([te.encode("OpusHead"), new Uint8Array([1, 1]), le(preSkip, 2), le(RATE, 4), le(0, 2), new Uint8Array([0])])]), page(0, 0, serial, 1, [cat([te.encode("OpusTags"), le(vendor.length, 4), vendor, le(0, 4)])])];
    const end = preSkip + pcm.length;
    for (let i = 0, seq = 2; i < packets.length; i += 50) { const g = packets.slice(i, i + 50), last = i + 50 >= packets.length; pages.push(page(last ? 4 : 0, last ? end : Math.min(end, preSkip + (i + g.length) * 960), serial, seq++, g)); }
    return { ogg: cat(pages), seconds: Math.round(seconds * 100) / 100 };
  }
  async function sha(bytes) { return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))); }
  function exif(meta) { const js = te.encode(JSON.stringify(meta)); return cat([new Uint8Array([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x41, 0x57, 7, 0]), le(js.length, 4), le(22, 4), js]); }
  // Rewrites a WebP with WhatsApp sticker EXIF (keeps image chunks, sets EXIF + alpha flags in VP8X).
  function tagWebp(bytes, soundSha) {
    const chunks = []; let i = 12;
    while (i + 8 <= bytes.length) { const id = String.fromCharCode(...bytes.slice(i, i + 4)); const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24); chunks.push({ id, data: bytes.slice(i + 8, i + 8 + size) }); i += 8 + size + (size & 1); }
    const vp8x = chunks.find((c) => c.id === "VP8X");
    if (vp8x) vp8x.data[0] |= 0x08 | 0x10;
    const meta = { "sticker-pack-id": "stikdesi-sound", "sticker-pack-name": "StikDesi", "sticker-pack-publisher": "StikDesi", emojis: ["🔊"], "sound-sha256": soundSha };
    const body = cat([te.encode("WEBP"), ...chunks.filter((c) => c.id !== "EXIF").map((c) => riffChunk(c.id, c.data)), riffChunk("EXIF", exif(meta))]);
    return cat([te.encode("RIFF"), le(body.length, 4), body]);
  }
  return { oggFrom, sha, tagWebp };
})();
