"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Baby,
  ClipboardList,
  CalendarDays,
  ChevronDown,
  Droplets,
  FlaskConical,
  GlassWater,
  MoonStar,
  Moon,
  Sparkles,
  Salad,
  Shield,
} from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { BabySelector } from "@/components/layout/baby-selector";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { cn, formatDuration } from "@/lib/utils";
import type { Baby as BabyType, Record } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalysisModule = "FEEDING" | "SLEEP" | "DIAPER" | "SOLID" | "ALL";
type MarkerKind = "breast_direct" | "breast_bottle" | "formula" | "diaper" | "solid" | "other";

interface AnalyticsContentProps {
  babies: BabyType[];
  monthRecords: Record[];
}

interface DaySeriesItem {
  date: string;
  feedingMl: number;
  feedingCount: number;
  sleepMinutes: number;
  sleepCount: number;
  diaperCount: number;
  wet: number;
  dirty: number;
  both: number;
  solidCount: number;
}

interface TimelineMarker {
  id: string;
  recordId: string;
  dayIndex: number;
  hour: number;
  kind: MarkerKind;
}

interface TimelineSleepBlock {
  id: string;
  recordId: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
}

interface ModuleTheme {
  accent: string;
  chip: string;
  chipText: string;
  soft: string;
  bar: string;
  bar2: string;
}

const HOUR_GRID_LINES = Array.from({ length: 25 }, (_, i) => i);
const HOUR_AXIS_LABELS = Array.from({ length: 13 }, (_, i) => i * 2);
const TIMELINE_HEIGHT = 540;
const TIMELINE_TOP_PADDING = 14;
const TIMELINE_INITIAL_DAYS = 90;
const TIMELINE_EXTEND_STEP = 2;
const TIMELINE_PRELOAD_LEFT_PX = 220;
const TIMELINE_DAY_WIDTH = 50;
const FEEDING_DAY_WIDTH = 50.7;
const TIMELINE_DAY_GAP = 0;
const TIMELINE_THUMB_DAYS = 5;

const MODULE_THEME: { [K in AnalysisModule]: ModuleTheme } = {
  FEEDING: {
    accent: "#d9467a",
    chip: "bg-rose-600",
    chipText: "text-white",
    soft: "bg-rose-50",
    bar: "#d9467a",
    bar2: "#f472b6",
  },
  SLEEP: {
    accent: "#7c69d9",
    chip: "bg-violet-600",
    chipText: "text-white",
    soft: "bg-violet-50",
    bar: "#7c69d9",
    bar2: "#a78bfa",
  },
  DIAPER: {
    accent: "#c38f17",
    chip: "bg-amber-600",
    chipText: "text-white",
    soft: "bg-amber-50",
    bar: "#c38f17",
    bar2: "#f59e0b",
  },
  SOLID: {
    accent: "#ea8b2f",
    chip: "bg-orange-500",
    chipText: "text-white",
    soft: "bg-orange-50",
    bar: "#ea8b2f",
    bar2: "#fb923c",
  },
  ALL: {
    accent: "#d9467a",
    chip: "bg-rose-600",
    chipText: "text-white",
    soft: "bg-slate-50",
    bar: "#d9467a",
    bar2: "#64748b",
  },
};

type GuideTab = "feeding" | "sleep" | "poop";

const BREAST_MILK_ROWS = [
  { age: "0~2个月", count: "8~12次", interval: "按需喂养（约1.5~3小时）", total: "按需喂养" },
  { age: "3~5个月", count: "8~10次", interval: "按需喂养（约2~3小时）", total: "按需喂养" },
  { age: "6~7个月", count: "5~6次", interval: "3~5小时", total: "800~1000ml" },
  { age: "8~11个月", count: "5~6次", interval: "3~5小时", total: "700~800ml" },
  { age: "1岁~1岁半", count: "2~3次", interval: "5~12小时", total: "600~700ml" },
  { age: "1岁半~2岁", count: "2~3次", interval: "5~12小时", total: "400~600ml" },
  { age: "2~3岁", count: "2~3次", interval: "5~12小时", total: "300~500ml" },
];

const FORMULA_ROWS = [
  { age: "0~30天", count: "6~8次", interval: "3~4小时", total: "600~700ml" },
  { age: "1~2个月", count: "6~8次", interval: "3~4小时", total: "600~800ml" },
  { age: "3个月", count: "6~7次", interval: "3~4小时", total: "800~900ml" },
  { age: "4~5个月", count: "5~7次", interval: "3~5小时", total: "800~900ml" },
  { age: "6~7个月", count: "5~6次", interval: "4~5小时", total: "800~1000ml" },
  { age: "8~11个月", count: "4~5次", interval: "4.5~6小时", total: "700~800ml" },
  { age: "1岁~1岁半", count: "2~3次", interval: "5~12小时", total: "600~700ml" },
  { age: "1岁半~2岁", count: "2~3次", interval: "5~12小时", total: "400~600ml" },
  { age: "2~3岁", count: "2~3次", interval: "5~12小时", total: "300~500ml" },
];

const SLEEP_ROWS = [
  { age: "0~30天", total: "14~17h", naps: "6~7次", wakeGap: "45min~1h", night: "8~10h", bedtime: "19:30~20:30" },
  { age: "1~3个月", total: "14~17h", naps: "4~6次", wakeGap: "1~2h", night: "8~10h", bedtime: "19:30~20:30" },
  { age: "4~6个月", total: "13~15h", naps: "3~4次", wakeGap: "1.5~2.5h", night: "8~10h", bedtime: "19:00~21:00" },
  { age: "7~9个月", total: "12~14h", naps: "2~3次", wakeGap: "2~3.5h", night: "8~10h", bedtime: "19:00~21:00" },
  { age: "10~15个月", total: "11.5~13.5h", naps: "1~2次", wakeGap: "2.5~4h", night: "8~10h", bedtime: "19:00~21:00" },
  { age: "16个月~2岁", total: "11~13h", naps: "1次", wakeGap: "4~6h", night: "8~10h", bedtime: "20:00~21:00" },
  { age: "2~3岁", total: "10~13h", naps: "0~1次", wakeGap: "5~6h", night: "8~10h", bedtime: "20:00~21:00" },
];

const SLEEP_SOOTHING_ROWS = [
  {
    ages: ["0~30天", "1~3个月"],
    tips: [
      "让宝宝吸吮乳头或安抚奶嘴，可帮助宝宝放松",
      "抱着宝宝爬楼梯、上下蹲起、坐摇椅、背巾轻拍等温柔安抚",
      "播放白噪音，保持节律稳定、音量柔和",
    ],
  },
  {
    ages: ["4~6个月", "7~9个月"],
    tips: [
      "固定睡前流程：拉窗帘、换睡衣、轻声互动",
      "让宝宝趴在肩头，轻拍后背安抚",
      "优化睡眠环境，减少亮光和噪音，保持作息一致",
    ],
  },
  {
    ages: ["10~15个月", "16个月~2岁", "2~3岁"],
    tips: [
      "入睡前1小时做好睡前准备，降低活动强度与刺激",
      "保持安静陪伴，可读绘本或轻声聊天",
      "关灯后家长若陪睡，可闭目养神，尽量保持安静少互动",
    ],
  },
];

const POOP_NORMAL_ROWS = [
  { situation: "墨绿色/黑色", reason: "新生儿胎便期常见", color: "#1f2328" },
  { situation: "金黄色", reason: "母乳喂养常见", color: "#efb11d" },
  { situation: "浅黄色", reason: "配方奶喂养常见", color: "#e9c85d" },
  { situation: "棕黄色/棕褐色", reason: "配方奶或辅食添加后常见", color: "#9f7a34" },
  { situation: "棕绿色/深绿色", reason: "补铁剂、特配奶或辅食影响", color: "#516b2f" },
];

const POOP_ALERT_ROWS = [
  { situation: "便便带血", reason: "新鲜血多见肛裂，持续需就医", color: "#d8ac57" },
  { situation: "柏油样便", reason: "警惕上消化道出血", color: "#111111" },
  { situation: "发白/发灰", reason: "警惕胆道问题", color: "#c4c7c9" },
  { situation: "水样便", reason: "可能腹泻，注意脱水风险", color: "#88a537" },
  { situation: "泡沫便/黏液便", reason: "可能乳糖不耐受或肠道感染", color: "#b0a44a" },
  { situation: "羊粪蛋样", reason: "多与便秘相关", color: "#5a4d39" },
];

function getLastNDates(days: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return d;
  });
}

function getTodayDayKey(): string {
  return dayKey(new Date());
}

function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toShortDate(date: Date): string {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function toHourFloat(value: Date | string): number {
  const d = new Date(value);
  return d.getHours() + d.getMinutes() / 60;
}

function minutesBetween(start: Date | string, end: Date | string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.round((e - s) / 60000));
}

function parseDirectMinutes(record: Record): { left: number; right: number } {
  const note = record.note ?? "";
  const leftMatch = note.match(/(?:左|left)\s*[:：]?\s*(\d{1,3})\s*(?:分钟|分|min)?/i);
  const rightMatch = note.match(/(?:右|right)\s*[:：]?\s*(\d{1,3})\s*(?:分钟|分|min)?/i);
  let left = leftMatch ? Number(leftMatch[1]) : 0;
  let right = rightMatch ? Number(rightMatch[1]) : 0;

  if (left === 0 && right === 0) {
    const fallbackMinutes = Math.max(0, Math.round(record.amount ?? 0));
    if (fallbackMinutes > 0) {
      left = Math.ceil(fallbackMinutes / 2);
      right = Math.floor(fallbackMinutes / 2);
    }
  }

  return { left, right };
}

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  return Math.min(24, Math.max(0, hour));
}

function getMarkerMeta(kind: MarkerKind, locale: "zh" | "en") {
  switch (kind) {
    case "breast_direct":
      return { icon: "🤱", label: locale === "zh" ? "母乳亲喂" : "Direct Breastfeeding" };
    case "breast_bottle":
      return { icon: "🍼", label: locale === "zh" ? "母乳瓶喂" : "Bottle-fed Breast Milk" };
    case "formula":
      return { icon: "🧃", label: locale === "zh" ? "配方奶" : "Formula" };
    case "diaper":
      return { icon: "🛡️", label: locale === "zh" ? "换尿布" : "Diaper" };
    case "solid":
      return { icon: "🍚", label: locale === "zh" ? "辅食" : "Solid" };
    default:
      return { icon: "✨", label: locale === "zh" ? "其他" : "Other" };
  }
}

function formatHourLabel(hour: number): string {
  if (hour === 24) return "24";
  return `${hour}`;
}

function toTimelineY(hour: number): number {
  return TIMELINE_TOP_PADDING + (hour / 24) * (TIMELINE_HEIGHT - TIMELINE_TOP_PADDING);
}

function shouldShadeByToday(index: number, total: number): boolean {
  return (total - 1 - index) % 2 === 0;
}

export function AnalyticsContent({ babies, monthRecords }: AnalyticsContentProps) {
  const { locale } = useI18n();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string>(babies[0]?.id || "ALL");
  const [module, setModule] = useState<AnalysisModule>("FEEDING");
  const [activeDayKey, setActiveDayKey] = useState(getTodayDayKey);
  const [timelineDays, setTimelineDays] = useState(TIMELINE_INITIAL_DAYS);
  const [isExtendingTimeline, setIsExtendingTimeline] = useState(false);
  const [feedingTimelineDays, setFeedingTimelineDays] = useState(TIMELINE_INITIAL_DAYS);
  const [isExtendingFeedingTimeline, setIsExtendingFeedingTimeline] = useState(false);
  const [sleepTimelineDays, setSleepTimelineDays] = useState(TIMELINE_INITIAL_DAYS);
  const [isExtendingSleepTimeline, setIsExtendingSleepTimeline] = useState(false);
  const [diaperTimelineDays, setDiaperTimelineDays] = useState(TIMELINE_INITIAL_DAYS);
  const [isExtendingDiaperTimeline, setIsExtendingDiaperTimeline] = useState(false);
  const [solidTimelineDays, setSolidTimelineDays] = useState(TIMELINE_INITIAL_DAYS);
  const [isExtendingSolidTimeline, setIsExtendingSolidTimeline] = useState(false);
  const [timelineScrollMetrics, setTimelineScrollMetrics] = useState({
    left: 0,
    width: 0,
    client: 0,
  });
  const [feedingScrollMetrics, setFeedingScrollMetrics] = useState({
    left: 0,
    width: 0,
    client: 0,
  });
  const [sleepScrollMetrics, setSleepScrollMetrics] = useState({
    left: 0,
    width: 0,
    client: 0,
  });
  const [diaperScrollMetrics, setDiaperScrollMetrics] = useState({
    left: 0,
    width: 0,
    client: 0,
  });
  const [solidScrollMetrics, setSolidScrollMetrics] = useState({
    left: 0,
    width: 0,
    client: 0,
  });
  const [allFilters, setAllFilters] = useState({
    feeding: true,
    sleep: true,
    diaper: true,
    solid: true,
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideTab>("feeding");
  const guideFeedingRef = useRef<HTMLElement | null>(null);
  const guideSleepRef = useRef<HTMLElement | null>(null);
  const guidePoopRef = useRef<HTMLElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const progressDraggingRef = useRef(false);
  const feedingDirectScrollRef = useRef<HTMLDivElement | null>(null);
  const feedingBottleScrollRef = useRef<HTMLDivElement | null>(null);
  const feedingVolumeScrollRef = useRef<HTMLDivElement | null>(null);
  const feedingSyncingRef = useRef(false);
  const feedingProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const feedingProgressDraggingRef = useRef(false);
  const feedingHasAutoScrolledRef = useRef(false);
  const sleepCountScrollRef = useRef<HTMLDivElement | null>(null);
  const sleepDurationScrollRef = useRef<HTMLDivElement | null>(null);
  const sleepSyncingRef = useRef(false);
  const sleepProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const sleepProgressDraggingRef = useRef(false);
  const sleepHasAutoScrolledRef = useRef(false);
  const diaperCountScrollRef = useRef<HTMLDivElement | null>(null);
  const diaperTypeScrollRef = useRef<HTMLDivElement | null>(null);
  const diaperVolumeScrollRef = useRef<HTMLDivElement | null>(null);
  const diaperSyncingRef = useRef(false);
  const diaperProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const diaperProgressDraggingRef = useRef(false);
  const diaperHasAutoScrolledRef = useRef(false);
  const solidCountScrollRef = useRef<HTMLDivElement | null>(null);
  const solidVolumeScrollRef = useRef<HTMLDivElement | null>(null);
  const solidSyncingRef = useRef(false);
  const solidProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const solidProgressDraggingRef = useRef(false);
  const solidHasAutoScrolledRef = useRef(false);
  const pendingScrollAdjustRef = useRef(0);
  const feedingPendingScrollAdjustRef = useRef(0);
  const sleepPendingScrollAdjustRef = useRef(0);
  const diaperPendingScrollAdjustRef = useRef(0);
  const solidPendingScrollAdjustRef = useRef(0);
  const hasAutoScrolledRef = useRef(false);
  const queuedExtendRef = useRef(false);
  const feedingQueuedExtendRef = useRef(false);
  const sleepQueuedExtendRef = useRef(false);
  const diaperQueuedExtendRef = useRef(false);
  const solidQueuedExtendRef = useRef(false);
  const getPrimaryFeedingScrollEl = () =>
    feedingVolumeScrollRef.current || feedingDirectScrollRef.current || feedingBottleScrollRef.current;
  const getFeedingScrollElements = () =>
    [feedingDirectScrollRef.current, feedingBottleScrollRef.current, feedingVolumeScrollRef.current].filter(
      (el): el is HTMLDivElement => !!el
    );
  const getPrimarySleepScrollEl = () => sleepDurationScrollRef.current || sleepCountScrollRef.current;
  const getSleepScrollElements = () =>
    [sleepCountScrollRef.current, sleepDurationScrollRef.current].filter(
      (el): el is HTMLDivElement => !!el
    );
  const getPrimaryDiaperScrollEl = () =>
    diaperVolumeScrollRef.current || diaperTypeScrollRef.current || diaperCountScrollRef.current;
  const getDiaperScrollElements = () =>
    [diaperCountScrollRef.current, diaperTypeScrollRef.current, diaperVolumeScrollRef.current].filter(
      (el): el is HTMLDivElement => !!el
    );
  const getPrimarySolidScrollEl = () => solidVolumeScrollRef.current || solidCountScrollRef.current;
  const getSolidScrollElements = () =>
    [solidCountScrollRef.current, solidVolumeScrollRef.current].filter((el): el is HTMLDivElement => !!el);

  const summaryDates = useMemo(() => getLastNDates(7), []);
  const timelineDates = useMemo(() => getLastNDates(timelineDays), [timelineDays]);
  const timelineDateKeys = useMemo(() => new Set(timelineDates.map((d) => dayKey(d))), [timelineDates]);
  const feedingTimelineDates = useMemo(() => getLastNDates(feedingTimelineDays), [feedingTimelineDays]);
  const feedingTimelineDateKeys = useMemo(() => new Set(feedingTimelineDates.map((d) => dayKey(d))), [feedingTimelineDates]);
  const sleepTimelineDates = useMemo(() => getLastNDates(sleepTimelineDays), [sleepTimelineDays]);
  const sleepTimelineDateKeys = useMemo(() => new Set(sleepTimelineDates.map((d) => dayKey(d))), [sleepTimelineDates]);
  const diaperTimelineDates = useMemo(() => getLastNDates(diaperTimelineDays), [diaperTimelineDays]);
  const diaperTimelineDateKeys = useMemo(() => new Set(diaperTimelineDates.map((d) => dayKey(d))), [diaperTimelineDates]);
  const solidTimelineDates = useMemo(() => getLastNDates(solidTimelineDays), [solidTimelineDays]);
  const solidTimelineDateKeys = useMemo(() => new Set(solidTimelineDates.map((d) => dayKey(d))), [solidTimelineDates]);

  const selectedBabyName = useMemo(() => {
    if (selectedBabyId === "ALL") return locale === "zh" ? "全部宝宝" : "All babies";
    return babies.find((baby) => baby.id === selectedBabyId)?.name || (locale === "zh" ? "全部宝宝" : "All babies");
  }, [babies, locale, selectedBabyId]);

  const recordsByBaby = useMemo(() => {
    return selectedBabyId === "ALL" ? monthRecords : monthRecords.filter((r) => r.babyId === selectedBabyId);
  }, [monthRecords, selectedBabyId]);

  const timelineRecords = useMemo(
    () => recordsByBaby.filter((r) => timelineDateKeys.has(dayKey(r.startTime))),
    [recordsByBaby, timelineDateKeys]
  );
  const feedingTimelineRecords = useMemo(
    () => recordsByBaby.filter((r) => feedingTimelineDateKeys.has(dayKey(r.startTime))),
    [recordsByBaby, feedingTimelineDateKeys]
  );
  const sleepTimelineRecords = useMemo(
    () => recordsByBaby.filter((r) => sleepTimelineDateKeys.has(dayKey(r.startTime))),
    [recordsByBaby, sleepTimelineDateKeys]
  );
  const diaperTimelineRecords = useMemo(
    () => recordsByBaby.filter((r) => r.type === "DIAPER" && diaperTimelineDateKeys.has(dayKey(r.startTime))),
    [recordsByBaby, diaperTimelineDateKeys]
  );
  const solidTimelineRecords = useMemo(
    () =>
      recordsByBaby.filter(
        (r) => r.type === "FEEDING" && r.feedingType === "SOLID_FOOD" && solidTimelineDateKeys.has(dayKey(r.startTime))
      ),
    [recordsByBaby, solidTimelineDateKeys]
  );

  const feedingRecords = useMemo(
    () => feedingTimelineRecords.filter((r) => r.type === "FEEDING" && r.feedingType !== "SOLID_FOOD"),
    [feedingTimelineRecords]
  );
  const timelineFeedingRecords = useMemo(
    () => timelineRecords.filter((r) => r.type === "FEEDING" && r.feedingType !== "SOLID_FOOD"),
    [timelineRecords]
  );
  const solidRecords = useMemo(
    () => recordsByBaby.filter((r) => r.type === "FEEDING" && r.feedingType === "SOLID_FOOD"),
    [recordsByBaby]
  );
  const timelineSolidRecords = useMemo(
    () => timelineRecords.filter((r) => r.type === "FEEDING" && r.feedingType === "SOLID_FOOD"),
    [timelineRecords]
  );
  const sleepRecords = useMemo(
    () => recordsByBaby.filter((r) => r.type === "SLEEP" && r.endTime),
    [recordsByBaby]
  );
  const timelineSleepRecords = useMemo(
    () => timelineRecords.filter((r) => r.type === "SLEEP" && r.endTime),
    [timelineRecords]
  );
  const diaperRecords = useMemo(() => recordsByBaby.filter((r) => r.type === "DIAPER"), [recordsByBaby]);
  const timelineDiaperRecords = useMemo(() => timelineRecords.filter((r) => r.type === "DIAPER"), [timelineRecords]);

  const daySeries = useMemo<DaySeriesItem[]>(() => {
    return summaryDates.map((date) => {
      const key = dayKey(date);
      const dayFeeding = feedingRecords.filter((r) => dayKey(r.startTime) === key);
      const daySleep = sleepRecords.filter((r) => dayKey(r.startTime) === key);
      const dayDiaper = diaperRecords.filter((r) => dayKey(r.startTime) === key);
      const daySolid = solidRecords.filter((r) => dayKey(r.startTime) === key);

      return {
        date: toShortDate(date),
        feedingMl: dayFeeding.reduce((sum, r) => sum + (r.amount ?? 0), 0),
        feedingCount: dayFeeding.length,
        sleepMinutes: daySleep.reduce((sum, r) => sum + (r.endTime ? minutesBetween(r.startTime, r.endTime) : 0), 0),
        sleepCount: daySleep.length,
        diaperCount: dayDiaper.length,
        wet: dayDiaper.filter((r) => r.diaperStatus === "WET").length,
        dirty: dayDiaper.filter((r) => r.diaperStatus === "DIRTY").length,
        both: dayDiaper.filter((r) => r.diaperStatus === "BOTH").length,
        solidCount: daySolid.length,
      };
    });
  }, [diaperRecords, feedingRecords, sleepRecords, solidRecords, summaryDates]);

  const timelineMarkers = useMemo<TimelineMarker[]>(() => {
    const list: TimelineMarker[] = [];
    const dayIndexMap = new Map(timelineDates.map((d, i) => [dayKey(d), i]));
    const showFeeding = module === "FEEDING" || (module === "ALL" && allFilters.feeding);
    const showSolid = module === "SOLID" || (module === "ALL" && allFilters.solid);
    const showDiaper = module === "DIAPER" || (module === "ALL" && allFilters.diaper);

    const pushRecord = (record: Record, kind: MarkerKind) => {
      const dayIndex = dayIndexMap.get(dayKey(record.startTime));
      if (dayIndex === undefined) return;
      list.push({
        id: `${record.id}-${kind}`,
        recordId: record.id,
        dayIndex,
        hour: clampHour(toHourFloat(record.startTime)),
        kind,
      });
    };

    if (showFeeding) {
      for (const record of timelineFeedingRecords) {
        if (record.feedingType === "BREAST_MILK_DIRECT" || record.feedingType === "BREAST_MILK") {
          pushRecord(record, "breast_direct");
        } else if (record.feedingType === "BREAST_MILK_BOTTLE") {
          pushRecord(record, "breast_bottle");
        } else if (record.feedingType === "FORMULA") {
          pushRecord(record, "formula");
        } else {
          pushRecord(record, "other");
        }
      }
    }

    if (showSolid) {
      for (const record of timelineSolidRecords) pushRecord(record, "solid");
    }

    if (showDiaper) {
      for (const record of timelineDiaperRecords) pushRecord(record, "diaper");
    }

    return list;
  }, [allFilters.diaper, allFilters.feeding, allFilters.solid, module, timelineDates, timelineDiaperRecords, timelineFeedingRecords, timelineSolidRecords]);

  const timelineSleepBlocks = useMemo<TimelineSleepBlock[]>(() => {
    const showSleep = module === "SLEEP" || (module === "ALL" && allFilters.sleep);
    if (!showSleep) return [];

    const blocks: TimelineSleepBlock[] = [];
    const dayIndexMap = new Map(timelineDates.map((d, i) => [dayKey(d), i]));

    for (const record of timelineSleepRecords) {
      const dayIndex = dayIndexMap.get(dayKey(record.startTime));
      if (dayIndex === undefined || !record.endTime) continue;
      const startHour = clampHour(toHourFloat(record.startTime));
      let endHour = clampHour(toHourFloat(record.endTime));
      if (endHour <= startHour) endHour = 24;
      blocks.push({
        id: `${record.id}-sleep`,
        recordId: record.id,
        dayIndex,
        startHour,
        endHour,
      });
    }

    return blocks;
  }, [allFilters.sleep, module, timelineDates, timelineSleepRecords]);

  const theme = MODULE_THEME[module];

  const moduleTabs = useMemo(
    () => [
      { value: "FEEDING" as const, label: locale === "zh" ? "喂奶" : "Feeding" },
      { value: "SLEEP" as const, label: locale === "zh" ? "睡眠" : "Sleep" },
      { value: "DIAPER" as const, label: locale === "zh" ? "换尿布" : "Diaper" },
      { value: "SOLID" as const, label: locale === "zh" ? "辅食" : "Solid" },
      { value: "ALL" as const, label: locale === "zh" ? "全部" : "All" },
    ],
    [locale]
  );

  const avgFeedingMl = useMemo(() => {
    const total = daySeries.reduce((sum, day) => sum + day.feedingMl, 0);
    const activeDays = daySeries.filter((day) => day.feedingCount > 0).length;
    return Math.round(total / activeDays || 0);
  }, [daySeries]);

  const todayLabel = locale === "zh" ? "今天" : "Today";
  const noDataText = locale === "zh" ? "近7天暂无数据" : "No data in last 7 days";

  const feedingDailyStats = useMemo(() => {
    return feedingTimelineDates.map((date) => {
      const currentDayKey = dayKey(date);
      const dayFeeding = feedingRecords
        .filter((r) => dayKey(r.startTime) === currentDayKey)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      let directCount = 0;
      let leftMinutes = 0;
      let rightMinutes = 0;
      let bottleBreastCount = 0;
      let formulaCount = 0;
      const stackAmounts: number[] = [];

      dayFeeding.forEach((record) => {
        const feedingType = record.feedingType;
        if (feedingType === "BREAST_MILK_DIRECT" || feedingType === "BREAST_MILK") {
          directCount += 1;
          const parsed = parseDirectMinutes(record);
          leftMinutes += parsed.left;
          rightMinutes += parsed.right;
        } else if (feedingType === "BREAST_MILK_BOTTLE") {
          bottleBreastCount += 1;
        } else if (feedingType === "FORMULA") {
          formulaCount += 1;
        }

        const amount = Math.max(0, Math.round(record.amount ?? 0));
        if (amount > 0) {
          stackAmounts.push(amount);
        }
      });

      const totalMl = stackAmounts.reduce((sum, amount) => sum + amount, 0);
      return {
        key: currentDayKey,
        label: currentDayKey === getTodayDayKey() ? todayLabel : toShortDate(date),
        directCount,
        leftMinutes,
        rightMinutes,
        bottleBreastCount,
        formulaCount,
        stackAmounts,
        totalMl,
      };
    });
  }, [feedingRecords, feedingTimelineDates, todayLabel]);

  const sleepDailyStats = useMemo(() => {
    return sleepTimelineDates.map((date) => {
      const key = dayKey(date);
      const daySleep = sleepTimelineRecords.filter((r) => r.type === "SLEEP" && r.endTime && dayKey(r.startTime) === key);
      const totalMinutes = daySleep.reduce(
        (sum, record) => sum + (record.endTime ? minutesBetween(record.startTime, record.endTime) : 0),
        0
      );
      return {
        key,
        label: key === getTodayDayKey() ? todayLabel : toShortDate(date),
        count: daySleep.length,
        totalMinutes,
      };
    });
  }, [sleepTimelineDates, sleepTimelineRecords, todayLabel]);

  const diaperDailyStats = useMemo(() => {
    return diaperTimelineDates.map((date) => {
      const key = dayKey(date);
      const dayDiaper = diaperTimelineRecords.filter((r) => dayKey(r.startTime) === key);
      const wet = dayDiaper.filter((r) => r.diaperStatus === "WET").length;
      const dirty = dayDiaper.filter((r) => r.diaperStatus === "DIRTY").length;
      const both = dayDiaper.filter((r) => r.diaperStatus === "BOTH").length;
      return {
        key,
        label: key === getTodayDayKey() ? todayLabel : toShortDate(date),
        total: dayDiaper.length,
        wet,
        dirty,
        both,
      };
    });
  }, [diaperTimelineDates, diaperTimelineRecords, todayLabel]);

  const solidDailyStats = useMemo(() => {
    return solidTimelineDates.map((date) => {
      const key = dayKey(date);
      const daySolid = solidTimelineRecords.filter((r) => dayKey(r.startTime) === key);
      const totalMl = daySolid.reduce((sum, record) => sum + Math.max(0, Math.round(record.amount ?? 0)), 0);
      return {
        key,
        label: key === getTodayDayKey() ? todayLabel : toShortDate(date),
        count: daySolid.length,
        totalMl,
      };
    });
  }, [solidTimelineDates, solidTimelineRecords, todayLabel]);

  const avgSleepMinutes = useMemo(() => {
    const total = sleepDailyStats.reduce((sum, day) => sum + day.totalMinutes, 0);
    const activeDays = sleepDailyStats.filter((day) => day.count > 0).length;
    return Math.round(total / activeDays || 0);
  }, [sleepDailyStats]);

  const avgDiaperDaily = useMemo(() => {
    const last7 = diaperDailyStats.slice(-7);
    const total = last7.reduce((sum, day) => sum + day.total, 0);
    const activeDays = last7.filter((day) => day.total > 0).length;
    return Math.round(total / activeDays || 0);
  }, [diaperDailyStats]);

  const avgSolidMlDaily = useMemo(() => {
    const last7 = solidDailyStats.slice(-7);
    const total = last7.reduce((sum, day) => sum + day.totalMl, 0);
    const activeDays = last7.filter((day) => day.totalMl > 0).length;
    return Math.round(total / activeDays || 0);
  }, [solidDailyStats]);

  const avgDiaper = useMemo(() => {
    const total = daySeries.reduce((sum, day) => sum + day.diaperCount, 0);
    return Number((total / daySeries.length || 0).toFixed(1));
  }, [daySeries]);

  const avgSolid = useMemo(() => {
    const total = daySeries.reduce((sum, day) => sum + day.solidCount, 0);
    return Number((total / daySeries.length || 0).toFixed(1));
  }, [daySeries]);

  useEffect(() => {
    if (!timelineDates.some((d) => dayKey(d) === activeDayKey)) {
      setActiveDayKey(dayKey(timelineDates[timelineDates.length - 1]));
    }
  }, [activeDayKey, timelineDates]);

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el || hasAutoScrolledRef.current) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
      setTimelineScrollMetrics({
        left: el.scrollLeft,
        width: el.scrollWidth,
        client: el.clientWidth,
      });
    });
    setTimelineScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
    hasAutoScrolledRef.current = true;
  }, []);

  useEffect(() => {
    const onResize = () => {
      const el = timelineScrollRef.current;
      if (el) {
        setTimelineScrollMetrics({
          left: el.scrollLeft,
          width: el.scrollWidth,
          client: el.clientWidth,
        });
      }
      const feedingEl = getPrimaryFeedingScrollEl();
      if (feedingEl) {
        setFeedingScrollMetrics({
          left: feedingEl.scrollLeft,
          width: feedingEl.scrollWidth,
          client: feedingEl.clientWidth,
        });
      }
      const sleepEl = getPrimarySleepScrollEl();
      if (sleepEl) {
        setSleepScrollMetrics({
          left: sleepEl.scrollLeft,
          width: sleepEl.scrollWidth,
          client: sleepEl.clientWidth,
        });
      }
      const diaperEl = getPrimaryDiaperScrollEl();
      if (diaperEl) {
        setDiaperScrollMetrics({
          left: diaperEl.scrollLeft,
          width: diaperEl.scrollWidth,
          client: diaperEl.clientWidth,
        });
      }
      const solidEl = getPrimarySolidScrollEl();
      if (solidEl) {
        setSolidScrollMetrics({
          left: solidEl.scrollLeft,
          width: solidEl.scrollWidth,
          client: solidEl.clientWidth,
        });
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
      }
    };
  }, []);

  useEffect(() => {
    const el = getPrimaryFeedingScrollEl();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (!feedingHasAutoScrolledRef.current) {
      requestAnimationFrame(() => {
        const elements = getFeedingScrollElements();
        elements.forEach((node) => {
          node.scrollLeft = maxScroll;
        });
        const primary = getPrimaryFeedingScrollEl();
        if (primary) {
          setFeedingScrollMetrics({
            left: primary.scrollLeft,
            width: primary.scrollWidth,
            client: primary.clientWidth,
          });
        }
      });
      feedingHasAutoScrolledRef.current = true;
      return;
    }
    const primary = getPrimaryFeedingScrollEl();
    if (primary) {
      setFeedingScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
  }, [feedingTimelineDates.length]);

  useEffect(() => {
    const el = getPrimarySleepScrollEl();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (!sleepHasAutoScrolledRef.current) {
      requestAnimationFrame(() => {
        getSleepScrollElements().forEach((node) => {
          node.scrollLeft = maxScroll;
        });
        const primary = getPrimarySleepScrollEl();
        if (primary) {
          setSleepScrollMetrics({
            left: primary.scrollLeft,
            width: primary.scrollWidth,
            client: primary.clientWidth,
          });
        }
      });
      sleepHasAutoScrolledRef.current = true;
      return;
    }
    const primary = getPrimarySleepScrollEl();
    if (primary) {
      setSleepScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
  }, [sleepTimelineDates.length]);

  useEffect(() => {
    const el = getPrimaryDiaperScrollEl();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (!diaperHasAutoScrolledRef.current) {
      requestAnimationFrame(() => {
        getDiaperScrollElements().forEach((node) => {
          node.scrollLeft = maxScroll;
        });
        const primary = getPrimaryDiaperScrollEl();
        if (primary) {
          setDiaperScrollMetrics({
            left: primary.scrollLeft,
            width: primary.scrollWidth,
            client: primary.clientWidth,
          });
        }
      });
      diaperHasAutoScrolledRef.current = true;
      return;
    }
    const primary = getPrimaryDiaperScrollEl();
    if (primary) {
      setDiaperScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
  }, [diaperTimelineDates.length]);

  useEffect(() => {
    const el = getPrimarySolidScrollEl();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (!solidHasAutoScrolledRef.current) {
      requestAnimationFrame(() => {
        getSolidScrollElements().forEach((node) => {
          node.scrollLeft = maxScroll;
        });
        const primary = getPrimarySolidScrollEl();
        if (primary) {
          setSolidScrollMetrics({
            left: primary.scrollLeft,
            width: primary.scrollWidth,
            client: primary.clientWidth,
          });
        }
      });
      solidHasAutoScrolledRef.current = true;
      return;
    }
    const primary = getPrimarySolidScrollEl();
    if (primary) {
      setSolidScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
  }, [solidTimelineDates.length]);

  useEffect(() => {
    if (module !== "FEEDING") return;
    const primary = getPrimaryFeedingScrollEl();
    if (!primary) return;
    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, primary.scrollWidth - primary.clientWidth);
      feedingSyncingRef.current = true;
      getFeedingScrollElements().forEach((el) => {
        el.scrollLeft = maxScroll;
      });
      feedingSyncingRef.current = false;
      setFeedingScrollMetrics({
        left: maxScroll,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    });
  }, [module]);

  useEffect(() => {
    if (module !== "SLEEP") return;
    const primary = getPrimarySleepScrollEl();
    if (!primary) return;
    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, primary.scrollWidth - primary.clientWidth);
      sleepSyncingRef.current = true;
      getSleepScrollElements().forEach((el) => {
        el.scrollLeft = maxScroll;
      });
      sleepSyncingRef.current = false;
      setSleepScrollMetrics({
        left: maxScroll,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    });
  }, [module]);

  useEffect(() => {
    if (module !== "DIAPER") return;
    const primary = getPrimaryDiaperScrollEl();
    if (!primary) return;
    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, primary.scrollWidth - primary.clientWidth);
      diaperSyncingRef.current = true;
      getDiaperScrollElements().forEach((el) => {
        el.scrollLeft = maxScroll;
      });
      diaperSyncingRef.current = false;
      setDiaperScrollMetrics({
        left: maxScroll,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    });
  }, [module]);

  useEffect(() => {
    if (module !== "SOLID") return;
    const primary = getPrimarySolidScrollEl();
    if (!primary) return;
    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, primary.scrollWidth - primary.clientWidth);
      solidSyncingRef.current = true;
      getSolidScrollElements().forEach((el) => {
        el.scrollLeft = maxScroll;
      });
      solidSyncingRef.current = false;
      setSolidScrollMetrics({
        left: maxScroll,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    });
  }, [module]);

  useEffect(() => {
    if (!pendingScrollAdjustRef.current) return;
    const adjust = pendingScrollAdjustRef.current;
    const el = timelineScrollRef.current;
    if (el) {
      el.scrollLeft += adjust;
      setTimelineScrollMetrics({
        left: el.scrollLeft,
        width: el.scrollWidth,
        client: el.clientWidth,
      });
    }
    pendingScrollAdjustRef.current = 0;
    setIsExtendingTimeline(false);

    if (queuedExtendRef.current) {
      queuedExtendRef.current = false;
      setIsExtendingTimeline(true);
      pendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (TIMELINE_DAY_WIDTH + TIMELINE_DAY_GAP);
      setTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
    }
  }, [timelineDates.length]);

  useEffect(() => {
    if (!feedingPendingScrollAdjustRef.current) return;
    const adjust = feedingPendingScrollAdjustRef.current;
    const feedingEls = getFeedingScrollElements();
    feedingEls.forEach((feedingEl) => {
      feedingEl.scrollLeft += adjust;
    });
    const primaryFeeding = getPrimaryFeedingScrollEl();
    if (primaryFeeding) {
      setFeedingScrollMetrics({
        left: primaryFeeding.scrollLeft,
        width: primaryFeeding.scrollWidth,
        client: primaryFeeding.clientWidth,
      });
    }
    feedingPendingScrollAdjustRef.current = 0;
    setIsExtendingFeedingTimeline(false);

    if (feedingQueuedExtendRef.current) {
      feedingQueuedExtendRef.current = false;
      setIsExtendingFeedingTimeline(true);
      feedingPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
      setFeedingTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
    }
  }, [feedingTimelineDates.length]);

  useEffect(() => {
    if (!sleepPendingScrollAdjustRef.current) return;
    const adjust = sleepPendingScrollAdjustRef.current;
    getSleepScrollElements().forEach((sleepEl) => {
      sleepEl.scrollLeft += adjust;
    });
    const primary = getPrimarySleepScrollEl();
    if (primary) {
      setSleepScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    sleepPendingScrollAdjustRef.current = 0;
    setIsExtendingSleepTimeline(false);

    if (sleepQueuedExtendRef.current) {
      sleepQueuedExtendRef.current = false;
      setIsExtendingSleepTimeline(true);
      sleepPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
      setSleepTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
    }
  }, [sleepTimelineDates.length]);

  useEffect(() => {
    if (!diaperPendingScrollAdjustRef.current) return;
    const adjust = diaperPendingScrollAdjustRef.current;
    getDiaperScrollElements().forEach((diaperEl) => {
      diaperEl.scrollLeft += adjust;
    });
    const primary = getPrimaryDiaperScrollEl();
    if (primary) {
      setDiaperScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    diaperPendingScrollAdjustRef.current = 0;
    setIsExtendingDiaperTimeline(false);

    if (diaperQueuedExtendRef.current) {
      diaperQueuedExtendRef.current = false;
      setIsExtendingDiaperTimeline(true);
      diaperPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
      setDiaperTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
    }
  }, [diaperTimelineDates.length]);

  useEffect(() => {
    if (!solidPendingScrollAdjustRef.current) return;
    const adjust = solidPendingScrollAdjustRef.current;
    getSolidScrollElements().forEach((solidEl) => {
      solidEl.scrollLeft += adjust;
    });
    const primary = getPrimarySolidScrollEl();
    if (primary) {
      setSolidScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    solidPendingScrollAdjustRef.current = 0;
    setIsExtendingSolidTimeline(false);

    if (solidQueuedExtendRef.current) {
      solidQueuedExtendRef.current = false;
      setIsExtendingSolidTimeline(true);
      solidPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
      setSolidTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
    }
  }, [solidTimelineDates.length]);

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    setTimelineScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  }, [timelineDates.length]);

  const handleTimelineScroll = () => {
    const el = timelineScrollRef.current;
    if (!el) return;
    setTimelineScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
    if (isExtendingTimeline) {
      if (el.scrollLeft <= TIMELINE_PRELOAD_LEFT_PX) {
        queuedExtendRef.current = true;
      }
      return;
    }
    if (el.scrollLeft > TIMELINE_PRELOAD_LEFT_PX) return;
    queuedExtendRef.current = false;
    setIsExtendingTimeline(true);
    pendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (TIMELINE_DAY_WIDTH + TIMELINE_DAY_GAP);
    setTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
  };

  const positionProgressByClientX = (clientX: number) => {
    const el = timelineScrollRef.current;
    const track = progressTrackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const availableTrack = Math.max(1, track.clientWidth - timelineThumbWidthPx);
    const rawThumbLeft = clientX - rect.left - timelineThumbWidthPx / 2;
    const thumbLeft = Math.max(0, Math.min(availableTrack, rawThumbLeft));
    const ratio = availableTrack > 0 ? thumbLeft / availableTrack : 0;
    el.scrollLeft = ratio * maxScroll;
    setTimelineScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  };

  const handleFeedingScroll = (source: HTMLDivElement | null) => {
    if (!source) return;
    if (!feedingSyncingRef.current) {
      feedingSyncingRef.current = true;
      getFeedingScrollElements().forEach((el) => {
        if (el !== source) {
          el.scrollLeft = source.scrollLeft;
        }
      });
      feedingSyncingRef.current = false;
    }
    const primary = getPrimaryFeedingScrollEl();
    if (primary) {
      setFeedingScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    if (isExtendingFeedingTimeline) {
      if (source.scrollLeft <= TIMELINE_PRELOAD_LEFT_PX) {
        feedingQueuedExtendRef.current = true;
      }
      return;
    }
    if (source.scrollLeft > TIMELINE_PRELOAD_LEFT_PX) return;
    feedingQueuedExtendRef.current = false;
    setIsExtendingFeedingTimeline(true);
    feedingPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
    setFeedingTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
  };

  const positionFeedingProgressByClientX = (clientX: number) => {
    const el = getPrimaryFeedingScrollEl();
    const track = feedingProgressTrackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const availableTrack = Math.max(1, track.clientWidth - feedingThumbWidthPx);
    const rawThumbLeft = clientX - rect.left - feedingThumbWidthPx / 2;
    const thumbLeft = Math.max(0, Math.min(availableTrack, rawThumbLeft));
    const ratio = availableTrack > 0 ? thumbLeft / availableTrack : 0;
    el.scrollLeft = ratio * maxScroll;
    feedingSyncingRef.current = true;
    getFeedingScrollElements().forEach((node) => {
      if (node !== el) node.scrollLeft = el.scrollLeft;
    });
    feedingSyncingRef.current = false;
    setFeedingScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  };

  const handleSleepScroll = (source: HTMLDivElement | null) => {
    if (!source) return;
    if (!sleepSyncingRef.current) {
      sleepSyncingRef.current = true;
      getSleepScrollElements().forEach((el) => {
        if (el !== source) el.scrollLeft = source.scrollLeft;
      });
      sleepSyncingRef.current = false;
    }
    const primary = getPrimarySleepScrollEl();
    if (primary) {
      setSleepScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    if (isExtendingSleepTimeline) {
      if (source.scrollLeft <= TIMELINE_PRELOAD_LEFT_PX) {
        sleepQueuedExtendRef.current = true;
      }
      return;
    }
    if (source.scrollLeft > TIMELINE_PRELOAD_LEFT_PX) return;
    sleepQueuedExtendRef.current = false;
    setIsExtendingSleepTimeline(true);
    sleepPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
    setSleepTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
  };

  const positionSleepProgressByClientX = (clientX: number) => {
    const el = getPrimarySleepScrollEl();
    const track = sleepProgressTrackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const availableTrack = Math.max(1, track.clientWidth - sleepThumbWidthPx);
    const rawThumbLeft = clientX - rect.left - sleepThumbWidthPx / 2;
    const thumbLeft = Math.max(0, Math.min(availableTrack, rawThumbLeft));
    const ratio = availableTrack > 0 ? thumbLeft / availableTrack : 0;
    el.scrollLeft = ratio * maxScroll;
    sleepSyncingRef.current = true;
    getSleepScrollElements().forEach((node) => {
      if (node !== el) node.scrollLeft = el.scrollLeft;
    });
    sleepSyncingRef.current = false;
    setSleepScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  };

  const handleDiaperScroll = (source: HTMLDivElement | null) => {
    if (!source) return;
    if (!diaperSyncingRef.current) {
      diaperSyncingRef.current = true;
      getDiaperScrollElements().forEach((el) => {
        if (el !== source) el.scrollLeft = source.scrollLeft;
      });
      diaperSyncingRef.current = false;
    }
    const primary = getPrimaryDiaperScrollEl();
    if (primary) {
      setDiaperScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    if (isExtendingDiaperTimeline) {
      if (source.scrollLeft <= TIMELINE_PRELOAD_LEFT_PX) {
        diaperQueuedExtendRef.current = true;
      }
      return;
    }
    if (source.scrollLeft > TIMELINE_PRELOAD_LEFT_PX) return;
    diaperQueuedExtendRef.current = false;
    setIsExtendingDiaperTimeline(true);
    diaperPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
    setDiaperTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
  };

  const positionDiaperProgressByClientX = (clientX: number) => {
    const el = getPrimaryDiaperScrollEl();
    const track = diaperProgressTrackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const availableTrack = Math.max(1, track.clientWidth - diaperThumbWidthPx);
    const rawThumbLeft = clientX - rect.left - diaperThumbWidthPx / 2;
    const thumbLeft = Math.max(0, Math.min(availableTrack, rawThumbLeft));
    const ratio = availableTrack > 0 ? thumbLeft / availableTrack : 0;
    el.scrollLeft = ratio * maxScroll;
    diaperSyncingRef.current = true;
    getDiaperScrollElements().forEach((node) => {
      if (node !== el) node.scrollLeft = el.scrollLeft;
    });
    diaperSyncingRef.current = false;
    setDiaperScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  };

  const handleSolidScroll = (source: HTMLDivElement | null) => {
    if (!source) return;
    if (!solidSyncingRef.current) {
      solidSyncingRef.current = true;
      getSolidScrollElements().forEach((el) => {
        if (el !== source) el.scrollLeft = source.scrollLeft;
      });
      solidSyncingRef.current = false;
    }
    const primary = getPrimarySolidScrollEl();
    if (primary) {
      setSolidScrollMetrics({
        left: primary.scrollLeft,
        width: primary.scrollWidth,
        client: primary.clientWidth,
      });
    }
    if (isExtendingSolidTimeline) {
      if (source.scrollLeft <= TIMELINE_PRELOAD_LEFT_PX) {
        solidQueuedExtendRef.current = true;
      }
      return;
    }
    if (source.scrollLeft > TIMELINE_PRELOAD_LEFT_PX) return;
    solidQueuedExtendRef.current = false;
    setIsExtendingSolidTimeline(true);
    solidPendingScrollAdjustRef.current = TIMELINE_EXTEND_STEP * (FEEDING_DAY_WIDTH + TIMELINE_DAY_GAP);
    setSolidTimelineDays((prev) => prev + TIMELINE_EXTEND_STEP);
  };

  const positionSolidProgressByClientX = (clientX: number) => {
    const el = getPrimarySolidScrollEl();
    const track = solidProgressTrackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const availableTrack = Math.max(1, track.clientWidth - solidThumbWidthPx);
    const rawThumbLeft = clientX - rect.left - solidThumbWidthPx / 2;
    const thumbLeft = Math.max(0, Math.min(availableTrack, rawThumbLeft));
    const ratio = availableTrack > 0 ? thumbLeft / availableTrack : 0;
    el.scrollLeft = ratio * maxScroll;
    solidSyncingRef.current = true;
    getSolidScrollElements().forEach((node) => {
      if (node !== el) node.scrollLeft = el.scrollLeft;
    });
    solidSyncingRef.current = false;
    setSolidScrollMetrics({
      left: el.scrollLeft,
      width: el.scrollWidth,
      client: el.clientWidth,
    });
  };

  const timelineTableWidthPx = Math.max(0, timelineDates.length * TIMELINE_DAY_WIDTH);
  const timelineGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${timelineDates.length}, minmax(${TIMELINE_DAY_WIDTH}px, ${TIMELINE_DAY_WIDTH}px))`,
      columnGap: `${TIMELINE_DAY_GAP}px`,
      width: `${timelineTableWidthPx}px`,
    }),
    [timelineDates.length, timelineTableWidthPx]
  );
  const timelineScrollMax = Math.max(0, timelineScrollMetrics.width - timelineScrollMetrics.client);
  const timelineThumbWidthPx = Math.max(
    28,
    Math.min(timelineScrollMetrics.client, TIMELINE_THUMB_DAYS * TIMELINE_DAY_WIDTH)
  );
  const timelineThumbLeftPx = timelineScrollMax
    ? ((Math.max(0, timelineScrollMetrics.client - timelineThumbWidthPx)) * timelineScrollMetrics.left) /
      timelineScrollMax
    : 0;
  const feedingScrollMax = Math.max(0, feedingScrollMetrics.width - feedingScrollMetrics.client);
  const feedingThumbWidthPx = Math.max(28, Math.min(feedingScrollMetrics.client, TIMELINE_THUMB_DAYS * FEEDING_DAY_WIDTH));
  const feedingThumbLeftPx = feedingScrollMax
    ? ((Math.max(0, feedingScrollMetrics.client - feedingThumbWidthPx)) * feedingScrollMetrics.left) /
      feedingScrollMax
    : 0;
  const sleepScrollMax = Math.max(0, sleepScrollMetrics.width - sleepScrollMetrics.client);
  const sleepThumbWidthPx = Math.max(28, Math.min(sleepScrollMetrics.client, TIMELINE_THUMB_DAYS * FEEDING_DAY_WIDTH));
  const sleepThumbLeftPx = sleepScrollMax
    ? ((Math.max(0, sleepScrollMetrics.client - sleepThumbWidthPx)) * sleepScrollMetrics.left) / sleepScrollMax
    : 0;
  const diaperScrollMax = Math.max(0, diaperScrollMetrics.width - diaperScrollMetrics.client);
  const diaperThumbWidthPx = Math.max(
    28,
    Math.min(diaperScrollMetrics.client, TIMELINE_THUMB_DAYS * FEEDING_DAY_WIDTH)
  );
  const diaperThumbLeftPx = diaperScrollMax
    ? ((Math.max(0, diaperScrollMetrics.client - diaperThumbWidthPx)) * diaperScrollMetrics.left) / diaperScrollMax
    : 0;
  const solidScrollMax = Math.max(0, solidScrollMetrics.width - solidScrollMetrics.client);
  const solidThumbWidthPx = Math.max(28, Math.min(solidScrollMetrics.client, TIMELINE_THUMB_DAYS * FEEDING_DAY_WIDTH));
  const solidThumbLeftPx = solidScrollMax
    ? ((Math.max(0, solidScrollMetrics.client - solidThumbWidthPx)) * solidScrollMetrics.left) / solidScrollMax
    : 0;
  const feedingDayCellStyle = {
    width: `${FEEDING_DAY_WIDTH}px`,
    minWidth: `${FEEDING_DAY_WIDTH}px`,
    maxWidth: `${FEEDING_DAY_WIDTH}px`,
  };
  const feedingTableWidthPx = Math.max(0, feedingDailyStats.length * FEEDING_DAY_WIDTH);
  const feedingGridStyle = {
    gridTemplateColumns: `repeat(${feedingDailyStats.length}, minmax(${FEEDING_DAY_WIDTH}px, ${FEEDING_DAY_WIDTH}px))`,
    columnGap: `${TIMELINE_DAY_GAP}px`,
    width: `${feedingTableWidthPx}px`,
  } as const;
  const sleepTableWidthPx = Math.max(0, sleepDailyStats.length * FEEDING_DAY_WIDTH);
  const sleepGridStyle = {
    gridTemplateColumns: `repeat(${sleepDailyStats.length}, minmax(${FEEDING_DAY_WIDTH}px, ${FEEDING_DAY_WIDTH}px))`,
    columnGap: `${TIMELINE_DAY_GAP}px`,
    width: `${sleepTableWidthPx}px`,
  } as const;
  const diaperTableWidthPx = Math.max(0, diaperDailyStats.length * FEEDING_DAY_WIDTH);
  const diaperGridStyle = {
    gridTemplateColumns: `repeat(${diaperDailyStats.length}, minmax(${FEEDING_DAY_WIDTH}px, ${FEEDING_DAY_WIDTH}px))`,
    columnGap: `${TIMELINE_DAY_GAP}px`,
    width: `${diaperTableWidthPx}px`,
  } as const;
  const solidTableWidthPx = Math.max(0, solidDailyStats.length * FEEDING_DAY_WIDTH);
  const solidGridStyle = {
    gridTemplateColumns: `repeat(${solidDailyStats.length}, minmax(${FEEDING_DAY_WIDTH}px, ${FEEDING_DAY_WIDTH}px))`,
    columnGap: `${TIMELINE_DAY_GAP}px`,
    width: `${solidTableWidthPx}px`,
  } as const;

  const scrollToGuide = (tab: GuideTab) => {
    setGuideTab(tab);
    const target =
      tab === "feeding" ? guideFeedingRef.current : tab === "sleep" ? guideSleepRef.current : guidePoopRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const guideTabClass = (tab: GuideTab) =>
    cn(
      "rounded-full border px-4 text-sm font-semibold transition-all",
      guideTab === tab
        ? tab === "feeding"
          ? "border-teal-300 bg-teal-500 text-white shadow-sm"
          : tab === "sleep"
            ? "border-cyan-300 bg-cyan-500 text-white shadow-sm"
            : "border-emerald-300 bg-emerald-500 text-white shadow-sm"
        : "border-cyan-100 bg-white/90 text-slate-600 hover:bg-cyan-50"
    );
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
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
                  <BarChart3 className="h-6 w-6 text-rose-500" />
                  {locale === "zh" ? "喂养分析" : "Behavior Analysis"}
                </h1>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                <div className="sm:hidden">
                  <GlobalShortcuts />
                </div>
                <BabySelector
                  selectedBabyId={selectedBabyId}
                  onSelectBaby={setSelectedBabyId}
                  includeAllOption
                  allOptionValue="ALL"
                />
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-muted-foreground/20 px-3 text-sm"
                  onClick={() => setGuideOpen(true)}
                  aria-label={locale === "zh" ? "打开参考表" : "Open reference"}
                  title={locale === "zh" ? "参考表" : "Reference"}
                >
                  <ClipboardList className="mr-1 h-4 w-4" />
                  {locale === "zh" ? "参考表" : "Reference"}
                </Button>
                <LanguageSwitcher />
                <AccountMenu />
              </div>
            </div>
          </div>
        </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="pt-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {moduleTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setModule(tab.value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    module === tab.value ? `${theme.chip} ${theme.chipText}` : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">{selectedBabyName} · {locale === "zh" ? "近7天" : "Last 7 days"}</div>
          </CardContent>
        </Card>

        <Card className={cn("border", theme.soft)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-lg">
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", theme.chip, theme.chipText)}>
                {locale === "zh" ? "时间规律" : "Time Pattern"}
              </span>
              {module === "ALL" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full border-rose-300 text-rose-600">
                      {locale === "zh" ? "筛选" : "Filter"}
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>{locale === "zh" ? "显示行为" : "Visible Modules"}</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={allFilters.feeding}
                      onCheckedChange={(v) => setAllFilters((s) => ({ ...s, feeding: !!v }))}
                    >
                      {locale === "zh" ? "喂奶" : "Feeding"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={allFilters.sleep}
                      onCheckedChange={(v) => setAllFilters((s) => ({ ...s, sleep: !!v }))}
                    >
                      {locale === "zh" ? "睡眠" : "Sleep"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={allFilters.diaper}
                      onCheckedChange={(v) => setAllFilters((s) => ({ ...s, diaper: !!v }))}
                    >
                      {locale === "zh" ? "换尿布" : "Diaper"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={allFilters.solid}
                      onCheckedChange={(v) => setAllFilters((s) => ({ ...s, solid: !!v }))}
                    >
                      {locale === "zh" ? "辅食" : "Solid"}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineMarkers.length === 0 && timelineSleepBlocks.length === 0 ? (
              <p className="pb-3 text-sm text-muted-foreground">{noDataText}</p>
            ) : null}

            <div className="relative rounded-xl border bg-white py-3 pl-3 pr-1">
              <div className="flex items-start gap-0">
                <div className="min-w-0 flex-1">
                  <div
                    ref={timelineScrollRef}
                    className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={handleTimelineScroll}
                  >
                    <div style={{ width: `${timelineTableWidthPx}px` }}>
                      <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
                        {HOUR_GRID_LINES.map((h) => (
                          <div
                            key={h}
                            className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-300/90"
                            style={{ top: `${toTimelineY(h)}px` }}
                          />
                        ))}

                        <div
                          className="absolute bottom-0 left-0 right-0 grid"
                          style={{ ...timelineGridStyle, top: `${TIMELINE_TOP_PADDING}px` }}
                        >
                          {timelineDates.map((date, dayIndex) => {
                            const currentDayKey = dayKey(date);
                            return (
                              <button
                                key={`${currentDayKey}-col`}
                                type="button"
                                onClick={() => {
                                  setActiveDayKey(currentDayKey);
                                }}
                            className={cn(
                              "relative border-r border-rose-100/70 p-0 transition-colors",
                              shouldShadeByToday(dayIndex, timelineDates.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          />
                            );
                          })}
                        </div>

                        <div className="absolute inset-0 grid" style={timelineGridStyle}>
                          {timelineDates.map((date, dayIndex) => (
                            <div key={`${dayKey(date)}-layer`} className="relative">
                              {timelineSleepBlocks
                                .filter((block) => block.dayIndex === dayIndex)
                                .map((block) => {
                                  const top = toTimelineY(block.startHour);
                                  const height = Math.max(
                                    8,
                                    ((block.endHour - block.startHour) / 24) * (TIMELINE_HEIGHT - TIMELINE_TOP_PADDING)
                                  );
                                  return (
                                <div
                                  key={block.id}
                                  className="absolute left-0.5 right-0.5 z-10 rounded-lg bg-violet-200/65 transition"
                                  style={{ top, height }}
                                />
                                  );
                                })}

                          {timelineMarkers
                            .filter((marker) => marker.dayIndex === dayIndex)
                            .map((marker) => {
                              const hourSlotCenter = Math.min(23.5, Math.floor(marker.hour) + 0.5);
                              const top = toTimelineY(hourSlotCenter);
                              const meta = getMarkerMeta(marker.kind, locale);
                              return (
                                <div
                                  key={marker.id}
                                  className="absolute left-1/2 z-20 -translate-x-1/2 text-[14px] transition"
                                  style={{ top: top - 8 }}
                                  title={meta.label}
                                >
                                      {meta.icon}
                                    </div>
                                  );
                                })}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-2 grid" style={timelineGridStyle}>
                        {timelineDates.map((date) => {
                          const currentDayKey = dayKey(date);
                          const isActive = currentDayKey === activeDayKey;
                          return (
                            <button
                              key={`${currentDayKey}-date`}
                              type="button"
                              onClick={() => {
                                setActiveDayKey(currentDayKey);
                              }}
                              className={cn(
                                "h-5 p-0 text-center text-xs font-semibold transition",
                                isActive ? "text-rose-600" : "text-slate-700"
                              )}
                            >
                              {currentDayKey === getTodayDayKey() ? todayLabel : toShortDate(date)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    ref={progressTrackRef}
                    className="mt-2 select-none py-1.5 touch-none"
                    onPointerDown={(e) => {
                      progressDraggingRef.current = true;
                      positionProgressByClientX(e.clientX);
                      const target = e.currentTarget;
                      target.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!progressDraggingRef.current) return;
                      positionProgressByClientX(e.clientX);
                    }}
                    onPointerUp={() => {
                      progressDraggingRef.current = false;
                    }}
                    onPointerCancel={() => {
                      progressDraggingRef.current = false;
                    }}
                    onMouseDown={(e) => {
                      progressDraggingRef.current = true;
                      positionProgressByClientX(e.clientX);
                    }}
                    onMouseMove={(e) => {
                      if (!progressDraggingRef.current || (e.buttons & 1) === 0) return;
                      positionProgressByClientX(e.clientX);
                    }}
                    onMouseUp={() => {
                      progressDraggingRef.current = false;
                    }}
                    onMouseLeave={() => {
                      progressDraggingRef.current = false;
                    }}
                  >
                    <div className="relative h-2 rounded-full bg-slate-200/95">
                      <div
                        className="absolute top-1/2 h-4 -translate-y-1/2 cursor-grab rounded-full border border-slate-400/60 bg-slate-500/90 shadow-sm active:cursor-grabbing"
                        style={{
                          width: `${timelineThumbWidthPx}px`,
                          left: `${timelineThumbLeftPx}px`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-12 shrink-0 pl-2">
                  <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
                    {HOUR_AXIS_LABELS.map((h) => (
                      <span
                        key={`axis-${h}`}
                        className="absolute left-0 -translate-y-1/2 text-xs font-semibold text-slate-700"
                        style={{ top: `${toTimelineY(h)}px` }}
                      >
                        {formatHourLabel(h)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {(module === "FEEDING" || module === "ALL") && (
                  <LegendTag locale={locale} kind="breast_direct" />
                )}
                {(module === "FEEDING" || module === "ALL") && (
                  <LegendTag locale={locale} kind="breast_bottle" />
                )}
                {(module === "FEEDING" || module === "ALL") && (
                  <LegendTag locale={locale} kind="formula" />
                )}
                {(module === "SLEEP" || module === "ALL") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-violet-700">
                    <Moon className="h-3.5 w-3.5" />
                    {locale === "zh" ? "睡眠" : "Sleep"}
                  </span>
                )}
                {(module === "DIAPER" || module === "ALL") && <LegendTag locale={locale} kind="diaper" />}
                {(module === "SOLID" || module === "ALL") && <LegendTag locale={locale} kind="solid" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {module === "FEEDING" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", theme.chip, theme.chipText)}>{locale === "zh" ? "喂奶量" : "Feeding Amount"}</span>
                <span className="text-sm font-normal text-muted-foreground">{locale === "zh" ? "统计周期：每日 00:00-24:00" : "Daily 00:00-24:00"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  {locale === "zh" ? "亲喂母乳" : "Direct Breastfeeding"}
                </div>
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-none border bg-white">
                    <div
                      ref={feedingDirectScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleFeedingScroll(e.currentTarget)}
                    >
                      <div className="grid text-center" style={feedingGridStyle}>
                        {feedingDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-direct`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          >
                            {day.directCount}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid text-center" style={feedingGridStyle}>
                        {feedingDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-left`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          >
                            {day.leftMinutes}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "分" : "m"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid text-center" style={feedingGridStyle}>
                        {feedingDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-right`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          >
                            {day.rightMinutes}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "分" : "m"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">🤱</div>
                    <div className="flex h-9 items-center justify-center text-xs font-semibold text-rose-600">{locale === "zh" ? "左" : "L"}</div>
                    <div className="flex h-9 items-center justify-center text-xs font-semibold text-rose-600">{locale === "zh" ? "右" : "R"}</div>
                  </div>
                </div>

                <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  {locale === "zh" ? "瓶喂" : "Bottle Feeding"}
                </div>
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-none border bg-white">
                    <div
                      ref={feedingBottleScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleFeedingScroll(e.currentTarget)}
                    >
                      <div className="grid text-center" style={feedingGridStyle}>
                        {feedingDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-bottle`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          >
                            {day.bottleBreastCount}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid text-center" style={feedingGridStyle}>
                        {feedingDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-formula`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent"
                            )}
                          >
                            {day.formulaCount}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="relative -mt-px border-t bg-white">
                    <div className="pointer-events-none absolute left-1/2 top-[20%] z-40 inline-flex -translate-x-1/2 -translate-y-1/2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm">
                      {locale === "zh" ? `近7天平均每天 ${avgFeedingMl}ml` : `Avg daily in last 7 days: ${avgFeedingMl}ml`}
                    </div>
                    <div className="flex">
                      <div
                        ref={feedingVolumeScrollRef}
                        className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        onScroll={(e) => handleFeedingScroll(e.currentTarget)}
                      >
                        <div className="grid" style={feedingGridStyle}>
                          {feedingDailyStats.map((day, index) => (
                            <div key={`${day.key}-stack`} style={feedingDayCellStyle} className={cn("flex min-h-[320px] flex-col items-center justify-end px-0 pb-2", shouldShadeByToday(index, feedingDailyStats.length) ? "bg-rose-100/40" : "bg-transparent")}>
                              <div className="mb-1 min-h-6 max-w-full truncate text-center text-sm font-semibold leading-none text-rose-600">
                                {day.totalMl > 0 ? day.totalMl : ""}
                              </div>
                              <div className="flex w-full max-w-[44px] flex-col-reverse gap-1">
                                {day.stackAmounts.map((amount, amountIndex) => (
                                  <div key={`${day.key}-stack-${amount}-${amountIndex}`} className="rounded-2xl bg-rose-600 py-1 text-center text-xs font-semibold leading-tight text-white">
                                    {amount}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid" style={feedingGridStyle}>
                          {feedingDailyStats.map((day) => (
                            <div key={`${day.key}-date-label`} className={cn("py-1 text-center text-xs font-semibold", day.label === todayLabel ? "text-rose-600" : "text-slate-700")}>
                              {day.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">🍼</div>
                    <div className="flex h-9 items-center justify-center text-sm">🧃</div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex">
                <div
                  ref={feedingProgressTrackRef}
                  className="min-w-0 flex-1 select-none py-1.5 touch-none"
                  onPointerDown={(e) => {
                    feedingProgressDraggingRef.current = true;
                    positionFeedingProgressByClientX(e.clientX);
                    const target = e.currentTarget;
                    target.setPointerCapture?.(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!feedingProgressDraggingRef.current) return;
                    positionFeedingProgressByClientX(e.clientX);
                  }}
                  onPointerUp={() => {
                    feedingProgressDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    feedingProgressDraggingRef.current = false;
                  }}
                  onMouseDown={(e) => {
                    feedingProgressDraggingRef.current = true;
                    positionFeedingProgressByClientX(e.clientX);
                  }}
                  onMouseMove={(e) => {
                    if (!feedingProgressDraggingRef.current || (e.buttons & 1) === 0) return;
                    positionFeedingProgressByClientX(e.clientX);
                  }}
                  onMouseUp={() => {
                    feedingProgressDraggingRef.current = false;
                  }}
                  onMouseLeave={() => {
                    feedingProgressDraggingRef.current = false;
                  }}
                >
                  <div className="relative h-2 rounded-full bg-slate-200/95">
                    <div
                      className="absolute top-1/2 h-4 -translate-y-1/2 cursor-grab rounded-full border border-slate-400/60 bg-slate-500/90 shadow-sm active:cursor-grabbing"
                      style={{
                        width: `${feedingThumbWidthPx}px`,
                        left: `${feedingThumbLeftPx}px`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-12 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {module === "SLEEP" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", theme.chip, theme.chipText)}>{locale === "zh" ? "睡眠量" : "Sleep Volume"}</span>
                <span className="text-sm font-normal text-muted-foreground">{locale === "zh" ? "统计周期：每日 00:00-24:00" : "Daily 00:00-24:00"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {locale === "zh" ? "总次数" : "Total Sessions"}
                </div>
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-none border bg-white">
                    <div
                      ref={sleepCountScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleSleepScroll(e.currentTarget)}
                    >
                    <div className="grid text-center" style={sleepGridStyle}>
                      {sleepDailyStats.map((day, index) => (
                        <div
                          key={`${day.key}-sleep-count`}
                          style={feedingDayCellStyle}
                          className={cn(
                            "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                            shouldShadeByToday(index, sleepDailyStats.length) ? "bg-violet-100/30" : "bg-transparent"
                          )}
                        >
                          {day.count}
                          <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">🌙</div>
                  </div>
                </div>

                <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {locale === "zh" ? "总时长" : "Total Duration"}
                </div>
                <div className="flex">
                  <div className="relative min-w-0 flex-1 overflow-hidden rounded-none border bg-white pb-2 pt-6">
                    <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 inline-flex -translate-x-1/2 -translate-y-1/2 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 shadow-sm">
                      {locale === "zh"
                        ? `近7天平均每天 ${formatDuration(avgSleepMinutes, locale)}`
                        : `Avg daily in last 7 days: ${formatDuration(avgSleepMinutes, locale)}`}
                    </div>
                    <div
                      ref={sleepDurationScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleSleepScroll(e.currentTarget)}
                    >
                    <div className="grid min-h-[320px] items-end" style={sleepGridStyle}>
                      {sleepDailyStats.map((day, index) => {
                        const maxMinutes = Math.max(1, ...sleepDailyStats.map((d) => d.totalMinutes));
                        const barHeight = Math.max(0, Math.round((day.totalMinutes / maxMinutes) * 180));
                        const hours = Math.floor(day.totalMinutes / 60);
                        const minutes = day.totalMinutes % 60;
                        return (
                          <div
                            key={`${day.key}-sleep-duration`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-full flex-col items-center justify-end pb-2",
                              shouldShadeByToday(index, sleepDailyStats.length) ? "bg-violet-100/30" : "bg-transparent"
                            )}
                          >
                            {day.totalMinutes > 0 ? (
                              <div className="mb-2 text-center text-xs font-semibold leading-tight text-violet-600">
                                <div>{hours}h</div>
                                <div>{minutes}min</div>
                              </div>
                            ) : (
                              <div className="mb-2 h-8" />
                            )}
                            <div
                              className="w-9 rounded-t-2xl bg-violet-600"
                              style={{ height: `${barHeight}px`, minHeight: day.totalMinutes > 0 ? "8px" : "0px" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid" style={sleepGridStyle}>
                      {sleepDailyStats.map((day) => (
                        <div
                          key={`${day.key}-sleep-date`}
                          style={feedingDayCellStyle}
                          className={cn(
                            "py-1 text-center text-xs font-semibold",
                            day.label === todayLabel ? "text-violet-600" : "text-slate-700"
                          )}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0" />
                </div>

                <div className="mt-2 flex">
                  <div
                    ref={sleepProgressTrackRef}
                    className="min-w-0 flex-1 select-none py-1.5 touch-none"
                    onPointerDown={(e) => {
                      sleepProgressDraggingRef.current = true;
                      positionSleepProgressByClientX(e.clientX);
                      const target = e.currentTarget;
                      target.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!sleepProgressDraggingRef.current) return;
                      positionSleepProgressByClientX(e.clientX);
                    }}
                    onPointerUp={() => {
                      sleepProgressDraggingRef.current = false;
                    }}
                    onPointerCancel={() => {
                      sleepProgressDraggingRef.current = false;
                    }}
                    onMouseDown={(e) => {
                      sleepProgressDraggingRef.current = true;
                      positionSleepProgressByClientX(e.clientX);
                    }}
                    onMouseMove={(e) => {
                      if (!sleepProgressDraggingRef.current || (e.buttons & 1) === 0) return;
                      positionSleepProgressByClientX(e.clientX);
                    }}
                    onMouseUp={() => {
                      sleepProgressDraggingRef.current = false;
                    }}
                    onMouseLeave={() => {
                      sleepProgressDraggingRef.current = false;
                    }}
                  >
                    <div className="relative h-2 rounded-full bg-slate-200/95">
                      <div
                        className="absolute top-1/2 h-4 -translate-y-1/2 cursor-grab rounded-full border border-slate-400/60 bg-slate-500/90 shadow-sm active:cursor-grabbing"
                        style={{
                          width: `${sleepThumbWidthPx}px`,
                          left: `${sleepThumbLeftPx}px`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {module === "DIAPER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", theme.chip, theme.chipText)}>{locale === "zh" ? "换尿布量" : "Diaper Volume"}</span>
                <span className="text-sm font-normal text-muted-foreground">{locale === "zh" ? "统计周期：每日 00:00-24:00" : "Daily 00:00-24:00"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {locale === "zh" ? "总次数" : "Total"}
                </div>
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-none border bg-white">
                    <div
                      ref={diaperCountScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleDiaperScroll(e.currentTarget)}
                    >
                      <div className="grid text-center" style={diaperGridStyle}>
                        {diaperDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-diaper-total`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, diaperDailyStats.length) ? "bg-amber-100/30" : "bg-transparent"
                            )}
                          >
                            {day.total}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">🛡️</div>
                  </div>
                </div>

                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {locale === "zh" ? "类型统计" : "Type Stats"}
                </div>
                <div className="flex">
                  <div className="relative min-w-0 flex-1 overflow-hidden rounded-none border bg-white pb-2 pt-6">
                    <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 inline-flex -translate-x-1/2 -translate-y-1/2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                      {locale === "zh" ? `近7天平均每天 ${avgDiaperDaily}次` : `Avg daily in last 7 days: ${avgDiaperDaily}`}
                    </div>
                    <div
                      ref={diaperTypeScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleDiaperScroll(e.currentTarget)}
                    >
                      <div className="grid text-center" style={diaperGridStyle}>
                        {diaperDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-wet`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, diaperDailyStats.length) ? "bg-amber-100/30" : "bg-transparent"
                            )}
                          >
                            {day.wet}
                          </div>
                        ))}
                      </div>
                      <div className="grid text-center" style={diaperGridStyle}>
                        {diaperDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-dirty`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, diaperDailyStats.length) ? "bg-amber-100/30" : "bg-transparent"
                            )}
                          >
                            {day.dirty}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="grid text-center" style={diaperGridStyle}>
                          {diaperDailyStats.map((day, index) => (
                            <div
                              key={`${day.key}-both`}
                              style={feedingDayCellStyle}
                              className={cn(
                                "flex h-9 items-center justify-center whitespace-nowrap px-0 text-xs font-semibold leading-tight text-slate-700",
                                shouldShadeByToday(index, diaperDailyStats.length) ? "bg-amber-100/30" : "bg-transparent"
                              )}
                            >
                              {day.both}
                            </div>
                          ))}
                        </div>
                        <div className="grid" style={diaperGridStyle}>
                          {diaperDailyStats.map((day) => (
                            <div
                              key={`${day.key}-date`}
                              style={feedingDayCellStyle}
                              className={cn(
                                "py-1 text-center text-xs font-semibold",
                                day.label === todayLabel ? "text-amber-700" : "text-slate-700"
                              )}
                            >
                              {day.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">💧</div>
                    <div className="flex h-9 items-center justify-center text-sm">💩</div>
                    <div className="flex h-9 items-center justify-center text-sm">⚖️</div>
                  </div>
                </div>

                <div className="mt-2 flex">
                  <div
                    ref={diaperProgressTrackRef}
                    className="min-w-0 flex-1 select-none py-1.5 touch-none"
                    onPointerDown={(e) => {
                      diaperProgressDraggingRef.current = true;
                      positionDiaperProgressByClientX(e.clientX);
                      const target = e.currentTarget;
                      target.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!diaperProgressDraggingRef.current) return;
                      positionDiaperProgressByClientX(e.clientX);
                    }}
                    onPointerUp={() => {
                      diaperProgressDraggingRef.current = false;
                    }}
                    onPointerCancel={() => {
                      diaperProgressDraggingRef.current = false;
                    }}
                    onMouseDown={(e) => {
                      diaperProgressDraggingRef.current = true;
                      positionDiaperProgressByClientX(e.clientX);
                    }}
                    onMouseMove={(e) => {
                      if (!diaperProgressDraggingRef.current || (e.buttons & 1) === 0) return;
                      positionDiaperProgressByClientX(e.clientX);
                    }}
                    onMouseUp={() => {
                      diaperProgressDraggingRef.current = false;
                    }}
                    onMouseLeave={() => {
                      diaperProgressDraggingRef.current = false;
                    }}
                  >
                    <div className="relative h-2 rounded-full bg-slate-200/95">
                      <div
                        className="absolute top-1/2 h-4 -translate-y-1/2 cursor-grab rounded-full border border-slate-400/60 bg-slate-500/90 shadow-sm active:cursor-grabbing"
                        style={{
                          width: `${diaperThumbWidthPx}px`,
                          left: `${diaperThumbLeftPx}px`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {module === "SOLID" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", theme.chip, theme.chipText)}>{locale === "zh" ? "辅食量" : "Solid Volume"}</span>
                <span className="text-sm font-normal text-muted-foreground">{locale === "zh" ? "统计周期：每日 00:00-24:00" : "Daily 00:00-24:00"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {locale === "zh" ? "总次数" : "Total"}
                </div>
                <div className="flex">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-none border bg-white">
                    <div
                      ref={solidCountScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleSolidScroll(e.currentTarget)}
                    >
                      <div className="grid text-center" style={solidGridStyle}>
                        {solidDailyStats.map((day, index) => (
                          <div
                            key={`${day.key}-solid-count`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "flex h-9 items-center justify-center whitespace-nowrap border-b px-0 text-xs font-semibold leading-tight text-slate-700",
                              shouldShadeByToday(index, solidDailyStats.length) ? "bg-orange-100/30" : "bg-transparent"
                            )}
                          >
                            {day.count}
                            <span className="ml-0.5 text-[10px]">{locale === "zh" ? "次" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0">
                    <div className="flex h-9 items-center justify-center text-sm">🍚</div>
                  </div>
                </div>

                <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {locale === "zh" ? "总量" : "Total Amount"}
                </div>
                <div className="flex">
                  <div className="relative min-w-0 flex-1 overflow-hidden rounded-none border bg-white pb-2 pt-6">
                    <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 inline-flex -translate-x-1/2 -translate-y-1/2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                      {locale === "zh" ? `近7天平均每天 ${avgSolidMlDaily}ml` : `Avg daily in last 7 days: ${avgSolidMlDaily}ml`}
                    </div>
                    <div
                      ref={solidVolumeScrollRef}
                      className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
                      onScroll={(e) => handleSolidScroll(e.currentTarget)}
                    >
                      <div className="grid min-h-[320px] items-end" style={solidGridStyle}>
                        {solidDailyStats.map((day, index) => {
                          const maxMl = Math.max(1, ...solidDailyStats.map((d) => d.totalMl));
                          const barHeight = Math.max(0, Math.round((day.totalMl / maxMl) * 180));
                          return (
                            <div
                              key={`${day.key}-solid-bar`}
                              style={feedingDayCellStyle}
                              className={cn(
                                "flex h-full flex-col items-center justify-end pb-2",
                                shouldShadeByToday(index, solidDailyStats.length) ? "bg-orange-100/30" : "bg-transparent"
                              )}
                            >
                              <div className="mb-2 min-h-5 text-center text-xs font-semibold leading-tight text-orange-700">
                                {day.totalMl > 0 ? `${day.totalMl}` : ""}
                              </div>
                              <div
                                className="w-9 rounded-t-2xl bg-orange-500"
                                style={{ height: `${barHeight}px`, minHeight: day.totalMl > 0 ? "8px" : "0px" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid" style={solidGridStyle}>
                        {solidDailyStats.map((day) => (
                          <div
                            key={`${day.key}-solid-date`}
                            style={feedingDayCellStyle}
                            className={cn(
                              "py-1 text-center text-xs font-semibold",
                              day.label === todayLabel ? "text-orange-700" : "text-slate-700"
                            )}
                          >
                            {day.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 shrink-0" />
                </div>

                <div className="mt-2 flex">
                  <div
                    ref={solidProgressTrackRef}
                    className="min-w-0 flex-1 select-none py-1.5 touch-none"
                    onPointerDown={(e) => {
                      solidProgressDraggingRef.current = true;
                      positionSolidProgressByClientX(e.clientX);
                      const target = e.currentTarget;
                      target.setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!solidProgressDraggingRef.current) return;
                      positionSolidProgressByClientX(e.clientX);
                    }}
                    onPointerUp={() => {
                      solidProgressDraggingRef.current = false;
                    }}
                    onPointerCancel={() => {
                      solidProgressDraggingRef.current = false;
                    }}
                    onMouseDown={(e) => {
                      solidProgressDraggingRef.current = true;
                      positionSolidProgressByClientX(e.clientX);
                    }}
                    onMouseMove={(e) => {
                      if (!solidProgressDraggingRef.current || (e.buttons & 1) === 0) return;
                      positionSolidProgressByClientX(e.clientX);
                    }}
                    onMouseUp={() => {
                      solidProgressDraggingRef.current = false;
                    }}
                    onMouseLeave={() => {
                      solidProgressDraggingRef.current = false;
                    }}
                  >
                    <div className="relative h-2 rounded-full bg-slate-200/95">
                      <div
                        className="absolute top-1/2 h-4 -translate-y-1/2 cursor-grab rounded-full border border-slate-400/60 bg-slate-500/90 shadow-sm active:cursor-grabbing"
                        style={{
                          width: `${solidThumbWidthPx}px`,
                          left: `${solidThumbLeftPx}px`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      <Dialog modal={false} open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[88vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[980px]">
          <div className="relative flex h-[88vh] max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-[#f6fcfd] shadow-2xl">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/35 blur-2xl" />
            <div className="absolute -left-10 top-20 h-36 w-36 rounded-full bg-teal-200/25 blur-2xl" />
            <DialogHeader className="relative z-10 border-b border-cyan-100 bg-[#eef8f9] px-4 pb-3 pt-4">
            <DialogTitle className="text-center text-xl font-extrabold text-slate-900">
              {locale === "zh" ? "喂养参考表" : "Reference Guide"}
            </DialogTitle>
            <div className="mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border border-cyan-100 bg-white/90 p-1">
              <Button size="sm" variant="ghost" className={guideTabClass("feeding")} onClick={() => scrollToGuide("feeding")}>
                {locale === "zh" ? "喂奶量" : "Feeding"}
              </Button>
              <Button size="sm" variant="ghost" className={guideTabClass("sleep")} onClick={() => scrollToGuide("sleep")}>
                {locale === "zh" ? "睡眠时长" : "Sleep"}
              </Button>
              <Button size="sm" variant="ghost" className={guideTabClass("poop")} onClick={() => scrollToGuide("poop")}>
                {locale === "zh" ? "便便图解" : "Poop Guide"}
              </Button>
            </div>
            </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-scroll bg-slate-50/70 px-3 py-3 sm:px-5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300 [&::-webkit-scrollbar-track]:bg-cyan-100/60">
            <section ref={guideFeedingRef} className="scroll-mt-24 space-y-3">
              <Card className="border-cyan-100 bg-white/95 shadow-sm">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center justify-center gap-2 text-center text-lg text-slate-900">
                    <Sparkles className="h-5 w-5 text-teal-500" />
                    {locale === "zh" ? "0~3岁宝宝喂奶量" : "0-3 Feeding"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <GuideTableCard title={locale === "zh" ? "纯母乳喂养" : "Breast Milk"} icon={<GlassWater className="h-4 w-4 text-teal-600" />} themeClass="border-b border-teal-100 bg-teal-50/90" rows={BREAST_MILK_ROWS} locale={locale} />
              <GuideTableCard title={locale === "zh" ? "配方粉喂养" : "Formula"} icon={<FlaskConical className="h-4 w-4 text-cyan-600" />} themeClass="border-b border-cyan-100 bg-cyan-50/90" rows={FORMULA_ROWS} locale={locale} />
              <p className="rounded-2xl border border-cyan-100 bg-white/90 p-3 text-sm text-muted-foreground">
                {locale === "zh"
                  ? "注：以上内容仅供参考，宝宝喂养存在个体差异，建议结合生长发育与精神状态综合判断。"
                  : "Note: For reference only. Follow your baby's growth, mood and pediatric guidance."}
              </p>
            </section>

            <section ref={guideSleepRef} className="mt-5 scroll-mt-24 space-y-3">
              <Card className="overflow-hidden border-cyan-100 bg-white/95 shadow-sm">
                <CardHeader className="w-full border-b border-cyan-100 bg-cyan-50/90 px-4 py-3">
                  <CardTitle className="flex items-center justify-center gap-2 text-center text-lg text-slate-900">
                    <MoonStar className="h-5 w-5 text-cyan-600" />
                    {locale === "zh" ? "0~3岁宝宝睡眠规律" : "0-3 Sleep"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[740px] table-fixed border-collapse text-sm">
                    <colgroup>
                      <col className="w-[16%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-cyan-100/95 text-slate-900">
                        <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "月龄" : "Age"}</th>
                        <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "全天睡眠" : "Total Sleep"}</th>
                        <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "白天小睡" : "Naps"}</th>
                        <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "清醒间隔" : "Wake Window"}</th>
                        <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "夜间睡眠" : "Night Sleep"}</th>
                        <th className="px-3 py-2 text-center">{locale === "zh" ? "晚上入睡" : "Bedtime"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SLEEP_ROWS.map((row) => (
                        <tr key={row.age} className="bg-white/95">
                          <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.age}</td>
                          <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.total}</td>
                          <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.naps}</td>
                          <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.wakeGap}</td>
                          <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.night}</td>
                          <td className="border-t border-dashed border-cyan-200 px-3 py-2 text-center">{row.bedtime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-cyan-100 bg-white/95 shadow-sm">
                <CardHeader className="w-full border-b border-cyan-100 bg-cyan-50/90 px-4 py-3">
                  <CardTitle className="flex items-center justify-center gap-2 text-center text-lg text-slate-900">
                    <MoonStar className="h-5 w-5 text-cyan-600" />
                    {locale === "zh" ? "安抚哄睡技巧" : "Soothing Sleep Tips"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[740px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-cyan-100/95 text-slate-900">
                        <th className="w-44 border-r border-dashed border-cyan-200 px-3 py-2 text-center">{locale === "zh" ? "月龄" : "Age"}</th>
                        <th className="px-3 py-2 text-center">{locale === "zh" ? "安抚建议" : "Tips"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SLEEP_SOOTHING_ROWS.map((row) => (
                        <tr key={row.ages.join("-")} className="bg-white/95">
                          <td className="align-middle border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center font-medium">
                            <div className="space-y-1.5">
                              {row.ages.map((age) => (
                                <p key={age}>{age}</p>
                              ))}
                            </div>
                          </td>
                          <td className="align-middle border-t border-dashed border-cyan-200 px-3 py-2">
                            <div className="flex h-full flex-col justify-center space-y-1.5">
                              {row.tips.map((tip) => (
                                <p key={tip} className="text-slate-700">• {tip}</p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            <section ref={guidePoopRef} className="mt-5 scroll-mt-24 space-y-3">
              <Card className="overflow-hidden border-cyan-100 bg-white/95 shadow-sm">
                <CardHeader className="w-full border-b border-cyan-100 bg-sky-50/90 px-4 py-3">
                  <CardTitle className="flex items-center justify-center gap-2 text-center text-lg text-slate-900">
                    <Sparkles className="h-5 w-5 text-sky-600" />
                    {locale === "zh" ? "宝宝便便图解" : "Poop Guide"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-0">
                  <div className="border-b border-emerald-100 bg-emerald-50/70">
                    <p className="px-3 py-2 text-sm font-semibold text-emerald-700">
                      {locale === "zh" ? "✅ 正常情况" : "✅ Typical"}
                    </p>
                    <SimpleGuideTable rows={POOP_NORMAL_ROWS} locale={locale} lineColorClass="border-emerald-100" />
                  </div>
                  <div className="bg-cyan-50/70">
                    <p className="px-3 py-2 text-sm font-semibold text-sky-700">
                      {locale === "zh" ? "⚠️ 异常情况（建议及时就医）" : "⚠️ Alert (seek medical advice)"}
                    </p>
                    <SimpleGuideTable rows={POOP_ALERT_ROWS} locale={locale} lineColorClass="border-cyan-100" />
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}

function LegendTag({ kind, locale }: { kind: MarkerKind; locale: "zh" | "en" }) {
  const meta = getMarkerMeta(kind, locale);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function GuideTableCard({
  title,
  icon,
  themeClass,
  rows,
  locale,
}: {
  title: string;
  icon: React.ReactNode;
  themeClass: string;
  rows: { age: string; count: string; interval: string; total: string }[];
  locale: "zh" | "en";
}) {
  return (
    <Card className="overflow-hidden border-cyan-100 bg-white/95 shadow-sm">
      <CardHeader className={cn("w-full px-4 py-3", themeClass)}>
        <CardTitle className="flex items-center justify-center gap-2 text-center text-base font-bold text-slate-900">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-cyan-100/95 text-slate-900">
              <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "月龄" : "Age"}</th>
              <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "喂养次数" : "Feeds/Day"}</th>
              <th className="border-r border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{locale === "zh" ? "喂养间隔" : "Interval"}</th>
              <th className="px-3 py-2 text-center">{locale === "zh" ? "总奶量" : "Total Milk"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.age} className="bg-white/95">
                <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.age}</td>
                <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.count}</td>
                <td className="border-r border-t border-dashed border-cyan-200 px-3 py-2 text-center last:border-r-0">{row.interval}</td>
                <td className="border-t border-dashed border-cyan-200 px-3 py-2 text-center">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SimpleGuideTable({
  rows,
  locale,
  lineColorClass,
}: {
  rows: { situation: string; reason: string; color: string }[];
  locale: "zh" | "en";
  lineColorClass: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] border-collapse text-sm">
        <thead>
          <tr className="bg-white/90 text-slate-900">
            <th className={cn("border-r border-dashed px-3 py-2 text-center", lineColorClass)}>{locale === "zh" ? "便便情况" : "Type"}</th>
            <th className={cn("border-r border-dashed px-3 py-2 text-center", lineColorClass)}>{locale === "zh" ? "常见原因" : "Reason"}</th>
            <th className="px-3 py-2 text-center">{locale === "zh" ? "示意图" : "Visual"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.situation} className="bg-white/95">
              <td className={cn("border-r border-t border-dashed px-3 py-2 text-center", lineColorClass)}>{row.situation}</td>
              <td className={cn("border-r border-t border-dashed px-3 py-2 text-center", lineColorClass)}>{row.reason}</td>
              <td className={cn("border-t px-3 py-2 text-center", lineColorClass)}>
                <PoopIcon color={row.color} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoopIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 70" className="h-9 w-14">
      <path
        d="M50 8c7 0 12 4 13 10 8 1 14 7 14 15 6 2 10 7 10 13 0 9-8 16-18 16H31C20 62 12 55 12 46c0-7 5-12 11-14 1-8 7-14 15-15 1-6 6-9 12-9z"
        fill={color}
        stroke="#f2a47b"
        strokeWidth="3"
      />
    </svg>
  );
}

function MiniStat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
        <span>{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
    </div>
  );
}


