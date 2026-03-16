import { useCallback, useEffect, useMemo, useState } from "react";
import Loader from "../../../components/ui/Loader";
import Card from "../../../components/ui/Card";
import StatCard from "../components/StatCard";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useRole } from "../../../hooks/useRole";
import { useAuth } from "../../../hooks/useAuth";
import CompactAnalytics from "../components/CompactAnalytics";
import { formatUserShift } from "../../../utils/shiftFormatter";
import {
  formatBreakMinutesPrecise,
  formatHours,
  formatMoney,
} from "../../../utils/format";
import {
  Activity,
  Wallet,
  CalendarRange,
  BadgeDollarSign,
  CircleX,
  BriefcaseBusiness,
  Landmark,
  SunMoon,
  Coffee,
} from "lucide-react";

function formatDays(value) {
  return `${Number(value ?? 0)}d`;
}

function getLatestAttendance(rows = []) {
  return rows?.[0] || null;
}

function getStatusBadgeClass(status) {
  const normalized = String(status || "OFF_DUTY").toUpperCase();

  if (normalized === "OPEN") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "AUTO_CLOSED") {
    return "border-brand-blue/25 bg-brand-blue/10 text-brand-blue";
  }

  if (normalized === "CLOSED") {
    return "border-brand-blue/25 bg-brand-blue/10 text-brand-blue";
  }

  return "border-brand-line/70 bg-brand-bg/30 text-brand-text/75";
}

function formatStatusLabel(status) {
  const raw = String(status || "Off Duty").trim();

  if (!raw) return "Off Duty";

  return raw
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { isAdmin } = useRole();
  const { user } = useAuth();

  const [busy, setBusy] = useState(true);
  const [today, setToday] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminWeekly, setAdminWeekly] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setBusy(true);

      const [t, w] = await Promise.all([
        dashboardApi.meToday(),
        dashboardApi.meWeekly(),
      ]);

      setToday(Array.isArray(t?.today) ? t.today.slice(0, 1) : []);
      setWeekly(w || null);

      if (isAdmin) {
        const [ao, aw] = await Promise.allSettled([
          dashboardApi.adminOverview(),
          dashboardApi.adminWeekly(),
        ]);

        setAdminOverview(ao.status === "fulfilled" ? ao.value : null);
        setAdminWeekly(aw.status === "fulfilled" ? aw.value : null);
      } else {
        setAdminOverview(null);
        setAdminWeekly(null);
      }
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Dashboard load failed",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    loadDashboardData();

    const handleRefresh = () => {
      loadDashboardData();
    };

    window.addEventListener("attendance:changed", handleRefresh);
    window.addEventListener("break:changed", handleRefresh);
    window.addEventListener("payroll:changed", handleRefresh);

    return () => {
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
      window.removeEventListener("payroll:changed", handleRefresh);
    };
  }, [loadDashboardData]);

  const latest = useMemo(() => getLatestAttendance(today), [today]);
  const shiftText = formatUserShift(user, new Date());

  const currentStatusRaw =
    latest?.status && latest.status !== "NONE" ? latest.status : "Off Duty";

  const currentStatus = formatStatusLabel(currentStatusRaw);

  const paidHours = Number(latest?.paid_hours ?? 0);
  const breakTodayMinutes = Number(latest?.break_minutes ?? 0);

  if (busy) {
    return <Loader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 space-y-3">
        <h1 className="text-xl font-bold text-white">
          Welcome, {user?.full_name?.split(" ")[0] || "User"} 👋
        </h1>

        <div className="flex items-center justify-between rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-4 shadow-lg shadow-brand-blue/5">
          <div className="min-w-0">
            <div className="mb-1 text-sm font-semibold text-brand-blue">
              Your Shift Today
            </div>
            <div className="truncate text-lg font-bold text-white">{shiftText}</div>
          </div>

          <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/15 p-3 text-brand-blue">
            <SunMoon size={24} />
          </div>
        </div>

        <div
          className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClass(
            currentStatusRaw
          )}`}
        >
          Current Status: {currentStatus}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Today Status"
          value={currentStatus}
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Paid Hours"
          value={`${formatHours(paidHours)}h`}
          icon={<Wallet size={20} />}
        />

        <div className="col-span-2">
          <StatCard
            title="Break Today"
            value={formatBreakMinutesPrecise(breakTodayMinutes)}
            icon={<Coffee size={20} />}
          />
        </div>
      </div>

      <Card className="overflow-hidden space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/75">
          <CalendarRange size={16} className="text-brand-blue" />
          <span>This Week (SAT → FRI)</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-4 text-sm">
            <div className="flex items-center gap-2 text-brand-text/60">
              <BadgeDollarSign size={16} className="text-emerald-400" />
              <span>Paid Hours</span>
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {formatHours(weekly?.summary?.paid_hours ?? 0)}h
            </div>
          </div>

          <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-4 text-sm">
            <div className="flex items-center gap-2 text-brand-text/60">
              <CircleX size={16} className="text-red-400" />
              <span>Absent Days</span>
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {formatDays(weekly?.summary?.absent_days ?? 0)}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-4 text-sm">
            <div className="flex items-center gap-2 text-brand-text/60">
              <BriefcaseBusiness size={16} className="text-amber-300" />
              <span>Worked Hours</span>
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {formatHours(weekly?.summary?.worked_net_hours ?? 0)}h
            </div>
          </div>

          <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-4 text-sm">
            <div className="flex items-center gap-2 text-brand-text/60">
              <Landmark size={16} className="text-brand-blue" />
              <span>Total Pay</span>
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {formatMoney(weekly?.summary?.total_pay ?? 0)}
            </div>
          </div>
        </div>
      </Card>

      <CompactAnalytics
        isAdmin={isAdmin}
        today={today}
        weekly={weekly}
        adminOverview={adminOverview}
        adminWeekly={adminWeekly}
      />
    </div>
  );
}