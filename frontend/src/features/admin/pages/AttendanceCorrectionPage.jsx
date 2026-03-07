import { useState } from "react";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../api/admin.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function AttendanceCorrectionPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [id, setId] = useState("");
  const [clock_in, setClockIn] = useState("");
  const [clock_out, setClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!id) return showToast("Enter attendance id", "error");
    setBusy(true);
    try {
      const payload = {};
      if (clock_in) payload.clock_in = clock_in;
      if (clock_out) payload.clock_out = clock_out;
      if (reason) payload.notes = reason;

      await adminApi.patchAttendance(Number(id), payload);
      showToast("Attendance updated");
    } catch (e) {
      showToast(e?.response?.data?.message || "Patch failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="text-sm font-semibold text-brand-text/70">Patch Attendance (ADMIN)</div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Attendance ID</div>
        <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="123" />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Clock in (ISO datetime)</div>
        <Input
          value={clock_in}
          onChange={(e) => setClockIn(e.target.value)}
          placeholder="2026-03-05T08:00:00.000Z"
        />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Clock out (ISO datetime)</div>
        <Input
          value={clock_out}
          onChange={(e) => setClockOut(e.target.value)}
          placeholder="2026-03-05T16:00:00.000Z"
        />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Correction reason</div>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason..."
        />
      </div>

      <Button disabled={busy} onClick={submit}>
        {busy ? "Saving..." : "Save"}
      </Button>
    </Card>
  );
}