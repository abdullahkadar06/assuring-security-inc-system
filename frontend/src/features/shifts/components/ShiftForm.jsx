import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function ShiftForm({ onSaved }) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [start_time, setStart] = useState("");
  const [end_time, setEnd] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await shiftsApi.create({ code, name, start_time, end_time });
      showToast("Shift created");
      onSaved?.();
    } catch (e2) {
      showToast(e2?.response?.data?.message || "Create failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <div className="text-sm text-brand-text/70 mb-1">Code</div>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MORNING" />
      </div>
      <div>
        <div className="text-sm text-brand-text/70 mb-1">Name</div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning Shift" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Start</div>
          <Input value={start_time} onChange={(e) => setStart(e.target.value)} placeholder="08:00" />
        </div>
        <div>
          <div className="text-sm text-brand-text/70 mb-1">End</div>
          <Input value={end_time} onChange={(e) => setEnd(e.target.value)} placeholder="16:00" />
        </div>
      </div>

      <Button disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
    </form>
  );
}