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
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function buildEmployeeData(period, today, weekly) {
  const latest = today?.[0] || {};
  const summary = weekly?.summary || {};

  const worked = Number(summary.worked_net_hours ?? 0);
  const paid = Number(summary.paid_hours ?? 0);
  const absent = Number(summary.absent_days ?? 0);
  const totalPay = Number(summary.total_pay ?? 0);
  const breakToday = Number(latest.break_minutes ?? 0);
  const breakWeekly = Number(summary.break_minutes ?? 0);
  const status = latest.status || "NONE";

  const dayWorked = Number(latest.total_hours ?? 0);
  const dayPaid = Number(latest.paid_hours ?? 0);

  if (period === "daily") {
    const low = clampPercent(
      status === "NONE" ? 70 : Math.max(5, Math.min(60, breakToday * 2))
    );
    const middle = clampPercent(dayWorked * 12.5);
    const high = clampPercent(dayPaid * 12.5);

    return {
      label: "Daily Analysis",
      subtitle: "Today activity snapshot",
      stats: [
        { name: "Low", color: "bg-red-500", value: low, hint: "Risk / gaps" },
        {
          name: "Middle",
          color: "bg-amber-400",
          value: middle,
          hint: "Balanced work",
        },
        {
          name: "High",
          color: "bg-emerald-500",
          value: high,
          hint: "Completed effort",
        },
      ],
      miniBars: [
        { key: "D1", value: low },
        { key: "D2", value: middle },
        { key: "D3", value: high },
        { key: "D4", value: clampPercent((middle + high) / 2) },
      ],
    };
  }

  if (period === "weekly") {
    const low = clampPercent(absent * 14 + breakWeekly * 0.35);
    const middle = clampPercent(worked * 8);
    const high = clampPercent(paid * 8 + totalPay * 0.08);

    return {
      label: "Weekly Analysis",
      subtitle: "This week performance",
      stats: [
        {
          name: "Low",
          color: "bg-red-500",
          value: low,
          hint: "Attendance gaps",
        },
        {
          name: "Middle",
          color: "bg-amber-400",
          value: middle,
          hint: "General consistency",
        },
        {
          name: "High",
          color: "bg-emerald-500",
          value: high,
          hint: "Strong performance",
        },
      ],
      miniBars: [
        { key: "D1", value: low },
        { key: "D2", value: middle },
        { key: "D3", value: high },
        { key: "D4", value: clampPercent(worked * 7) },
        { key: "D5", value: clampPercent(paid * 7) },
        { key: "D6", value: clampPercent(totalPay * 0.06) },
        { key: "D7", value: clampPercent((middle + high) / 2) },
      ],
    };
  }

  const low = clampPercent(absent * 12);
  const middle = clampPercent(worked * 10);
  const high = clampPercent(paid * 10 + totalPay * 0.07);

  return {
    label: "Monthly Analysis",
    subtitle: "Estimated monthly trend",
    stats: [
      { name: "Low", color: "bg-red-500", value: low, hint: "Monthly gaps" },
      {
        name: "Middle",
        color: "bg-amber-400",
        value: middle,
        hint: "Stable output",
      },
      {
        name: "High",
        color: "bg-emerald-500",
        value: high,
        hint: "Growth level",
      },
    ],
    miniBars: [
      { key: "D1", value: low },
      { key: "D2", value: middle },
      { key: "D3", value: high },
      { key: "D4", value: clampPercent((middle + high) / 2) },
      { key: "D5", value: clampPercent(worked * 8) },
      { key: "D6", value: clampPercent(paid * 8) },
      { key: "D7", value: clampPercent(totalPay * 0.06) },
    ],
  };
}

function buildAdminData(period, overview, weekly) {
  const ov = overview?.summary || {};
  const wk = weekly?.summary || {};

  const totalStaff = Number(ov.total_staff ?? 0);
  const present = Number(ov.present ?? 0);
  const absent = Number(ov.absent ?? 0);
  const late = Number(ov.late ?? 0);

  const worked = Number(wk.worked_hours ?? 0);
  const paid = Number(wk.paid_hours ?? 0);
  const totalPay = Number(wk.total_pay ?? 0);

  const attendanceRate =
    totalStaff > 0 ? clampPercent((present / totalStaff) * 100) : 0;
  const absenceRate =
    totalStaff > 0 ? clampPercent((absent / totalStaff) * 100) : 0;
  const lateRate =
    totalStaff > 0 ? clampPercent((late / totalStaff) * 100) : 0;

  if (period === "daily") {
    return {
      label: "Daily Admin Analysis",
      subtitle: "System attendance snapshot",
      stats: [
        {
          name: "Low",
          color: "bg-red-500",
          value: clampPercent(absenceRate + lateRate),
          hint: "Risk / absence",
        },
        {
          name: "Middle",
          color: "bg-amber-400",
          value: clampPercent(attendanceRate * 0.7),
          hint: "Mid activity",
        },
        {
          name: "High",
          color: "bg-emerald-500",
          value: attendanceRate,
          hint: "Healthy system",
        },
      ],
      miniBars: [
        { key: "A1", value: absenceRate },
        { key: "A2", value: lateRate },
        { key: "A3", value: attendanceRate },
        { key: "A4", value: clampPercent((attendanceRate + lateRate) / 2) },
      ],
    };
  }

  if (period === "weekly") {
    return {
      label: "Weekly Admin Analysis",
      subtitle: "This week staff activity",
      stats: [
        {
          name: "Low",
          color: "bg-red-500",
          value: clampPercent(absenceRate + lateRate),
          hint: "Risk / absence",
        },
        {
          name: "Middle",
          color: "bg-amber-400",
          value: clampPercent(worked * 3.5),
          hint: "Mid activity",
        },
        {
          name: "High",
          color: "bg-emerald-500",
          value: clampPercent(paid * 3.5 + totalPay * 0.04),
          hint: "Healthy system",
        },
      ],
      miniBars: [
        { key: "A1", value: clampPercent(worked * 3.5) },
        { key: "A2", value: clampPercent(paid * 3.5) },
        { key: "A3", value: clampPercent(totalPay * 0.04) },
        { key: "A4", value: absenceRate },
        { key: "A5", value: lateRate },
        { key: "A6", value: attendanceRate },
        { key: "A7", value: clampPercent((attendanceRate + paid * 3) / 2) },
      ],
    };
  }

  return {
    label: "Monthly Admin Analysis",
    subtitle: "Estimated monthly system trend",
    stats: [
      {
        name: "Low",
        color: "bg-red-500",
        value: clampPercent((absenceRate + lateRate) * 1.2),
        hint: "Monthly risk",
      },
      {
        name: "Middle",
        color: "bg-amber-400",
        value: clampPercent(worked * 4),
        hint: "Operational stability",
      },
      {
        name: "High",
        color: "bg-emerald-500",
        value: clampPercent(paid * 4 + totalPay * 0.05),
        hint: "System growth",
      },
    ],
    miniBars: [
      { key: "A1", value: clampPercent(worked * 4) },
      { key: "A2", value: clampPercent(paid * 4) },
      { key: "A3", value: clampPercent(totalPay * 0.05) },
      { key: "A4", value: absenceRate },
      { key: "A5", value: lateRate },
      { key: "A6", value: attendanceRate },
      { key: "A7", value: clampPercent((attendanceRate + paid * 4) / 2) },
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