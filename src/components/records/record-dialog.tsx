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
import type {
  BathRecordInput,
  DiaperRecordInput,
  FeedingRecordInput,
  MedicalRecordInput,
  SleepRecordInput,
} from "@/validations/record";
import {
  bathRecordSchema,
  diaperRecordSchema,
  feedingRecordSchema,
  medicalRecordSchema,
  sleepRecordSchema,
} from "@/validations/record";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  babyId: string;
  babies: Baby[];
  defaultTab?: "feeding" | "sleep" | "diaper" | "bath" | "medical";
  medicalPreset?: "MEDICAL_VISIT" | "HEIGHT_WEIGHT" | "VACCINE" | null;
}

type RecordTab = "feeding" | "sleep" | "diaper" | "bath" | "medical";

interface CreateRecordResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
}

export function RecordDialog({
  open,
  onOpenChange,
  babyId,
  babies,
  defaultTab = "feeding",
  medicalPreset = null,
}: RecordDialogProps) {
  const { locale, m } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RecordTab>(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedingForm = useForm<FeedingRecordInput>({
    resolver: zodResolver(feedingRecordSchema),
    defaultValues: {
      type: "FEEDING",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      amount: undefined,
      unit: "ml",
      feedingType: "BREAST_MILK_DIRECT",
      note: "",
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

  const medicalForm = useForm<MedicalRecordInput>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      type: "MEDICAL",
      babyId,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      medicalCategory: "MEDICAL_VISIT",
      medicalHospital: "",
      medicalDepartment: "",
      medicalDiagnosis: "",
      medicalPrescription: "",
      medicalCost: undefined,
      followUpDate: "",
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
    medicalForm.reset({
      type: "MEDICAL",
      babyId,
      startTime: now,
      medicalCategory: "MEDICAL_VISIT",
      medicalHospital: "",
      medicalDepartment: "",
      medicalDiagnosis: "",
      medicalPrescription: "",
      medicalCost: undefined,
      followUpDate: "",
      vaccineName: "",
      vaccineDoseNumber: undefined,
      vaccineTotalDoses: undefined,
      vaccineStatus: "PLANNED",
      nextDoseDate: "",
      contraindication: "",
      adverseReaction: "",
      note: "",
    });
  };

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      resetAllForms();
    }
  }, [defaultTab, open, babyId]);

  useEffect(() => {
    if (!open || defaultTab !== "medical" || !medicalPreset) return;
    if (medicalPreset === "MEDICAL_VISIT") {
      medicalForm.setValue("medicalCategory", "MEDICAL_VISIT");
      medicalForm.setValue("medicalDiagnosis", "就医记录");
      medicalForm.setValue("note", "");
      medicalForm.setValue("medicalDepartment", "");
    } else if (medicalPreset === "HEIGHT_WEIGHT") {
      medicalForm.setValue("medicalCategory", "HEIGHT_WEIGHT");
      medicalForm.setValue("medicalDiagnosis", "身高体重");
      medicalForm.setValue("note", "身高: cm, 体重: kg");
      medicalForm.setValue("medicalDepartment", "儿童保健");
    } else if (medicalPreset === "VACCINE") {
      medicalForm.setValue("medicalCategory", "VACCINE");
      medicalForm.setValue("medicalDiagnosis", "疫苗接种");
      medicalForm.setValue("note", "疫苗名称: , 剂次: ");
      medicalForm.setValue("medicalDepartment", "预防接种门诊");
      medicalForm.setValue("vaccineName", "");
      medicalForm.setValue("vaccineStatus", "PLANNED");
    }
  }, [defaultTab, medicalForm, medicalPreset, open]);

  const medicalCategory = medicalForm.watch("medicalCategory");

  const submitRecord = async (data: unknown) => {
    setIsSubmitting(true);
    try {
      const payload =
        typeof data === "object" && data !== null
          ? Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, typeof value === "number" && Number.isNaN(value) ? null : value])
            )
          : data;

      let response: Response;
      try {
        response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch {
        toast({ title: m.records.addRecord });
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

      const payloadRecord =
        typeof payload === "object" && payload !== null
          ? (payload as { startTime?: string; babyId?: string })
          : undefined;
      if (payloadRecord?.startTime) {
        try {
          await refetchDayRecordsOnce(queryClient, payloadRecord.startTime, payloadRecord.babyId);
        } catch {
          // ignore refetch errors; keep save success path
        }
      }

      toast({ title: m.records.addRecord });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{m.records.addRecord}</DialogTitle>
          <DialogDescription>{m.records.addRecordHint}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as RecordTab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="feeding">{m.recordType.FEEDING}</TabsTrigger>
            <TabsTrigger value="sleep">{m.recordType.SLEEP}</TabsTrigger>
            <TabsTrigger value="diaper">{m.recordType.DIAPER}</TabsTrigger>
            <TabsTrigger value="bath">{m.recordType.BATH}</TabsTrigger>
            <TabsTrigger value="medical">{m.recordType.MEDICAL}</TabsTrigger>
          </TabsList>

          <TabsContent value="feeding" className="space-y-4">
            <form onSubmit={feedingForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField
                babies={babies}
                babyId={feedingForm.watch("babyId")}
                onChange={(value) => feedingForm.setValue("babyId", value)}
                label={m.babies.select}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{m.recordType.FEEDING}</Label>
                  <Select
                    value={feedingForm.watch("feedingType") || ""}
                    onValueChange={(value) => feedingForm.setValue("feedingType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={m.recordType.FEEDING} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BREAST_MILK_DIRECT">{m.feedingType.BREAST_MILK_DIRECT}</SelectItem>
                      <SelectItem value="BREAST_MILK_BOTTLE">{m.feedingType.BREAST_MILK_BOTTLE}</SelectItem>
                      <SelectItem value="FORMULA">{m.feedingType.FORMULA}</SelectItem>
                      <SelectItem value="SOLID_FOOD">{m.feedingType.SOLID_FOOD}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{m.common.unitMl}</Label>
                  <Input type="number" {...feedingForm.register("amount", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{m.common.time}</Label>
                <Input type="datetime-local" {...feedingForm.register("startTime")} />
              </div>
              <div className="space-y-2">
                <Label>{m.common.note}</Label>
                <Textarea {...feedingForm.register("note")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : m.common.save}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="sleep" className="space-y-4">
            <form onSubmit={sleepForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField
                babies={babies}
                babyId={sleepForm.watch("babyId")}
                onChange={(value) => sleepForm.setValue("babyId", value)}
                label={m.babies.select}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{m.common.start}</Label>
                  <Input type="datetime-local" {...sleepForm.register("startTime")} />
                </div>
                <div className="space-y-2">
                  <Label>{m.common.end}</Label>
                  <Input type="datetime-local" {...sleepForm.register("endTime")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{m.common.note}</Label>
                <Textarea {...sleepForm.register("note")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : m.common.save}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="diaper" className="space-y-4">
            <form onSubmit={diaperForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField
                babies={babies}
                babyId={diaperForm.watch("babyId")}
                onChange={(value) => diaperForm.setValue("babyId", value)}
                label={m.babies.select}
              />
              <div className="space-y-2">
                <Label>{m.recordType.DIAPER}</Label>
                <Select
                  value={diaperForm.watch("diaperStatus") || ""}
                  onValueChange={(value) => diaperForm.setValue("diaperStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={m.recordType.DIAPER} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WET">{m.diaperStatus.WET}</SelectItem>
                    <SelectItem value="DIRTY">{m.diaperStatus.DIRTY}</SelectItem>
                    <SelectItem value="BOTH">{m.diaperStatus.BOTH}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{m.common.time}</Label>
                <Input type="datetime-local" {...diaperForm.register("startTime")} />
              </div>
              <div className="space-y-2">
                <Label>{m.common.note}</Label>
                <Textarea {...diaperForm.register("note")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : m.common.save}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bath" className="space-y-4">
            <form onSubmit={bathForm.handleSubmit(submitRecord)} className="space-y-4">
              <BabyField
                babies={babies}
                babyId={bathForm.watch("babyId")}
                onChange={(value) => bathForm.setValue("babyId", value)}
                label={m.babies.select}
              />
              <div className="space-y-2">
                <Label>{m.common.time}</Label>
                <Input type="datetime-local" {...bathForm.register("startTime")} />
              </div>
              <div className="space-y-2">
                <Label>{m.common.note}</Label>
                <Textarea {...bathForm.register("note")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : m.common.save}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <form onSubmit={medicalForm.handleSubmit(submitRecord)} className="space-y-4">
              <input type="hidden" {...medicalForm.register("medicalCategory")} />
              <BabyField
                babies={babies}
                babyId={medicalForm.watch("babyId")}
                onChange={(value) => medicalForm.setValue("babyId", value)}
                label={m.babies.select}
              />
              <div className="space-y-2">
                <Label>{m.common.time}</Label>
                <Input type="datetime-local" {...medicalForm.register("startTime")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{m.records.hospital}</Label>
                  <Input {...medicalForm.register("medicalHospital")} />
                </div>
                <div className="space-y-2">
                  <Label>{m.records.department}</Label>
                  <Input {...medicalForm.register("medicalDepartment")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{m.records.diagnosis}</Label>
                <Input {...medicalForm.register("medicalDiagnosis")} />
              </div>
              <div className="space-y-2">
                <Label>{m.records.prescription}</Label>
                <Input {...medicalForm.register("medicalPrescription")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{m.records.cost}</Label>
                  <Input type="number" step="0.01" {...medicalForm.register("medicalCost", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>{m.records.followUpDate}</Label>
                  <Input type="datetime-local" {...medicalForm.register("followUpDate")} />
                </div>
              </div>
              {medicalCategory === "VACCINE" && (
                <>
                  <div className="space-y-2">
                    <Label>{locale === "zh" ? "疫苗名称" : "Vaccine Name"}</Label>
                    <Input {...medicalForm.register("vaccineName")} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{locale === "zh" ? "当前剂次" : "Dose No."}</Label>
                      <Input type="number" {...medicalForm.register("vaccineDoseNumber", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{locale === "zh" ? "总剂次" : "Total Doses"}</Label>
                      <Input type="number" {...medicalForm.register("vaccineTotalDoses", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{locale === "zh" ? "状态" : "Status"}</Label>
                      <Select
                        value={medicalForm.watch("vaccineStatus") || "PLANNED"}
                        onValueChange={(value) => medicalForm.setValue("vaccineStatus", value as "PLANNED" | "COMPLETED" | "DEFERRED")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNED">{locale === "zh" ? "待接种" : "Planned"}</SelectItem>
                          <SelectItem value="COMPLETED">{locale === "zh" ? "已完成" : "Completed"}</SelectItem>
                          <SelectItem value="DEFERRED">{locale === "zh" ? "延期" : "Deferred"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{locale === "zh" ? "下次接种时间" : "Next Dose Date"}</Label>
                    <Input type="datetime-local" {...medicalForm.register("nextDoseDate")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale === "zh" ? "禁忌说明" : "Contraindications"}</Label>
                    <Textarea {...medicalForm.register("contraindication")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale === "zh" ? "不良反应记录" : "Adverse Reaction"}</Label>
                    <Textarea {...medicalForm.register("adverseReaction")} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>{m.common.note}</Label>
                <Textarea
                  {...medicalForm.register("note")}
                  placeholder={m.common.detail}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : m.common.save}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function BabyField({
  babies,
  babyId,
  onChange,
  label,
}: {
  babies: Baby[];
  babyId: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={babyId} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
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
  );
}




