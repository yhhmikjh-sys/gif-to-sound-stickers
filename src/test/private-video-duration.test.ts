import { describe, expect, it } from "vitest";
import { isPrivateVideoDurationAllowed } from "@/lib/private-video-duration";

describe("private video sticker duration", () => {
  it("accepts a 4-second clip", () => {
    expect(isPrivateVideoDurationAllowed(4)).toBe(true);
  });

  it("rejects clips longer than 4 seconds", () => {
    expect(isPrivateVideoDurationAllowed(4.01)).toBe(false);
  });
});