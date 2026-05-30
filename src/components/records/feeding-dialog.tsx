"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import {
  forceInsertRecordIntoAllRecordsByDayCaches,
  insertCreatedRecordIntoRecordsByDayCache,
} from "@/lib/records-by-day-cache";
import { emitRecordCreated } from "@/lib/record-events";
import { refetchDayRecordsOnce } from "@/lib/refetch-day-records";
import type { Baby, Record } from "@/types";
import type { BathRecordInput, DiaperRecordInput, FeedingRecordInput, SleepRecordInput } from "@/validations/record";
import { bathRecordSchema, diaperRecordSchema, feedingRecordSchema, sleepRecordSchema } from "@/validations/record";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface FeedingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  babyId: string;
  babies: Baby[];
  defaultTab?: "feeding" | "sleep" | "diaper" | "bath";
  onSaved?: (saved?: { startTime?: string; babyId?: string; record?: unknown }) => void;
}

interface CreateRecordResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
}

type CreateRecordPayload = {
  type?: string;
  babyId?: string;
  startTime?: string;
  amount?: number | null;
  unit?: string | null;
  feedingType?: string | null;
  note?: string | null;
};

type FeedingFormValues = FeedingRecordInput & {
  leftMinutes?: number | null;
  rightMinutes?: number | null;
};

function minuteKey(value?: string | Date | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor(ts / 60000);
}

function isLikelySameRecord(
  payload: CreateRecordPayload,
  record: Record,
  submitAttemptAtMs: number
) {
  if (!payload.babyId || !payload.type || !payload.startTime) return false;
  if (record.babyId !== payload.babyId) return false;
  if (record.type !== payload.type) return false;

  const createdAtMs = new Date(record.createdAt as unknown as string).getTime();
  if (Number.isNaN(createdAtMs)) return false;
  // Recovery should only accept records created around this submit attempt.
  if (Math.abs(createdAtMs - submitAttemptAtMs) > 3 * 60 * 1000) return false;

  const payloadMinute = minuteKey(payload.startTime);
  const recordMinute = minuteKey(record.startTime as unknown as string);
  if (payloadMinute === null || recordMinute === null || payloadMinute !== recordMinute) return false;

  if (payload.type === "FEEDING") {
    const payloadAmount = payload.amount ?? null;
    const recordAmount = record.amount ?? null;
    if (payloadAmount !== recordAmount) return false;
    if ((payload.unit ?? null) !== (record.unit ?? null)) return false;
    if ((payload.feedingType ?? null) !== (record.feedingType ?? null)) return false;
    if ((payload.note ?? "") !== (record.note ?? "")) return false;
  }

  return true;
}

async function recoverSavedRecordFromDayApi(
  payload: CreateRecordPayload,
  submitAttemptAtMs: number
) {
  if (!payload.babyId || !payload.startTime) return null;
  const dateKey = payload.startTime.slice(0, 10);
  if (!dateKey || dateKey.length !== 10) return null;

  const params = new URLSearchParams();
  params.set("date", dateKey);
  params.set("babyId", payload.babyId);
  params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
  params.set("_ts", String(Date.now()));
  const response = await fetch(`/api/records?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: Record[] };
  const records = body.data || [];
  return (
    records
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt as unknown as string).getTime() -
          new Date(a.createdAt as unknown as string).getTime()
      )
      .find((record) => isLikelySameRecord(payload, record, submitAttemptAtMs)) || null
  );
}

export function FeedingDialog({ open, onOpenChange, babyId, babies, defaultTab = "feeding", onSaved }: FeedingDialogProps) {
  const { m } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"feeding" | "sleep" | "diaper" | "bath">(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedingForm = useForm<FeedingFormValues>({
    resolver: zodResolver(feedingRecordSchema),
    defaultValues: {
      type: "FEEDING",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      amount: undefined,
      unit: "ml",
      feedingType: "BREAST_MILK_DIRECT",
      note: "",
      leftMinutes: undefined,
      rightMinutes: undefined,
    },
  });

  const sleepForm = useForm<SleepRecordInput>({
    resolver: zodResolver(sleepRecordSchema),
    defaultValues: {
      type: "SLEEP",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      note: "",
    },
  });

  const diaperForm = useForm<DiaperRecordInput>({
    resolver: zodResolver(diaperRecordSchema),
    defaultValues: {
      type: "DIAPER",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      diaperStatus: "WET",
      note: "",
    },
  });

  const bathForm = useForm<BathRecordInput>({
    resolver: zodResolver(bathRecordSchema),
    defaultValues: {
      type: "BATH",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      note: "",
    },
  });

  const resetAllForms = () => {
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    feedingForm.reset({
      type: "FEEDING",
      babyId,
      startTime: now,
      amount: undefined,
      unit: "ml",
      feedingType: "BREAST_MILK_DIRECT",
      note: "",
      leftMinutes: undefined,
      rightMinutes: undefined,
    });
    sleepForm.reset({
      type: "SLEEP",
      babyId,
      startTime: now,
      endTime: now,
      note: "",
    });
    diaperForm.reset({
      type: "DIAPER",
      babyId,
      startTime: now,
      diaperStatus: "WET",
      note: "",
    });
    bathForm.reset({
      type: "BATH",
      babyId,
      startTime: now,
      note: "",
    });
  };

  useEffect(() => {
    if (!open) return;
    resetAllForms();
    setActiveTab(defaultTab);
  }, [open, babyId, defaultTab]);

  const submitRecord = async (data: unknown) => {
    setIsSubmitting(true);
    let saveAccepted = false;
    const submitAttemptAtMs = Date.now();
    try {
      const payload =
        typeof data === "object" && data !== null
          ? Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, typeof value === "number" && Number.isNaN(value) ? null : value])
            )
          : data;
      const payloadRecord =
        typeof payload === "object" && payload !== null ? (payload as CreateRecordPayload) : undefined;
      const hasExternalRealtimeHandler = typeof onSaved === "function";

      let response: Response | null = null;
      let body: CreateRecordResponse | null = null;
      let recoveredFromNetworkError = false;
      try {
        response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("[feeding-dialog] request failed, trying recovery query", error);
        if (payloadRecord) {
          try {
            const recovered = await recoverSavedRecordFromDayApi(
              payloadRecord,
              submitAttemptAtMs
            );
            if (recovered) {
              body = { success: true, data: recovered };
              recoveredFromNetworkError = true;
            }
          } catch (recoverError) {
            console.error("[feeding-dialog] recovery query failed", recoverError);
          }
        }
        if (!recoveredFromNetworkError) {
          toast({
            title: m.babies.addFailed,
            variant: "destructive",
          });
          return;
        }
      }

      if (!recoveredFromNetworkError) {
        try {
          body = (await response?.json()) as CreateRecordResponse;
        } catch {
          body = null;
        }
      }

      const isSuccess = recoveredFromNetworkError || (!!response?.ok && body?.success !== false);
      if (!isSuccess) {
        toast({
          title: body?.error || m.babies.addFailed,
          variant: "destructive",
        });
        return;
      }
      saveAccepted = true;

      if (payloadRecord?.startTime && !hasExternalRealtimeHandler) {
        try {
          await refetchDayRecordsOnce(queryClient, payloadRecord.startTime, payloadRecord.babyId);
        } catch {
          // ignore refetch errors; keep save success path
        }
      }

      toast({ title: m.records.addRecord });
      resetAllForms();
      onOpenChange(false);
      if (body?.data && typeof body.data === "object") {
        const created = body.data as Record;
        try {
          insertCreatedRecordIntoRecordsByDayCache(queryClient, created, babies);
          forceInsertRecordIntoAllRecordsByDayCaches(queryClient, created, babies);
          emitRecordCreated(created);
        } catch (error) {
          console.error("[feeding-dialog] optimistic update failed", error);
          // ignore optimistic insert errors; keep save success path
        }
      }
      try {
        if (hasExternalRealtimeHandler) {
          if (recoveredFromNetworkError) {
            // Recovery query already fetched day records; skip extra dashboard refetch.
            return;
          }
          if (typeof payload === "object" && payload !== null) {
            const saved = payload as { startTime?: string; babyId?: string };
            await Promise.resolve(onSaved?.({ startTime: saved.startTime, babyId: saved.babyId, record: body?.data }));
          } else {
            await Promise.resolve(onSaved?.());
          }
        }
      } catch (error) {
        console.error("[feeding-dialog] onSaved callback failed", error);
        // ignore post-save callback errors; keep save success path
      }
      try {
        if (!hasExternalRealtimeHandler) {
          await queryClient.invalidateQueries({ queryKey: ["records"] });
          await queryClient.invalidateQueries({ queryKey: ["records-by-day"] });
        }
      } catch (error) {
        console.error("[feeding-dialog] query refresh failed", error);
        // ignore cache refresh errors; keep save success path
      }
    } catch (error) {
      if (!saveAccepted) {
        console.error("[feeding-dialog] submit failed before save acceptance", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedingRecord = (data: FeedingFormValues) => {
    const feedingType = data.feedingType ?? "";
    if (feedingType !== "BREAST_MILK_DIRECT" && feedingType !== "BREAST_MILK") {
      submitRecord({
        ...data,
        leftMinutes: undefined,
        rightMinutes: undefined,
        unit: data.unit ?? "ml",
      });
      return;
    }

    const leftMinutes = Math.max(0, Math.round(data.leftMinutes ?? 0));
    const rightMinutes = Math.max(0, Math.round(data.rightMinutes ?? 0));
    const directMinutesNote = `左:${leftMinutes}分钟 右:${rightMinutes}分钟`;
    const customNote = (data.note ?? "").trim();

    submitRecord({
      ...data,
      amount: leftMinutes + rightMinutes,
      unit: "min",
      note: customNote ? `${directMinutesNote}\n${customNote}` : directMinutesNote,
      leftMinutes: undefined,
      rightMinutes: undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{m.recordType.FEEDING}</DialogTitle>
          <DialogDescription>{m.records.addRecordHint}</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "feeding" | "sleep" | "diaper" | "bath")}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feeding">{m.recordType.FEEDING}</TabsTrigger>
            <TabsTrigger value="sleep">{m.recordType.SLEEP}</TabsTrigger>
            <TabsTrigger value="diaper">{m.recordType.DIAPER}</TabsTrigger>
            <TabsTrigger value="bath">{m.recordType.BATH}</TabsTrigger>
          </TabsList>

          <TabsContent value="feeding" className="space-y-4">
            <form onSubmit={feedingForm.handleSubmit(submitFeedingRecord)} className="space-y-4">
              <BabyField babies={babies} babyId={feedingForm.watch("babyId")} onChange={(v) => feedingForm.setValue("babyId", v)} label={m.babies.select} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{m.recordType.FEEDING}</Label>
                  <Select value={feedingForm.watch("feedingType") || ""} onValueChange={(v) => feedingForm.setValue("feedingType", v)}>
                    <SelectTrigger><SelectValue placeholder={m.recordType.FEEDING} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BREAST_MILK_DIRECT">{m.feedingType.BREAST_MILK_DIRECT}</SelectItem>
                      <SelectItem value="BREAST_MILK_BOTTLE">{m.feedingType.BREAST_MILK_BOTTLE}</SelectItem>
                      <SelectItem value="FORMULA">{m.feedingType.FORMULA}</SelectItem>
                      <SelectItem value="SOLID_FOOD">{m.feedingType.SOLID_FOOD}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(feedingForm.watch("feedingType") === "BREAST_MILK_DIRECT" ||
                  feedingForm.watch("feedingType") === "BREAST_MILK") ? (
                  <div className="col-span-1 grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>左侧(分钟)</Label>
                      <Input type="number" min={0} {...feedingForm.register("leftMinutes", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>右侧(分钟)</Label>
                      <Input type="number" min={0} {...feedingForm.register("rightMinutes", { valueAsNumber: true })} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{m.common.unitMl}</Label>
                    <Input type="number" min={0} {...feedingForm.register("amount", { valueAsNumber: true })} />
                  </div>
                )}
              </div>
              <TimeAndNote formRegister={feedingForm.register} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : m.common.save}</Button>
            </form>
          </TabsContent>

          <TabsContent value="sleep" className="space-y-4">
            <form onSubmit={sleepForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField babies={babies} babyId={sleepForm.watch("babyId")} onChange={(v) => sleepForm.setValue("babyId", v)} label={m.babies.select} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{m.common.start}</Label><Input type="datetime-local" {...sleepForm.register("startTime")} /></div>
                <div className="space-y-2"><Label>{m.common.end}</Label><Input type="datetime-local" {...sleepForm.register("endTime")} /></div>
              </div>
              <div className="space-y-2"><Label>{m.common.note}</Label><Textarea {...sleepForm.register("note")} /></div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : m.common.save}</Button>
            </form>
          </TabsContent>

          <TabsContent value="diaper" className="space-y-4">
            <form onSubmit={diaperForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField babies={babies} babyId={diaperForm.watch("babyId")} onChange={(v) => diaperForm.setValue("babyId", v)} label={m.babies.select} />
              <div className="space-y-2">
                <Label>{m.recordType.DIAPER}</Label>
                <Select value={diaperForm.watch("diaperStatus") || ""} onValueChange={(v) => diaperForm.setValue("diaperStatus", v)}>
                  <SelectTrigger><SelectValue placeholder={m.recordType.DIAPER} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WET">{m.diaperStatus.WET}</SelectItem>
                    <SelectItem value="DIRTY">{m.diaperStatus.DIRTY}</SelectItem>
                    <SelectItem value="BOTH">{m.diaperStatus.BOTH}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <TimeAndNote formRegister={diaperForm.register} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : m.common.save}</Button>
            </form>
          </TabsContent>

          <TabsContent value="bath" className="space-y-4">
            <form onSubmit={bathForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField babies={babies} babyId={bathForm.watch("babyId")} onChange={(v) => bathForm.setValue("babyId", v)} label={m.babies.select} />
              <TimeAndNote formRegister={bathForm.register} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : m.common.save}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TimeAndNote({ formRegister }: { formRegister: any }) {
  const { m } = useI18n();
  return (
    <>
      <div className="space-y-2"><Label>{m.common.time}</Label><Input type="datetime-local" {...formRegister("startTime")} /></div>
      <div className="space-y-2"><Label>{m.common.note}</Label><Textarea {...formRegister("note")} /></div>
    </>
  );
}

function BabyField({ babies, babyId, onChange, label }: { babies: Baby[]; babyId: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={babyId} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          {babies.map((baby) => <SelectItem key={baby.id} value={baby.id}>{baby.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
