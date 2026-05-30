import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale: "zh" | "en" = "zh"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(date: Date | string, locale: "zh" | "en" = "zh"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string, locale: "zh" | "en" = "zh"): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

export function formatDuration(minutes: number, locale: "zh" | "en" = "zh"): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (locale === "en") {
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
}

export function getWeekDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }
  return dates;
}

export function getRecordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FEEDING: "喂奶",
    SLEEP: "睡觉",
    DIAPER: "换尿布",
    BATH: "洗澡",
  };
  return labels[type] || type;
}

export function getFeedingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BREAST_MILK: "母乳",
    BREAST_MILK_DIRECT: "母乳亲喂",
    BREAST_MILK_BOTTLE: "母乳瓶喂",
    FORMULA: "配方奶",
    SOLID_FOOD: "辅食",
  };
  return labels[type] || type;
}

export function getDiaperStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WET: "湿",
    DIRTY: "脏",
    BOTH: "湿+脏",
  };
  return labels[status] || status;
}
