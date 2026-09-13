/**
 * サイドバー各タブ用の色付きアイコン。
 * 非選択時は色で機能を判別し、選択時は親リンク側で白に上書きする。
 */
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserSearch,
  Handshake,
  CalendarDays,
  FileSpreadsheet,
  BadgeCheck,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  CalendarCheck,
  CalendarX,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  BedDouble,
  MessageSquare,
  FileBarChart,
  Sparkles,
  HeartPulse,
  Images,
  Wallet,
  Compass,
  Receipt,
  PawPrint,
  Leaf,
  Megaphone,
  Mail,
  ScrollText,
  Settings,
  Home,
  PlayCircle,
  Package,
  FileText,
  type LucideIcon,
} from "lucide-react";

const S = "h-4 w-4 shrink-0";

function ic(Icon: LucideIcon, color: string) {
  return <Icon className={`${S} ${color}`} aria-hidden />;
}

/** 在校生・保護者ポータル共通 */
export const portalNavIcons = {
  home: ic(Home, "text-brand-600"),
  attendance: ic(CalendarCheck, "text-sky-600"),
  absence: ic(CalendarX, "text-rose-500"),
  riding: ic(ClipboardList, "text-amber-600"),
  trainings: ic(GraduationCap, "text-violet-600"),
  overnight: ic(BedDouble, "text-indigo-500"),
  meals: ic(UtensilsCrossed, "text-orange-500"),
  grades: ic(FileBarChart, "text-blue-600"),
  competency: ic(Sparkles, "text-fuchsia-500"),
  career: ic(Compass, "text-teal-600"),
  photos: ic(Images, "text-pink-500"),
  insurance: ic(HeartPulse, "text-red-500"),
  tuition: ic(Wallet, "text-emerald-600"),
  reimbursements: ic(Receipt, "text-lime-600"),
  surveys: ic(MessageSquare, "text-cyan-600"),
  announcements: ic(Megaphone, "text-amber-500"),
};

/** 入学希望者マイページ */
export const mypageNavIcons = {
  progress: ic(Compass, "text-brand-600"),
  screening: ic(PlayCircle, "text-violet-600"),
  visit: ic(CalendarDays, "text-sky-600"),
  selection: ic(ClipboardCheck, "text-amber-600"),
  enrollment: ic(Package, "text-emerald-600"),
};

/** 一口支援者 */
export const supporterNavIcons = {
  reports: ic(FileText, "text-brand-600"),
  announcements: ic(Megaphone, "text-amber-500"),
};

/** 管理画面の各メニュー項目 */
export const adminNavIcons = {
  dashboard: ic(LayoutDashboard, "text-brand-600"),
  leads: ic(UserSearch, "text-sky-600"),
  followUps: ic(Handshake, "text-amber-600"),
  events: ic(CalendarDays, "text-cyan-600"),
  applications: ic(FileSpreadsheet, "text-violet-600"),
  decisions: ic(BadgeCheck, "text-emerald-600"),
  enrollments: ic(ClipboardCheck, "text-teal-600"),
  payments: ic(CreditCard, "text-lime-600"),
  students: ic(Users, "text-brand-600"),
  attendance: ic(CalendarCheck, "text-sky-600"),
  absences: ic(CalendarX, "text-rose-500"),
  meals: ic(UtensilsCrossed, "text-orange-500"),
  riding: ic(ClipboardList, "text-amber-600"),
  trainings: ic(BookOpen, "text-violet-600"),
  overnight: ic(BedDouble, "text-indigo-500"),
  surveys: ic(MessageSquare, "text-cyan-600"),
  grades: ic(FileBarChart, "text-blue-600"),
  competency: ic(Sparkles, "text-fuchsia-500"),
  injuries: ic(HeartPulse, "text-red-500"),
  photos: ic(Images, "text-pink-500"),
  tuition: ic(Wallet, "text-emerald-600"),
  career: ic(Compass, "text-teal-600"),
  reimbursements: ic(Receipt, "text-lime-600"),
  horses: ic(PawPrint, "text-amber-700"),
  retouch: ic(Leaf, "text-green-600"),
  announcements: ic(Megaphone, "text-amber-500"),
  messages: ic(Mail, "text-sky-500"),
  notifications: ic(ScrollText, "text-gray-500"),
  users: ic(Settings, "text-slate-600"),
};

/** 管理画面セクション見出し用 */
export const adminSectionIcons = {
  overview: ic(LayoutDashboard, "text-brand-600"),
  admission: ic(UserPlus, "text-sky-600"),
  students: ic(Users, "text-violet-600"),
  finance: ic(Wallet, "text-emerald-600"),
  horses: ic(PawPrint, "text-amber-700"),
  broadcast: ic(Megaphone, "text-amber-500"),
  system: ic(Settings, "text-slate-600"),
};
