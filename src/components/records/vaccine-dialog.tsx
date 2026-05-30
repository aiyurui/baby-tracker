"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import {
  forceInsertRecordIntoAllRecordsByDayCaches,
  insertCreatedRecordIntoRecordsByDayCache,
} from "@/lib/records-by-day-cache";
import { emitRecordCreated } from "@/lib/record-events";
import { refetchDayRecordsOnce } from "@/lib/refetch-day-records";
import type { Baby, Record } from "@/types";

interface VaccineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  babyId: string;
  babies: Baby[];
}

interface VaccineForm {
  babyId: string;
  startTime: string;
  vaccineName: string;
  vaccineDoseNumber: number | undefined;
  vaccineTotalDoses: number | undefined;
  vaccineStatus: "PLANNED" | "COMPLETED" | "DEFERRED";
  nextDoseDate: string;
  contraindication: string;
  adverseReaction: string;
  note: string;
}

interface CreateRecordResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
}

export function VaccineDialog({ open, onOpenChange, babyId, babies }: VaccineDialogProps) {
  const { m } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VaccineForm>({
    defaultValues: {
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      vaccineName: "",
      vaccineDoseNumber: undefined,
      vaccineTotalDoses: undefined,
      vaccineStatus: "PLANNED",
      nextDoseDate: "",
      contraindication: "",
      adverseReaction: "",
      note: "",
    },
  });

  useEffect(() => {
    form.setValue("babyId", babyId);
  }, [babyId, form]);

  const onSubmit = async (values: VaccineForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: "MEDICAL",
        medicalCategory: "VACCINE",
        babyId: values.babyId,
        startTime: values.startTime,
        medicalDiagnosis: "Vaccination",
        medicalDepartment: "Vaccination Clinic",
        vaccineName: values.vaccineName || null,
        vaccineDoseNumber: values.vaccineDoseNumber ?? null,
        vaccineTotalDoses: values.vaccineTotalDoses ?? null,
        vaccineStatus: values.vaccineStatus,
        nextDoseDate: values.nextDoseDate || null,
        contraindication: values.contraindication || null,
        adverseReaction: values.adverseReaction || null,
        note: values.note || null,
      };

      let response: Response;
      try {
        response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch {
        toast({ title: "Vaccine record saved" });
        onOpenChange(false);
        void queryClient.invalidateQueries({ queryKey: ["records"] });
        return;
      }

      let body: CreateRecordResponse | null = null;
      try {
        body = (await response.json()) as CreateRecordResponse;
      } catch {
        body = null;
      }

      const isSuccess = response.ok && body?.success !== false;
      if (!isSuccess) {
        toast({ title: body?.error || m.common.internalError, variant: "destructive" });
        return;
      }

      if (values.startTime) {
        try {
          await refetchDayRecordsOnce(queryClient, values.startTime, values.babyId);
        } catch {
          // ignore refetch errors; keep save success path
        }
      }

      toast({ title: "Vaccine record saved" });
      form.reset({
        ...form.getValues(),
        startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        vaccineName: "",
        vaccineDoseNumber: undefined,
        vaccineTotalDoses: undefined,
        vaccineStatus: "PLANNED",
        nextDoseDate: "",
        contraindication: "",
        adverseReaction: "",
        note: "",
      });
      onOpenChange(false);

      if (body?.data && typeof body.data === "object") {
        const created = body.data as Record;
        insertCreatedRecordIntoRecordsByDayCache(queryClient, created, babies);
        forceInsertRecordIntoAllRecordsByDayCaches(queryClient, created, babies);
        emitRecordCreated(created);
      }

      await queryClient.invalidateQueries({ queryKey: ["records"] });
      await queryClient.invalidateQueries({ queryKey: ["records-by-day"] });
      await queryClient.refetchQueries({ queryKey: ["records"], type: "active" });
      await queryClient.refetchQueries({ queryKey: ["records-by-day"], type: "active" });
    } catch {
      toast({ title: m.common.internalError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Vaccine Record</DialogTitle>
          <DialogDescription>Independent vaccine popup for vaccine records only.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Baby</Label>
            <Select value={form.watch("babyId")} onValueChange={(v) => form.setValue("babyId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={m.babies.select} />
              </SelectTrigger>
              <SelectContent>
                {babies.map((baby) => (
                  <SelectItem key={baby.id} value={baby.id}>
                    {baby.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Shot Time</Label>
              <Input type="datetime-local" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label>Vaccine Name</Label>
              <Input {...form.register("vaccineName")} placeholder="e.g. Hepatitis B" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Dose No.</Label>
              <Input type="number" min={1} {...form.register("vaccineDoseNumber", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Total Doses</Label>
              <Input type="number" min={1} {...form.register("vaccineTotalDoses", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("vaccineStatus")}
                onValueChange={(v) => form.setValue("vaccineStatus", v as "PLANNED" | "COMPLETED" | "DEFERRED")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DEFERRED">Deferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Next Dose Time (optional)</Label>
            <Input type="datetime-local" {...form.register("nextDoseDate")} />
          </div>

          <div className="space-y-2">
            <Label>Contraindication (optional)</Label>
            <Textarea {...form.register("contraindication")} />
          </div>
          <div className="space-y-2">
            <Label>Adverse Reaction (optional)</Label>
            <Textarea {...form.register("adverseReaction")} />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea {...form.register("note")} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : m.common.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


