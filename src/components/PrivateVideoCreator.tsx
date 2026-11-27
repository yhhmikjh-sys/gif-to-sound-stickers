import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SoundGif } from "@/components/SoundGif";
import { SoundPicker, soundUrl } from "@/components/SoundPicker";
import { WaveTrimmer } from "@/components/WaveTrimmer";
import { makeSoundSticker, WHATSAPP_GIF_MAX } from "@/lib/make-sound-sticker";
import { makeWhatsAppSoundSticker, makeWhatsAppStickerWebp } from "@/lib/wa-sticker-format";
import { isPrivateVideoDurationAllowed } from "@/lib/private-video-duration";
import { saveToMyStickers } from "@/lib/my-stickers";
import { phoneShareTarget, prepareShare, sendToWhatsApp } from "@/lib/send-to-whatsapp";
import type { Sound } from "@/lib/sounds.functions";
import { useEffect as useBrowserEffect } from "react";
import { WhatsAppAppButtons } from "@/components/WhatsAppAppButtons";

type Result = { videoUrl: string; stickerUrl: string | null };

export function PrivateVideoCreator({ userId }: { userId: string }) {
  const [clip, setClip] = useState<File | null>(null);
  const [clipDuration, setClipDuration] = useState(0);
  const [clipPreview, setClipPreview] = useState("");
  const [clipError, setClipError] = useState("");
  const [title, setTitle] = useState("My sound sticker");
  const [pack, setPack] = useState<Sound | null>(null);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundSrc, setSoundSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0.5);
  const [picker, setPicker] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    if (!clip) { setClipPreview(""); return; }
    const url = URL.createObjectURL(clip);
    setClipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);

  useEffect(() => {
    if (result?.stickerUrl) void prepareShare(result.stickerUrl, title, "sticker").catch(() => {});
  }, [result, title]);

  const resetCut = (soundDuration: number) => {
    const initial = Math.min(soundDuration, clipDuration || soundDuration, WHATSAPP_GIF_MAX);
    setDuration(soundDuration);
    setStart(0);
    setEnd(Math.max(0.5, initial));
  };

  const selectSound = async (snd: Sound) => {
    setPack(snd);
    setSoundFile(null);
    setSoundSrc("");
    setResult(null);
    try {
      const response = await fetch(soundUrl(snd.path));
      if (!response.ok) throw new Error("Couldn't load the sound");
      const url = URL.createObjectURL(await response.blob());
      setSoundSrc(url);
      const probe = new Audio(url);
      probe.onloadedmetadata = () => resetCut(probe.duration);
    } catch (error) {
      setClipError(error instanceof Error ? error.message : "Couldn't load the sound");
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!clip || !soundSrc) throw new Error("Choose a video and a sound first");
      const audioResponse = await fetch(soundSrc);
      if (!audioResponse.ok) throw new Error("Couldn't load the selected sound");
      const audio = await audioResponse.arrayBuffer();
      const { blob, mime } = await makeSoundSticker({ videoFile: clip, audio, start, seconds: Math.max(0.5, end - start) });

      let nativeFiles: { webp: Blob; ogg: Blob; seconds: number } | null = null;
      let sticker = null as Blob | null;
      try {
        nativeFiles = await makeWhatsAppSoundSticker({ videoFile: clip, audio, start, seconds: Math.max(0.5, end - start) });
        sticker = nativeFiles.webp;
      } catch {
        try { sticker = await makeWhatsAppStickerWebp({ videoFile: clip }); } catch { /* MP4 still remains in the private account. */ }
      }

      const savedFiles = nativeFiles ?? (sticker ? { webp: sticker, ogg: null, seconds: null } : null);
      await saveToMyStickers(userId, blob, mime, title, "", savedFiles);
      return {
        videoUrl: URL.createObjectURL(blob),
        stickerUrl: sticker ? URL.createObjectURL(sticker) : null,
      };
    },
    onSuccess: (value) => { setResult(value); setShareMessage(""); },
  });

  const inspectClip = (file: File | undefined) => {
    setClipError("");
    setResult(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const seconds = probe.duration;
      URL.revokeObjectURL(url);
      if (!isPrivateVideoDurationAllowed(seconds)) {
        setClip(null);
        setClipDuration(0);
        setClipError("Choose a video clip that is 4 seconds or shorter.");
        return;
      }
      setClip(file);
      setClipDuration(seconds);
      if (duration > 0) resetCut(duration);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setClip(null);
      setClipDuration(0);
      setClipError("This video could not be opened.");
    };
  };

  const sendSticker = () => {
    if (!result?.stickerUrl) {
      setShareMessage("Sticker file could not be made on this device; no video was shared.");
      return;
    }
    const target = phoneShareTarget(result.videoUrl, result.stickerUrl);
    if (!target) {
      setShareMessage("Sticker file could not be made on this device; no video was shared.");
      return;
    }
    void sendToWhatsApp(target.url, title, target.kind)
      .then(() => setShareMessage("Choose WhatsApp and then the chat."))
      .catch((error: Error) => error.name !== "AbortError" && setShareMessage(error.message));
  };

  return (
    <>
      {picker && <SoundPicker initialQuery="" onClose={() => setPicker(false)} onSelect={(snd) => { void selectSound(snd); setPicker(false); }} />}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border-2 border-foreground bg-card">
            {result ? <SoundGif url={result.videoUrl} /> : clipPreview ? <video src={clipPreview} controls muted loop playsInline className="aspect-square w-full object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">Choose a short video</div>}
          </div>
          {clip && <p className="mt-2 text-sm text-muted-foreground">Video length: {clipDuration.toFixed(1)} seconds</p>}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="font-display text-4xl text-foreground">Create a private sticker</h1>
            <p className="mt-2 text-sm text-muted-foreground">Saved to your account, not the public gallery.</p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Video</span>
            <input type="file" accept="video/*" onChange={(event) => inspectClip(event.target.files?.[0])} className="mt-2 block w-full text-sm text-foreground" />
          </label>
          {clipError && <p role="alert" className="text-sm text-destructive">{clipError}</p>}

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className="mt-1 w-full rounded-md border-2 border-input bg-card px-4 py-3 text-foreground outline-none focus:ring-4 focus:ring-ring/40" />
          </label>

          <div>
            <span className="text-sm font-semibold text-foreground">Sound</span>
            <Button type="button" variant="outline" onClick={() => setPicker(true)} className="mt-2 w-full justify-between">
              <span className="truncate">{pack ? `🔊 ${pack.title}` : "Choose a sound"}</span><span>{pack ? "Change" : "→"}</span>
            </Button>
            <details className="mt-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer">Use a sound from this device</summary>
              <input type="file" accept="audio/*" className="mt-2 block w-full" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                setSoundFile(file); setPack(null); setSoundSrc(url); setResult(null);
                const probe = new Audio(url);
                probe.onloadedmetadata = () => resetCut(probe.duration);
              }} />
              {soundFile && <p className="mt-1">{soundFile.name}</p>}
            </details>
          </div>

          {soundSrc && duration > 0 && (
            <div className="space-y-3 rounded-lg border-2 border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">✂️ Sound section</span>
                <span className="text-sm text-muted-foreground">{start.toFixed(1)}s → {end.toFixed(1)}s</span>
              </div>
              <WaveTrimmer src={soundSrc} duration={duration} start={start} end={end} onChange={(a, b) => { setStart(a); setEnd(b); }} onDuration={(d) => resetCut(d)} lockLen={WHATSAPP_GIF_MAX} />
              <p className="text-xs text-muted-foreground">The video repeats if the selected sound lasts longer. Maximum sound cut: 6 seconds.</p>
            </div>
          )}

          <Button type="button" disabled={!clip || !soundSrc || title.trim().length < 2 || create.isPending} onClick={() => create.mutate()} className="w-full">
            {create.isPending ? "Creating…" : "Create and save privately"}
          </Button>
          {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message || "Sticker could not be created."}</p>}

          {result && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-semibold text-foreground">Saved privately to your account.</p>
              {result.stickerUrl ? <WhatsAppAppButtons stickerUrl={result.stickerUrl} title={title} /> : <p className="text-sm text-destructive">This browser could not make the sticker file. The video was saved, but mobile sticker sharing is unavailable.</p>}
              {result.stickerUrl && <Button type="button" variant="outline" onClick={sendSticker}>Share sticker</Button>}
              {shareMessage && <p role="status" className="text-sm text-muted-foreground">{shareMessage}</p>}
              <p className="text-sm text-muted-foreground">The sound stays with the saved version for the desktop extension; phone sharing sends the animated sticker file without separate audio.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}