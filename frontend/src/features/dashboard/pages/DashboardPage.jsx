import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function DashboardPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { isAdmin } = useRole();
  const { user } = useAuth();

  const [busy, setBusy] = useState(true);
  const [today, setToday] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminWeekly, setAdminWeekly] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async (retryCount = 1) => {
      try {
        const t = await dashboardApi.meToday();
        const w = await dashboardApi.meWeekly();

        if (isMounted) {
          setToday(t?.today || []);
          setWeekly(w || null);
        }

        if (isAdmin) {
          try {
            const ao = await dashboardApi.adminOverview();
            if (isMounted) setAdminOverview(ao || null);
          } catch {
            if (isMounted) setAdminOverview(null);
          }
          try {
            const aw = await dashboardApi.adminWeekly();
            if (isMounted) setAdminWeekly(aw || null);
          } catch {
            if (isMounted) setAdminWeekly(null);
          }
        }
        if (isMounted) setBusy(false);
      } catch (e) {
        if (retryCount > 0 && isMounted) {
          setTimeout(() => loadDashboardData(retryCount - 1), 2500);
        } else if (isMounted) {
          showToast(e?.response?.data?.message || "Dashboard load failed", "error");
          setBusy(false);
        }
      }
    };

    setBusy(true);
    loadDashboardData();

    return () => { isMounted = false; };
  }, [showToast, isAdmin]);

  if (busy) return <Loader label="Loading dashboard..." />;

  const latest = today?.[0];
  const shiftText = user?.shift_id === 1 ? "MORNING (08:00 - 16:00)" : 
                    user?.shift_id === 2 ? "NIGHT (23:00 - 07:00)" : "Not Assigned";
  const currentStatus = latest?.status && latest.status !== 'NONE' ? latest.status : "Off Duty";

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white mb-3">
          Welcome, {user?.full_name?.split(' ')[0] || 'User'} 👋
        </h1>
        <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-brand-blue font-semibold mb-1">Your Shift Today</div>
            <div className="text-lg text-white font-bold">{shiftText}</div>
          </div>
          <div className="bg-brand-blue/20 p-2 rounded-xl text-brand-blue">
            <SunMoon size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today Status" value={currentStatus} icon={<Activity size={22} />} />
        <StatCard title="Paid hours" value={`${Number(latest?.paid_hours ?? 0).toFixed(2)} h`} icon={<Wallet size={22} />} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/70">
          <CalendarRange size={16} className="text-brand-blue" />
          <span>This Week (SAT → FRI)</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-center gap-2">
            <BadgeDollarSign size={16} className="text-emerald-400" />
            <span>Paid: <b>{Number(weekly?.summary?.paid_hours ?? 0).toFixed(2)} h</b></span>
          </div>
          <div className="flex items-center gap-2">
            <CircleX size={16} className="text-red-400" />
            <span>Absent: <b>{weekly?.summary?.absent_days ?? 0} d</b></span>
          </div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={16} className="text-amber-300" />
            <span>Worked: <b>{Number(weekly?.summary?.worked_net_hours ?? 0).toFixed(2)} h</b></span>
          </div>
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-brand-blue" />
            <span>Total pay: <b>${Number(weekly?.summary?.total_pay ?? 0).toFixed(2)}</b></span>
          </div>
        </div>
      </Card>

      <CompactAnalytics isAdmin={isAdmin} today={today} weekly={weekly} adminOverview={adminOverview} adminWeekly={adminWeekly} />
    </div>
  );
}