import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import { attendanceApi } from "../../../api/attendance.api";
import { dashboardApi } from "../../../api/dashboard.api";
import { useUiStore } from "../../../state/ui/ui.store";

function getLatest(rows = []) {
  return rows?.[0] || null;
}

export default function CheckOutButton() {
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
  const latestStatus = latest?.status || "NONE";

  const disabled = useMemo(() => {
    if (busy || loadingState) return true;
    return latestStatus !== "OPEN";
  }, [busy, loadingState, latestStatus]);

  const buttonText = useMemo(() => {
    if (busy) return "Checking out...";
    if (loadingState) return "Loading...";
    if (latestStatus === "CLOSED" || latestStatus === "AUTO_CLOSED") return "Already Closed";
    if (latestStatus === "NONE") return "No Open Shift";
    return "Clock Out";
  }, [busy, loadingState, latestStatus]);

  const onClick = async () => {
    if (disabled) return;

    setBusy(true);
    try {
      const res = await attendanceApi.clockOut({});

      showToast(
        res?.body?.message ||
          res?.message ||
          "Clock-out successful"
      );

      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("break:changed"));
      window.dispatchEvent(new Event("payroll:changed"));
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Clock-out failed",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      className="bg-brand-red border-brand-red"
      disabled={disabled}
      onClick={onClick}
    >
      {buttonText}
    </Button>
  );
}