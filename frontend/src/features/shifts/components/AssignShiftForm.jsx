import { useState, useEffect } from "react";
import Button from "../../../components/ui/Button";
import { shiftsApi } from "../../../api/shifts.api";
import { usersApi } from "../../../api/users.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function AssignShiftForm({ onAssigned }) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [user_id, setUserId] = useState("");
  const [shift_id, setShiftId] = useState("");

  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [usersRes, shiftsRes] = await Promise.all([
          usersApi.list(),
          shiftsApi.list(),
        ]);

        setUsers(usersRes?.users || []);
        setShifts(shiftsRes?.shifts || []);
      } catch (error) {
        showToast("Failed to load users and shifts", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const submit = async (e) => {
    e.preventDefault();

    if (!user_id || !shift_id) {
      showToast("Please select both employee and shift", "error");
      return;
    }

    setBusy(true);

    try {
      await shiftsApi.assign({
        user_id: Number(user_id),
        shift_id: Number(shift_id),
      });

      showToast("Shift assigned to user", "success");
      onAssigned?.();
    } catch (e2) {
      showToast(e2?.response?.data?.message || "Assign failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-brand-text/70">
        Loading data...
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="mb-2 text-sm text-brand-text/70">
        Please select an employee and assign a shift
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-brand-text/70">User Name</div>
          <select
            value={user_id}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-xl border border-brand-line/60 bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:border-brand-blue focus:outline-none"
          >
            <option value="">-- Select Employee --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-brand-text/70">Shift Name</div>
          <select
            value={shift_id}
            onChange={(e) => setShiftId(e.target.value)}
            className="w-full rounded-xl border border-brand-line/60 bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:border-brand-blue focus:outline-none"
          >
            <option value="">-- Select Shift --</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button disabled={busy || !user_id || !shift_id} className="mt-4 w-full">
        {busy ? "Assigning..." : "Assign Shift"}
      </Button>
    </form>
  );
}