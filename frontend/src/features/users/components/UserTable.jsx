import { useState } from "react";
import Card from "../../../components/ui/Card";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { Trash2, Pencil, Mail, Shield, BadgeDollarSign, CalendarClock } from "lucide-react";
import { usersApi } from "../../../api/users.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function UserTable({ rows = [], reload }) {
  const showToast = useUiStore((s) => s.showToast);

  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [isActive, setIsActive] = useState(true);

  const openEdit = (user) => {
    setSelected(user);
    setFullName(user.full_name || "");
    setPhone(user.phone || "");
    setAddress(user.address || "");
    setHourlyRate(user.hourly_rate ?? 0);
    setShiftId(user.shift_id ?? "");
    setRole(user.role || "EMPLOYEE");
    setIsActive(Boolean(user.is_active));
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (busy) return;
    setEditOpen(false);
    setSelected(null);
  };

  const remove = async (id) => {
    const ok = window.confirm("Ma hubtaa inaad user-kan delete gareyneyso?");
    if (!ok) return;

    try {
      await usersApi.deleteUser(id);
      showToast("User deleted");
      await reload?.();
    } catch (e) {
      showToast(e?.response?.data?.message || "Delete failed", "error");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!selected?.id) return;

    setBusy(true);
    try {
      await usersApi.updateByAdmin(selected.id, {
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        hourly_rate: Number(hourlyRate || 0),
        shift_id: shiftId === "" ? null : Number(shiftId),
        role,
        is_active: isActive,
      });

      showToast("User updated");
      setEditOpen(false);
      setSelected(null);
      await reload?.();
    } catch (e) {
      showToast(e?.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {rows.map((u) => (
          <Card key={u.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{u.full_name}</div>

              <div className="mt-1 flex items-center gap-2 text-xs text-brand-text/70 break-all">
                <Mail size={13} className="shrink-0 text-brand-blue" />
                <span>{u.email}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-text/70">
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-amber-300" />
                  <span>{u.role}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <BadgeDollarSign size={13} className="text-emerald-400" />
                  <span>rate: {u.hourly_rate}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CalendarClock size={13} className="text-brand-blue" />
                  <span>shift: {u.shift_code || u.shift_id || "-"}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => openEdit(u)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line bg-brand-blue/15 text-brand-blue transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/60 hover:bg-brand-blue/20"
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                onClick={() => remove(u.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-300 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-500/20"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={editOpen} title="Edit User" onClose={closeEdit}>
        <form onSubmit={saveEdit} className="space-y-3">
          <div>
            <div className="mb-1 text-sm text-brand-text/70">Full name</div>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <div className="mb-1 text-sm text-brand-text/70">Phone</div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <div className="mb-1 text-sm text-brand-text/70">Address</div>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-sm text-brand-text/70">Hourly rate</div>
              <Input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            </div>

            <div>
              <div className="mb-1 text-sm text-brand-text/70">Shift ID</div>
              <Input value={shiftId} onChange={(e) => setShiftId(e.target.value)} placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-sm text-brand-text/70">Role</div>
              <select
                className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm text-brand-text/70">Status</div>
              <select
                className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3"
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
              >
                <option value="true">ACTIVE</option>
                <option value="false">DISABLED</option>
              </select>
            </div>
          </div>

          <Button disabled={busy}>{busy ? "Saving..." : "Save Changes"}</Button>
        </form>
      </Modal>
    </>
  );
}