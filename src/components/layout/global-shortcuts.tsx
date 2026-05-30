"use client";

import Link from "next/link";
import { Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalShortcuts() {
  return (
    <div className="flex items-center justify-center gap-2">
      <Link href="/">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-muted-foreground/20" aria-label="go-home">
          <Home className="h-4 w-4" />
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-muted-foreground/20" aria-label="go-dashboard">
          <LayoutDashboard className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

