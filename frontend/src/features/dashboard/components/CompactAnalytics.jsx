import { useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import { exportExcel, exportPDF } from "../../../utils/exportDashboard";
import {
  Download,
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
} from "lucide-react";

function clampPercent(value) {
  const n = Number(value || 0);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function buildEmployeeData(period, today, weekly) {
  const worked = Number(weekly?.summary?.worked_net_hours ?? 0);
  const paid = Number(weekly?.summary?.paid_hours ?? 0);
  const absent = Number(weekly?.summary?.absent_days ?? 0);
  const totalPay = Number(weekly?.summary?.total_pay ?? 0);
  const weeklyBreakMinutes = Number(weekly?.summary?.break_minutes ?? 0);
  const todayBreakMinutes = Number(today?.[0]?.break_minutes ?? 0);
  const currentStatus = today?.[0]?.status || "NONE";

  const factor = period === "daily" ? 1 : period === "weekly" ? 7 : 30;

  const scoreA =
    period === "daily"
      ? Math.min(
          100,
          worked * 12 +
            (currentStatus !== "NONE" ? 18 : 0) +
            todayBreakMinutes * 0.2
        )
      : period === "weekly"
      ? Math.min(100, worked * 7 + weeklyBreakMinutes * 0.12)
      : Math.min(100, worked * 3 + paid * 2);

  const scoreB =
    period === "daily"
      ? Math.min(100, paid * 12)
      : period === "weekly"
      ? Math.min(100, paid * 8)
      : Math.min(100, paid * 3 + totalPay / 10);

  const scoreC =
    period === "daily"
      ? Math.max(5, 20 - absent * 5)
      : period === "weekly"
      ? Math.max(8, 40 - absent * 8)
      : Math.max(10, 55 - absent * 5);

  return {
    label:
      period === "daily"
        ? "Daily Analysis"
        : period === "weekly"
        ? "Weekly Analysis"
        : "Monthly Analysis",
    subtitle:
      period === "daily"
        ? "Today activity snapshot"
        : period === "weekly"
        ? "This week performance"
        : "Estimated monthly trend",
    stats: [
      {
        name: "Low",
        color: "bg-red-500",
        value: clampPercent(Math.round(scoreC)),
        hint:
          period === "daily"
            ? "Risk / gaps"
            : period === "weekly"
            ? "Attendance gaps"
            : "Monthly gaps",
      },
      {
        name: "Middle",
        color: "bg-amber-400",
        value: clampPercent(Math.round((scoreA + scoreB) / 2)),
        hint:
          period === "daily"
            ? "Balanced work"
            : period === "weekly"
            ? "General consistency"
            : "Stable output",
      },
      {
        name: "High",
        color: "bg-emerald-500",
        value: clampPercent(Math.round(scoreA + 10)),
        hint:
          period === "daily"
            ? "Completed effort"
            : period === "weekly"
            ? "Strong performance"
            : "Growth level",
      },
    ],
    miniBars: [
      { key: "D1", value: clampPercent(Math.round(scoreA * 0.55)) },
      { key: "D2", value: clampPercent(Math.round(scoreB * 0.72)) },
      { key: "D3", value: clampPercent(Math.round(scoreC * 0.9)) },
      { key: "D4", value: clampPercent(Math.round(scoreA * 0.84)) },
      { key: "D5", value: clampPercent(Math.round(scoreB * 0.92)) },
      { key: "D6", value: clampPercent(Math.round(scoreC * 0.66)) },
      { key: "D7", value: clampPercent(Math.round((scoreA + scoreB) / 2)) },
    ].slice(0, factor === 1 ? 4 : 7),
  };
}

function buildAdminData(period, overview, weekly) {
  const totalStaff = Number(overview?.summary?.total_staff ?? 0);
  const present = Number(overview?.summary?.present ?? 0);
  const absent = Number(overview?.summary?.absent ?? 0);
  const late = Number(overview?.summary?.late ?? 0);

  const worked = Number(weekly?.summary?.worked_hours ?? 0);
  const paid = Number(weekly?.summary?.paid_hours ?? 0);
  const totalPay = Number(weekly?.summary?.total_pay ?? 0);

  const attendanceHealth = totalStaff > 0 ? (present / totalStaff) * 100 : 0;
  const delayRisk = totalStaff > 0 ? (late / totalStaff) * 100 : 0;
  const absenceRisk = totalStaff > 0 ? (absent / totalStaff) * 100 : 0;

  const multiplier =
    period === "daily" ? 1 : period === "weekly" ? 1.3 : 1.6;

  return {
    label:
      period === "daily"
        ? "Daily Admin Analysis"
        : period === "weekly"
        ? "Weekly Admin Analysis"
        : "Monthly Admin Analysis",
    subtitle:
      period === "daily"
        ? "System attendance snapshot"
        : period === "weekly"
        ? "This week staff activity"
        : "Estimated monthly system trend",
    stats: [
      {
        name: "Low",
        color: "bg-red-500",
        value: clampPercent(Math.round((absenceRisk + delayRisk) * multiplier)),
        hint: "Risk / absence",
      },
      {
        name: "Middle",
        color: "bg-amber-400",
        value: clampPercent(Math.round((worked + paid) * 0.6 * multiplier)),
        hint: "Mid activity",
      },
      {
        name: "High",
        color: "bg-emerald-500",
        value: clampPercent(
          Math.round((attendanceHealth + totalPay / 20) * multiplier)
        ),
        hint: "Healthy system",
      },
    ],
    miniBars: [
      { key: "A1", value: clampPercent(Math.round(attendanceHealth * 0.88)) },
      { key: "A2", value: clampPercent(Math.round(delayRisk * 1.2 + 10)) },
      { key: "A3", value: clampPercent(Math.round(absenceRisk * 1.15 + 8)) },
      { key: "A4", value: clampPercent(Math.round(worked * 1.4)) },
      { key: "A5", value: clampPercent(Math.round(paid * 1.55)) },
      { key: "A6", value: clampPercent(Math.round(totalPay / 18)) },
      {
        key: "A7",
        value: clampPercent(Math.round((attendanceHealth + paid) * 0.55)),
      },
    ],
  };
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
        active
          ? "bg-brand-blue text-white shadow-soft"
          : "bg-brand-bg/50 text-brand-text/70 hover:bg-brand-card hover:text-brand-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ProgressRow({ item }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          <span className="font-medium text-brand-text/80">{item.name}</span>
        </div>
        <span className="text-brand-text/60">{item.value}%</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-brand-bg/70">
        <div
          className={`h-full rounded-full ${item.color}`}
          style={{ width: `${item.value}%` }}
        />
      </div>

      <div className="text-[11px] text-brand-text/50">{item.hint}</div>
    </div>
  );
}

export default function CompactAnalytics({
  isAdmin = false,
  today,
  weekly,
  adminOverview,
  adminWeekly,
}) {
  const [period, setPeriod] = useState("daily");

  const data = useMemo(() => {
    return isAdmin
      ? buildAdminData(period, adminOverview, adminWeekly)
      : buildEmployeeData(period, today, weekly);
  }, [isAdmin, period, today, weekly, adminOverview, adminWeekly]);

  const exportRows = useMemo(() => {
    const summary = isAdmin
      ? {
          period,
          total_staff: adminOverview?.summary?.total_staff ?? 0,
          present: adminOverview?.summary?.present ?? 0,
          absent: adminOverview?.summary?.absent ?? 0,
          late: adminOverview?.summary?.late ?? 0,
          worked_hours: adminWeekly?.summary?.worked_hours ?? 0,
          paid_hours: adminWeekly?.summary?.paid_hours ?? 0,
          total_pay: adminWeekly?.summary?.total_pay ?? 0,
        }
      : {
          period,
          status: today?.[0]?.status || "NONE",
          worked_hours: weekly?.summary?.worked_net_hours ?? 0,
          paid_hours: weekly?.summary?.paid_hours ?? 0,
          absent_days: weekly?.summary?.absent_days ?? 0,
          total_pay: weekly?.summary?.total_pay ?? 0,
          break_today_minutes: today?.[0]?.break_minutes ?? 0,
          weekly_break_minutes: weekly?.summary?.break_minutes ?? 0,
        };

    return [summary];
  }, [isAdmin, period, today, weekly, adminOverview, adminWeekly]);

  const fileName = isAdmin
    ? `admin-${period}-analytics`
    : `employee-${period}-analytics`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/85">
            <BarChart3 size={16} className="text-brand-blue" />
            <span>{data.label}</span>
          </div>

          <div className="mt-1 text-xs text-brand-text/55">{data.subtitle}</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line bg-brand-bg/45 text-brand-text/80 transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/50 hover:bg-brand-blue/10"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            onClick={() => exportExcel(exportRows, fileName)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all duration-200 hover:-translate-y-[1px] hover:bg-emerald-500/20"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportPDF(exportRows, fileName)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-500/20"
          >
            <Download size={15} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-1.5">
        <SegmentButton
          active={period === "daily"}
          onClick={() => setPeriod("daily")}
        >
          Daily
        </SegmentButton>

        <SegmentButton
          active={period === "weekly"}
          onClick={() => setPeriod("weekly")}
        >
          Weekly
        </SegmentButton>

        <SegmentButton
          active={period === "monthly"}
          onClick={() => setPeriod("monthly")}
        >
          Monthly
        </SegmentButton>
      </div>

      <div className="mt-4 grid grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="space-y-3">
          {data.stats.map((item) => (
            <ProgressRow key={item.name} item={item} />
          ))}
        </div>

        <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3">
          <div className="flex h-full items-end justify-between gap-2">
            {data.miniBars.map((bar, index) => (
              <div
                key={bar.key}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="flex h-28 w-full items-end">
                  <div
                    className={[
                      "w-full rounded-t-xl transition-all duration-300",
                      index % 3 === 0
                        ? "bg-red-500/85"
                        : index % 3 === 1
                        ? "bg-amber-400/85"
                        : "bg-emerald-500/85",
                    ].join(" ")}
                    style={{ height: `${Math.max(14, bar.value)}%` }}
                  />
                </div>

                <span className="text-[10px] text-brand-text/45">
                  {bar.key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}