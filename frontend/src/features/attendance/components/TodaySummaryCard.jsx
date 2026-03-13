import { useCallback, useEffect, useState } from "react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

function formatClock(value) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHours(value) {
  return Number(value ?? 0).toFixed(2);
}

function formatBreakDuration(totalMinutes = 0) {
  const mins = Math.max(0, Number(totalMinutes || 0));

  if (mins <= 0) return "0s";

  if (mins < 1) {
    const seconds = Math.max(1, Math.round(mins * 60));
    return `${seconds}s`;
  }

  if (mins < 60) {
    return `${Math.round(mins)}m`;
  }

  const roundedMinutes = Math.round(mins);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
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
    window.addEventListener("payroll:changed", handleRefresh);

    return () => {
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
      window.removeEventListener("payroll:changed", handleRefresh);
    };
  }, [loadToday]);

  if (busy) return <Loader label="Loading today..." />;

  const latest = rows?.[0];

  return (
    <Card>
      <div className="text-sm font-semibold text-brand-text/85">
        Today Summary
      </div>

      {!latest ? (
        <div className="mt-3 text-sm text-brand-text/70">No attendance yet.</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-brand-text/65">In</div>
            <div className="font-semibold text-white">
              {formatClock(latest.clock_in)}
            </div>
          </div>

          <div>
            <div className="text-brand-text/65">Out</div>
            <div className="font-semibold text-white">
              {formatClock(latest.clock_out)}
            </div>
          </div>

          <div>
            <div className="text-brand-text/65">Status</div>
            <div className="font-semibold text-white">
              {latest.status || "NONE"}
            </div>
          </div>

          <div>
            <div className="text-brand-text/65">Paid</div>
            <div className="font-semibold text-white">
              {formatHours(latest.paid_hours)}
            </div>
          </div>

          <div>
            <div className="text-brand-text/65">Worked</div>
            <div className="font-semibold text-white">
              {formatHours(latest.total_hours)}
            </div>
          </div>

          <div>
            <div className="text-brand-text/65">Break</div>
            <div className="font-semibold text-white">
              {formatBreakDuration(latest.break_minutes)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}