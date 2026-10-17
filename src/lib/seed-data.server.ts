import seedText from "../../docs/seed.md?raw";
import type { Database } from "@/integrations/supabase/types";

export const SEED_HANDLES = ["Traveler4821", "RoadTripRaven", "FogLightFan", "BackseatDJ", "MileMarker88", "PlateWhisperer", "TollboothPoet", "ParkingLotOracle", "ChainUpCrew", "FerryLineLurker", "PrairieDrifter"];
export const SEED_PHOTO_BOXES: Record<string, number[]> = {
  RAINY7Q: [0.4419, 0.4425, 0.1500, 0.1175], EH2ZED: [0.2800, 0.6433, 0.1756, 0.1317],
  "2FOG4ME": [0.2969, 0.5383, 0.3481, 0.2592], MAPLE9X: [0.4250, 0.4950, 0.2156, 0.1758], YEEHA7Z: [0.4037, 0.5892, 0.1856, 0.1375],
};
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type SeedPayload = { subjects: Row<"subjects">[]; stories: Row<"stories">[]; summaries: Row<"summaries">[]; hearts: Row<"hearts">[]; featured_days: Row<"featured_days">[]; notifications: Row<"notifications">[]; reports: Row<"reports">[] };
const PLATES = [
  ["RAINY7Q", "US-OR"], ["EH2ZED", "CA-BC"], ["MAPLE9X", "CA-ON"], ["4GOT10", "US-WA"], ["DEJAVU2", "US-MA"], ["2FOG4ME", "US-CA"], ["YEEHA7Z", "US-TX"], ["BRKFST4U", "US-VT"], ["QWERTY9", "US-MN"], ["1MORLAP", "US-IN"], ["SNACKZ", "CA-AB"], ["BRB2NITE", "US-NV"], ["H2OH2O", "US-HI"], ["TUBA4ME", "US-WI"], ["MUDFLAP", "US-MT"], ["WANDR4", "US-UT"],
] as const;
const SOURCES: Record<string, string> = { "My best guess": "guess", "I asked the driver": "secondhand", "I know the owner": "knows_owner", "It's my plate": "owner" };

/** Literal editorial content comes from the approved document, never AI or form framing. */
export function buildSeed(day: string, accounts: Record<string, string>, photoPaths: Record<string, string>): SeedPayload {
  const account = (handle: string) => {
    const id = accounts[handle];
    if (!id) throw new Error("Seed account mapping is incomplete.");
    return id;
  };
  const offset = Date.parse(`${day}T00:00:00Z`) - Date.parse("2026-10-17T00:00:00Z");
  // The source scenario is PDT (UTC-7); shift instants by whole days, preserving its wall times.
  const at = (date: number, hour = 8, minute = 0) => new Date(Date.UTC(2026, 9, date, hour + 7, minute) + offset).toISOString();
  const localTime = (date: string, hour: string, minute: string, period: string) => at(Number(date), Number(hour) % 12 + (period === "pm" ? 12 : 0), Number(minute));
  const seed: SeedPayload = { subjects: [], stories: [], summaries: [], hearts: [], featured_days: [], notifications: [], reports: [] };
  for (const [text, jurisdiction] of PLATES) {
    const section = seedText.split(`### ${text} · `)[1]?.split("\n### ")[0] ?? "";
    const first = section.match(/1\. \*\*(\w+)\*\*/)?.[1];
    const created = at(text === "WANDR4" ? 16 : text === "MUDFLAP" ? 14 : 10);
    const subject: Row<"subjects"> = { id: crypto.randomUUID(), identity_a: jurisdiction, identity_b: text, normalized_key: `${jurisdiction}|${text}`, image_path: null, status: text === "WANDR4" ? "pending" : "published", created_by: account(text === "MUDFLAP" || text === "WANDR4" ? "Traveler4821" : first ?? "MileMarker88"), created_at: created, published_at: text === "WANDR4" ? null : created };
    seed.subjects.push(subject);
    const matches = section.matchAll(/\d+\. \*\*(\w+)\*\* · ([^·]+) · Oct (\d+), (\d+):(\d+) (am|pm) · (\d+) hearts(?: · (photo))?\n\s+- Meaning: ([^\n]+)\n\s+- Tell us more: ([^\n]+)/g);
    for (const m of matches) {
      const [, handle = "", sourceLabel = "", date = "", hour = "", minute = "", period = "", hearts = "", photo, meaning = "", body = ""] = m;
      const source = SOURCES[sourceLabel.trim()];
      if (!source) throw new Error("Unknown seed source.");
      const path = photo ? photoPaths[text] : null;
      if (photo && !path) throw new Error("Seed photo mapping is incomplete.");
      const createdAt = localTime(date, hour, minute, period);
      const story: Row<"stories"> = { id: crypto.randomUUID(), subject_id: subject.id, author_id: account(handle), meaning, source, body, photo_path: path ?? null, photo_box: photo ? SEED_PHOTO_BOXES[text] ?? null : null, status: "published", created_at: createdAt, published_at: createdAt, removed_at: null };
      seed.stories.push(story);
      for (const hearer of SEED_HANDLES.filter((h) => h !== handle).slice(0, Number(hearts))) seed.hearts.push({ story_id: story.id, user_id: account(hearer), created_at: createdAt });
    }
    for (const m of section.matchAll(/(\d+)\. Oct (\d+), (\d+):(\d+) (am|pm) · (\d+) stor(?:y|ies) · score (\d+) [^\n]+\n\s+> ([^\n]+)/g)) {
      const [, version = "", date = "", hour = "", minute = "", period = "", count = "", score = "", text = ""] = m;
      const generated = localTime(date, hour, minute, period);
      seed.summaries.push({ id: crypto.randomUUID(), subject_id: subject.id, version: Number(version), text, disagreement_score: Number(score), story_count: Number(count), started_at: generated, generated_at: generated });
    }
  }
  const subjectId = (text: string) => {
    const row = seed.subjects.find((p) => p.identity_b === text);
    if (!row) throw new Error("Seed plate missing.");
    return row.id;
  };
  for (const [status, text, hour, minute] of [["pending", "RAINY7Q", 10, 30], ["rejected", "YEEHA7Z", 17, 15]] as const) {
    const block = seedText.split(`**${status === "pending" ? "Pending" : "Rejected"} story on ${text}**`)[1];
    const match = block?.match(/- Meaning: ([^\n]+)\n- Tell us more: ([^\n]+)/);
    if (!match?.[1] || !match[2]) throw new Error("Seed sample history missing.");
    seed.stories.push({ id: crypto.randomUUID(), subject_id: subjectId(text), author_id: account("Traveler4821"), meaning: match[1], body: match[2], source: "guess", status, created_at: at(16, hour, minute), published_at: null, removed_at: null, photo_path: null, photo_box: null });
  }
  for (const [date, text, count] of [[13, "RAINY7Q", 0], [14, "EH2ZED", 2], [15, "MAPLE9X", 0], [16, "4GOT10", 0], [17, "DEJAVU2", 0]] as const) seed.featured_days.push({ day: new Date(Date.UTC(2026, 9, date) + offset).toISOString().slice(0, 10), subject_id: subjectId(text), stories_at_pick: count });
  for (const [text, status] of [["2FOG4ME", "published"], ["YEEHA7Z", "rejected"]] as const) {
    const story = seed.stories.find((s) => s.subject_id === subjectId(text) && s.author_id === account("Traveler4821") && s.status === status);
    if (!story) throw new Error("Seed notification story missing.");
    seed.notifications.push({ id: crypto.randomUUID(), user_id: account("Traveler4821"), kind: `story_${status}`, subject_id: story.subject_id, story_id: story.id, created_at: story.created_at, read_at: null });
  }
  const reported = seed.stories.find((s) => s.subject_id === subjectId("BRKFST4U") && s.author_id === account("ParkingLotOracle"));
  if (!reported) throw new Error("Seed report story missing.");
  seed.reports.push({ id: crypto.randomUUID(), story_id: reported.id, reporter_id: account("MileMarker88"), reason: "other", note: null, created_at: at(16) });
  if (seed.stories.length !== 17 || seed.summaries.length !== 9 || seed.stories.filter((s) => s.photo_path).length !== 5) throw new Error("Approved seed content counts do not match.");
  return seed;
}