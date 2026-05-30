"use client";

import { Baby, Heart, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function SiteFooter() {
  const { locale, m } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-6 text-sm text-muted-foreground">
      <div className="container mx-auto flex items-center justify-center gap-1.5 text-center">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span>
          {locale === "zh"
            ? `© ${year} ${m.appName} · 用心记录每一次成长`
            : `© ${year} ${m.appName} · Track every little milestone with love`}
        </span>
        <Baby className="h-4 w-4 text-sky-500" />
        <Heart className="h-4 w-4 text-rose-500" />
      </div>
    </footer>
  );
}
