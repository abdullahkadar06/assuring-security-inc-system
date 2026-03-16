import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";
import {
  formatBreakMinutesPrecise,
  formatHours,
  formatDateTimeCompact,
} from "../../../utils/format";

function formatClock(value) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLatest(rows = []) {
  return rows?.[0] || null;
}

function getStatusBadge(status) {
  const normalized = String(status || "NONE").toUpperCase();

  if (normalized === "AUTO_CLOSED") {
    return {
      label: "Auto Closed",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  if (normalized === "OPEN") {
    return {
      label: "Open",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (normalized === "CLOSED") {
    return {
      label: "Closed",
      className:
        "border-brand-blue/30 bg-brand-blue/10 text-brand-blue",
    };
  }

  return {
    label: "None",
    className:
      "border-brand-line/70 bg-brand-bg/30 text-brand-text/70",
  };
}

export default function TodaySummaryCard() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [rows, setRows] = useState([]);

  const loadToday = useCallback(async () => {
    try {
      setBusy(true);
      const d = await dashboardApi.meToday();
      const normalized = Array.isArray(d?.today) ? d.today.slice(0, 1) : [];
      setRows(normalized);
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

  const latest = useMemo(() => getLatest(rows), [rows]);
  const statusBadge = useMemo(() => getStatusBadge(latest?.status), [latest?.status]);

  if (busy) return <Loader label="Loading today..." />;

  return (
    <Card className="space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-brand-text/85">
            Today Summary
          </div>
          <div className="mt-1 text-xs text-brand-text/60">
            Live attendance overview for your latest shift record
          </div>
        </div>

        <div
          className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
        >
          {statusBadge.label}
        </div>
      </div>

      {!latest ? (
        <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 px-4 py-5 text-sm text-brand-text/70">
          No attendance recorded yet for today.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3">
              <div className="text-brand-text/60">Clock In</div>
              <div className="mt-1 font-semibold text-white">
                {formatClock(latest.clock_in)}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3">
              <div className="text-brand-text/60">Clock Out</div>
              <div className="mt-1 font-semibold text-white">
                {formatClock(latest.clock_out)}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3">
              <div className="text-brand-text/60">Paid Hours</div>
              <div className="mt-1 font-semibold text-white">
                {formatHours(latest.paid_hours)}h
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3">
              <div className="text-brand-text/60">Worked Hours</div>
              <div className="mt-1 font-semibold text-white">
                {formatHours(latest.total_hours)}h
              </div>
            </div>

            <div className="col-span-2 rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-brand-text/60">Break Time</div>
                  <div className="mt-1 font-semibold text-white">
                    {formatBreakMinutesPrecise(latest.break_minutes)}
                  </div>
                </div>

                {latest.clock_in && (
                  <div className="text-right text-xs text-brand-text/55">
                    <div>Record Time</div>
                    <div className="mt-1 text-brand-text/75">
                      {formatDateTimeCompact(latest.clock_in)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}