import { useEffect, useState } from "react";
import Loader from "../../../components/ui/Loader";
import Card from "../../../components/ui/Card";
import StatCard from "../components/StatCard";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useRole } from "../../../hooks/useRole";
import CompactAnalytics from "../components/CompactAnalytics";
import {
  Activity,
  Wallet,
  CalendarRange,
  BadgeDollarSign,
  CircleX,
  BriefcaseBusiness,
  Landmark,
} from "lucide-react";

export default function DashboardPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { isAdmin } = useRole();

  const [busy, setBusy] = useState(true);
  const [today, setToday] = useState([]);
  const [weekly, setWeekly] = useState(null);

  const [adminOverview, setAdminOverview] = useState(null);
  const [adminWeekly, setAdminWeekly] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await dashboardApi.meToday();
        const w = await dashboardApi.meWeekly();

        setToday(t?.today || []);
        setWeekly(w || null);

        if (isAdmin) {
          try {
            const ao = await dashboardApi.adminOverview();
            setAdminOverview(ao || null);
          } catch {
            setAdminOverview(null);
          }

          try {
            const aw = await dashboardApi.adminWeekly();
            setAdminWeekly(aw || null);
          } catch {
            setAdminWeekly(null);
          }
        }
      } catch (e) {
        showToast(e?.response?.data?.message || "Dashboard failed", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [showToast, isAdmin]);

  if (busy) return <Loader label="Loading dashboard..." />;

  const latest = today?.[0];
  const weekStart = weekly?.week_start;
  const weekEnd = weekly?.week_end;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Today Status"
          value={latest?.status || "NONE"}
          icon={<Activity size={22} />}
        />

        <StatCard
          title="Paid hours"
          value={latest?.paid_hours ?? 0}
          icon={<Wallet size={22} />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/70">
          <CalendarRange size={16} className="text-brand-blue" />
          <span>This Week (SAT → FRI)</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <BadgeDollarSign size={15} className="text-emerald-400" />
            <span>
              Paid: <b>{weekly?.summary?.paid_hours ?? 0}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CircleX size={15} className="text-red-400" />
            <span>
              Absent: <b>{weekly?.summary?.absent_days ?? 0}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={15} className="text-amber-300" />
            <span>
              Worked: <b>{weekly?.summary?.worked_net_hours ?? 0}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Landmark size={15} className="text-brand-blue" />
            <span>
              Total pay: <b>{weekly?.summary?.total_pay ?? 0}</b>
            </span>
          </div>
        </div>

        {weekStart && weekEnd ? (
          <div className="mt-4 rounded-2xl border border-brand-line/70 bg-brand-bg/35 px-3 py-2 text-xs text-brand-text/60">
            {weekStart} - {weekEnd}
          </div>
        ) : null}
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