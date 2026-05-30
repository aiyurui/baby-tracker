"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Circle,
  Clock3,
  HeartPulse,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { BabySelector } from "@/components/layout/baby-selector";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/client";
import type { Baby, Record } from "@/types";

interface VaccinesContentProps {
  babies: Baby[];
  vaccineRecords: (Record & { baby: { id: string; name: string } })[];
}

type VaccineKind = "FREE" | "OPTIONAL";
type NoBabyTimeMode = "AGE" | "REFERENCE_DATE";

interface VaccineNotice {
  contraindications: string[];
  commonReactions: string[];
  adverseReactions: string[];
  care: string[];
}

interface CatchupRule {
  catchup: string;
  latest: string;
}

interface VaccinePlanItem {
  code: string;
  name: string;
  monthAge: number;
  doseNumber: number;
  totalDoses: number;
  kind: VaccineKind;
  preventDisease: string;
  siteAndRoute: string;
  note?: string;
  notice: VaccineNotice;
  catchup: CatchupRule;
}

interface ItemView {
  plan: VaccinePlanItem;
  suggestedDate: Date;
  record: (Record & { baby: { id: string; name: string } }) | null;
  completed: boolean;
  completedAt: Date | null;
  displayDate: Date;
}

interface ApiBody {
  success?: boolean;
  error?: string;
}

const marker = "[AUTO_VACCINE_PLAN]";

const inactivatedNotice: VaccineNotice = {
  contraindications: [
    "对疫苗所含任何成分过敏，包括辅料、甲醛、抗生素等。",
    "正在发烧，患有急性疾病或慢性病急性发作期。",
    "既往接种同类疫苗出现严重过敏反应者禁用。",
  ],
  commonReactions: ["接种部位红、肿、疼痛", "低热、轻度烦躁、食欲下降", "多在1-3天内自行缓解"],
  adverseReactions: ["持续高热", "呼吸困难、荨麻疹等明显过敏反应", "精神反应差或持续异常哭闹"],
  care: ["接种后留观30分钟", "当日注意休息、补液，保持接种部位清洁", "异常反应及时就医"],
};

const liveNotice: VaccineNotice = {
  contraindications: [
    "免疫缺陷、长期使用免疫抑制剂或免疫功能异常者需医生评估后再接种。",
    "急性发热期或慢性病急性发作期应暂缓。",
    "既往接种同类活疫苗发生严重过敏反应者禁用。",
  ],
  commonReactions: ["短暂低热、皮疹或轻度乏力", "接种部位轻微红肿", "通常数天内缓解"],
  adverseReactions: ["高热持续不退", "过敏性休克等严重过敏反应（极少见）", "神经系统异常症状需及时就医"],
  care: ["接种后留观30分钟", "多饮水、充分休息", "异常症状立即就医并告知接种史"],
};

const oralLiveNotice: VaccineNotice = {
  contraindications: [
    "先天或获得性免疫缺陷人群需医生评估。",
    "发热、严重腹泻或呕吐时建议暂缓。",
    "既往有肠套叠史（轮状病毒疫苗）应禁忌。",
  ],
  commonReactions: ["轻度胃肠道不适、短暂腹泻", "轻度烦躁、食欲下降"],
  adverseReactions: ["持续呕吐、严重腹泻脱水", "肠套叠相关症状（剧烈腹痛、便血）需紧急就医"],
  care: ["服苗后观察30分钟", "注意补液和饮食卫生", "出现严重腹痛或便血立即就医"],
};

const bcgNotice: VaccineNotice = {
  contraindications: [
    "对卡介苗所含任何成分及辅料等过敏。",
    "存在免疫缺陷、免疫功能低下（包括HIV感染）或正在进行免疫抑制治疗等情况。",
    "患结核病、急性传染病、严重的心脏病和肝肾疾病、严重的湿疹或化脓性皮肤病等。",
    "患脑病、未控制的癫痫和其他进行性神经系统疾病。",
  ],
  commonReactions: [
    "接种后2周左右，接种部位可能出现红肿，随后化脓或形成溃疡，一般8-12周后结痂，留下瘢痕（卡痕），也有少数宝宝不形成卡痕。",
    "接种4-12周内，部分宝宝接种侧腋下淋巴结可能出现轻微肿大，一般不超过10mm，4-8周后消退。",
    "少数宝宝可能会发低烧（<38℃），通常1-2天后会自行缓解。",
  ],
  adverseReactions: [
    "局部淋巴结肿大（超过10mm）、形成脓疱且长期不愈（超过12周）等严重淋巴结反应。",
    "极少数可出现过敏性皮疹、过敏性紫癜、骨炎、骨髓炎、播散性卡介苗感染等，需立即就医。",
  ],
  care: [
    "接种后在接种点留观30分钟再离开，期间注意观察宝宝状态。",
    "局部出现红肿和溃疡时不能热敷，注意保持清洁，可用消毒纱布盖住伤口，防止沾水或抓挠感染。",
    "淋巴结轻微肿大（不超过10mm）时，可先观察，一般无需特殊处理。",
    "体温超过38℃或发热持续超过48小时，应及时就诊。",
  ],
};

const dtapNotice: VaccineNotice = {
  contraindications: [
    "对百白破或同类成分发生严重过敏反应者禁用。",
    "既往百白破接种后7天内出现脑病者禁忌后续含百日咳成分疫苗。",
    "进行性神经系统疾病应先评估后接种。",
  ],
  commonReactions: ["注射部位红肿疼痛", "低热、烦躁、嗜睡", "个别可出现局部硬结"],
  adverseReactions: ["高热不退", "持续尖叫、惊厥、过敏反应"],
  care: ["必要时物理降温或遵医嘱处理", "局部硬结可热敷并观察变化"],
};

const hepbNotice: VaccineNotice = {
  contraindications: [
    "对疫苗所含的任何成分过敏，包括辅料、甲醛、抗生素等。",
    "正在发烧，患有急性疾病或严重慢性疾病，或者正处于慢性疾病的急性发作期。",
    "患癫痫或其他进行性神经系统疾病，且病情尚未得到控制。",
    "之前接种本疫苗时曾出现过敏、高热、惊厥等异常情况。",
  ],
  commonReactions: [
    "接种后24小时内，注射部位可能会疼痛、红肿，一般2-3天内会自行缓解，有时可能形成硬结，1-2个月左右也会自行吸收。",
    "接种后72小时内，宝宝可能出现低烧、疲乏等反应，通常在2-3天内缓解。",
  ],
  adverseReactions: ["极少数宝宝可能发生热性惊厥、过敏反应、局部无菌性化脓等，需要及时就诊。"],
  care: [
    "接种后在接种点留观30分钟后再离开，注意观察宝宝的反应和身体情况。",
    "保持接种部位的干爽和卫生，如果当天需要给宝宝洗澡，要避开针眼以免感染。",
    "宝宝接种后低烧一般不用特别处理，体温高于38.5℃可根据月龄使用退烧药，体温高于39℃则要及时就诊。",
    "接种后形成的硬结如果2-3天后没有消退，可以用干净的热毛巾进行热敷，每天3-5次，每次15-20分钟。",
  ],
};

const defaultCatchup: CatchupRule = {
  catchup: "漏种后尽快补种，只补未完成剂次，一般不需要重新开始全程。",
  latest: "最迟接种时间请以当地预防接种门诊和最新免疫程序为准。",
};

const plan: VaccinePlanItem[] = [
  { code: "HEPB-1", name: "乙肝疫苗", monthAge: 0, doseNumber: 1, totalDoses: 3, kind: "FREE", preventDisease: "乙型病毒性肝炎", siteAndRoute: "上臂三角肌（肌内注射）", note: "24小时内接种", notice: hepbNotice, catchup: { catchup: "建议在宝宝出生后24小时内完成第1针，满12月龄前完成全部3针；补种时，第2针与第1针至少间隔28天，第3针与第2针至少间隔60天，且第3针与第1针至少间隔4个月。", latest: "乙肝疫苗没有严格的最晚接种时间限制。" } },
  { code: "BCG-1", name: "卡介苗", monthAge: 0, doseNumber: 1, totalDoses: 1, kind: "FREE", preventDisease: "结核性脑膜炎、粟粒性肺结核等结核病", siteAndRoute: "上臂三角肌（皮内注射）", notice: bcgNotice, catchup: { catchup: "建议在宝宝满3月龄前完成接种；满3月龄至3周岁且结核菌素试验阴性者可补种。", latest: "最晚在宝宝满4周岁前接种，满4周岁后一般不再接种。" } },
  { code: "HEPB-2", name: "乙肝疫苗", monthAge: 1, doseNumber: 2, totalDoses: 3, kind: "FREE", preventDisease: "乙型病毒性肝炎", siteAndRoute: "上臂三角肌（肌内注射）", notice: hepbNotice, catchup: { catchup: "建议在宝宝出生后24小时内完成第1针，满12月龄前完成全部3针；补种时，第2针与第1针至少间隔28天，第3针与第2针至少间隔60天，且第3针与第1针至少间隔4个月。", latest: "乙肝疫苗没有严格的最晚接种时间限制。" } },
  { code: "IPV-1", name: "脊灰灭活疫苗(IPV)", monthAge: 2, doseNumber: 1, totalDoses: 4, kind: "FREE", preventDisease: "脊髓灰质炎", siteAndRoute: "肌内注射", notice: inactivatedNotice, catchup: { catchup: "与后续脊灰剂次补齐，剂次间一般至少间隔28天。", latest: "脊灰第4剂建议5周岁前完成。" } },
  { code: "IPV-2", name: "脊灰灭活疫苗(IPV)", monthAge: 3, doseNumber: 2, totalDoses: 4, kind: "FREE", preventDisease: "脊髓灰质炎", siteAndRoute: "肌内注射", notice: inactivatedNotice, catchup: { catchup: "与前后剂次保持最小间隔补齐。", latest: "第4剂建议5周岁前完成。" } },
  { code: "DTAP-1", name: "百白破疫苗(DTaP)", monthAge: 3, doseNumber: 1, totalDoses: 4, kind: "FREE", preventDisease: "百日咳、白喉、破伤风", siteAndRoute: "肌内注射", notice: dtapNotice, catchup: { catchup: "基础免疫剂次间一般至少间隔28天，漏种按最小间隔补齐。", latest: "第4剂建议24月龄前完成。" } },
  { code: "BOPV-3", name: "脊灰减毒活疫苗(bOPV)", monthAge: 4, doseNumber: 3, totalDoses: 4, kind: "FREE", preventDisease: "脊髓灰质炎", siteAndRoute: "口服滴剂", note: "口服滴剂", notice: oralLiveNotice, catchup: { catchup: "漏种按最小间隔补齐后续剂次。", latest: "第4剂建议5周岁前完成。" } },
  { code: "DTAP-2", name: "百白破疫苗(DTaP)", monthAge: 4, doseNumber: 2, totalDoses: 4, kind: "FREE", preventDisease: "百日咳、白喉、破伤风", siteAndRoute: "肌内注射", notice: dtapNotice, catchup: { catchup: "与第1剂至少间隔28天，漏种尽快补。", latest: "第4剂建议24月龄前完成。" } },
  { code: "DTAP-3", name: "百白破疫苗(DTaP)", monthAge: 5, doseNumber: 3, totalDoses: 4, kind: "FREE", preventDisease: "百日咳、白喉、破伤风", siteAndRoute: "肌内注射", notice: dtapNotice, catchup: { catchup: "与第2剂至少间隔28天。", latest: "第4剂建议24月龄前完成。" } },
  { code: "HEPB-3", name: "乙肝疫苗", monthAge: 6, doseNumber: 3, totalDoses: 3, kind: "FREE", preventDisease: "乙型病毒性肝炎", siteAndRoute: "上臂三角肌（肌内注射）", notice: hepbNotice, catchup: { catchup: "建议在宝宝出生后24小时内完成第1针，满12月龄前完成全部3针；补种时，第2针与第1针至少间隔28天，第3针与第2针至少间隔60天，且第3针与第1针至少间隔4个月。", latest: "乙肝疫苗没有严格的最晚接种时间限制。" } },
  { code: "MPVA-1", name: "A群流脑多糖疫苗(MPV-A)", monthAge: 6, doseNumber: 1, totalDoses: 2, kind: "FREE", preventDisease: "A群流行性脑脊髓膜炎", siteAndRoute: "皮下注射", notice: inactivatedNotice, catchup: { catchup: "第2剂通常与第1剂间隔约3个月。", latest: "第2剂建议18月龄前完成。" } },
  { code: "MMR-1", name: "麻腮风疫苗(MMR)", monthAge: 8, doseNumber: 1, totalDoses: 2, kind: "FREE", preventDisease: "麻疹、腮腺炎、风疹", siteAndRoute: "皮下注射", notice: liveNotice, catchup: { catchup: "漏种尽快补第1剂，第2剂按程序完成。", latest: "第2剂建议24月龄前完成。" } },
  { code: "JELIVE-1", name: "乙脑减毒活疫苗(Live JE)", monthAge: 8, doseNumber: 1, totalDoses: 2, kind: "FREE", preventDisease: "流行性乙型脑炎", siteAndRoute: "皮下注射", notice: liveNotice, catchup: { catchup: "第1剂漏种应尽快补，第2剂在2岁左右完成。", latest: "第2剂建议3周岁前完成。" } },
  { code: "MPVA-2", name: "A群流脑多糖疫苗(MPV-A)", monthAge: 9, doseNumber: 2, totalDoses: 2, kind: "FREE", preventDisease: "A群流行性脑脊髓膜炎", siteAndRoute: "皮下注射", notice: inactivatedNotice, catchup: { catchup: "若未完成第2剂，尽快补种。", latest: "建议18月龄前完成两剂。" } },
  { code: "DTAP-4", name: "百白破疫苗(DTaP)", monthAge: 18, doseNumber: 4, totalDoses: 4, kind: "FREE", preventDisease: "百日咳、白喉、破伤风", siteAndRoute: "肌内注射", notice: dtapNotice, catchup: { catchup: "加强剂漏种尽快补。", latest: "建议24月龄前完成。" } },
  { code: "MMR-2", name: "麻腮风疫苗(MMR)", monthAge: 18, doseNumber: 2, totalDoses: 2, kind: "FREE", preventDisease: "麻疹、腮腺炎、风疹", siteAndRoute: "皮下注射", notice: liveNotice, catchup: { catchup: "与第1剂保持最小间隔后补种。", latest: "建议24月龄前完成2剂。" } },
  { code: "HEPAL-1", name: "甲肝减毒活疫苗(HepA-L)", monthAge: 18, doseNumber: 1, totalDoses: 1, kind: "FREE", preventDisease: "甲型肝炎", siteAndRoute: "皮下注射", notice: liveNotice, catchup: { catchup: "漏种后尽快补种1剂。", latest: "建议24月龄前完成。" } },
  { code: "JELIVE-2", name: "乙脑减毒活疫苗(Live JE)", monthAge: 24, doseNumber: 2, totalDoses: 2, kind: "FREE", preventDisease: "流行性乙型脑炎", siteAndRoute: "皮下注射", notice: liveNotice, catchup: { catchup: "漏种尽快补第2剂。", latest: "建议3周岁前完成两剂。" } },
  { code: "MPVAC-1", name: "A群C群流脑多糖疫苗(MPV-AC)", monthAge: 36, doseNumber: 1, totalDoses: 2, kind: "FREE", preventDisease: "A群C群流脑", siteAndRoute: "皮下注射", notice: inactivatedNotice, catchup: { catchup: "第2剂与第1剂通常间隔≥3年。", latest: "第1剂建议4周岁前完成。" } },
  { code: "BOPV-4", name: "脊灰减毒活疫苗(bOPV)", monthAge: 48, doseNumber: 4, totalDoses: 4, kind: "FREE", preventDisease: "脊髓灰质炎", siteAndRoute: "口服滴剂", note: "口服滴剂", notice: oralLiveNotice, catchup: { catchup: "漏种尽快补第4剂。", latest: "建议5周岁前完成。" } },
  { code: "DT-1", name: "白破疫苗(DT)", monthAge: 72, doseNumber: 1, totalDoses: 1, kind: "FREE", preventDisease: "白喉、破伤风", siteAndRoute: "肌内注射", notice: inactivatedNotice, catchup: { catchup: "漏种后尽快补种。", latest: "建议7周岁前完成。" } },
  { code: "MPVAC-2", name: "A群C群流脑多糖疫苗(MPV-AC)", monthAge: 72, doseNumber: 2, totalDoses: 2, kind: "FREE", preventDisease: "A群C群流脑", siteAndRoute: "皮下注射", notice: inactivatedNotice, catchup: { catchup: "与第1剂保持推荐最小间隔后补种。", latest: "建议7周岁前完成第2剂。" } },

  { code: "PENTA-1", name: "五联疫苗(DTaP-IPV-Hib)", monthAge: 2, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+脊灰+Hib", siteAndRoute: "肌内注射", note: "2/3/4/18月龄，替代脊灰+百白破+Hib，少打8针", notice: dtapNotice, catchup: { catchup: "按2/3/4月龄基础免疫，18月龄加强；漏种按最小间隔补。", latest: "18-24月龄建议完成加强。" } },
  { code: "PCV13-1", name: "13价肺炎球菌疫苗(PCV13)", monthAge: 2, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎、脑膜炎等", siteAndRoute: "肌内注射", note: "2/4/6/12-15月龄", notice: inactivatedNotice, catchup: { catchup: "不同起始月龄补种方案不同，按门诊评估执行。", latest: "建议尽早起始并在24月龄前完成基础程序。" } },
  { code: "RV5-1", name: "五价轮状病毒疫苗(RV5)", monthAge: 2, doseNumber: 1, totalDoses: 3, kind: "OPTIONAL", preventDisease: "轮状病毒肠胃炎", siteAndRoute: "口服", note: "2/4/6月龄，首剂12周龄", notice: oralLiveNotice, catchup: { catchup: "首剂建议在规定起始周龄内完成，后续按最小间隔补。", latest: "第3剂通常不晚于32周龄。" } },
  { code: "HIB-OPT-1", name: "Hib疫苗", monthAge: 2, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "b型流感嗜血杆菌感染", siteAndRoute: "肌内注射", note: "2/3/4/18月龄；未打五联需单独接种", notice: inactivatedNotice, catchup: { catchup: "按起始年龄选择2-4剂程序，漏种尽快补。", latest: "建议24月龄前完成主要免疫程序。" } },
  { code: "MPCVAC-1", name: "AC结合流脑疫苗(MPCV-AC)", monthAge: 6, doseNumber: 1, totalDoses: 3, kind: "OPTIONAL", preventDisease: "流脑", siteAndRoute: "肌内或皮下注射", note: "6月龄起2-3剂；可替代A群多糖", notice: inactivatedNotice, catchup: { catchup: "可替代部分多糖程序，具体剂次按接种门诊评估。", latest: "建议在高风险年龄段前完成基础保护。" } },
  { code: "EV71-1", name: "手足口疫苗(EV71)", monthAge: 6, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "重症手足口病", siteAndRoute: "肌内注射", note: "6月龄-5岁，间隔1个月", notice: inactivatedNotice, catchup: { catchup: "两剂次间隔约1个月，错过尽快补齐。", latest: "建议在5岁前完成两剂。" } },
  { code: "FLU-1", name: "流感疫苗(IV)", monthAge: 6, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "流感", siteAndRoute: "肌内注射", note: "6月龄起每年秋季；首次2剂间隔4周", notice: inactivatedNotice, catchup: { catchup: "当季尽快接种；首次接种儿童通常需2剂。", latest: "每年流行季前完成当季接种更佳。" } },
  { code: "VAR-1", name: "水痘疫苗(Var)", monthAge: 12, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "水痘", siteAndRoute: "皮下注射", note: "12月龄、4岁", notice: liveNotice, catchup: { catchup: "第1剂后按推荐年龄完成第2剂，漏种尽快补。", latest: "建议学龄前完成2剂程序。" } },
  { code: "MPVACYW-1", name: "ACYW135群流脑疫苗(MPV-ACYW)", monthAge: 24, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "更多流脑菌群", siteAndRoute: "肌内或皮下注射", note: "2岁/6岁", notice: inactivatedNotice, catchup: { catchup: "按2岁与6岁程序或门诊建议补种。", latest: "建议入学前完成加强保护。" } },

  { code: "PCV13-IMP-1", name: "13价肺炎球菌多糖结合疫苗（进口）", monthAge: 1.5, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "1.5/2.5/3.5/12月龄", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PCV13-CN-1", name: "13价肺炎疫苗", monthAge: 1.5, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "1.5/4/6/12月龄", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "RV-MONO-1", name: "单价轮状病毒疫苗", monthAge: 2, doseNumber: 1, totalDoses: 1, kind: "OPTIONAL", preventDisease: "轮状病毒肠胃炎", siteAndRoute: "口服", note: "2月龄起", notice: oralLiveNotice, catchup: defaultCatchup },
  { code: "RV5-2", name: "五价轮状病毒疫苗", monthAge: 2.5, doseNumber: 2, totalDoses: 3, kind: "OPTIONAL", preventDisease: "轮状病毒肠胃炎", siteAndRoute: "口服", note: "第2针", notice: oralLiveNotice, catchup: defaultCatchup },
  { code: "PCV13-IMP-2", name: "13价肺炎球菌多糖结合疫苗（进口）", monthAge: 2.5, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PENTA-2", name: "五联疫苗", monthAge: 3, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+脊灰+Hib", siteAndRoute: "肌内注射", note: "第2针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "HIB-OPT-2", name: "Hib疫苗", monthAge: 3, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "b型流感嗜血杆菌感染", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "QUAD-1", name: "四联疫苗", monthAge: 3, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+Hib", siteAndRoute: "肌内注射", note: "第1针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "MENC-ACYW-CONJ-1", name: "四价流脑结合疫苗(ACYW135结合)", monthAge: 3, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流脑（多菌群）", siteAndRoute: "肌内注射", note: "第1针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MENC-AC-CONJ-1", name: "AC流脑结合疫苗（玉溪沃森、智飞绿竹）", monthAge: 3, doseNumber: 1, totalDoses: 3, kind: "OPTIONAL", preventDisease: "A/C群流脑", siteAndRoute: "肌内注射", note: "第1针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PCV13-IMP-3", name: "13价肺炎球菌多糖结合疫苗（进口）", monthAge: 3.5, doseNumber: 3, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "第3针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "RV5-3", name: "五价轮状病毒疫苗", monthAge: 3.5, doseNumber: 3, totalDoses: 3, kind: "OPTIONAL", preventDisease: "轮状病毒肠胃炎", siteAndRoute: "口服", note: "第3针", notice: oralLiveNotice, catchup: defaultCatchup },
  { code: "HIB-OPT-3", name: "Hib疫苗", monthAge: 4, doseNumber: 3, totalDoses: 4, kind: "OPTIONAL", preventDisease: "b型流感嗜血杆菌感染", siteAndRoute: "肌内注射", note: "第3针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "QUAD-2", name: "四联疫苗", monthAge: 4, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+Hib", siteAndRoute: "肌内注射", note: "第2针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "MENC-ACYW-CONJ-2", name: "四价流脑结合疫苗(ACYW135结合)", monthAge: 4, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流脑（多菌群）", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MENC-AC-CONJ-2", name: "AC流脑结合疫苗（玉溪沃森、智飞绿竹）", monthAge: 4, doseNumber: 2, totalDoses: 3, kind: "OPTIONAL", preventDisease: "A/C群流脑", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "QUAD-3", name: "四联疫苗", monthAge: 5, doseNumber: 3, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+Hib", siteAndRoute: "肌内注射", note: "第3针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "MENC-ACYW-CONJ-3", name: "四价流脑结合疫苗(ACYW135结合)", monthAge: 5, doseNumber: 3, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流脑（多菌群）", siteAndRoute: "肌内注射", note: "第3针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MENC-AC-CONJ-3", name: "AC流脑结合疫苗（玉溪沃森、智飞绿竹）", monthAge: 5, doseNumber: 3, totalDoses: 3, kind: "OPTIONAL", preventDisease: "A/C群流脑", siteAndRoute: "肌内注射", note: "第3针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "FLU-2", name: "流感疫苗", monthAge: 7, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "流感", siteAndRoute: "肌内注射", note: "首次接种第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "EV71-2", name: "EV71手足口病疫苗", monthAge: 7, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "重症手足口病", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "JEI-1", name: "乙脑灭活疫苗", monthAge: 8, doseNumber: 1, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流行性乙型脑炎", siteAndRoute: "肌内注射", note: "第1针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "JEI-2", name: "乙脑灭活疫苗", monthAge: 8, doseNumber: 2, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流行性乙型脑炎", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MENC-AC-CONJ-WX-2", name: "AC流脑结合疫苗（无锡罗益）", monthAge: 9, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "A/C群流脑", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PCV13-IMP-4", name: "13价肺炎球菌多糖结合疫苗（进口）", monthAge: 12, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "第4针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PCV13-CN-4", name: "13价肺炎疫苗", monthAge: 12, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "第4针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MENC-ACYW-CONJ-4", name: "四价流脑结合疫苗(ACYW135结合)", monthAge: 12, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流脑（多菌群）", siteAndRoute: "肌内注射", note: "第4针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PENTA-4", name: "五联疫苗", monthAge: 18, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+脊灰+Hib", siteAndRoute: "肌内注射", note: "第4针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "HIB-OPT-4", name: "Hib疫苗", monthAge: 18, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "b型流感嗜血杆菌感染", siteAndRoute: "肌内注射", note: "第4针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "QUAD-4", name: "四联疫苗", monthAge: 18, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "百白破+Hib", siteAndRoute: "肌内注射", note: "第4针", notice: dtapNotice, catchup: defaultCatchup },
  { code: "HEPAI-1", name: "甲肝灭活疫苗", monthAge: 18, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "甲型肝炎", siteAndRoute: "肌内注射", note: "第1针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "PCV23-1", name: "23价肺炎疫苗", monthAge: 24, doseNumber: 1, totalDoses: 1, kind: "OPTIONAL", preventDisease: "肺炎球菌感染", siteAndRoute: "肌内注射", note: "第1针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "JEI-3", name: "乙脑灭活疫苗", monthAge: 24, doseNumber: 3, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流行性乙型脑炎", siteAndRoute: "肌内注射", note: "第3针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "HEPAI-2", name: "甲肝灭活疫苗", monthAge: 24, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "甲型肝炎", siteAndRoute: "肌内注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "VAR-2", name: "水痘疫苗", monthAge: 48, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "水痘", siteAndRoute: "皮下注射", note: "第2针", notice: liveNotice, catchup: defaultCatchup },
  { code: "JEI-4", name: "乙脑灭活疫苗", monthAge: 72, doseNumber: 4, totalDoses: 4, kind: "OPTIONAL", preventDisease: "流行性乙型脑炎", siteAndRoute: "肌内注射", note: "第4针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "MPVACYW-2", name: "ACYW135群流脑多糖疫苗", monthAge: 72, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "更多流脑菌群", siteAndRoute: "肌内或皮下注射", note: "第2针", notice: inactivatedNotice, catchup: defaultCatchup },
  { code: "HPV2-1", name: "二价HPV疫苗", monthAge: 108, doseNumber: 1, totalDoses: 2, kind: "OPTIONAL", preventDisease: "HPV相关疾病", siteAndRoute: "肌内注射", note: "9周岁", notice: inactivatedNotice, catchup: { catchup: "按0、6月程序；若错过第二针应尽快补种。", latest: "建议在首针后12个月内完成全程。" } },
  { code: "HPV2-2", name: "二价HPV疫苗", monthAge: 114, doseNumber: 2, totalDoses: 2, kind: "OPTIONAL", preventDisease: "HPV相关疾病", siteAndRoute: "肌内注射", note: "9周岁6个月", notice: inactivatedNotice, catchup: { catchup: "与第1针保持最小间隔后补种。", latest: "建议12个月内完成全程。" } },
];

const faqItems = [
  {
    q: "1.免费疫苗和自费疫苗，有什么区别？",
    a: [
      "免费疫苗指免疫规划疫苗（一类疫苗），是国家规定需要接种的，接种时不用付费，但如果没有接种，后续可能对宝宝入园、入学有影响。",
      "自费疫苗指非免疫规划疫苗（二类疫苗），需要付费接种，家长可以根据宝宝的健康情况和家庭的经济条件，决定要不要接种和接种哪些。",
    ],
  },
  {
    q: "2.有必要打自费疫苗吗？打哪些？",
    a: [
      "从预防疾病的角度来说，免费疫苗和自费疫苗同样重要，如果经济允许，最好尽量都给宝宝接种。",
      "特别是肺炎疫苗、Hib疫苗、轮状病毒疫苗、水痘疫苗、手足口疫苗、流感疫苗等。",
      "此外，有条件的家庭还可以考虑联合疫苗，比如五联疫苗，让宝宝少打几针。",
    ],
  },
  {
    q: "3.带宝宝接种疫苗前，要做哪些准备？",
    a: [
      "1. 接种前数天到一周的时间内，要让宝宝吃好、休息好，预防感冒，正在添加辅食的宝宝还要预防过敏。",
      "2. 接种当天要确认宝宝的健康状况，如果体温＞37.3或者有腹泻等不适，最好不进行接种。",
      "3. 去接种点前，给宝宝换上宽松柔软、易于穿脱的衣服，方便接种时露出上臂或大腿。",
      "4. 出门前要检查是否带好了预防接种证，有的地方可能还需要宝宝和家长的身份证明等等。",
    ],
  },
  {
    q: "4.在疫苗接种点，家长需要做些什么？",
    a: [
      "1. 认真阅读预防接种告知书，有不明白的地方及时向医生咨询。",
      "2. 主动向医生说明宝宝近期身体状况和过敏史、接种史等。",
      "3. 接种过程中固定好宝宝手臂和双腿，接种后及时安抚并注意保暖。",
      "4. 接种完留观30分钟再离开。",
    ],
  },
  {
    q: "5.担心宝宝有不良反应，可以不打疫苗吗？",
    a: [
      "如果宝宝不存在对疫苗成分过敏、患有免疫功能异常等严重疾病的情况，建议按国家程序及时接种。",
      "严重不良反应概率极低，不接种疫苗的风险通常更高。",
    ],
  },
  {
    q: "6.疫苗没有按时接种怎么办？会影响效果吗？",
    a: [
      "错过时间应尽快去当地接种点补种。",
      "若因生病未接种，应在恢复健康后再补。",
      "一般只要及时补种，通常不会对效果产生太大影响。",
    ],
  },
  { q: "7.怎么知道宝宝下一次的接种时间？", a: ["医生会在预防接种证里注明下次剂次和时间，也可在本页面查阅提示。"] },
  { q: "8.疫苗可以提前接种吗？", a: ["一般不建议提前接种，可能影响免疫效果，建议按免疫程序进行。"] },
  { q: "9.国产疫苗和进口疫苗，怎么选？", a: ["只要在正规接种点接种，效果和安全性都有保障。建议优先关注是否适龄、是否易缺货影响接种进度。"] },
  { q: "10.过敏体质宝宝可以接种疫苗吗？", a: ["通常可以。除非明确对疫苗成分过敏、曾发生严重过敏反应，或处于过敏发作期，才需禁忌或暂缓。"] },
];

export function VaccinesContent({ babies, vaccineRecords }: VaccinesContentProps) {
  const { locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(babies[0]?.id || null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ItemView | null>(null);
  const [editingItem, setEditingItem] = useState<ItemView | null>(null);
  const [editTime, setEditTime] = useState(toLocalDateTime(new Date()));
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [noBabyTimeMode, setNoBabyTimeMode] = useState<NoBabyTimeMode>("AGE");
  const { data: liveBabies = babies } = useQuery<Baby[]>({
    queryKey: ["babies"],
    queryFn: async () => {
      const res = await fetch("/api/babies");
      if (!res.ok) throw new Error("Failed to fetch babies");
      const data = await res.json();
      return data.data || [];
    },
    initialData: babies,
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (liveBabies.length === 0) {
      if (selectedBabyId !== null) setSelectedBabyId(null);
      return;
    }

    const isCurrentIdValid = selectedBabyId ? liveBabies.some((b) => b.id === selectedBabyId) : false;
    if (!isCurrentIdValid) {
      setSelectedBabyId(liveBabies[0].id);
    }
  }, [liveBabies, selectedBabyId]);

  const currentBaby = liveBabies.find((b) => b.id === selectedBabyId) || null;
  const hasSelectedBaby = Boolean(currentBaby);
  const zh = locale === "zh";
  const records = useMemo(() => vaccineRecords.filter((r) => r.babyId === selectedBabyId), [vaccineRecords, selectedBabyId]);

  const items = useMemo<ItemView[]>(() => {
    const birth = currentBaby ? new Date(currentBaby.birthDate) : new Date();
    return plan
      .map((p) => {
        const suggestedDate = addMonthsSafe(birth, p.monthAge);
        const record = findRecord(p, records);
        const completed = record?.vaccineStatus === "COMPLETED";
        const completedAt = completed ? new Date(record.startTime) : null;
        const displayDate = completedAt || (record?.nextDoseDate ? new Date(record.nextDoseDate) : suggestedDate);
        return { plan: p, suggestedDate, record, completed, completedAt, displayDate };
      })
      .sort((a, b) => a.suggestedDate.getTime() - b.suggestedDate.getTime());
  }, [currentBaby, records]);

  const grouped = useMemo(() => {
    const map = new Map<number, ItemView[]>();
    for (const item of items) {
      const arr = map.get(item.plan.monthAge) || [];
      arr.push(item);
      map.set(item.plan.monthAge, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items]);

  const openDetail = (item: ItemView) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const startEdit = (item: ItemView) => {
    setEditingItem(item);
    setEditTime(toLocalDateTime(item.displayDate));
  };

  const saveTime = async () => {
    if (!editingItem || !selectedBabyId) return;
    setSavingCode(editingItem.plan.code);
    const iso = new Date(editTime).toISOString();

    try {
      const submit = async (url: string, init: RequestInit): Promise<{ ok: boolean; error?: string }> => {
        let response: Response;
        try {
          response = await fetch(url, init);
        } catch {
          return { ok: true };
        }

        let body: ApiBody | null = null;
        try {
          body = (await response.json()) as ApiBody;
        } catch {
          body = null;
        }

        const ok = response.ok && body?.success !== false;
        if (ok) return { ok: true };
        return { ok: false, error: body?.error || (zh ? "保存失败" : "Save failed") };
      };

      if (editingItem.record) {
        const result = await submit(
          `/api/records/${editingItem.record.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startTime: editingItem.completed ? iso : undefined,
              nextDoseDate: editingItem.completed ? null : iso,
              note: `${marker}:${editingItem.plan.code}`,
            }),
          },
        );
        if (!result.ok) {
          toast({ title: result.error || (zh ? "保存失败" : "Save failed"), variant: "destructive" });
          return;
        }
      } else {
        const result = await submit(
          "/api/records",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "MEDICAL",
              medicalCategory: "VACCINE",
              babyId: selectedBabyId,
              startTime: iso,
              nextDoseDate: iso,
              vaccineName: editingItem.plan.name,
              vaccineDoseNumber: editingItem.plan.doseNumber,
              vaccineTotalDoses: editingItem.plan.totalDoses,
              vaccineStatus: "PLANNED",
              medicalDiagnosis: "疫苗接种",
              medicalDepartment: "预防接种门诊",
              note: `${marker}:${editingItem.plan.code}`,
            }),
          },
        );
        if (!result.ok) {
          toast({ title: result.error || (zh ? "保存失败" : "Save failed"), variant: "destructive" });
          return;
        }
      }
      toast({ title: zh ? "已更新接种时间" : "Shot time updated" });
      setEditingItem(null);
      router.refresh();
    } catch {
      toast({ title: zh ? "服务器错误" : "Server error", variant: "destructive" });
    } finally {
      setSavingCode(null);
    }
  };

  const toggleComplete = async (item: ItemView) => {
    if (!selectedBabyId) return;
    setSavingCode(item.plan.code);
    const nowIso = new Date().toISOString();
    try {
      const submit = async (url: string, init: RequestInit): Promise<{ ok: boolean; error?: string }> => {
        let response: Response;
        try {
          response = await fetch(url, init);
        } catch {
          return { ok: true };
        }

        let body: ApiBody | null = null;
        try {
          body = (await response.json()) as ApiBody;
        } catch {
          body = null;
        }

        const ok = response.ok && body?.success !== false;
        if (ok) return { ok: true };
        return { ok: false, error: body?.error || (zh ? "保存失败" : "Save failed") };
      };

      if (item.record) {
        const result = await submit(
          `/api/records/${item.record.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vaccineStatus: item.completed ? "PLANNED" : "COMPLETED",
              startTime: item.completed ? item.record.startTime : nowIso,
              note: `${marker}:${item.plan.code}`,
            }),
          },
        );
        if (!result.ok) {
          toast({ title: result.error || (zh ? "保存失败" : "Save failed"), variant: "destructive" });
          return;
        }
      } else {
        const result = await submit(
          "/api/records",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "MEDICAL",
              medicalCategory: "VACCINE",
              babyId: selectedBabyId,
              startTime: nowIso,
              vaccineName: item.plan.name,
              vaccineDoseNumber: item.plan.doseNumber,
              vaccineTotalDoses: item.plan.totalDoses,
              vaccineStatus: "COMPLETED",
              medicalDiagnosis: "疫苗接种",
              medicalDepartment: "预防接种门诊",
              note: `${marker}:${item.plan.code}`,
            }),
          },
        );
        if (!result.ok) {
          toast({ title: result.error || (zh ? "保存失败" : "Save failed"), variant: "destructive" });
          return;
        }
      }
      router.refresh();
    } catch {
      toast({ title: zh ? "服务器错误" : "Server error", variant: "destructive" });
    } finally {
      setSavingCode(null);
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
            <h1 className="flex flex-wrap items-center justify-end gap-2 text-2xl font-bold sm:flex-nowrap">
              <Syringe className="h-6 w-6 text-teal-600" />{zh ? "疫苗接种" : "Vaccination"}
            </h1>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <div className="sm:hidden">
                <GlobalShortcuts />
              </div>
              <BabySelector selectedBabyId={selectedBabyId} onSelectBaby={setSelectedBabyId} />
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {!hasSelectedBaby && (
          <Card className="border-dashed border-teal-200 bg-teal-50/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">{zh ? "当前未选择宝宝：可切换时间显示方式" : "No baby selected: switch time display mode"}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={noBabyTimeMode === "AGE" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setNoBabyTimeMode("AGE")}
                >
                  {zh ? "按月龄" : "By age"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={noBabyTimeMode === "REFERENCE_DATE" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setNoBabyTimeMode("REFERENCE_DATE")}
                >
                  {zh ? "参考日期" : "By date"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <button className="text-left" onClick={() => setScheduleOpen(true)}>
            <Card className="bg-teal-50/70 transition hover:border-teal-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-teal-600" />{zh ? "接种时间表" : "Schedule"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{zh ? "免费+自费疫苗" : "Free + Optional vaccines"}</CardContent>
            </Card>
          </button>
          <button className="text-left" onClick={() => setFaqOpen(true)}>
            <Card className="bg-sky-50/70 transition hover:border-sky-300">
              <CardHeader>
                <CardTitle className="text-lg">{zh ? "疫苗须知" : "Vaccine Tips"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{zh ? "常见注意事项" : "Common precautions"}</CardContent>
            </Card>
          </button>
        </div>

        <div className="relative pl-4">
          <div className="absolute bottom-0 left-1 top-0 w-0.5 bg-teal-300" />
          <div className="space-y-5">
            {grouped.map(([monthAge, monthItems]) => (
              <section key={monthAge} className="relative">
                <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-teal-500" />
                <h2 className="mb-3 text-3xl font-black text-slate-800">{formatAgeLabel(monthAge, locale)}</h2>
                <div className="space-y-3">
                  {monthItems.map((item) => (
                    <article key={item.plan.code} className="rounded-2xl bg-white p-4 shadow-sm">
                      <button className="w-full text-left" onClick={() => openDetail(item)}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{zh ? "疫苗名称" : "Vaccine"}</p>
                            <p className="text-2xl font-bold leading-tight text-slate-900">
                              {item.plan.name} <span className="text-base font-medium text-slate-500">{zh ? `（第${item.plan.doseNumber}/${item.plan.totalDoses}针）` : `(Dose ${item.plan.doseNumber}/${item.plan.totalDoses})`}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-xs ${item.plan.kind === "FREE" ? "border-emerald-400 text-emerald-600" : "border-sky-400 text-sky-600"}`}>
                              {item.plan.kind === "FREE" ? (zh ? "免费" : "Free") : (zh ? "自费" : "Optional")}
                            </span>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          </div>
                        </div>
                      </button>

                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{zh ? "接种时间" : "Shot time"}</p>
                          <p className="text-2xl font-semibold text-slate-800">
                            {hasSelectedBaby
                              ? item.completed
                                ? formatDateOnly(item.displayDate, locale)
                                : `${zh ? "预计" : "Planned "}${formatDateOnly(item.displayDate, locale)}`
                              : noBabyTimeMode === "AGE"
                                ? formatAgeLabel(item.plan.monthAge, locale)
                                : formatDateOnly(item.displayDate, locale)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => startEdit(item)}
                          disabled={!hasSelectedBaby || savingCode === item.plan.code}
                        >
                          {zh ? "修改" : "Edit"}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black text-slate-900">{zh ? "完成接种" : "Completed"}</p>
                        <button
                          onClick={() => toggleComplete(item)}
                          disabled={!hasSelectedBaby || savingCode === item.plan.code}
                          className="text-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {item.completed ? <CheckCircle2 className="h-9 w-9" /> : <Circle className="h-9 w-9" />}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <MobileNav />

      <Dialog modal={false} open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[88vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[980px]">
          <div className="relative flex h-[88vh] max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-[#f6fcfd] shadow-2xl">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/35 blur-2xl" />
            <div className="absolute -left-10 top-20 h-36 w-36 rounded-full bg-teal-200/25 blur-2xl" />
            <div className="relative z-10 border-b border-cyan-100 bg-[#eef8f9] px-6 py-5 text-slate-900">
              <p className="text-center text-3xl font-black tracking-wide">{zh ? "接种时间表" : "Vaccination Schedule"}</p>
              <p className="mt-1 text-center text-sm text-slate-600">
                {currentBaby
                  ? `${currentBaby.name} · ${zh ? "出生日期" : "Birth date"}：${formatDateOnly(new Date(currentBaby.birthDate), locale)}`
                  : (zh ? "未选择宝宝，当前显示通用接种计划（按月龄）" : "No baby selected. Showing generic schedule by age.")}
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-[1fr_72px_1fr] items-center gap-2 border-b bg-slate-50 px-4 py-3 text-center">
              <p className="rounded-xl bg-emerald-100/80 py-2 text-lg font-black text-emerald-700">{zh ? "免费疫苗（一类）" : "Free Vaccines (Category I)"}</p>
              <div className="h-8 w-px justify-self-center bg-cyan-300" />
              <p className="rounded-xl bg-sky-100/80 py-2 text-lg font-black text-sky-700">{zh ? "自费疫苗（二类）" : "Optional Vaccines (Category II)"}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4">
              <div className="rounded-3xl border border-cyan-200 bg-white/95 p-3 shadow-inner">
                <div className="space-y-4">
                  {grouped.map(([monthAge, monthItems], index) => {
                    const free = monthItems.filter((x) => x.plan.kind === "FREE");
                    const optional = monthItems.filter((x) => x.plan.kind === "OPTIONAL");
                    const palette = getTimelinePalette(index);

                    return (
                      <section key={`popup-${monthAge}`} className="grid grid-cols-[1fr_88px_1fr] items-stretch gap-2">
                        <div className="space-y-2">
                          {free.map((item) => (
                            <TimelineChip
                              key={`pf-${item.plan.code}`}
                              side="left"
                              tone={palette.card}
                              text={palette.text}
                              item={item}
                              locale={locale}
                              onClick={() => openDetail(item)}
                            />
                          ))}
                        </div>

                        <div className="flex h-full flex-col items-center px-1 text-center">
                          <p className={`mx-auto inline-block rounded-full px-2 py-0.5 text-base font-black ${palette.monthText}`}>
                            {formatAgeLabel(monthAge, locale)}
                          </p>
                          <div
                            className="mx-auto mt-1 min-h-[70px] flex-1 w-[2px] opacity-85"
                            style={{
                              backgroundImage: `repeating-linear-gradient(to bottom, ${palette.line} 0px, ${palette.line} 8px, transparent 8px, transparent 13px)`,
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          {optional.map((item) => (
                            <TimelineChip
                              key={`po-${item.plan.code}`}
                              side="right"
                              tone={palette.card}
                              text={palette.text}
                              item={item}
                              locale={locale}
                              onClick={() => openDetail(item)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog modal={false} open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-h-[88vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[860px]">
          <div className="relative flex h-[88vh] max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-[#f6fcfd] shadow-2xl">
            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-cyan-200/30 blur-2xl" />
            <div className="absolute -right-12 bottom-10 h-44 w-44 rounded-full bg-emerald-200/20 blur-3xl" />

            <div className="relative z-10 border-b border-cyan-100 bg-[#eef8f9] px-6 py-5 text-slate-900">
              <p className="text-center text-3xl font-black tracking-wide">{zh ? "疫苗须知" : "Vaccine Tips"}</p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-base leading-7">
              <section className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <p className="leading-9 text-slate-700 [text-decoration:underline] [text-decoration-style:dashed] [text-decoration-color:#98d9d3] [text-underline-offset:12px]">
                  {zh
                    ? "宝宝出生后就要开始接种疫苗了，但不少家长对于疫苗选择、接种准备等事项仍存在很多疑问。因此特意准备了常见的10个疫苗问答，给大家一次讲清楚啦。"
                    : "Vaccination starts from birth. Here are common Q&A items to help parents prepare and decide."}
                </p>
              </section>
              {faqItems.map((item, index) => (
                <section key={item.q} className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 flex items-center gap-2 text-xl font-black text-slate-900">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm text-white">{zh ? "问" : "Q"}</span>
                    {item.q.replace(/^\d+\./, "")}
                  </p>
                  <div className="space-y-2 text-slate-700">
                    {item.a.map((line, lineIndex) => (
                      <div key={line} className="flex items-start gap-2 rounded-xl bg-rose-50/50 px-3 py-2">
                        {item.a.length > 1 ? (
                          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffd8e8] text-sm font-bold text-rose-600">
                            {lineIndex + 1}
                          </span>
                        ) : null}
                        <p className="text-lg leading-9">{line}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-0 bg-gradient-to-b from-slate-50 to-white p-0 sm:max-w-[820px]">
          {detailItem && (
            <>
              <DialogHeader className="border-b bg-white/95 px-6 pb-5 pt-6">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-200" />
                <DialogTitle className="text-center text-3xl font-bold tracking-normal text-slate-900">{zh ? "疫苗详情" : "Vaccine Details"}</DialogTitle>
                <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-400" />
                <DialogDescription className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-xl font-bold text-slate-900">{detailItem.plan.name}</span>
                  <span className={`rounded-lg border px-2 py-0.5 text-xs ${detailItem.plan.kind === "FREE" ? "border-emerald-400 text-emerald-600" : "border-sky-400 text-sky-600"}`}>
                    {detailItem.plan.kind === "FREE" ? (zh ? "免费" : "Free") : (zh ? "自费" : "Optional")}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-5 py-4 text-xs">
                <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <SectionTag title={zh ? "疫苗简介" : "Overview"} icon={<Sparkles className="h-4 w-4" />} />
                  <InfoRow icon={<ShieldCheck className="h-4 w-4 text-fuchsia-500" />} title={zh ? "预防疾病" : "Prevents"} value={detailItem.plan.preventDisease} />
                  <InfoRow icon={<CalendarClock className="h-4 w-4 text-fuchsia-500" />} title={zh ? "接种剂次" : "Dose"} value={getDoseText(detailItem.plan, locale)} />
                  <InfoRow icon={<Stethoscope className="h-4 w-4 text-fuchsia-500" />} title={zh ? "接种部位" : "Site / Route"} value={detailItem.plan.siteAndRoute} />
                </section>

                <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <SectionTag title={zh ? "接种须知" : "Notes"} icon={<ShieldCheck className="h-4 w-4" />} />
                  <InfoList title={zh ? "以下情况不能接种" : "Do not vaccinate if"} icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} items={detailItem.plan.notice.contraindications} tone="rose" />
                  <InfoList title={zh ? "常见接种反应" : "Common reactions"} icon={<HeartPulse className="h-4 w-4 text-fuchsia-500" />} items={detailItem.plan.notice.commonReactions} tone="fuchsia" />
                  <InfoList title={zh ? "不良反应" : "Adverse reactions"} icon={<ShieldAlert className="h-4 w-4 text-rose-600" />} items={detailItem.plan.notice.adverseReactions} tone="rose" />
                  <InfoList title={zh ? "接种后护理" : "Post-shot care"} icon={<Stethoscope className="h-4 w-4 text-fuchsia-600" />} items={detailItem.plan.notice.care} tone="fuchsia" />
                </section>

                <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <SectionTag title={zh ? "补种原则" : "Catch-up rules"} icon={<Clock3 className="h-4 w-4" />} />
                  <InfoRow icon={<Clock3 className="h-4 w-4 text-fuchsia-500" />} title={zh ? "补种时间" : "Catch-up timing"} value={detailItem.plan.catchup.catchup} />
                  <InfoRow icon={<CalendarClock className="h-4 w-4 text-fuchsia-500" />} title={zh ? "最迟接种时间" : "Latest timing"} value={detailItem.plan.catchup.latest} />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{zh ? "修改接种时间" : "Edit shot time"}</DialogTitle>
            <DialogDescription>{editingItem?.plan.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{zh ? "时间" : "Time"}</Label>
              <Input type="datetime-local" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
            </div>
            <Button className="w-full" onClick={saveTime} disabled={!editingItem || savingCode === editingItem.plan.code}>{zh ? "保存" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTag({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-b-2xl rounded-t-md bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
        {icon}
        {title}
      </div>
    </div>
  );
}

function InfoRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-lg font-bold text-slate-900">
        {icon}
        {title}
      </p>
      <p className="whitespace-pre-line text-base text-slate-700">{value}</p>
    </div>
  );
}

function InfoList({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: "rose" | "fuchsia";
}) {
  const toneClass = tone === "rose" ? "border-rose-100 bg-rose-50/40" : "border-fuchsia-100 bg-fuchsia-50/40";
  return (
    <div className={`mb-3 rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="mb-2 flex items-center gap-1.5 text-xl font-black text-slate-900">
        {icon}
        {title}
      </p>
      <ul className="space-y-1 text-base text-slate-700">
        {items.map((line, idx) => (
          <li key={line} className="flex gap-2">
            <span className="font-semibold text-slate-500">{idx + 1}.</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineChip({
  side,
  tone,
  text,
  item,
  locale,
  onClick,
}: {
  side: "left" | "right";
  tone: string;
  text: string;
  item: ItemView;
  locale: "zh" | "en";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`relative w-full rounded-xl border px-3 py-2 text-left shadow-sm transition hover:brightness-95 ${tone}`}>
      <div
        className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border ${tone}`}
        style={side === "left" ? { right: -4 } : { left: -4 }}
      />
      <p className={`text-lg font-black leading-tight ${text}`}>{item.plan.name}</p>
      <p className={`mt-0.5 text-sm font-semibold ${text} opacity-90`}>
        {locale === "zh" ? `（第${item.plan.doseNumber}针）` : `(Dose ${item.plan.doseNumber})`}
      </p>
    </button>
  );
}

function getTimelinePalette(index: number) {
  const palettes = [
    { card: "bg-[#d8b273] border-[#c89f5e]", text: "text-white", line: "#e8c995", monthText: "text-[#b48a4d]" },
    { card: "bg-[#d494a6] border-[#c68498]", text: "text-white", line: "#e8b8c5", monthText: "text-[#b77086]" },
    { card: "bg-[#7cbfd2] border-[#6cafc4]", text: "text-white", line: "#b7dbe7", monthText: "text-[#4f98ae]" },
    { card: "bg-[#c8a0c2] border-[#b891b3]", text: "text-white", line: "#dfc2da", monthText: "text-[#9f7398]" },
    { card: "bg-[#9db7df] border-[#8ca7d1]", text: "text-white", line: "#c8d7ef", monthText: "text-[#6f8fbe]" },
    { card: "bg-[#95cbc3] border-[#84bbb3]", text: "text-white", line: "#c2e2dd", monthText: "text-[#669f97]" },
    { card: "bg-[#a8d09a] border-[#97c188]", text: "text-white", line: "#cfe8c4", monthText: "text-[#79a96c]" },
  ];
  return palettes[index % palettes.length];
}

function addMonthsSafe(base: Date, months: number): Date {
  const d = new Date(base);
  const wholeMonths = Math.trunc(months);
  const fraction = months - wholeMonths;
  d.setMonth(d.getMonth() + wholeMonths);
  if (Math.abs(fraction) > 0.0001) {
    d.setDate(d.getDate() + Math.round(fraction * 30));
  }
  return d;
}

function findRecord(item: VaccinePlanItem, records: (Record & { baby: { id: string; name: string } })[]) {
  const byMarker = records.find((r) => (r.note || "").includes(`${marker}:${item.code}`));
  if (byMarker) return byMarker;
  return records.find((r) => r.vaccineName === item.name && (r.vaccineDoseNumber || 0) === item.doseNumber) || null;
}

function toLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAgeLabel(monthAge: number, locale: "zh" | "en"): string {
  if (locale === "en") {
    if (monthAge === 0) return "Birth";
    if (monthAge <= 18) return `${monthAge} mo`;
    if (monthAge % 12 === 0) return `${monthAge / 12} y`;
    const years = Math.floor(monthAge / 12);
    const months = monthAge % 12;
    return `${years} y ${months} mo`;
  }

  if (monthAge === 0) return "出生";
  if (monthAge <= 18) return `${monthAge}月龄`;
  if (monthAge % 12 === 0) return `${monthAge / 12}周岁`;
  const years = Math.floor(monthAge / 12);
  const months = monthAge % 12;
  return `${years}周岁${months}个月`;
}

function formatDateOnly(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDoseText(planItem: VaccinePlanItem, locale: "zh" | "en"): string {
  if (planItem.code.startsWith("HEPB-")) {
    return locale === "zh"
      ? "第1针：新生儿出生后24小时内接种\n第2针：1月龄接种\n第3针：6月龄接种"
      : "Dose 1: within 24h after birth\nDose 2: at 1 month\nDose 3: at 6 months";
  }
  return locale === "zh"
    ? `第${planItem.doseNumber}/${planItem.totalDoses}针`
    : `Dose ${planItem.doseNumber}/${planItem.totalDoses}`;
}

