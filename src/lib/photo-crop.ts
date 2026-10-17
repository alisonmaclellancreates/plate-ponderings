import type { Box } from "./photo-blur";

/** Margin around the plate box, as a fraction of the box's wider pixel side. */
export const CROP_MARGIN = 0.12;

export type CropStyle = { width: string; height: string; left: string; top: string };

const pct = (v: number) => `${Math.round(v * 10000) / 100}%`;

/**
 * Where to place the full photo inside a 2:1 frame so the plate box (plus a
 * small margin) shows, zoomed, never stretched and never clipped. The area is
 * widened or heightened around the box centre to 2:1, shifted inward at the
 * photo edges, and limited to the photo; if the photo cannot supply a 2:1
 * area, the area is fitted inside the frame instead of cropping the plate.
 * `width` and `height` are the photo's pixel size.
 */
export function plateCropStyle(box: Box, width: number, height: number): CropStyle {
  const bw = box.w * width;
  const bh = box.h * height;
  const pad = Math.max(bw, bh) * CROP_MARGIN;
  let cw = bw + pad * 2;
  let ch = bh + pad * 2;
  if (cw < ch * 2) cw = ch * 2;
  else ch = cw / 2;
  cw = Math.min(cw, width);
  ch = Math.min(ch, height);
  const centreX = (box.x + box.w / 2) * width;
  const centreY = (box.y + box.h / 2) * height;
  const cx = Math.min(Math.max(centreX - cw / 2, 0), width - cw);
  const cy = Math.min(Math.max(centreY - ch / 2, 0), height - ch);
  // Frame units: 2 wide by 1 high. Fit the area, centred.
  const scale = Math.min(2 / cw, 1 / ch);
  const ox = (2 - cw * scale) / 2;
  const oy = (1 - ch * scale) / 2;
  return {
    width: pct((width * scale) / 2),
    height: pct(height * scale),
    left: pct((ox - cx * scale) / 2),
    top: pct(oy - cy * scale),
  };
}
