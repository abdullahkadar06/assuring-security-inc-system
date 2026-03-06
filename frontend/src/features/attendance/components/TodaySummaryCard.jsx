import { useEffect, useState } from "react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function TodaySummaryCard() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const d = await dashboardApi.meToday();
        setRows(d?.today || []);
      } catch (e) {
        showToast(e?.response?.data?.message || "Failed loading today", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [showToast]);

  if (busy) return <Loader label="Loading today..." />;

  const latest = rows?.[0];

  return (
    <Card>
      <div className="text-sm text-brand-text/70">Today</div>
      {!latest ? (
        <div className="mt-2 text-sm">No attendance yet.</div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>In: <b>{latest.clock_in ? new Date(latest.clock_in).toLocaleTimeString() : "-"}</b></div>
          <div>Out: <b>{latest.clock_out ? new Date(latest.clock_out).toLocaleTimeString() : "-"}</b></div>
          <div>Status: <b>{latest.status}</b></div>
          <div>Paid: <b>{latest.paid_hours ?? 0}</b></div>
        </div>
      )}
    </Card>
  );
}