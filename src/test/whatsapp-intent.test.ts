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
