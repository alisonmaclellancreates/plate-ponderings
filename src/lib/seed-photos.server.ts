import rainy from "./seed-photos/RAINY7Q.jpg?inline";
import eh from "./seed-photos/EH2ZED.jpg?inline";
import fog from "./seed-photos/2FOG4ME.jpg?inline";
import maple from "./seed-photos/MAPLE9X.jpg?inline";
import yeeha from "./seed-photos/YEEHA7Z.jpg?inline";

export function seedPhotos(): Record<string, Uint8Array> {
  const photos = Object.fromEntries(Object.entries({ RAINY7Q: rainy, EH2ZED: eh, "2FOG4ME": fog, MAPLE9X: maple, YEEHA7Z: yeeha }).map(([name, url]) => {
    const bytes = Uint8Array.from(atob(url.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
    if (bytes.length === 0) throw new Error("Seed photo is missing.");
    return [name, bytes];
  }));
  if (Object.values(photos).reduce((sum, p) => sum + p.length, 0) > 1_000_000) throw new Error("Seed photos exceed 1 MB.");
  return photos;
}