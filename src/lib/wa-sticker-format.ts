// WhatsApp native sound sticker files, built in the browser at Create time:
// - a 512x512 animated WebP with WhatsApp's EXIF sticker metadata (incl. "sound-sha256"),
// - the cut sound as mono 48 kHz Ogg/Opus (WebCodecs AudioEncoder + our own Ogg muxer).
// The extension sends these through WhatsApp Web so they arrive as a real sticker with sound.
import { decodeGif } from "./make-sound-sticker";

const RATE = 48000;
const te = new TextEncoder();
const cat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const le = (n: number, bytes: number) => { const a = new Uint8Array(bytes); for (let i = 0; i < bytes; i++) a[i] = Math.floor(n / 2 ** (8 * i)) & 255; return a; };
const riffChunk = (id: string, data: Uint8Array) => cat([te.encode(id), le(data.length, 4), data, new Uint8Array(data.length & 1)]);

// ---------- Ogg/Opus
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
function page(type: number, granule: number, serial: number, seq: number, packets: Uint8Array[]) {
  const lace: number[] = [];
  for (const p of packets) { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); }
  const head = cat([te.encode("OggS"), new Uint8Array([0, type]), le(granule, 8), le(serial, 4), le(seq, 4), le(0, 4), new Uint8Array([lace.length]), new Uint8Array(lace)]);
  const pg = cat([head, ...packets]);
  let c = 0;
  for (const b of pg) c = ((c << 8) ^ CRC[((c >>> 24) ^ b) & 255]!) >>> 0;
  pg.set(le(c, 4), 22);
  return pg;
}

export async function encodeOggOpus(audio: ArrayBuffer, start: number, seconds: number): Promise<Uint8Array> {
  if (typeof AudioEncoder === "undefined") throw new Error("No WebCodecs");
  const decoded = await new OfflineAudioContext(1, RATE, RATE).decodeAudioData(audio.slice(0));
  const octx = new OfflineAudioContext(1, Math.max(1, Math.round(seconds * RATE)), RATE);
  const src = octx.createBufferSource();
  src.buffer = decoded; src.connect(octx.destination);
  src.start(0, Math.min(start, Math.max(0, decoded.duration - 0.1)), seconds);
  const pcm = (await octx.startRendering()).getChannelData(0);
  const packets: Uint8Array[] = [];
  let preSkip = 312, err: unknown = null;
  const enc = new AudioEncoder({
    output: (c, meta) => {
      const b = new Uint8Array(c.byteLength); c.copyTo(b); packets.push(b);
      const d = meta?.decoderConfig?.description;
      if (d) { const u = ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d as ArrayBuffer); if (u.length >= 12) preSkip = u[10]! | (u[11]! << 8); }
    },
    error: (e) => { err = e; },
  });
  enc.configure({ codec: "opus", sampleRate: RATE, numberOfChannels: 1, bitrate: 48000 });
  const BLOCK = 960 * 50;
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const n = Math.min(BLOCK, pcm.length - i);
    const ad = new AudioData({ format: "f32-planar", sampleRate: RATE, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round((i / RATE) * 1e6), data: new Float32Array(pcm.subarray(i, i + n)) });
    enc.encode(ad); ad.close();
  }
  await enc.flush(); enc.close();
  if (err) throw err;
  const serial = (Math.random() * 2 ** 32) >>> 0;
  const head = cat([te.encode("OpusHead"), new Uint8Array([1, 1]), le(preSkip, 2), le(RATE, 4), le(0, 2), new Uint8Array([0])]);
  const vendor = te.encode("StikDesi");
  const tags = cat([te.encode("OpusTags"), le(vendor.length, 4), vendor, le(0, 4)]);
  const pages = [page(2, 0, serial, 0, [head]), page(0, 0, serial, 1, [tags])];
  const end = preSkip + pcm.length;
  for (let i = 0, seq = 2; i < packets.length; i += 50) {
    const group = packets.slice(i, i + 50);
    const last = i + 50 >= packets.length;
    pages.push(page(last ? 4 : 0, last ? end : Math.min(end, preSkip + (i + group.length) * 960), serial, seq++, group));
  }
  return cat(pages);
}

// ---------- WebP + WhatsApp EXIF
export async function sha256b64(bytes: Uint8Array) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  return btoa(String.fromCharCode(...h));
}
// Little-endian TIFF with a single 0x5741 ("WA") tag holding the sticker JSON.
export function waExif(meta: Record<string, unknown>) {
  const js = te.encode(JSON.stringify(meta));
  return cat([new Uint8Array([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x41, 0x57, 7, 0]), le(js.length, 4), le(22, 4), js]);
}
export function stickerMeta(soundSha: string) {
  return { "sticker-pack-id": "stikdesi-sound", "sticker-pack-name": "StikDesi", "sticker-pack-publisher": "StikDesi", emojis: ["🔊"], "sound-sha256": soundSha };
}

function frameChunks(f: Uint8Array) {
  const out: Uint8Array[] = []; let alpha = false; let i = 12;
  while (i + 8 <= f.length) {
    const id = String.fromCharCode(f[i]!, f[i + 1]!, f[i + 2]!, f[i + 3]!);
    const size = f[i + 4]! | (f[i + 5]! << 8) | (f[i + 6]! << 16) | (f[i + 7]! << 24);
    if (id === "ALPH" || id === "VP8 " || id === "VP8L") { out.push(f.slice(i, i + 8 + size + (size & 1))); if (id !== "VP8 ") alpha = true; }
    i += 8 + size + (size & 1);
  }
  return { payload: cat(out), alpha };
}

async function encodeGifWebp(gifUrl: string, side: number, fps: number, quality: number, exif: Uint8Array) {
  const { frames, width, height } = await decodeGif(gifUrl);
  const total = Math.min(6000, frames.reduce((s, f) => s + f.delay, 0));
  const c = document.createElement("canvas"); c.width = c.height = side;
  const g = c.getContext("2d")!;
  const r = Math.min(side / width, side / height), w = width * r, h = height * r;
  const pick = (ms: number) => { let t = ms; for (let i = 0; i < frames.length; i++) { if (t < frames[i]!.delay) return i; t -= frames[i]!.delay; } return frames.length - 1; };
  const steps: { idx: number; ms: number }[] = [];
  const step = 1000 / fps;
  for (let t = 0; t < total - 1; t += step) {
    const idx = pick(t), ms = Math.round(Math.min(step, total - t));
    const last = steps[steps.length - 1];
    if (last && last.idx === idx) last.ms += ms; else steps.push({ idx, ms });
  }
  const cache = new Map<number, { payload: Uint8Array; alpha: boolean }>();
  const anmf: Uint8Array[] = []; let anyAlpha = false;
  for (const s of steps) {
    let fr = cache.get(s.idx);
    if (!fr) {
      g.clearRect(0, 0, side, side);
      g.drawImage(frames[s.idx]!.canvas, (side - w) / 2, (side - h) / 2, w, h);
      const b = await new Promise<Blob | null>((res) => c.toBlob(res, "image/webp", quality));
      if (!b || b.type !== "image/webp") throw new Error("WebP not supported");
      fr = frameChunks(new Uint8Array(await b.arrayBuffer()));
      cache.set(s.idx, fr);
    }
    anyAlpha ||= fr.alpha;
    anmf.push(riffChunk("ANMF", cat([le(0, 3), le(0, 3), le(side - 1, 3), le(side - 1, 3), le(Math.max(1, s.ms), 3), new Uint8Array([0x02]), fr.payload])));
  }
  const vp8x = riffChunk("VP8X", cat([new Uint8Array([0x02 | 0x08 | (anyAlpha ? 0x10 : 0), 0, 0, 0]), le(side - 1, 3), le(side - 1, 3)]));
  const body = cat([te.encode("WEBP"), vp8x, riffChunk("ANIM", new Uint8Array(6)), ...anmf, riffChunk("EXIF", exif)]);
  return new Blob([cat([te.encode("RIFF"), le(body.length, 4), body]) as BlobPart], { type: "image/webp" });
}

export const WA_STICKER_MAX_BYTES = 490_000;

/** GIF + cut sound -> WhatsApp native sound sticker files. */
export async function makeWhatsAppSoundSticker(opts: { gifUrl: string; audio: ArrayBuffer; start: number; seconds: number }) {
  const ogg = await encodeOggOpus(opts.audio, opts.start, opts.seconds);
  const exif = waExif(stickerMeta(await sha256b64(ogg)));
  let webp: Blob | null = null;
  // WhatsApp only accepts an animated sticker that is exactly 512x512 and under 500 KB (phone share sheet included),
  // so shrink fps/quality, never the size.
  for (const [fps, q] of [[15, 0.7], [12, 0.55], [10, 0.45], [8, 0.35], [6, 0.25], [5, 0.15], [4, 0.05]] as const) {
    webp = await encodeGifWebp(opts.gifUrl, 512, fps, q, exif);
    if (webp.size <= WA_STICKER_MAX_BYTES) break;
  }
  return { webp: webp!, ogg: new Blob([ogg as BlobPart], { type: "audio/ogg" }), seconds: Math.round(opts.seconds * 100) / 100 };
}
