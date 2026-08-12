import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turkish-locale number formatting (1.234,5). */
export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("tr-TR", opts ?? { day: "numeric", month: "long" });
}

/** Midnight (local) of a given date — used as the DailyLog key. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysAgo(n: number): Date {
  return startOfDay(new Date(Date.now() - n * 86_400_000));
}

export function ageFromDob(dob: Date | null | undefined): number {
  if (!dob) return 30;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 86_400_000));
}
