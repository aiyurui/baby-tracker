"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface HeightWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  babyId: string;
  babies: Baby[];
  onSaved?: (saved?: { startTime?: string; babyId?: string; record?: unknown }) => void;
}

interface HeightWeightForm {
  babyId: string;
  startTime: string;
  heightCm: number | undefined;
  weightKg: number | undefined;
  note: string;
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
  medicalCategory?: string | null;
  medicalDepartment?: string | null;
  medicalDiagnosis?: string | null;
  note?: string | null;
};

function minuteKey(value?: string | Date | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor(ts / 60000);
}

function isLikelySameHeightWeightRecord(payload: CreateRecordPayload, record: Record, submitAttemptAtMs: number) {
  if (!payload.babyId || !payload.type || !payload.startTime) return false;
  if (record.babyId !== payload.babyId || record.type !== payload.type) return false;
  if ((payload.medicalCategory ?? null) !== (record.medicalCategory ?? null)) return false;

  const createdAtMs = new Date(record.createdAt as unknown as string).getTime();
  if (Number.isNaN(createdAtMs)) return false;
  if (Math.abs(createdAtMs - submitAttemptAtMs) > 3 * 60 * 1000) return false;

  const payloadMinute = minuteKey(payload.startTime);
  const recordMinute = minuteKey(record.startTime as unknown as string);
  if (payloadMinute === null || recordMinute === null || payloadMinute !== recordMinute) return false;

  if ((payload.note ?? "") !== (record.note ?? "")) return false;
  return true;
}

async function recoverSavedHeightWeightRecordFromDayApi(payload: CreateRecordPayload, submitAttemptAtMs: number) {
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
      .find((record) => isLikelySameHeightWeightRecord(payload, record, submitAttemptAtMs)) || null
  );
}

export function HeightWeightDialog({ open, onOpenChange, babyId, babies, onSaved }: HeightWeightDialogProps) {
  const { m } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HeightWeightForm>({
    defaultValues: {
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      heightCm: undefined,
      weightKg: undefined,
      note: "",
    },
  });

  const resetForm = () => {
    form.reset({
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      heightCm: undefined,
      weightKg: undefined,
      note: "",
    });
  };

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, babyId]);

  const onSubmit = async (values: HeightWeightForm) => {
    setIsSubmitting(true);
    let saveAccepted = false;
    const submitAttemptAtMs = Date.now();
    try {
      const recordNote = `身高: ${values.heightCm ?? "-"} cm, 体重: ${values.weightKg ?? "-"} kg${values.note ? `; 备注: ${values.note}` : ""}`;
      const payload = {
        type: "MEDICAL",
        medicalCategory: "HEIGHT_WEIGHT",
        babyId: values.babyId,
        startTime: values.startTime,
        medicalDiagnosis: "身高体重",
        medicalDepartment: "儿童保健",
        note: recordNote,
      };
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
        console.error("[height-weight-dialog] request failed, trying recovery query", error);
        if (payloadRecord) {
          try {
            const recovered = await recoverSavedHeightWeightRecordFromDayApi(payloadRecord, submitAttemptAtMs);
            if (recovered) {
              body = { success: true, data: recovered };
              recoveredFromNetworkError = true;
            }
          } catch (recoverError) {
            console.error("[height-weight-dialog] recovery query failed", recoverError);
          }
        }
        if (!recoveredFromNetworkError) {
          toast({ title: m.common.internalError, variant: "destructive" });
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
        toast({ title: body?.error || m.common.internalError, variant: "destructive" });
        return;
      }
      saveAccepted = true;

      if (values.startTime && !hasExternalRealtimeHandler) {
        try {
          await refetchDayRecordsOnce(queryClient, values.startTime, values.babyId);
        } catch {
          // ignore refetch errors; keep save success path
        }
      }

      toast({ title: m.records.addRecord });
      onOpenChange(false);
      if (body?.data && typeof body.data === "object") {
        const created = body.data as Record;
        try {
          insertCreatedRecordIntoRecordsByDayCache(queryClient, created, babies);
          forceInsertRecordIntoAllRecordsByDayCaches(queryClient, created, babies);
          emitRecordCreated(created);
        } catch (error) {
          console.error("[height-weight-dialog] optimistic update failed", error);
        }
      }
      try {
        if (hasExternalRealtimeHandler) {
          if (!recoveredFromNetworkError) {
            onSaved?.({ startTime: values.startTime, babyId: values.babyId, record: body?.data });
          }
        }
      } catch (error) {
        console.error("[height-weight-dialog] onSaved callback failed", error);
      }
      try {
        if (!hasExternalRealtimeHandler) {
          await queryClient.invalidateQueries({ queryKey: ["records"] });
          await queryClient.invalidateQueries({ queryKey: ["records-by-day"] });
          await queryClient.refetchQueries({ queryKey: ["records"], type: "active" });
          await queryClient.refetchQueries({ queryKey: ["records-by-day"], type: "active" });
        }
      } catch (error) {
        console.error("[height-weight-dialog] query refresh failed", error);
      }
    } catch (error) {
      if (!saveAccepted) {
        console.error("[height-weight-dialog] submit failed before save acceptance", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{m.recordType.MEDICAL}</DialogTitle>
          <DialogDescription>{m.records.addRecordHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{m.babies.select}</Label>
            <Select value={form.watch("babyId")} onValueChange={(v) => form.setValue("babyId", v)}>
              <SelectTrigger><SelectValue placeholder={m.babies.select} /></SelectTrigger>
              <SelectContent>{babies.map((baby) => <SelectItem key={baby.id} value={baby.id}>{baby.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{m.common.time}</Label><Input type="datetime-local" {...form.register("startTime")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{m.common.detail} (cm)</Label><Input type="number" step="0.1" {...form.register("heightCm", { valueAsNumber: true })} /></div>
            <div className="space-y-2"><Label>{m.common.detail} (kg)</Label><Input type="number" step="0.01" {...form.register("weightKg", { valueAsNumber: true })} /></div>
          </div>
          <div className="space-y-2"><Label>{m.common.note}</Label><Textarea {...form.register("note")} /></div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : m.common.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}



