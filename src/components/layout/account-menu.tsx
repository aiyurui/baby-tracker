"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Baby, Home, LayoutDashboard, LogOut, Shield, User } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { isAdminLike } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const { data: session } = useSession();
  const { m, locale } = useI18n();

  const displayName = session?.user?.name || session?.user?.email || m.appName;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[220px] gap-2 rounded-full border-muted-foreground/20"
          aria-label="account-menu"
        >
          <User className="h-4 w-4" />
          <span className="hidden truncate sm:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-[220px] truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {m.common.home}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {m.common.enterDashboard}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/babies">
            <Baby className="mr-2 h-4 w-4" />
            {locale === "zh" ? "宝宝管理" : "Baby Management"}
          </Link>
        </DropdownMenuItem>
        {isAdminLike(session?.user?.role) && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              {m.nav.admin}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="mr-2 h-4 w-4" />
          {m.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
