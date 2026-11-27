// Browser-only: records the animated GIF + a trimmed audio clip into a short video (like StikSound).
export async function makeSoundSticker(opts: {
  gifUrl: string;
  audio: ArrayBuffer;
  start: number;
  seconds: number;
}): Promise<{ blob: Blob; mime: string }> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = opts.gifUrl;
  await img.decode();
  // Keep the image in the DOM (invisible) so the browser keeps animating it.
  img.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px";
  document.body.appendChild(img);

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const ac = new AudioContext();
  const buf = await ac.decodeAudioData(opts.audio.slice(0));
  const src = ac.createBufferSource();
  src.buffer = buf;
  const dest = ac.createMediaStreamDestination();
  src.connect(dest);

  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_200_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const draw = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const r = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * r;
    const h = img.naturalHeight * r;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  };
  draw();
  let raf = 0;
  const loop = () => {
    draw();
    raf = requestAnimationFrame(loop);
  };

  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  loop();
  src.start(0, Math.min(opts.start, Math.max(0, buf.duration - 0.1)), opts.seconds);
  await new Promise((r) => setTimeout(r, opts.seconds * 1000));
  rec.stop();
  await done;
  cancelAnimationFrame(raf);
  src.disconnect();
  await ac.close();
  img.remove();
  return { blob: new Blob(chunks, { type: mime }), mime };
}
