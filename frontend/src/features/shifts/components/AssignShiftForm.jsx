import { useState, useEffect } from "react";
import { UserCheck, Clock, ListChecks } from "lucide-react";
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
    (async () => {
      try {
        const [u, s] = await Promise.all([usersApi.list(), shiftsApi.list()]);
        setUsers(u?.users || []);
        setShifts(s?.shifts || []);
      } catch { showToast("Data sync failed", "error"); }
      finally { setLoading(false); }
    })();
  }, [showToast]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await shiftsApi.assign({ user_id: Number(user_id), shift_id: Number(shift_id) });
      showToast("Shift updated for employee", "success");
      onAssigned?.();
    } catch (err) { showToast(err?.response?.data?.message || "Assignment failed", "error"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-4 text-center animate-pulse text-brand-blue">Syncing database...</div>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-4 p-1">
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text/60">
            <UserCheck size={14} className="text-brand-blue" /> Choose Employee
          </label>
          <select value={user_id} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-2xl border border-brand-line/60 bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-brand-blue transition-all">
            <option value="">-- Select Person --</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
          </select>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text/60">
            <Clock size={14} className="text-amber-400" /> Target Work Shift
          </label>
          <select value={shift_id} onChange={(e) => setShiftId(e.target.value)} className="w-full rounded-2xl border border-brand-line/60 bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-brand-blue transition-all">
            <option value="">-- Select Shift --</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
      </div>

      <Button disabled={busy || !user_id || !shift_id} className="w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-brand-blue/10">
        <ListChecks size={18} /> {busy ? "Updating..." : "Confirm Assignment"}
      </Button>
    </form>
  );
}