import type { Box } from "./photo-blur";
export type PlateStatus = "mystery" | "interpreted" | "owner";
export type Consensus = "agree" | "mixed" | "differ";
export type HowIKnow = "owner" | "knows_owner" | "secondhand" | "guess";
export type Moderation = "published" | "pending" | "rejected";

export interface Story {
  id: string;
  handle: string;
  date: string;
  meaning: string;
  howIKnow: HowIKnow;
  longer?: string;
  /** Optional photo URL shown small on the right of the story card. */
  photo?: string;
  /** Plate box within the photo; absent for photos saved before boxes were kept. */
  photoBox?: Box;
  hearts: number;
  /** Omitted means published. Unpublished stories never count. */
  moderation?: Moderation;
}

/** Newest first: summaries[0] is current, the rest are earlier versions. */
export interface Summary {
  date: string;
  consensus: Consensus;
  storyCount: number;
  text: string;
}

export interface PlateRecord {
  slug: string;
  jurisdiction: string;
  text: string;
  stories: Story[];
  consensus?: Consensus;
  summaries: Summary[];
  plateOfTheDay?: string;
  /** Published stories when featured. Above 0 means a fallback pick. Omitted means 0. */
  featuredStoryCount?: number;
}

export interface Submission {
  id: string;
  jurisdiction: string;
  text: string;
  kind: "plate" | "story";
  date: string;
  moderation: Moderation;
  explanation: string;
  /** Plate detail preview state to open, when the plate is public and has a preview. */
  plateState?: string | undefined;
  action: "view" | "dismiss" | null;
  updated?: boolean | undefined;
}

export const BLOCKING_EXPLANATION =
  "Blocking someone hides their stories from your view. It doesn't remove their contributions from the shared plate summary.";

export const DELETE_ACCOUNT_WARNING =
  "Deleting your account removes your handle and your published stories from the site. Plates you've spotted stay in the collection. This can't be undone.";

export interface ReportedStory {
  id: string;
  jurisdiction: string;
  text: string;
  handle: string;
  meaning: string;
  reports: number;
  reasons: string[];
  status: "visible" | "hidden";
}
