import { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import { breaksApi } from "../../../api/breaks.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useNow } from "../../../hooks/useNow";
import { formatDuration, toMs } from "../../../utils/format";

export default function BreaksPage() {
  const showToast = useUiStore((s) => s.showToast);
  const now = useNow(1000);

  const [busy, setBusy] = useState(false);

  // local timers (frontend-only)
  const [breakStartISO, setBreakStartISO] = useState(null);

  const breakElapsed = breakStartISO ? formatDuration(now - toMs(breakStartISO)) : "00:00:00";

  const onStart = async () => {
    setBusy(true);
    try {
      const res = await breaksApi.start({});
      const b = res?.break;
      if (b?.break_start) setBreakStartISO(b.break_start);
      showToast("Break started");
    } catch (e) {
      showToast(e?.response?.data?.message || "Start break failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async () => {
    setBusy(true);
    try {
      const res = await breaksApi.end({});
      const b = res?.break;
      // break ended => clear timer
      setBreakStartISO(null);
      showToast("Break ended");
    } catch (e) {
      showToast(e?.response?.data?.message || "End break failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loader label="Processing..." />;

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-sm text-brand-text/70">Break Timer</div>

        <div className="mt-2 text-2xl font-bold">
          {breakStartISO ? breakElapsed : "Not on break"}
        </div>

        <div className="mt-1 text-xs text-brand-text/60">
          {breakStartISO ? `Started at: ${new Date(breakStartISO).toLocaleTimeString()}` : "Start a break to begin timer."}
        </div>
      </Card>

      <div className="space-y-2">
        <Button onClick={onStart}>Start Break</Button>
        <Button className="bg-brand-red border-brand-red" onClick={onEnd}>
          End Break
        </Button>
      </div>
    </div>
  );
}