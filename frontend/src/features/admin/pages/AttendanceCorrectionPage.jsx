import { useState } from "react";
import {
  ShieldCheck,
  Hash,
  Clock3,
  Clock4,
  FilePenLine,
  Save,
} from "lucide-react";
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
      
      // Convert local datetime to ISO for the backend
      if (clock_in) payload.clock_in = new Date(clock_in).toISOString();
      if (clock_out) payload.clock_out = new Date(clock_out).toISOString();
      if (notes) payload.notes = notes;

      await adminApi.patchAttendance(Number(id), payload);
      showToast("Attendance updated successfully", "success");
      
      // Clear form after success
      setId("");
      setClockIn("");
      setClockOut("");
      setNotes("");
    } catch (e) {
      const msg = e?.response?.data?.message || "Patch failed";
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-red-400">
          <ShieldCheck size={22} />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">Patch Attendance</div>
          <div className="mt-1 text-sm text-brand-text/65">
            Correct attendance records using admin-level patch access.
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* Attendance ID */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Hash size={16} className="text-brand-blue" />
            <span>Attendance ID</span>
          </div>
          <Input 
            type="number"
            value={id} 
            onChange={(e) => setId(e.target.value)} 
            placeholder="e.g. 123" 
          />
        </div>

        {/* Clock In - Now with Date Picker */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Clock3 size={16} className="text-emerald-400" />
            <span>Clock In Date & Time</span>
          </div>
          <Input
            type="datetime-local"
            value={clock_in}
            onChange={(e) => setClockIn(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Clock Out - Now with Date Picker */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Clock4 size={16} className="text-amber-300" />
            <span>Clock Out Date & Time</span>
          </div>
          <Input
            type="datetime-local"
            value={clock_out}
            onChange={(e) => setClockOut(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Reason */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <FilePenLine size={16} className="text-red-400" />
            <span>Correction Reason</span>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe why you are patching this record..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button disabled={busy} onClick={submit} className="w-full">
            {busy ? "Applying Patch..." : "Save Correction"}
          </Button>
        </div>
      </div>
    </Card>
  );
}