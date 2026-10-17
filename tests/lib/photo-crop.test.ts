import { describe, expect, it } from "vitest";
import { plateCropStyle } from "@/lib/photo-crop";

const n = (v: string) => Number.parseFloat(v) / 100;

/** The photo area (in pixels) the frame shows, from a crop style. */
function shown(style: ReturnType<typeof plateCropStyle>, width: number, height: number) {
  const scale = n(style.width) / width; // frame widths per pixel (frame is 1 wide, 0.5 high)
  return {
    x: -n(style.left) / scale,
    y: (-n(style.top) * 0.5) / scale,
    w: 1 / scale,
    h: 0.5 / scale,
  };
}

describe("plateCropStyle", () => {
  it("shows a 2:1 area around the plate with a margin, without stretching", () => {
    const style = plateCropStyle({ x: 0.4, y: 0.45, w: 0.2, h: 0.1 }, 1000, 1000);
    expect(n(style.height) / n(style.width)).toBeCloseTo(2, 5);
    const area = shown(style, 1000, 1000);
    expect(area.w / area.h).toBeCloseTo(2, 5);
    expect(area.x).toBeLessThan(400);
    expect(area.x + area.w).toBeGreaterThan(600);
    expect(area.y).toBeLessThan(450);
    expect(area.y + area.h).toBeGreaterThan(550);
  });
  it("heightens a wide plate box and widens a tall one to 2:1", () => {
    const wide = shown(plateCropStyle({ x: 0.1, y: 0.4, w: 0.8, h: 0.1 }, 1000, 1000), 1000, 1000);
    const tall = shown(plateCropStyle({ x: 0.45, y: 0.3, w: 0.1, h: 0.4 }, 1000, 1000), 1000, 1000);
    expect(wide.w / wide.h).toBeCloseTo(2, 5);
    expect(tall.w / tall.h).toBeCloseTo(2, 5);
    expect(tall.h).toBeGreaterThan(400);
  });
  it("shifts the area inward at the photo's edges", () => {
    const area = shown(plateCropStyle({ x: 0.85, y: 0.9, w: 0.15, h: 0.1 }, 1000, 1000), 1000, 1000);
    expect(area.x + area.w).toBeCloseTo(1000, 3);
    expect(area.y + area.h).toBeCloseTo(1000, 3);
  });
  it("fits a plate that cannot get a 2:1 area inside the photo, never clipping it", () => {
    const style = plateCropStyle({ x: 0, y: 0, w: 1, h: 1 }, 400, 400);
    expect(style).toEqual({ width: "50%", height: "100%", left: "25%", top: "0%" });
  });
});
