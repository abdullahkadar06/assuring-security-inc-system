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
  const weekStart = weekly?.week_start;
  const weekEnd = weekly?.week_end;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today Status" value={latest?.status || "NONE"} />
        <StatCard title="Paid hours" value={latest?.paid_hours ?? 0} />
      </div>

      <Card className="overflow-hidden">
        <div className="text-sm font-semibold text-brand-text/70">
          This Week (SAT → FRI)
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            Paid: <b>{weekly?.summary?.paid_hours ?? 0}</b>
          </div>

          <div>
            Absent: <b>{weekly?.summary?.absent_days ?? 0}</b>
          </div>

          <div>
            Worked: <b>{weekly?.summary?.worked_net_hours ?? 0}</b>
          </div>

          <div>
            Total pay: <b>{weekly?.summary?.total_pay ?? 0}</b>
          </div>
        </div>

        {weekStart && weekEnd ? (
          <div className="mt-4 rounded-2xl border border-brand-line/70 bg-brand-bg/35 px-3 py-2 text-xs text-brand-text/60">
            {weekStart} - {weekEnd}
          </div>
        ) : null}
      </Card>
    </div>
  );
}