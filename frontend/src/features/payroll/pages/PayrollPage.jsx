import { useEffect, useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Button from "../../../components/ui/Button";
import { payrollApi } from "../../../api/payroll.api";
import { usersApi } from "../../../api/users.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { useAuth } from "../../../hooks/useAuth";
import { useRole } from "../../../hooks/useRole";
import PayrollTable from "../components/PayrollTable";

export default function PayrollPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const [busy, setBusy] = useState(true);
  const [rows, setRows] = useState([]);

  // Admin helpers
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const selectedUser = useMemo(() => {
    const id = Number(selectedUserId || 0);
    return users.find((u) => u.id === id) || null;
  }, [selectedUserId, users]);

  const loadPayrollForUser = async (userId) => {
    const d = await payrollApi.getByUserId(userId);
    setRows(d?.payroll || []);
  };

  // Initial load
  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        // EMPLOYEE: always load self
        if (!isAdmin) {
          await loadPayrollForUser(user.id);
          return;
        }

        // ADMIN: load users list first (dropdown)
        const u = await usersApi.list();
        const list = u?.users || [];
        setUsers(list);

        // default selection: first employee/admin in list or self
        const defaultId = (list[0]?.id ?? user.id);
        setSelectedUserId(String(defaultId));

        // load payroll for default
        await loadPayrollForUser(defaultId);
      } catch (e) {
        showToast(e?.response?.data?.message || "Payroll load failed", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [isAdmin, user?.id, showToast]);

  const onAdminLoad = async () => {
    if (!selectedUserId) return showToast("Select a user", "error");
    setBusy(true);
    try {
      await loadPayrollForUser(Number(selectedUserId));
      showToast("Payroll loaded");
    } catch (e) {
      showToast(e?.response?.data?.message || "Load failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onRecalculate = async () => {
    if (!isAdmin) return;
    if (!rows.length) return showToast("No payroll rows to recalculate", "error");

    // We need an attendance_id to recalc (your backend expects attendance_id)
    // We'll take latest row attendance_id (first row) as quick action.
    const attendance_id = rows[0]?.attendance_id;
    if (!attendance_id) return showToast("Missing attendance_id", "error");

    setBusy(true);
    try {
      await payrollApi.recalculate({ attendance_id: Number(attendance_id) });
      await loadPayrollForUser(Number(selectedUserId || user.id));
      showToast("Recalculated (fixed pay)");
    } catch (e) {
      showToast(e?.response?.data?.message || "Recalculate failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loader label="Loading payroll..." />;

  return (
    <div className="space-y-3">
      {isAdmin ? (
        <Card className="space-y-2">
          <div className="text-sm text-brand-text/70">Admin: View anyone payroll</div>

          <select
            className="w-full px-4 py-3 rounded-2xl bg-brand-card border border-brand-line"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id} — {u.full_name} ({u.role})
              </option>
            ))}
          </select>

          {selectedUser && (
            <div className="text-xs text-brand-text/70">
              Selected: <b>{selectedUser.full_name}</b> — {selectedUser.email}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onAdminLoad}>Load</Button>
            <Button className="bg-brand-red border-brand-red" onClick={onRecalculate}>
              Recalculate
            </Button>
          </div>

          <div className="text-xs text-brand-text/60">
            Note: Recalculate uses latest row attendance_id (quick action).
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-sm text-brand-text/70">My Payroll</div>
          <div className="text-xs text-brand-text/60 mt-1">
            You can only view your own payroll.
          </div>
        </Card>
      )}

      <PayrollTable rows={rows} />
    </div>
  );
}