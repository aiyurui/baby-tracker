"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function MobileNav() {
  const pathname = usePathname();
  const { m } = useI18n();
  const navItems = [
    { href: "/dashboard", label: m.nav.dashboard, icon: Home },
    { href: "/records", label: m.nav.records, icon: Calendar },
    { href: "/analytics", label: m.nav.analytics, icon: BarChart3 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[var(--mobile-nav-height)] items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs transition-colors",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
