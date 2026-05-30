"use client";

import { useMemo, useState } from "react";
import { AccountMenu } from "@/components/layout/account-menu";
import { Calendar, Filter } from "lucide-react";
import { BabySelector } from "@/components/layout/baby-selector";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { formatDateTime } from "@/lib/utils";
import type { Baby, Record } from "@/types";

interface RecordsContentProps {
  babies: Baby[];
  initialRecords: (Record & { baby: { id: string; name: string } })[];
  initialFilterType?: string;
  initialMedicalCategory?: string;
}

export function RecordsContent({
  initialRecords,
  initialFilterType = "ALL",
  initialMedicalCategory = "ALL",
}: RecordsContentProps) {
  const { locale, m } = useI18n();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>(initialFilterType);
  const [medicalCategoryFilter, setMedicalCategoryFilter] = useState<string>(initialMedicalCategory);

  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      const babyMatch = !selectedBabyId || record.babyId === selectedBabyId;
      const feedingGroupMatch =
        filterType !== "FEEDING_GROUP" ||
        ["FEEDING", "SLEEP", "DIAPER", "BATH"].includes(record.type);
      const typeMatch =
        filterType === "ALL" || filterType === "FEEDING_GROUP" || record.type === filterType;
      const medicalCategoryMatch =
        record.type !== "MEDICAL" ||
        medicalCategoryFilter === "ALL" ||
        (record.medicalCategory || "") === medicalCategoryFilter;
      return babyMatch && feedingGroupMatch && typeMatch && medicalCategoryMatch;
    });
  }, [filterType, initialRecords, medicalCategoryFilter, selectedBabyId]);

  return (
    <div className="min-h-full pb-mobile-nav md:pb-6">
      <header className="relative border-b bg-background">
        <div className="absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 sm:block">
          <div>
            <GlobalShortcuts />
          </div>
        </div>
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Calendar className="h-6 w-6" />
              {m.records.title}
            </h1>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:flex-nowrap">
              <div className="sm:hidden">
                <GlobalShortcuts />
              </div>
              <BabySelector selectedBabyId={selectedBabyId} onSelectBaby={setSelectedBabyId} />
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[calc(50%-0.5rem)] min-w-[148px] sm:w-40">
                <SelectValue placeholder={m.records.filterType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{m.common.all}</SelectItem>
                <SelectItem value="FEEDING_GROUP">{locale === "zh" ? "喂养模块" : "Feeding Group"}</SelectItem>
                <SelectItem value="FEEDING">{m.recordType.FEEDING}</SelectItem>
                <SelectItem value="SLEEP">{m.recordType.SLEEP}</SelectItem>
                <SelectItem value="DIAPER">{m.recordType.DIAPER}</SelectItem>
                <SelectItem value="BATH">{m.recordType.BATH}</SelectItem>
                <SelectItem value="MEDICAL">{m.recordType.MEDICAL}</SelectItem>
              </SelectContent>
            </Select>
            {filterType === "MEDICAL" && (
              <Select value={medicalCategoryFilter} onValueChange={setMedicalCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder={locale === "zh" ? "就医子类型" : "Medical Category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{m.common.all}</SelectItem>
                  <SelectItem value="MEDICAL_VISIT">{locale === "zh" ? "就医记录" : "Medical Visit"}</SelectItem>
                  <SelectItem value="HEIGHT_WEIGHT">{locale === "zh" ? "身高体重" : "Height/Weight"}</SelectItem>
                  <SelectItem value="VACCINE">{locale === "zh" ? "疫苗接种" : "Vaccine"}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{m.records.noRecords}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-medium">{getRecordTitle(record, m, locale)}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(record.startTime, locale)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{getRecordDetail(record, m, locale)}</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {record.feedingType && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {m.feedingType[record.feedingType as keyof typeof m.feedingType] || record.feedingType}
                          </span>
                        )}
                        {record.amount && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {record.amount} ml
                          </span>
                        )}
                        {record.diaperStatus && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            {m.diaperStatus[record.diaperStatus as keyof typeof m.diaperStatus] || record.diaperStatus}
                          </span>
                        )}
                        {record.note && <span className="text-sm text-muted-foreground">{record.note}</span>}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{record.baby.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function getRecordTitle(record: Record, m: ReturnType<typeof useI18n>["m"], locale: "zh" | "en") {
  if (record.type !== "MEDICAL") {
    return m.recordType[record.type as keyof typeof m.recordType] || record.type;
  }

  if (record.medicalCategory === "MEDICAL_VISIT") {
    return locale === "zh" ? "就医记录" : "Medical Visit";
  }
  if (record.medicalCategory === "HEIGHT_WEIGHT") {
    return locale === "zh" ? "身高体重记录" : "Height/Weight Record";
  }
  if (record.medicalCategory === "VACCINE") {
    return locale === "zh" ? "疫苗接种记录" : "Vaccine Record";
  }
  return m.recordType.MEDICAL;
}

function getRecordDetail(record: Record, m: ReturnType<typeof useI18n>["m"], locale: "zh" | "en") {
  if (record.type === "FEEDING") {
    const feeding = record.feedingType
      ? m.feedingType[record.feedingType as keyof typeof m.feedingType] || record.feedingType
      : m.common.detail;
    const amount = record.amount ? `${record.amount} ml` : "-";
    return `${feeding} / ${amount}`;
  }

  if (record.type === "SLEEP") {
    return record.endTime ? `${m.common.end}: ${formatDateTime(record.endTime, locale)}` : `${m.common.end}: -`;
  }

  if (record.type === "DIAPER") {
    return record.diaperStatus
      ? m.diaperStatus[record.diaperStatus as keyof typeof m.diaperStatus] || record.diaperStatus
      : "-";
  }

  if (record.type === "MEDICAL") {
    const parts = [
      record.medicalHospital,
      record.medicalDepartment,
      record.medicalDiagnosis,
      record.note,
    ].filter(Boolean);
    return parts.join(" / ") || m.common.detail;
  }

  return record.note || "-";
}

