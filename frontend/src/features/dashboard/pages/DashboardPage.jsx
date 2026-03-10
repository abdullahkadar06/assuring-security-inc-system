import { useCallback, useEffect, useState } from "react";
import Loader from "../../../components/ui/Loader";
import Card from "../../../components/ui/Card";
import StatCard from "../components/StatCard";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useRole } from "../../../hooks/useRole";
import { useAuth } from "../../../hooks/useAuth";
import CompactAnalytics from "../components/CompactAnalytics";
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

function formatHours(value) {
  return `${Number(value ?? 0).toFixed(2)}h`;
}

function formatDays(value) {
  return `${Number(value ?? 0)}d`;
}

function formatMoney(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatBreakMinutes(totalMinutes = 0) {
  const mins = Math.max(0, Math.round(Number(totalMinutes || 0)));
  return `${String(mins).padStart(2, "0")}m`;
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

  const loadDashboardData = useCallback(
    async (retryCount = 1) => {
      try {
        setBusy(true);

        const [t, w] = await Promise.all([
          dashboardApi.meToday(),
          dashboardApi.meWeekly(),
        ]);

        setToday(t?.today || []);
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
        if (retryCount > 0) {
          setTimeout(() => loadDashboardData(retryCount - 1), 2500);
          return;
        }
        showToast(
          e?.response?.data?.message || "Dashboard load failed",
          "error"
        );
      } finally {
        setBusy(false);
      }
    },
    [isAdmin, showToast]
  );

  useEffect(() => {
    loadDashboardData();

    const handleRefresh = () => loadDashboardData(0);
    window.addEventListener("attendance:changed", handleRefresh);
    window.addEventListener("break:changed", handleRefresh);
    window.addEventListener("payroll:changed", handleRefresh);

    return () => {
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
      window.removeEventListener("payroll:changed", handleRefresh);
    };
  }, [loadDashboardData]);

  if (busy) return <Loader label="Loading dashboard..." />;

  const latest = today?.[0] || null;

  const shiftText =
    user?.shift_id === 1
      ? "MORNING (08:00 - 16:00)"
      : user?.shift_id === 2
      ? "NIGHT (23:00 - 07:00)"
      : "Not Assigned";

  const currentStatus =
    latest?.status && latest.status !== "NONE" ? latest.status : "Off Duty";

  const paidHours = Number(latest?.paid_hours ?? 0);
  const breakTodayMinutes = Number(latest?.break_minutes ?? 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="mb-3 text-xl font-bold text-white">
          Welcome, {user?.full_name?.split(" ")[0] || "User"} 👋
        </h1>

        <div className="flex items-center justify-between rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-4">
          <div>
            <div className="mb-1 text-sm font-semibold text-brand-blue">
              Your Shift Today
            </div>
            <div className="text-lg font-bold text-white">{shiftText}</div>
          </div>

          <div className="rounded-xl bg-brand-blue/20 p-2 text-brand-blue">
            <SunMoon size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Today Status"
          value={currentStatus}
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Paid hours"
          value={formatHours(paidHours)}
          icon={<Wallet size={20} />}
        />

        <div className="col-span-2">
          <StatCard
            title="Break today"
            value={formatBreakMinutes(breakTodayMinutes)}
            icon={<Coffee size={20} />}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/70">
          <CalendarRange size={16} className="text-brand-blue" />
          <span>This Week (SAT → FRI)</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-center gap-2">
            <BadgeDollarSign size={16} className="text-emerald-400" />
            <span>
              Paid: <b>{formatHours(weekly?.summary?.paid_hours ?? 0)}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CircleX size={16} className="text-red-400" />
            <span>
              Absent: <b>{formatDays(weekly?.summary?.absent_days ?? 0)}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={16} className="text-amber-300" />
            <span>
              Worked:{" "}
              <b>{formatHours(weekly?.summary?.worked_net_hours ?? 0)}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-brand-blue" />
            <span>
              Total pay: <b>{formatMoney(weekly?.summary?.total_pay ?? 0)}</b>
            </span>
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