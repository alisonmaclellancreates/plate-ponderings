import {
  CheckCircle2,
  Clock,
  CircleSlash,
  HelpCircle,
  Key,
  Lightbulb,
  Car,
  Users,
  Sparkles,
  Equal,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { Consensus, HowIKnow, Moderation, PlateStatus } from "@/lib/domain";

interface BadgeSpec {
  label: string;
  icon: LucideIcon;
  tone: string;
}

function BrandBadge({ spec, kind }: { spec: BadgeSpec; kind: string }) {
  const Icon = spec.icon;
  return (
    <span className="brand-badge" data-kind={kind} data-tone={spec.tone}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {spec.label}
    </span>
  );
}

const STATUS: Record<PlateStatus, BadgeSpec> = {
  mystery: { label: "Mystery", icon: HelpCircle, tone: "mystery" },
  interpreted: { label: "Interpreted", icon: Lightbulb, tone: "amber" },
  owner: { label: "Owner claim", icon: Key, tone: "teal" },
};

const CONSENSUS: Record<Consensus, BadgeSpec> = {
  agree: { label: "Largely agree", icon: Equal, tone: "teal" },
  mixed: { label: "Mixed views", icon: Shuffle, tone: "yellow" },
  differ: { label: "Opinions differ", icon: Sparkles, tone: "coral" },
};

const HOW: Record<HowIKnow, BadgeSpec> = {
  owner: { label: "It's my plate", icon: Key, tone: "how-owner" },
  knows_owner: { label: "I know the owner", icon: Users, tone: "how-knows" },
  secondhand: { label: "I asked the driver", icon: Car, tone: "how-asked" },
  guess: { label: "My best guess", icon: Lightbulb, tone: "how-guess" },
};

const MODERATION: Record<Moderation, BadgeSpec> = {
  published: { label: "Published", icon: CheckCircle2, tone: "green" },
  pending: { label: "Pending", icon: Clock, tone: "blue" },
  rejected: { label: "Couldn't approve", icon: CircleSlash, tone: "coral" },
};

export const StatusBadge = ({ status }: { status: PlateStatus }) => (
  <BrandBadge spec={STATUS[status]} kind="status" />
);
export const ConsensusBadge = ({ consensus }: { consensus: Consensus }) => (
  <BrandBadge spec={CONSENSUS[consensus]} kind="consensus" />
);
export const HowIKnowBadge = ({ how }: { how: HowIKnow }) => (
  <BrandBadge spec={HOW[how]} kind="how" />
);
export const ModerationBadge = ({ state }: { state: Moderation }) => (
  <BrandBadge spec={MODERATION[state]} kind="moderation" />
);
