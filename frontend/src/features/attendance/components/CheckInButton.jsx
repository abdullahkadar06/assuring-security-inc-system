import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import { attendanceApi } from "../../../api/attendance.api";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

function getLatest(rows = []) {
  return rows?.[0] || null;
}

export default function CheckInButton() {
  const showToast = useUiStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [todayRows, setTodayRows] = useState([]);

  const loadToday = useCallback(async () => {
    try {
      setLoadingState(true);
      const d = await dashboardApi.meToday();
      setTodayRows(d?.today || []);
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed loading attendance state",
        "error"
      );
    } finally {
      setLoadingState(false);
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

  const latest = useMemo(() => getLatest(todayRows), [todayRows]);
  const status = latest?.status || "NONE";

  const disabled = useMemo(() => {
    if (busy || loadingState) return true;

    if (status === "OPEN") return true;
    if (status === "CLOSED") return true;
    if (status === "AUTO_CLOSED") return true;

    return false;
  }, [busy, loadingState, status]);

  const text = useMemo(() => {
    if (busy) return "Checking in...";
    if (loadingState) return "Loading...";

    if (status === "OPEN") return "Already Checked In";
    if (status === "CLOSED") return "Shift Closed";
    if (status === "AUTO_CLOSED") return "Auto Closed";

    return "Clock In";
  }, [busy, loadingState, status]);

  const onClick = async () => {
    if (disabled) return;

    try {
      setBusy(true);

      const res = await attendanceApi.clockIn({});

      showToast(res?.message || "Clock-in successful");

      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("break:changed"));
      window.dispatchEvent(new Event("payroll:changed"));
    } catch (e) {
      showToast(e?.response?.data?.message || "Clock-in failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button disabled={disabled} onClick={onClick}>
      {text}
    </Button>
  );
}