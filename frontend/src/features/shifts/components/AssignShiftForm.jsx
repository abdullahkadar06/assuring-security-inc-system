import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function AssignShiftForm({ onAssigned }) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const [user_id, setUserId] = useState("");
  const [shift_id, setShiftId] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await shiftsApi.assign({ user_id: Number(user_id), shift_id: Number(shift_id) });
      showToast("Shift assigned to user");
      onAssigned?.();
    } catch (e2) {
      showToast(e2?.response?.data?.message || "Assign failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm text-brand-text/70">Assign Shift</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-brand-text/70 mb-1">User ID</div>
          <Input value={user_id} onChange={(e) => setUserId(e.target.value)} placeholder="1" />
        </div>
        <div>
          <div className="text-xs text-brand-text/70 mb-1">Shift ID</div>
          <Input value={shift_id} onChange={(e) => setShiftId(e.target.value)} placeholder="1" />
        </div>
      </div>
      <Button disabled={busy}>{busy ? "Assigning..." : "Assign"}</Button>
    </form>
  );
}