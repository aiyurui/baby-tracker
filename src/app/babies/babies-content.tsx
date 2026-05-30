"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Pencil, Trash2, UserCircle2 } from "lucide-react";
import { BabyDialog } from "@/components/dashboard/baby-dialog";
import { EditBabyDialog } from "@/components/dashboard/edit-baby-dialog";
import { AccountMenu } from "@/components/layout/account-menu";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import { apiRequest } from "@/lib/http";
import type { Baby } from "@/types";

interface BabiesContentProps {
  initialBabies: Baby[];
}

function formatDateOnly(value: Date | string, locale: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function BabiesContent({ initialBabies }: BabiesContentProps) {
  const { locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingBaby, setEditingBaby] = useState<Baby | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const title = locale === "zh" ? "宝宝管理" : "Baby Management";
  const addText = locale === "zh" ? "新增宝宝" : "Add Baby";
  const emptyText = locale === "zh" ? "还没有宝宝，先新增一个吧" : "No babies yet. Add one to get started.";
  const editText = locale === "zh" ? "编辑" : "Edit";
  const deleteText = locale === "zh" ? "删除" : "Delete";
  const deletingText = locale === "zh" ? "删除中..." : "Deleting...";
  const deleteConfirmText =
    locale === "zh"
      ? "确定删除该宝宝吗？该操作会影响关联数据展示。"
      : "Delete this baby? This may affect related data views.";
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  };

  const { data: babies = initialBabies } = useQuery<Baby[]>({
    queryKey: ["babies"],
    queryFn: async () => {
      const res = await fetch("/api/babies");
      if (!res.ok) throw new Error("Failed to fetch babies");
      const data = await res.json();
      return data.data || [];
    },
    initialData: initialBabies,
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sortedBabies = useMemo(
    () => [...babies].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [babies]
  );

  const onDelete = async (baby: Baby) => {
    if (!window.confirm(`${deleteConfirmText}\n\n${baby.name}`)) return;
    setDeletingId(baby.id);
    try {
      const result = await apiRequest(
        `/api/babies/${baby.id}`,
        { method: "DELETE" },
        locale === "zh" ? "服务器错误" : "Server error"
      );
      if (!result.ok) {
        toast({
          title: locale === "zh" ? "删除失败" : "Delete failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: locale === "zh" ? "删除成功" : "Deleted" });
      queryClient.setQueryData<Baby[]>(["babies"], (prev = []) => prev.filter((b) => b.id !== baby.id));
    } catch {
      toast({ title: locale === "zh" ? "删除失败" : "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-mobile-nav md:pb-6">
      <header className="relative border-b bg-background">
        <div className="absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 sm:block">
          <div>
            <GlobalShortcuts />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <button type="button" className="rounded-full p-2 hover:bg-muted" aria-label="back" onClick={handleGoBack}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <UserCircle2 className="h-6 w-6 text-teal-600" />
                {title}
              </h1>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <div className="sm:hidden">
                <GlobalShortcuts />
              </div>
              <Button type="button" className="h-9 rounded-full" onClick={() => setOpenAdd(true)}>
                {addText}
              </Button>
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {sortedBabies.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{emptyText}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedBabies.map((baby) => (
              <Card key={baby.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5 text-teal-600" />
                    <span className="truncate">{baby.name}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {formatDateOnly(baby.birthDate, locale)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingBaby(baby);
                      setOpenEdit(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {editText}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => onDelete(baby)}
                    disabled={deletingId === baby.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === baby.id ? deletingText : deleteText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />

      <BabyDialog open={openAdd} onOpenChange={setOpenAdd} />
      <EditBabyDialog open={openEdit} onOpenChange={setOpenEdit} baby={editingBaby} />
    </div>
  );
}

