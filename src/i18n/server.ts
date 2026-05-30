import type { NextRequest } from "next/server";
import type { Locale } from "./messages";

export type ApiMessageKey =
  | "unauthorized"
  | "forbidden"
  | "internalError"
  | "recordNotFound"
  | "babyNotFound"
  | "emailRegistered"
  | "registrationFailed";

const apiMessages: Record<Locale, Record<ApiMessageKey, string>> = {
  zh: {
    unauthorized: "未登录",
    forbidden: "未授权",
    internalError: "服务器错误",
    recordNotFound: "未找到记录",
    babyNotFound: "未找到宝宝",
    emailRegistered: "邮箱已被注册",
    registrationFailed: "注册失败",
  },
  en: {
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    internalError: "Internal server error",
    recordNotFound: "Record not found",
    babyNotFound: "Baby not found",
    emailRegistered: "Email already registered",
    registrationFailed: "Registration failed",
  },
};

export function getLocaleFromRequest(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") || "";
  const lower = header.toLowerCase();
  if (lower.includes("zh")) return "zh";
  return "en";
}

export function tApi(locale: Locale, key: ApiMessageKey): string {
  return apiMessages[locale][key];
}

