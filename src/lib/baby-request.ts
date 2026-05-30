import type { Locale } from "@/i18n/messages";

export interface BabyApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BabyRequestErrorText {
  title: string;
  description: string;
}

const ZH_DUPLICATE_HINT = "同一账户下不允许添加同名宝宝，请修改姓名";
const EN_DUPLICATE_HINT = "Baby name already exists in this account";

export function isDuplicateBabyError(status: number, error?: string): boolean {
  if (status === 409) return true;
  const normalized = (error || "").toLowerCase();
  return normalized.includes("already exists") || normalized.includes("同名");
}

export function mapBabyRequestError(
  locale: Locale,
  status: number,
  error: string | undefined,
  fallbackTitle: string
): BabyRequestErrorText {
  if (isDuplicateBabyError(status, error)) {
    return {
      title: locale === "zh" ? "重名" : "Duplicate name",
      description: error || (locale === "zh" ? ZH_DUPLICATE_HINT : EN_DUPLICATE_HINT),
    };
  }

  return {
    title: fallbackTitle,
    description:
      error ||
      (locale === "zh"
        ? `请求失败（状态码 ${status || 0}）`
        : `Request failed (status ${status || 0})`),
  };
}
