import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Users,
  RefreshCw,
  Calculator,
  Mail,
  BadgeDollarSign,
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
import { formatMoney } from "../../../utils/format";

export default function PayrollPage() {
  const showToast = useUiStore((s) => s.showToast);
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const [busy, setBusy] = useState(true);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [action, setAction] = useState(null);

  const selectedUser = useMemo(() => {
    const id = Number(selectedUserId || 0);
    return users.find((u) => u.id === id) || null;
  }, [selectedUserId, users]);

  const totalPayrollAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row?.total_pay || 0), 0);
  }, [rows]);

  const loadPayrollForUser = async (userId) => {
    const d = await payrollApi.getByUserId(userId);
    setRows(d?.payroll || []);
  };

  useEffect(() => {
    let isMounted = true;

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
        if (retryCount > 0 && isMounted) {
          setTimeout(() => initData(retryCount - 1), 2500);
        } else if (isMounted) {
          showToast(
            e?.response?.data?.message || "Payroll load failed",
            "error"
          );
          setBusy(false);
        }
      }
    };

    setBusy(true);
    initData();

    const handleRefresh = async () => {
      try {
        const targetUserId = Number(selectedUserId || user.id);
        await loadPayrollForUser(targetUserId);
      } catch {}
    };

    window.addEventListener("attendance:changed", handleRefresh);
    window.addEventListener("break:changed", handleRefresh);
    window.addEventListener("payroll:changed", handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener("attendance:changed", handleRefresh);
      window.removeEventListener("break:changed", handleRefresh);
      window.removeEventListener("payroll:changed", handleRefresh);
    };
  }, [isAdmin, user?.id, selectedUserId, showToast]);

  const onAdminLoad = async () => {
    if (!selectedUserId) return showToast("Select a user", "error");

    setAction("load");
    try {
      await loadPayrollForUser(Number(selectedUserId));
      showToast("Payroll loaded successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Load failed", "error");
    } finally {
      setAction(null);
    }
  };

  const onRecalculate = async () => {
    if (!isAdmin) return;
    if (!rows.length) return showToast("No payroll rows to recalculate", "error");

    const attendance_id = rows[0]?.attendance_id;
    if (!attendance_id) return showToast("Missing attendance_id", "error");

    setAction("recalculate");
    try {
      await payrollApi.recalculate({ attendance_id: Number(attendance_id) });
      await loadPayrollForUser(Number(selectedUserId || user.id));
      window.dispatchEvent(new Event("payroll:changed"));
      showToast("Payroll recalculated successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Recalculate failed", "error");
    } finally {
      setAction(null);
    }
  };

  if (busy) return <Loader label="Loading payroll..." />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4 shadow-lg shadow-black/10">
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
                ? "Load and recalculate payroll records for staff members."
                : "View your payroll history and payment summary."}
            </div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <Card className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
            Payroll Controls
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <Users size={16} className="text-brand-blue" />
              <span>Select Staff Member</span>
            </div>

            <select
              className="w-full rounded-2xl border border-brand-line bg-[#0f172a] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20"
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
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3 text-sm text-brand-text/75">
                <div className="flex items-center gap-2">
                  <Mail size={15} className="text-brand-blue" />
                  <span className="truncate">
                    <b>{selectedUser.full_name}</b>
                  </span>
                </div>
                <div className="mt-2 break-all text-xs text-brand-text/60">
                  {selectedUser.email}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3 text-sm text-brand-text/75">
                <div className="text-xs uppercase tracking-wide text-brand-text/55">
                  Payroll Records
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {rows.length}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3 text-sm text-brand-text/75">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-text/55">
                  <BadgeDollarSign size={14} className="text-emerald-400" />
                  Total Loaded Pay
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(totalPayrollAmount)}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
                <RefreshCw size={16} className="text-brand-blue" />
                <span>Load Payroll</span>
              </div>
              <Button
                onClick={onAdminLoad}
                disabled={action !== null}
                className="w-full"
              >
                {action === "load" ? "Loading..." : "Load Payroll"}
              </Button>
            </div>

            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
                <Calculator size={16} className="text-red-400" />
                <span>Recalculate</span>
              </div>
              <Button
                className="w-full border-brand-red bg-brand-red hover:bg-red-600"
                onClick={onRecalculate}
                disabled={action !== null}
              >
                {action === "recalculate" ? "Recalculating..." : "Recalculate Payroll"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="space-y-2">
          <div className="text-sm font-semibold text-white">Payroll Access</div>
          <div className="text-sm text-brand-text/70">
            You can only view your own payroll records.
          </div>
        </Card>
      )}

      <div className="overflow-hidden rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2">
        <PayrollTable rows={rows} />
      </div>
    </div>
  );
}