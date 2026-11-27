// WhatsApp only accepts "GIF with sound" as a progressive H.264 + AAC MP4.
// MediaRecorder often produces VP9/Opus or fragmented MP4, so re-encode in the browser with ffmpeg.wasm.
import type { FFmpeg } from "@ffmpeg/ffmpeg";

let loading: Promise<FFmpeg> | null = null;
const CORE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

function load() {
  loading ??= (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ff;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

/** Warm up the encoder (call when the user picks a sound). */
export function preloadWhatsAppEncoder() { void load().catch(() => {}); }

export async function toWhatsAppMp4(input: Blob): Promise<Blob> {
  const ff = await load();
  const inName = input.type.includes("webm") ? "in.webm" : "in.mp4";
  await ff.writeFile(inName, new Uint8Array(await input.arrayBuffer()));
  const code = await ff.exec([
    "-i", inName,
    "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.1", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "26",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-ac", "2",
    "-movflags", "+faststart", "-y", "out.mp4",
  ]);
  if (code !== 0) throw new Error("ffmpeg failed");
  const out = (await ff.readFile("out.mp4")) as Uint8Array;
  void ff.deleteFile(inName); void ff.deleteFile("out.mp4");
  return new Blob([out.slice().buffer], { type: "video/mp4" });
}
