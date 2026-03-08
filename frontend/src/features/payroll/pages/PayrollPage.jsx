import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Users,
  RefreshCw,
  Calculator,
  Mail,
} from "lucide-react";
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

  useEffect(() => {
    let isMounted = true;

    // Nidaamka Silent Auto-Retry ee ka hortagaya Database Error-ka
    const initData = async (retryCount = 1) => {
      try {
        if (!isAdmin) {
          await loadPayrollForUser(user.id);
          if (isMounted) setBusy(false);
          return;
        }

        const u = await usersApi.list();
        const list = u?.users || [];
        if (isMounted) setUsers(list);

        const defaultId = list[0]?.id ?? user.id;
        if (isMounted) setSelectedUserId(String(defaultId));

        await loadPayrollForUser(defaultId);
        if (isMounted) setBusy(false);
      } catch (e) {
        // Haddii DB uu hurdo, si aamusnaan ah ayuu dib isugu dayayaa
        if (retryCount > 0 && isMounted) {
          setTimeout(() => initData(retryCount - 1), 2500);
        } else if (isMounted) {
          showToast(e?.response?.data?.message || "Payroll load failed", "error");
          setBusy(false);
        }
      }
    };

    setBusy(true);
    initData();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, user?.id, showToast]);

  const onAdminLoad = async () => {
    if (!selectedUserId) return showToast("Select a user", "error");
    setBusy(true);
    try {
      await loadPayrollForUser(Number(selectedUserId));
      showToast("Payroll loaded successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Load failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onRecalculate = async () => {
    if (!isAdmin) return;
    if (!rows.length) return showToast("No payroll rows to recalculate", "error");

    const attendance_id = rows[0]?.attendance_id;
    if (!attendance_id) return showToast("Missing attendance_id", "error");

    setBusy(true);
    try {
      await payrollApi.recalculate({ attendance_id: Number(attendance_id) });
      await loadPayrollForUser(Number(selectedUserId || user.id));
      showToast("Payroll recalculated successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Recalculate failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loader label="Loading payroll..." />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-brand-blue">
            <Wallet size={22} />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">
              {isAdmin ? "Admin Payroll View" : "My Payroll"}
            </div>
            <div className="mt-1 text-sm text-brand-text/65">
              {isAdmin
                ? "Load and recalculate payroll records for staff."
                : "View your payroll history and payment summary."}
            </div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <Card className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <Users size={16} className="text-brand-blue" />
              <span>Select Staff Member</span>
            </div>

            <select
              className="w-full rounded-2xl border border-brand-line bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-brand-blue"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.id} — {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3 text-sm text-brand-text/75">
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-brand-blue" />
                <span>
                  Selected: <b>{selectedUser.full_name}</b> — {selectedUser.email}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
                <RefreshCw size={16} className="text-brand-blue" />
                <span>Load Payroll</span>
              </div>
              <Button onClick={onAdminLoad}>Load</Button>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
                <Calculator size={16} className="text-red-400" />
                <span>Recalculate</span>
              </div>
              <Button className="bg-brand-red border-brand-red hover:bg-red-600" onClick={onRecalculate}>
                Recalculate
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-sm text-brand-text/70">
            You can only view your own payroll records.
          </div>
        </Card>
      )}

      <div className="rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2 overflow-hidden">
        <PayrollTable rows={rows} />
      </div>
    </div>
  );
}