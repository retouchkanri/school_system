import {
  Mail,
  PackageCheck,
  PlayCircle,
  ClipboardList,
  Sparkles,
  CalendarCheck,
  CreditCard,
  Footprints,
  MessageSquare,
  FileText,
  Brain,
  Users,
  BadgeCheck,
  ClipboardCheck,
  Wallet,
  Shirt,
  BedDouble,
  GraduationCap,
  Package,
  CalendarDays,
} from "lucide-react";
import type { LeadStatus } from "@/lib/types";

type IconComponent = React.ComponentType<{ className?: string }>;

/** 入学までの18ステップそれぞれに対応するアイコン (サイドバー・現在の状態ページで共用) */
export const STEP_ICONS: Record<LeadStatus, IconComponent> = {
  material_requested: Mail,
  material_sent: PackageCheck,
  video_watched: PlayCircle,
  survey_answered: ClipboardList,
  ai_judged: Sparkles,
  visit_reserved: CalendarCheck,
  payment_confirmed: CreditCard,
  visit_attended: Footprints,
  exp_survey_answered: MessageSquare,
  applied: FileText,
  aptitude_done: Brain,
  interview: Users,
  decision_sent: BadgeCheck,
  enrollment_procedure: ClipboardCheck,
  admission_fee_paid: Wallet,
  uniform_ordered: Shirt,
  dorm_ready: BedDouble,
  enrolled: GraduationCap,
};

/** 5つの章 (PROGRESS_GROUPS の key) に対応するアイコン */
export const GROUP_ICONS: Record<string, IconComponent> = {
  material: Mail,
  screening: PlayCircle,
  visit: CalendarDays,
  selection: ClipboardCheck,
  enrollment: Package,
};
