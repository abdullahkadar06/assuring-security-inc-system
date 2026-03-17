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
      setTodayRows(Array.isArray(d?.today) ? d.today.slice(0, 1) : []);
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
  const status = String(latest?.status || "NONE").toUpperCase();

  const disabled = useMemo(() => {
    if (busy || loadingState) return true;
    return status !== "OPEN";
  }, [busy, loadingState, status]);

  const text = useMemo(() => {
    if (busy) return "Checking out...";
    if (loadingState) return "Loading...";
    if (status === "OPEN") return "Clock Out";
    if (status === "CLOSED") return "Already Closed";
    if (status === "AUTO_CLOSED") return "Auto Closed";
    return "No Open Shift";
  }, [busy, loadingState, status]);

  const onClick = async () => {
    if (disabled) return;

    try {
      setBusy(true);

      const res = await attendanceApi.clockOut({});
      showToast(res?.message || "Clock-out successful");

      window.dispatchEvent(new Event("attendance:changed"));
      window.dispatchEvent(new Event("break:changed"));
      window.dispatchEvent(new Event("payroll:changed"));
    } catch (e) {
      showToast(e?.response?.data?.message || "Clock-out failed", "error");
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
      {text}
    </Button>
  );
}