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
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!id) return showToast("Enter attendance id", "error");
    setBusy(true);
    try {
      const payload = {};
      if (clock_in) payload.clock_in = clock_in;
      if (clock_out) payload.clock_out = clock_out;
      if (notes) payload.notes = notes;

      await adminApi.patchAttendance(Number(id), payload);
      showToast("Attendance updated");
    } catch (e) {
      showToast(e?.response?.data?.message || "Patch failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="text-sm text-brand-text/70">Patch Attendance (ADMIN)</div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">Attendance ID</div>
        <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="123" />
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">clock_in (ISO datetime)</div>
        <Input value={clock_in} onChange={(e) => setClockIn(e.target.value)} placeholder="2026-03-05T08:00:00.000Z" />
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">clock_out (ISO datetime)</div>
        <Input value={clock_out} onChange={(e) => setClockOut(e.target.value)} placeholder="2026-03-05T16:00:00.000Z" />
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">notes</div>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason..." />
      </div>

      <Button disabled={busy} onClick={submit}>{busy ? "Saving..." : "Save"}</Button>
    </Card>
  );
}