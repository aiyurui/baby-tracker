"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Baby as BabyIcon,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplets,
  CheckSquare,
  LayoutDashboard,
  Stethoscope,
  Syringe,
  Trash2,
  Weight,
} from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { BabySelector } from "@/components/layout/baby-selector";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FeedingDialog } from "@/components/records/feeding-dialog";
import { HeightWeightDialog } from "@/components/records/height-weight-dialog";
import { MedicalVisitDialog } from "@/components/records/medical-visit-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import { resolveRealtimeUpdateContext } from "@/lib/dashboard-realtime";
import { apiRequest } from "@/lib/http";
import { RECORD_CREATED_EVENT } from "@/lib/record-events";
import { formatDateTime } from "@/lib/utils";
import type { Baby, Record } from "@/types";

interface DashboardContentProps {
  babies: Baby[];
  todayRecords: (Record & { baby: { id: string; name: string } })[];
}

type DashboardRecord = Record & { baby: { id: string; name: string } };
type SavedPayload = { startTime?: string; babyId?: string; record?: unknown };

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDateKey(dateKey: string, diffDays: number) {
  const [y, m, d0] = dateKey.split("-").map(Number);
  const d = new Date(y, m - 1, d0);
  d.setDate(d.getDate() + diffDays);
  const nextY = d.getFullYear();
  const nextM = String(d.getMonth() + 1).padStart(2, "0");
  const nextD = String(d.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

function formatDateLabel(dateKey: string, locale: "zh" | "en") {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const formatted = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
  return formatted;
}

export function DashboardContent({ babies: initialBabies, todayRecords: initialRecords }: DashboardContentProps) {
  const { locale, m } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const todayKey = getTodayKey();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(initialBabies[0]?.id || null);
  const [activeDate, setActiveDate] = useState(todayKey);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [localCreatedRecords, setLocalCreatedRecords] = useState<DashboardRecord[]>([]);
  const [openFeeding, setOpenFeeding] = useState(false);
  const [openMedical, setOpenMedical] = useState(false);
  const [openHeightWeight, setOpenHeightWeight] = useState(false);
  const { data: liveBabies = initialBabies } = useQuery<Baby[]>({
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
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };
  const refetchCurrentDayRecords = async (saved?: SavedPayload) => {
    const created =
      saved?.record && typeof saved.record === "object" ? (saved.record as Record) : null;
    const effectiveStartTime = saved?.startTime || created?.startTime;
    const effectiveBabyId = saved?.babyId || created?.babyId;
    const { targetDateKey, shouldOptimisticInsert } = resolveRealtimeUpdateContext(activeDate, effectiveStartTime);

    if (effectiveBabyId && selectedBabyId && effectiveBabyId !== selectedBabyId) return;

    const key = ["records-by-day", selectedBabyId || "ALL", targetDateKey] as const;
    if (created && shouldOptimisticInsert) {
      const babyName =
        liveBabies.find((b) => b.id === (created.babyId || selectedBabyId || ""))?.name ||
        selectedBaby?.name ||
        "";
      const optimistic: DashboardRecord = {
        ...created,
        baby: { id: created.babyId, name: babyName },
      } as DashboardRecord;

      setLocalCreatedRecords((prev) => {
        if (prev.some((r) => r.id === optimistic.id)) return prev;
        return [optimistic, ...prev];
      });

      queryClient.setQueryData<DashboardRecord[]>(key, (prev = []) => {
        if (prev.some((r) => r.id === created.id)) return prev;
        return [optimistic, ...prev].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      });
    }
    await queryClient.refetchQueries({ queryKey: key, exact: true, type: "active" });
  };

  useEffect(() => {
    if (liveBabies.length === 0) {
      if (selectedBabyId !== null) setSelectedBabyId(null);
      return;
    }
    const exists = selectedBabyId ? liveBabies.some((baby) => baby.id === selectedBabyId) : false;
    if (!exists) {
      setSelectedBabyId(liveBabies[0].id);
    }
  }, [liveBabies, selectedBabyId]);

  const selectedBaby = useMemo(
    () => liveBabies.find((baby) => baby.id === selectedBabyId) || null,
    [liveBabies, selectedBabyId]
  );

  const { data: dayRecords = [] } = useQuery<DashboardRecord[]>({
    queryKey: ["records-by-day", selectedBabyId || "ALL", activeDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("date", activeDate);
      params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
      if (selectedBabyId) params.set("babyId", selectedBabyId);
      const res = await fetch(`/api/records?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch records");
      const json = (await res.json()) as { data?: DashboardRecord[] };
      return json.data || [];
    },
    initialData: activeDate === todayKey
      ? (selectedBabyId ? initialRecords.filter((record) => record.babyId === selectedBabyId) : initialRecords)
      : [],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  useEffect(() => {
    setSelectedRecordIds([]);
    setLocalCreatedRecords([]);
  }, [activeDate, selectedBabyId]);

  useEffect(() => {
    const onRecordCreated = (event: Event) => {
      const customEvent = event as CustomEvent<Record>;
      const created = customEvent.detail;
      if (!created?.id) return;
      if (selectedBabyId && created.babyId !== selectedBabyId) return;
      setLocalCreatedRecords((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        const babyName =
          liveBabies.find((baby) => baby.id === created.babyId)?.name ||
          selectedBaby?.name ||
          "";
        const optimistic: DashboardRecord = {
          ...created,
          baby: { id: created.babyId, name: babyName },
        } as DashboardRecord;
        return [optimistic, ...prev];
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener(RECORD_CREATED_EVENT, onRecordCreated as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(RECORD_CREATED_EVENT, onRecordCreated as EventListener);
      }
    };
  }, [liveBabies, selectedBaby?.name, selectedBabyId]);

  const visibleDayRecords = useMemo(() => {
    const scopedLocals = localCreatedRecords.filter((record) => {
      if (selectedBabyId && record.babyId !== selectedBabyId) return false;
      return true;
    });
    if (scopedLocals.length === 0) return dayRecords;
    const map = new Map<string, DashboardRecord>();
    for (const record of dayRecords) map.set(record.id, record);
    for (const record of scopedLocals) map.set(record.id, record);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [activeDate, dayRecords, localCreatedRecords, selectedBabyId]);

  const stats = useMemo(
    () => ({
      feeding: visibleDayRecords.filter((r) => ["FEEDING", "SLEEP", "DIAPER", "BATH"].includes(r.type)).length,
      medical: visibleDayRecords.filter((r) => r.type === "MEDICAL" && r.medicalCategory === "MEDICAL_VISIT").length,
      heightWeight: visibleDayRecords.filter((r) => r.type === "MEDICAL" && r.medicalCategory === "HEIGHT_WEIGHT").length,
      vaccine: visibleDayRecords.filter((r) => r.type === "MEDICAL" && r.medicalCategory === "VACCINE").length,
    }),
    [visibleDayRecords]
  );

  useEffect(() => {
    setLocalCreatedRecords((prev) => {
      if (prev.length === 0) return prev;
      const dayIds = new Set(dayRecords.map((r) => r.id));
      const next = prev.filter((r) => !dayIds.has(r.id));
      return next.length === prev.length ? prev : next;
    });
  }, [dayRecords]);

  useEffect(() => {
    setSelectedRecordIds((prev) => prev.filter((id) => visibleDayRecords.some((record) => record.id === id)));
  }, [visibleDayRecords]);

  const allSelected = visibleDayRecords.length > 0 && selectedRecordIds.length === visibleDayRecords.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRecordIds([]);
      return;
    }
    setSelectedRecordIds(visibleDayRecords.map((record) => record.id));
  };

  const toggleSelectOne = (recordId: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };
  const quickDateKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDateKey(todayKey, -(6 - i))),
    [todayKey]
  );

  const onDeleteRecord = async (recordId: string) => {
    const confirmed = window.confirm(locale === "zh" ? "确认删除这条记录？" : "Delete this record?");
    if (!confirmed) return;
    setDeletingRecordId(recordId);
    try {
      const result = await apiRequest(`/api/records/${recordId}`, { method: "DELETE" }, m.common.internalError);
      if (!result.ok) {
        toast({ title: result.error, variant: "destructive" });
        return;
      }
      toast({ title: m.records.deleteSuccess });
      queryClient.setQueryData<DashboardRecord[]>(
        ["records-by-day", selectedBabyId || "ALL", activeDate],
        (prev = []) => prev.filter((record) => record.id !== recordId)
      );
      setLocalCreatedRecords((prev) => prev.filter((record) => record.id !== recordId));
      setSelectedRecordIds((prev) => prev.filter((id) => id !== recordId));
      router.refresh();
    } catch {
      toast({ title: m.common.internalError, variant: "destructive" });
    } finally {
      setDeletingRecordId(null);
    }
  };

  const onDeleteSelectedRecords = async () => {
    if (!selectedRecordIds.length || isBulkDeleting) return;
    const confirmed = window.confirm(
      locale === "zh"
        ? `确定删除选中的 ${selectedRecordIds.length} 条记录吗？`
        : `Delete ${selectedRecordIds.length} selected records?`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    const failedIds: string[] = [];
    const deletedIds: string[] = [];
    for (const id of selectedRecordIds) {
      const result = await apiRequest(`/api/records/${id}`, { method: "DELETE" }, m.common.internalError);
      if (!result.ok) {
        failedIds.push(id);
      } else {
        deletedIds.push(id);
      }
    }

    if (deletedIds.length > 0) {
      queryClient.setQueryData<DashboardRecord[]>(
        ["records-by-day", selectedBabyId || "ALL", activeDate],
        (prev = []) => prev.filter((record) => !deletedIds.includes(record.id))
      );
      setLocalCreatedRecords((prev) => prev.filter((record) => !deletedIds.includes(record.id)));
    }

    if (failedIds.length === 0) {
      toast({
        title: locale === "zh" ? `已删除 ${selectedRecordIds.length} 条记录` : `Deleted ${selectedRecordIds.length} records`,
      });
      setSelectedRecordIds([]);
      router.refresh();
    } else {
      toast({
        title:
          locale === "zh"
            ? `${selectedRecordIds.length - failedIds.length} 条删除成功，${failedIds.length} 条失败`
            : `${selectedRecordIds.length - failedIds.length} deleted, ${failedIds.length} failed`,
        variant: "destructive",
      });
      setSelectedRecordIds((prev) => prev.filter((id) => failedIds.includes(id)));
      router.refresh();
    }

    setIsBulkDeleting(false);
  };

  return (
    <div className="min-h-full pb-mobile-nav md:pb-6">
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
                <LayoutDashboard className="h-6 w-6 text-sky-600" />
                {m.dashboard.title}
              </h1>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <div className="sm:hidden">
                <GlobalShortcuts />
              </div>
              <BabySelector selectedBabyId={selectedBabyId} onSelectBaby={setSelectedBabyId} />
              <Link href="/analytics">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-muted-foreground/20" aria-label="open-analytics">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {selectedBaby ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                icon={<Droplets className="h-5 w-5" />}
                label={locale === "zh" ? "喂养记录" : "Feeding Module"}
                count={stats.feeding}
                color="bg-blue-100 text-blue-600"
                onClick={() => setOpenFeeding(true)}
              />
              <ActionCard
                icon={<Stethoscope className="h-5 w-5" />}
                label={locale === "zh" ? "就医记录" : "Medical Visit"}
                count={stats.medical}
                color="bg-amber-100 text-amber-700"
                onClick={() => setOpenMedical(true)}
              />
              <ActionCard
                icon={<Weight className="h-5 w-5" />}
                label={locale === "zh" ? "身高体重记录" : "Height/Weight"}
                count={stats.heightWeight}
                color="bg-violet-100 text-violet-700"
                onClick={() => setOpenHeightWeight(true)}
              />
              <ActionCard
                icon={<Syringe className="h-5 w-5" />}
                label={locale === "zh" ? "疫苗接种记录" : "Vaccine"}
                count={stats.vaccine}
                color="bg-emerald-100 text-emerald-700"
                href="/vaccines"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setActiveDate((prev) => shiftDateKey(prev, -1))}
                    aria-label="previous-day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 text-center">
                    <CardTitle>{m.records.todayOverview}</CardTitle>
                    <CardDescription>
                      {selectedBaby.name} · {formatDateLabel(activeDate, locale)}
                    </CardDescription>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1 h-8 w-8"
                      aria-label="pick-day"
                      onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="sr-only"
                      max={todayKey}
                      value={activeDate}
                      onChange={(e) => setActiveDate(e.target.value)}
                    />
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveDate(todayKey)}
                        disabled={activeDate === todayKey}
                      >
                        {locale === "zh" ? "返回今日" : "Back to Today"}
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                      {quickDateKeys.map((key) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={key === activeDate ? "default" : "outline"}
                          className="h-7 rounded-full px-2 text-xs"
                          onClick={() => setActiveDate(key)}
                        >
                          {key.slice(5).replace("-", ".")}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setActiveDate((prev) => shiftDateKey(prev, 1))}
                    aria-label="next-day"
                    disabled={activeDate >= todayKey}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {visibleDayRecords.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <BabyIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>{m.records.noTodayRecords}</p>
                    <p className="text-sm">{m.records.clickToAdd}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2">
                      <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {allSelected
                          ? locale === "zh"
                            ? "取消全选"
                            : "Unselect All"
                          : locale === "zh"
                            ? "全选"
                            : "Select All"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onDeleteSelectedRecords}
                        disabled={!selectedRecordIds.length || isBulkDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {locale === "zh"
                          ? `删除选中${selectedRecordIds.length ? `（${selectedRecordIds.length}）` : ""}`
                          : `Delete Selected${selectedRecordIds.length ? ` (${selectedRecordIds.length})` : ""}`}
                      </Button>
                    </div>
                    {visibleDayRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0"
                          checked={selectedRecordIds.includes(record.id)}
                          onChange={() => toggleSelectOne(record.id)}
                          aria-label="select-record"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{getRecordTitle(record, m, locale)}</p>
                          <p className="text-sm text-muted-foreground">{formatDateTime(record.startTime, locale)}</p>
                          <p className="text-xs text-muted-foreground">{getRecordDetail(record, m, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{record.baby.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDeleteRecord(record.id)}
                            disabled={deletingRecordId === record.id || isBulkDeleting}
                            aria-label="delete-record"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BabyIcon className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">{m.dashboard.welcome}</h2>
              <p className="text-muted-foreground">{m.dashboard.addBabyFirst}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <MobileNav />

      {selectedBabyId && (
        <>
          <FeedingDialog open={openFeeding} onOpenChange={setOpenFeeding} babyId={selectedBabyId} babies={liveBabies} onSaved={refetchCurrentDayRecords} />
          <MedicalVisitDialog open={openMedical} onOpenChange={setOpenMedical} babyId={selectedBabyId} babies={liveBabies} onSaved={refetchCurrentDayRecords} />
          <HeightWeightDialog open={openHeightWeight} onOpenChange={setOpenHeightWeight} babyId={selectedBabyId} babies={liveBabies} onSaved={refetchCurrentDayRecords} />
        </>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  label,
  count,
  color,
  onClick,
  href,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <Link href={href}>
        <Card className="cursor-pointer transition-transform hover:scale-[1.01]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-full p-2.5 ${color}`}>{icon}</div>
            <div className="min-w-0">
              <p className="truncate font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{count}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="cursor-pointer transition-transform hover:scale-[1.01]" onClick={onClick}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-full p-2.5 ${color}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{count}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getRecordTitle(record: Record & { baby: { name: string } }, m: ReturnType<typeof useI18n>["m"], locale: "zh" | "en") {
  if (record.type !== "MEDICAL") {
    return m.recordType[record.type as keyof typeof m.recordType] || record.type;
  }
  if (record.medicalCategory === "HEIGHT_WEIGHT") return locale === "zh" ? "身高体重记录" : "Height/Weight";
  if (record.medicalCategory === "VACCINE") return locale === "zh" ? "疫苗接种记录" : "Vaccine";
  if (record.medicalCategory === "MEDICAL_VISIT") return locale === "zh" ? "就医记录" : "Medical Visit";
  return m.recordType.MEDICAL;
}

function getRecordDetail(record: Record & { baby: { name: string } }, m: ReturnType<typeof useI18n>["m"], locale: "zh" | "en") {
  if (record.type === "FEEDING") {
    const feeding = record.feedingType ? m.feedingType[record.feedingType as keyof typeof m.feedingType] || record.feedingType : m.common.detail;
    const amount = record.amount ? `${record.amount} ml` : "-";
    return `${feeding} / ${amount}`;
  }
  if (record.type === "SLEEP" && record.endTime) return `${m.common.end}: ${formatDateTime(record.endTime, locale)}`;
  if (record.type === "DIAPER") return record.diaperStatus ? m.diaperStatus[record.diaperStatus as keyof typeof m.diaperStatus] || record.diaperStatus : "-";
  if (record.type === "MEDICAL") {
    const parts = [record.vaccineName, record.medicalHospital, record.medicalDepartment, record.medicalDiagnosis, record.note].filter(Boolean);
    return parts.join(" / ") || m.common.detail;
  }
  return record.note || "-";
}

