import { decompressFrames, parseGIF } from "gifuct-js";

type Frame = { canvas: HTMLCanvasElement; delay: number };

// Decode every GIF frame into full canvases (handles patches + disposal).
async function decodeGif(url: string): Promise<{ frames: Frame[]; width: number; height: number }> {
  const buf = await (await fetch(url)).arrayBuffer();
  const gif = parseGIF(buf);
  const raw = decompressFrames(gif, true);
  const width = gif.lsd.width;
  const height = gif.lsd.height;
  const work = document.createElement("canvas");
  work.width = width; work.height = height;
  const wctx = work.getContext("2d")!;
  const patch = document.createElement("canvas");
  const pctx = patch.getContext("2d")!;
  const frames: Frame[] = [];
  for (const f of raw) {
    const { left, top, width: w, height: h } = f.dims;
    const before = f.disposalType === 3 ? wctx.getImageData(0, 0, width, height) : null;
    patch.width = w; patch.height = h;
    pctx.putImageData(new ImageData(new Uint8ClampedArray(f.patch), w, h), 0, 0);
    wctx.drawImage(patch, left, top);
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    c.getContext("2d")!.drawImage(work, 0, 0);
    frames.push({ canvas: c, delay: Math.max(20, f.delay || 100) });
    if (f.disposalType === 2) wctx.clearRect(left, top, w, h);
    else if (before) wctx.putImageData(before, 0, 0);
  }
  return { frames, width, height };
}

// WhatsApp only turns clips up to 6 seconds into a GIF.
export const WHATSAPP_GIF_MAX = 6;

// Length of one loop of the GIF, in seconds.
export async function gifSeconds(url: string): Promise<number> {
  const gif = parseGIF(await (await fetch(url)).arrayBuffer());
  const raw = decompressFrames(gif, false);
  return raw.reduce((s, f) => s + Math.max(20, f.delay || 100), 0) / 1000;
}

// Browser-only: loops the GIF for as long as the cut sound lasts, sound plays once (like StikSound).
export async function makeSoundSticker(opts: {
  gifUrl: string;
  audio: ArrayBuffer;
  start: number;
  seconds: number;
}): Promise<{ blob: Blob; mime: string }> {
  const { frames, width, height } = await decodeGif(opts.gifUrl);
  if (!frames.length) throw new Error("Couldn't read the GIF");
  const total = frames.reduce((s, f) => s + f.delay, 0);
  const frameAt = (ms: number) => {
    let t = ms % total;
    for (const f of frames) { if (t < f.delay) return f.canvas; t -= f.delay; }
    return frames[0]!.canvas;
  };

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = Math.min(size / width, size / height);
  const w = width * r, h = height * r;
  const draw = (ms: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(frameAt(ms), (size - w) / 2, (size - h) / 2, w, h);
  };

  const ac = new AudioContext();
  const buf = await ac.decodeAudioData(opts.audio.slice(0));
  const src = ac.createBufferSource();
  src.buffer = buf;
  const dest = ac.createMediaStreamDestination();
  src.connect(dest);

  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  // WhatsApp plays "GIF with sound" from an H.264 + AAC MP4, so prefer that.
  const mime = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  draw(0);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  const t0 = performance.now();
  // Timer-driven so it keeps animating even if the tab isn't painting.
  const timer = setInterval(() => draw(performance.now() - t0), 1000 / 30);
  src.start(0, Math.min(opts.start, Math.max(0, buf.duration - 0.1)), opts.seconds);
  await new Promise((res) => setTimeout(res, opts.seconds * 1000 + 150));
  rec.stop();
  await done;
  clearInterval(timer);
  src.disconnect();
  await ac.close();
  const type = mime.split(";")[0]!;
  return { blob: new Blob(chunks, { type }), mime: type };
}
