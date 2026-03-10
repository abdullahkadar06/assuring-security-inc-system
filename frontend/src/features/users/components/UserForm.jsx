import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useUiStore } from "../../../state/ui/ui.store";
import { usersApi } from "../../../api/users.api";

export default function UserForm({ onSaved }) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [hourly_rate, setRate] = useState("0");
  const [shift_id, setShiftId] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    if (!full_name.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    if (!email.trim()) {
      showToast("Email is required", "error");
      return;
    }

    if (!password.trim()) {
      showToast("Password is required", "error");
      return;
    }

    setBusy(true);

    try {
      await usersApi.createUser({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        password: password.trim(),
        role,
        hourly_rate: Number(hourly_rate || 0),
        shift_id: shift_id ? Number(shift_id) : undefined,
      });

      showToast("User created successfully", "success");

      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setPassword("");
      setRole("EMPLOYEE");
      setRate("0");
      setShiftId("");

      onSaved?.();
    } catch (e2) {
      showToast(
        e2?.response?.data?.message || "Create failed",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <div className="mb-1 text-sm text-brand-text/70">Full name</div>
        <Input
          value={full_name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter full name"
        />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Email</div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Phone</div>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone"
          />
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Hourly rate</div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={hourly_rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Address</div>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Role</div>
          <select
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Shift ID</div>
          <Input
            type="number"
            min="1"
            value={shift_id}
            onChange={(e) => setShiftId(e.target.value)}
            placeholder="1"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Password</div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}