"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 rounded-full border-muted-foreground/20 px-3.5"
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
    >
      <Languages className="h-4 w-4" />
      <span className="ml-1.5">{locale === "zh" ? "中文" : "EN"}</span>
    </Button>
  );
}
