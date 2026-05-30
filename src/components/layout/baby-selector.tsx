"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Pencil, Plus } from "lucide-react";
import { BabyDialog } from "@/components/dashboard/baby-dialog";
import { EditBabyDialog } from "@/components/dashboard/edit-baby-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import type { Baby } from "@/types";

interface BabySelectorProps {
  selectedBabyId: string | null;
  onSelectBaby: (babyId: string) => void;
  includeAllOption?: boolean;
  allOptionValue?: string;
}

export function BabySelector({
  selectedBabyId,
  onSelectBaby,
  includeAllOption = false,
  allOptionValue = "ALL",
}: BabySelectorProps) {
  const { m, locale } = useI18n();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: babies, isLoading } = useQuery<Baby[]>({
    queryKey: ["babies"],
    queryFn: async () => {
      const res = await fetch("/api/babies");
      if (!res.ok) throw new Error("Failed to fetch babies");
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const selectedBaby = babies?.find((baby) => baby.id === selectedBabyId);
  const selectorWidth = selectedBaby ? Math.min(Math.max(selectedBaby.name.length * 16 + 52, 112), 240) : 152;
  const menuWidth = Math.max(selectorWidth, 188);

  return (
    <>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {(!babies || babies.length === 0) && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-muted-foreground/20 bg-background"
            onClick={() => setIsAddDialogOpen(true)}
            aria-label={m.babies.add}
            title={m.babies.add}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {isLoading ? (
          <div className="h-9 w-[42vw] max-w-44 animate-pulse rounded-full bg-muted/60 sm:w-44" />
        ) : babies && babies.length > 0 ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 max-w-[52vw] justify-between rounded-full border-muted-foreground/20 bg-muted/25 px-4 text-sm font-medium text-foreground hover:bg-muted/40 sm:max-w-none"
                style={{ width: selectorWidth, minWidth: 112 }}
                aria-label={m.babies.select}
              >
                <span className="truncate">
                  {selectedBaby?.name || (includeAllOption && selectedBabyId === allOptionValue ? (locale === "zh" ? "全部宝宝" : "All babies") : m.babies.select)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="rounded-2xl border-muted-foreground/20 bg-background/95 p-1.5 shadow-xl backdrop-blur"
              style={{ width: menuWidth, maxWidth: "calc(100vw - 1rem)" }}
            >
              {includeAllOption ? (
                <DropdownMenuItem
                  onClick={() => onSelectBaby(allOptionValue)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    selectedBabyId === allOptionValue ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted/70"
                  }`}
                >
                  <span>{locale === "zh" ? "全部宝宝" : "All babies"}</span>
                  {selectedBabyId === allOptionValue ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              ) : null}
              {babies.map((baby) => (
                <DropdownMenuItem
                  key={baby.id}
                  onClick={() => onSelectBaby(baby.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    selectedBabyId === baby.id ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted/70"
                  }`}
                >
                  <span className="truncate">{baby.name}</span>
                  {selectedBabyId === baby.id ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-sm text-muted-foreground">{m.babies.none}</span>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-muted-foreground/20 bg-background"
          onClick={() => setIsEditDialogOpen(true)}
          disabled={!selectedBaby || (includeAllOption && selectedBabyId === allOptionValue)}
          aria-label={locale === "zh" ? "编辑宝宝" : "Edit baby"}
          title={locale === "zh" ? "编辑宝宝" : "Edit baby"}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <BabyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreated={(baby) => onSelectBaby(baby.id)}
      />
      <EditBabyDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} baby={selectedBaby || null} />
    </>
  );
}
