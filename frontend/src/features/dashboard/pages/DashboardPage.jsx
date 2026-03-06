import { useEffect, useState } from "react";
import Loader from "../../../components/ui/Loader";
import Card from "../../../components/ui/Card";
import StatCard from "../components/StatCard";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function DashboardPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [busy, setBusy] = useState(true);
  const [today, setToday] = useState([]);
  const [weekly, setWeekly] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await dashboardApi.meToday();
        const w = await dashboardApi.meWeekly();
        setToday(t?.today || []);
        setWeekly(w || null);
      } catch (e) {
        showToast(e?.response?.data?.message || "Dashboard failed", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [showToast]);

  if (busy) return <Loader label="Loading dashboard..." />;

  const latest = today?.[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today Status" value={latest?.status || "NONE"} />
        <StatCard title="Paid hours" value={latest?.paid_hours ?? 0} />
      </div>

      <Card>
        <div className="text-sm text-brand-text/70">This Week (SAT → FRI)</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>Paid: <b>{weekly?.summary?.paid_hours ?? 0}</b></div>
          <div>Absent: <b>{weekly?.summary?.absent_days ?? 0}</b></div>
          <div>Worked: <b>{weekly?.summary?.worked_net_hours ?? 0}</b></div>
          <div>Total pay: <b>{weekly?.summary?.total_pay ?? 0}</b></div>
        </div>
        <div className="text-xs text-brand-text/60 mt-2">
          {weekly?.week_start} → {weekly?.week_end} (cutoff: {weekly?.cutoff_day})
        </div>
      </Card>
    </div>
  );
}