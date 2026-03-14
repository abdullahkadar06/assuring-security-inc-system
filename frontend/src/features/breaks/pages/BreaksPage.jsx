import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, TimerReset, PlayCircle, StopCircle } from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import { breaksApi } from "../../../api/breaks.api";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useNow } from "../../../hooks/useNow";
import { formatDuration, toMs } from "../../../utils/format";

function getLatestStatus(rows = []) {
  return rows?.[0]?.status || "NONE";
}

export default function BreaksPage() {
  const showToast = useUiStore((s) => s.showToast);
  const now = useNow(1000);

  const [busy, setBusy] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [breakStartISO, setBreakStartISO] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);

  const loadCurrentBreakState = useCallback(async () => {
    try {
      setLoadingState(true);

      const [breakRes, todayRes] = await Promise.all([
        breaksApi.current(),
        dashboardApi.meToday(),
      ]);

      setAttendanceRows(todayRes?.today || []);

      if (
        breakRes?.current_break?.break_start &&
        !breakRes?.current_break?.break_end
      ) {
        setBreakStartISO(breakRes.current_break.break_start);
      } else {
        setBreakStartISO(null);
      }
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed loading break state",
        "error"
      );
    } finally {
      setLoadingState(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCurrentBreakState();

    const handleRefresh = () => loadCurrentBreakState();

    window.addEventListener("attendance:changed", handleRefresh);
    window.addEventListener("break:changed", handleRefresh);
    window.addEventListener("payroll:changed", handleRefresh);

    return () => {
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
      window.removeEventListener("payroll:changed", handleRefresh);
    };
  }, [loadCurrentBreakState]);

  const latestStatus = useMemo(
    () => getLatestStatus(attendanceRows),
    [attendanceRows]
  );

  const hasOpenAttendance = latestStatus === "OPEN";
  const isOnBreak = Boolean(breakStartISO);

  const breakElapsed = breakStartISO
    ? formatDuration(now - toMs(breakStartISO))
    : "00:00:00";

  const startDisabled = useMemo(() => {
    if (busy || loadingState) return true;
    if (!hasOpenAttendance) return true;
    if (isOnBreak) return true;
    return false;
  }, [busy, loadingState, hasOpenAttendance, isOnBreak]);

  const endDisabled = useMemo(() => {
    if (busy || loadingState) return true;
    if (!hasOpenAttendance) return true;
    return !isOnBreak;
  }, [busy, loadingState, hasOpenAttendance, isOnBreak]);

  const onStart = async () => {
    if (startDisabled) return;

    setBusy(true);
    try {
      const res = await breaksApi.start({});
      const b = res?.break;

      if (b?.break_start) {
        setBreakStartISO(b.break_start);
      }

      showToast(res?.message || "Break started");
      window.dispatchEvent(new Event("break:changed"));
      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("payroll:changed"));
    } catch (e) {
      showToast(e?.response?.data?.message || "Start break failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async () => {
    if (endDisabled) return;

    setBusy(true);
    try {
      const res = await breaksApi.end({});
      setBreakStartISO(null);
      showToast(res?.message || "Break ended");
      window.dispatchEvent(new Event("break:changed"));
      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("payroll:changed"));
    } catch (e) {
      showToast(e?.response?.data?.message || "End break failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loadingState && !busy) {
    return <Loader label="Loading break state..." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-amber-400">
            <Coffee size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              Break Management
            </div>
            <div className="mt-1 text-sm text-brand-text/65">
              Start and end your break while tracking its duration.
            </div>
          </div>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-text/80">
          <TimerReset size={16} className="text-brand-blue" />
          <span>Break Timer</span>
        </div>

        <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-4">
          <div className="text-3xl font-bold text-white">
            {isOnBreak ? breakElapsed : "Not on break"}
          </div>
          <div className="mt-2 text-sm text-brand-text/60">
            {!hasOpenAttendance
              ? "Clock in first before starting a break."
              : isOnBreak
                ? `Started at: ${new Date(breakStartISO).toLocaleTimeString()}`
                : "Start a break to begin timer."}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <PlayCircle size={16} className="text-emerald-400" />
              <span>Start Break</span>
            </div>
            <Button disabled={startDisabled} onClick={onStart}>
              {busy && !isOnBreak
                ? "Starting..."
                : !hasOpenAttendance
                  ? "Clock In First"
                  : isOnBreak
                    ? "Break Active"
                    : "Start Break"}
            </Button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <StopCircle size={16} className="text-red-400" />
              <span>End Break</span>
            </div>
            <Button
              className="bg-brand-red border-brand-red"
              disabled={endDisabled}
              onClick={onEnd}
            >
              {busy && isOnBreak
                ? "Ending..."
                : !hasOpenAttendance
                  ? "No Open Shift"
                  : !isOnBreak
                    ? "No Active Break"
                    : "End Break"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}