import Link from "next/link";
import { PROGRESS_STEPS, statusIndex } from "@/lib/constants";
import type { LeadStatus } from "@/lib/types";

export { ProgressTracker } from "@/components/progress-tracker";

/* ============ レイアウト ============ */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3.5 sm:px-5">
          {title && <h3 className="text-sm font-bold tracking-tight text-gray-800">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/**
 * カードの枠(border/shadow/白背景)を持たない見出し+本文のまとまり。
 * ユーザー向けポータル(マイページ・在校生・保護者・支援者)で Card の代わりに使う。
 * 管理画面は Card のまま (ここは変更しない)。
 */
export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-gray-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: {
      value: "text-gray-900",
      accent: "bg-gray-300",
      wash: "from-gray-50/90",
    },
    success: {
      value: "text-brand-700",
      accent: "bg-brand-500",
      wash: "from-brand-50",
    },
    warning: {
      value: "text-amber-700",
      accent: "bg-amber-500",
      wash: "from-amber-50",
    },
    danger: {
      value: "text-red-700",
      accent: "bg-red-500",
      wash: "from-red-50",
    },
  };
  const t = tones[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${t.accent}`} aria-hidden />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.wash} to-transparent`} aria-hidden />
      <div className="relative pl-1.5">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${t.value}`}>{value}</p>
        {sub && <p className="mt-1.5 text-xs leading-snug text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/** 枠のない数値表示 (StatCard のカードなし版)。ユーザー向けポータルで使う */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "text-gray-900",
    success: "text-brand-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

/* ============ バッジ ============ */

export type BadgeTone = "gray" | "green" | "blue" | "amber" | "red" | "purple" | "brand";

const badgeTones: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  brand: "bg-brand-100 text-brand-700",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const idx = statusIndex(status);
  const label = PROGRESS_STEPS[idx]?.label ?? status;
  const tone: BadgeTone = idx >= 17 ? "green" : idx >= 12 ? "purple" : idx >= 9 ? "blue" : idx >= 5 ? "amber" : "gray";
  return <Badge tone={tone}>{label}</Badge>;
}

/* ============ 進捗トラッカー ============ */
// ProgressTracker は progress-tracker.tsx (クライアント) から re-export

/* ============ フォーム ============ */

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-gray-600">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-300 ease-out hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 border border-gray-800 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition duration-300 ease-out hover:bg-gray-800 hover:text-white disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-300 ease-out hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSmall =
  "inline-flex items-center justify-center gap-1 border border-gray-800 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 transition duration-300 ease-out hover:bg-gray-800 hover:text-white disabled:opacity-50";

/** トップ・公開ページ向けの大きめCTA (創進学園風の角ばったソリッドボタン) */
export const btnCta =
  "inline-flex min-h-[56px] min-w-[220px] items-center justify-center gap-2 bg-brand-600 px-8 text-base font-semibold text-white transition duration-300 ease-out hover:bg-accent-500";
export const btnCtaAccent =
  "inline-flex min-h-[56px] min-w-[220px] items-center justify-center gap-2 bg-accent-500 px-8 text-base font-semibold text-white transition duration-300 ease-out hover:bg-brand-600";
export const btnCtaOutline =
  "inline-flex min-h-[56px] min-w-[220px] items-center justify-center gap-2 border border-white bg-transparent px-8 text-base font-semibold text-white transition duration-300 ease-out hover:bg-white hover:text-brand-800";

/* ============ テーブル ============ */

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 text-xs font-bold text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

/** 枠のないテーブル (行の区切り線のみ)。ユーザー向けポータルで Table の代わりに使う */
export function SimpleTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

/* ============ その他 ============ */

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
      ← {label}
    </Link>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-2 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-gray-500">{label}</dt>
      <dd className="text-right text-sm text-gray-800">{value ?? "—"}</dd>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-base font-bold text-gray-800 first:mt-0">{children}</h2>;
}
