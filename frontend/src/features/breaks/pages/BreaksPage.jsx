import { useState } from "react";
import {
  Coffee,
  TimerReset,
  PlayCircle,
  StopCircle,
} from "lucide-react";
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
  const [breakStartISO, setBreakStartISO] = useState(null);

  const breakElapsed = breakStartISO
    ? formatDuration(now - toMs(breakStartISO))
    : "00:00:00";

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
      await breaksApi.end({});
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-amber-400">
            <Coffee size={22} />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">Break Management</div>
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
            {breakStartISO ? breakElapsed : "Not on break"}
          </div>

          <div className="mt-2 text-sm text-brand-text/60">
            {breakStartISO
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
            <Button onClick={onStart}>Start Break</Button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <StopCircle size={16} className="text-red-400" />
              <span>End Break</span>
            </div>
            <Button className="bg-brand-red border-brand-red" onClick={onEnd}>
              End Break
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}