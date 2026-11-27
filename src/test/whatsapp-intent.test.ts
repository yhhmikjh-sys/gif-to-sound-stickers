import { describe, expect, it } from "vitest";
import { whatsappIntentUrl, WA_APPS } from "@/lib/send-to-whatsapp";

describe("WhatsApp app links", () => {
  it("targets normal WhatsApp by package com.whatsapp", () => {
    expect(whatsappIntentUrl("com.whatsapp", "hi")).toContain(";package=com.whatsapp;");
  });
  it("targets WhatsApp Business by package com.whatsapp.w4b", () => {
    expect(whatsappIntentUrl("com.whatsapp.w4b", "hi")).toContain(";package=com.whatsapp.w4b;");
  });
  it("offers exactly these two apps", () => {
    expect(WA_APPS.map((a) => a.pkg)).toEqual(["com.whatsapp", "com.whatsapp.w4b"]);
  });
});

describe("phone share sends the sticker, not the video", () => {
  const setUA = (ua: string) => Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua }, configurable: true });
  it("Android phone shares the WebP sticker file", async () => {
    setUA("Mozilla/5.0 (Linux; Android 14)");
    const { phoneShareTarget } = await import("@/lib/send-to-whatsapp");
    expect(phoneShareTarget("v.mp4", "s.webp")).toEqual({ url: "s.webp", kind: "sticker" });
  });
  it("computer keeps the video with sound", async () => {
    setUA("Mozilla/5.0 (Windows NT 10.0)");
    const { phoneShareTarget } = await import("@/lib/send-to-whatsapp");
    expect(phoneShareTarget("v.mp4", "s.webp")).toEqual({ url: "v.mp4", kind: "video" });
  });
});
