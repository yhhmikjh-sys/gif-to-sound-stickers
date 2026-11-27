export const MAX_PRIVATE_VIDEO_SECONDS = 4;

export function isPrivateVideoDurationAllowed(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0 && duration <= MAX_PRIVATE_VIDEO_SECONDS;
}