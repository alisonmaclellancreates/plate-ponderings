import { beforeEach, expect, it, vi } from "vitest";

const photos = vi.hoisted(() => ({ urls: ["", "", "", "", ""] }));
vi.mock("@/lib/seed-photos/RAINY7Q.jpg?inline", () => ({
  get default() {
    return photos.urls[0];
  },
}));
vi.mock("@/lib/seed-photos/EH2ZED.jpg?inline", () => ({
  get default() {
    return photos.urls[1];
  },
}));
vi.mock("@/lib/seed-photos/2FOG4ME.jpg?inline", () => ({
  get default() {
    return photos.urls[2];
  },
}));
vi.mock("@/lib/seed-photos/MAPLE9X.jpg?inline", () => ({
  get default() {
    return photos.urls[3];
  },
}));
vi.mock("@/lib/seed-photos/YEEHA7Z.jpg?inline", () => ({
  get default() {
    return photos.urls[4];
  },
}));
import { seedPhotos } from "@/lib/seed-photos.server";

beforeEach(() => {
  photos.urls = [0, 1, 2, 3, 4].map(
    (n) => `data:image/jpeg;base64,${btoa(String.fromCharCode(0, n, 255))}`,
  );
});

it("decodes all five inline imports into the original bytes", () => {
  expect(seedPhotos()).toEqual(
    Object.fromEntries(
      ["RAINY7Q", "EH2ZED", "2FOG4ME", "MAPLE9X", "YEEHA7Z"].map((name, n) => [
        name,
        new Uint8Array([0, n, 255]),
      ]),
    ),
  );
});

it.each(["data:image/jpeg;base64,", "missing comma"])("throws for an empty photo (%s)", (url) => {
  photos.urls[2] = url;
  expect(() => seedPhotos()).toThrow("Seed photo is missing.");
});

it("accepts exactly 1 MB total", () => {
  photos.urls.fill(`data:image/jpeg;base64,${btoa("x".repeat(200_000))}`);
  expect(Object.values(seedPhotos()).reduce((total, bytes) => total + bytes.length, 0)).toBe(
    1_000_000,
  );
});

it("throws when the five photos exceed 1 MB in total", () => {
  photos.urls.fill(`data:image/jpeg;base64,${btoa("x".repeat(200_000))}`);
  photos.urls[4] = `data:image/jpeg;base64,${btoa("x".repeat(200_001))}`;
  expect(() => seedPhotos()).toThrow("Seed photos exceed 1 MB.");
});
