import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useUiStore } from "../../../state/ui/ui.store";
import { authApi } from "../../../api/auth.api";

export default function UserForm({ onSaved }) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [hourly_rate, setRate] = useState(0);
  const [shift_id, setShiftId] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.register({
        full_name,
        email,
        phone: phone || undefined,
        address: address || undefined,
        password,
        role,
        hourly_rate: Number(hourly_rate || 0),
        shift_id: shift_id ? Number(shift_id) : undefined
      });
      showToast("User created");
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
        <div className="text-sm text-brand-text/70 mb-1">Full name</div>
        <Input value={full_name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Phone</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Hourly rate</div>
          <Input value={hourly_rate} onChange={(e) => setRate(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">Address</div>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Role</div>
          <select
            className="w-full px-4 py-3 rounded-2xl bg-brand-card border border-brand-line"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Shift ID</div>
          <Input value={shift_id} onChange={(e) => setShiftId(e.target.value)} placeholder="1" />
        </div>
      </div>

      <div>
        <div className="text-sm text-brand-text/70 mb-1">Password</div>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <Button disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
    </form>
  );
}