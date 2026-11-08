export const campusHintKey = 'smk-campus-drag-understood-v1';
export const panLimit = (viewportWidth, imageWidth) => Math.max(0, imageWidth - viewportWidth);
export const clampPan = (value, maximum) => Math.min(Math.max(0, value), maximum);
export function campusGeometry(viewportWidth) {
  // Keep the original image ratio and pin coordinates in a compact, pannable canvas.
  const width = Math.min(1600, Math.max(960, viewportWidth * 3142 / 1847));
  const unit = width / 3142, available = panLimit(viewportWidth, width);
  // The two Figma camera states retain 83px on the left and 42px on the right.
  const inset = Math.min(83 * unit, available);
  const maximum = Math.max(0, available - inset - 42 * unit);
  return { width, height: width * 1314 / 3142, maximum, initial: 0, inset, unit };
}
export const centerCampusPoint = (x, imageWidth, viewportWidth) => clampPan(x * imageWidth - viewportWidth / 2, panLimit(viewportWidth, imageWidth));
export const meaningfulPan = (start, current) => Math.abs(current - start) >= 24;
export function gestureAxis(dx, dy) {
  if (Math.abs(dx) >= 8 && Math.abs(dx) > Math.abs(dy) * 1.1) return 'horizontal';
  if (Math.abs(dy) >= 8 && Math.abs(dy) > Math.abs(dx) * 1.1) return 'vertical';
  return 'pending';
}
export function readCampusHint(storage) {
  try { return (storage || globalThis.localStorage).getItem(campusHintKey) === '1'; } catch { return false; }
}
export function saveCampusHint(storage) {
  try { (storage || globalThis.localStorage).setItem(campusHintKey, '1'); return true; } catch { return false; }
}
