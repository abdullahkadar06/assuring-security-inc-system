import { useState, useEffect, useMemo } from "react";
import { UserCheck, Clock, ListChecks, ShieldCheck } from "lucide-react";
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
    let mounted = true;

    (async () => {
      try {
        const [u, s] = await Promise.all([usersApi.list(), shiftsApi.list()]);

        if (!mounted) return;

        setUsers(u?.users || []);
        setShifts((s?.shifts || []).filter((x) => Boolean(x.is_active)));
      } catch (err) {
        if (mounted) {
          showToast(
            err?.response?.data?.message || "Data sync failed",
            "error"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const selectedUser = useMemo(() => {
    const id = Number(user_id || 0);
    return users.find((u) => u.id === id) || null;
  }, [user_id, users]);

  const selectedShift = useMemo(() => {
    const id = Number(shift_id || 0);
    return shifts.find((s) => s.id === id) || null;
  }, [shift_id, shifts]);

  const submit = async (e) => {
    e.preventDefault();

    if (!user_id) {
      showToast("Please select employee", "error");
      return;
    }

    if (!shift_id) {
      showToast("Please select shift", "error");
      return;
    }

    setBusy(true);

    try {
      await shiftsApi.assign({
        user_id: Number(user_id),
        shift_id: Number(shift_id),
      });

      showToast("Shift assigned successfully", "success");
      onAssigned?.();
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Assignment failed",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-brand-blue animate-pulse">
        Syncing database...
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text/60">
            <UserCheck size={14} className="text-brand-blue" />
            Choose Employee
          </label>

          <select
            value={user_id}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-2xl border border-brand-line/60 bg-brand-card px-4 py-3 text-white outline-none transition-all duration-200 focus:border-brand-blue"
          >
            <option value="">-- Select Person --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text/60">
            <Clock size={14} className="text-amber-400" />
            Target Work Shift
          </label>

          <select
            value={shift_id}
            onChange={(e) => setShiftId(e.target.value)}
            className="w-full rounded-2xl border border-brand-line/60 bg-brand-card px-4 py-3 text-white outline-none transition-all duration-200 focus:border-brand-blue"
          >
            <option value="">-- Select Shift --</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) • {String(s.start_time).slice(0, 5)} →{" "}
                {String(s.end_time).slice(0, 5)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(selectedUser || selectedShift) && (
        <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 p-3 text-sm text-brand-text/75">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>
              {selectedUser ? (
                <>
                  Employee: <b>{selectedUser.full_name}</b>
                </>
              ) : (
                "Employee not selected"
              )}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Clock size={15} className="text-brand-blue" />
            <span>
              {selectedShift ? (
                <>
                  Shift: <b>{selectedShift.name}</b> ({selectedShift.code}) —{" "}
                  {String(selectedShift.start_time).slice(0, 5)} →{" "}
                  {String(selectedShift.end_time).slice(0, 5)}
                </>
              ) : (
                "Shift not selected"
              )}
            </span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={busy || !user_id || !shift_id}
        className="flex w-full items-center justify-center gap-2 py-3 shadow-lg shadow-brand-blue/10"
      >
        <ListChecks size={18} />
        {busy ? "Updating..." : "Confirm Assignment"}
      </Button>
    </form>
  );
}