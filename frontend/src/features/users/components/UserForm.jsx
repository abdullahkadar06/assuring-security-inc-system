import { useEffect, useMemo, useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useUiStore } from "../../../state/ui/ui.store";
import { usersApi } from "../../../api/users.api";
import { shiftsApi } from "../../../api/shifts.api";
import { formatShiftOption } from "../../../utils/shiftFormatter";
import { isStandardEmail } from "../../../utils/format";

function getLocationPlaceholders() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz.includes("Africa")) {
    return {
      phone: "e.g. +252 63 4123456",
      address: "e.g. Jigjiga Yar, Hargeisa, Somaliland",
      hourlyRate: "e.g. 10",
    };
  }
  if (tz.includes("America")) {
    return {
      phone: "e.g. +1 720 555 1234",
      address: "e.g. 123 Main St, Denver, CO 80203",
      hourlyRate: "e.g. 18",
    };
  }
  if (tz.includes("Europe")) {
    return {
      phone: "e.g. +44 7700 900123",
      address: "e.g. 221B Baker Street, London",
      hourlyRate: "e.g. 15",
    };
  }
  return {
    phone: "e.g. +252 63 4123456",
    address: "Enter full address",
    hourlyRate: "e.g. 10",
  };
}

export default function UserForm({ onSaved }) {
  const showToast = useUiStore((s) => s.showToast);
  const placeholders = useMemo(() => getLocationPlaceholders(), []);
  const [busy, setBusy] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [shifts, setShifts] = useState([]);

  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [hourly_rate, setRate] = useState("");
  const [shift_id, setShiftId] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadShifts = async () => {
      try {
        const res = await shiftsApi.list();
        if (mounted) {
          setShifts((res?.shifts || []).filter((x) => Boolean(x.is_active)));
        }
      } catch (e) {
        if (mounted) {
          showToast(
            e?.response?.data?.message || "Failed to load shifts",
            "error"
          );
        }
      } finally {
        if (mounted) setLoadingShifts(false);
      }
    };

    loadShifts();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const normalizedEmail = email.trim().toLowerCase();

  const submit = async (e) => {
    e.preventDefault();

    if (!full_name.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    if (!normalizedEmail) {
      showToast("Email is required", "error");
      return;
    }
    if (!isStandardEmail(normalizedEmail)) {
      showToast("Enter a valid email address", "error");
      return;
    }
    if (!password.trim()) {
      showToast("Password is required", "error");
      return;
    }
    if (hourly_rate !== "" && Number(hourly_rate) < 0) {
      showToast("Hourly rate cannot be negative", "error");
      return;
    }

    setBusy(true);

    try {
      await usersApi.createUser({
        full_name: full_name.trim(),
        email: normalizedEmail,
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
      setRate("");
      setShiftId("");
      onSaved?.();
    } catch (e2) {
      showToast(e2?.response?.data?.message || "Create failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
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
          onBlur={() => {
            if (email !== normalizedEmail) setEmail(normalizedEmail);
          }}
          placeholder="name@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Phone</div>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={placeholders.phone}
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
            placeholder={placeholders.hourlyRate}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Address</div>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={placeholders.address}
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
          <div className="mb-1 text-sm text-brand-text/70">Shift</div>
          <select
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
            value={shift_id}
            onChange={(e) => setShiftId(e.target.value)}
            disabled={loadingShifts}
          >
            <option value="">
              {loadingShifts ? "Loading shifts..." : "Select shift"}
            </option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {formatShiftOption(shift)}
              </option>
            ))}
          </select>
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

      <Button type="submit" disabled={busy || loadingShifts}>
        {busy ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}