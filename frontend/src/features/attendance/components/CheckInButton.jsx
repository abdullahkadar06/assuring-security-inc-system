import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import { attendanceApi } from "../../../api/attendance.api";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

function getLatestStatus(rows = []) {
  const latest = rows?.[0];
  return latest?.status || "NONE";
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
      showToast(e?.response?.data?.message || "Failed loading attendance state", "error");
    } finally {
      setLoadingState(false);
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

  const latestStatus = useMemo(() => getLatestStatus(todayRows), [todayRows]);

  const disabled = useMemo(() => {
    if (busy || loadingState) return true;
    return latestStatus === "OPEN" || latestStatus === "CLOSED";
  }, [busy, loadingState, latestStatus]);

  const buttonText = useMemo(() => {
    if (busy) return "Checking in...";
    if (loadingState) return "Loading...";
    if (latestStatus === "OPEN") return "Already Checked In";
    if (latestStatus === "CLOSED") return "Shift Closed";
    return "Clock In";
  }, [busy, loadingState, latestStatus]);

  const onClick = async () => {
    if (disabled) return;

    setBusy(true);
    try {
      await attendanceApi.clockIn({});
      showToast("Clock-in successful");
      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("break:changed"));
    } catch (e) {
      showToast(e?.response?.data?.message || "Clock-in failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button disabled={disabled} onClick={onClick}>
      {buttonText}
    </Button>
  );
}