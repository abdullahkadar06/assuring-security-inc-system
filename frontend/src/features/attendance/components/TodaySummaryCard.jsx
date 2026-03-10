import { useCallback, useEffect, useState } from "react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

function formatClock(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
}

function formatPaid(value) {
  return Number(value ?? 0).toFixed(2);
}

export default function TodaySummaryCard() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [rows, setRows] = useState([]);

  const loadToday = useCallback(async () => {
    try {
      setBusy(true);
      const d = await dashboardApi.meToday();
      setRows(d?.today || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed loading today", "error");
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadToday();

    const handleRefresh = () => loadToday();
    window.addEventListener("attendance:changed", handleRefresh);
    window.addEventListener("break:changed", handleRefresh);

    return () => {
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
    };
  }, [loadToday]);

  if (busy) return <Loader label="Loading today..." />;

  const latest = rows?.[0];

  return (
    <Card>
      <div className="text-sm text-brand-text/70">Today</div>

      {!latest ? (
        <div className="mt-2 text-sm">No attendance yet.</div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            In: <b>{formatClock(latest.clock_in)}</b>
          </div>

          <div>
            Out: <b>{formatClock(latest.clock_out)}</b>
          </div>

          <div>
            Status: <b>{latest.status}</b>
          </div>

          <div>
            Paid: <b>{formatPaid(latest.paid_hours)}</b>
          </div>
        </div>
      )}
    </Card>
  );
}