import { useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";
import { useRole } from "../../../hooks/useRole";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { useUiStore } from "../../../state/ui/ui.store";
import { usersApi } from "../../../api/users.api";
import { authApi } from "../../../api/auth.api";

export default function ProfilePage() {
  const { user, logout, setUser, updateUser } = useAuth();
  const { isAdmin } = useRole();
  const { online } = useNetworkStatus();
  const showToast = useUiStore((s) => s.showToast);

  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const canSaveProfile = useMemo(() => {
    const p = (phone || "").trim();
    const a = (address || "").trim();
    const up = (user?.phone || "").trim();
    const ua = (user?.address || "").trim();
    return p !== up || a !== ua;
  }, [phone, address, user?.phone, user?.address]);

  const onSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        phone: phone?.trim() || null,
        address: address?.trim() || null
      };

      const res = await usersApi.updateMe(payload);

      if (res?.user) {
        setUser(res.user);
      } else {
        updateUser({ phone: payload.phone, address: payload.address });
      }

      showToast("Profile updated");
    } catch (e) {
      const msg = e?.response?.data?.message || "Update failed";
      showToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      return showToast("Fill current & new password", "error");
    }

    if (newPassword.length < 6) {
      return showToast("New password must be at least 6 characters", "error");
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      setCurrentPassword("");
      setNewPassword("");
      showToast("Password changed");
    } catch (e) {
      const msg = e?.response?.data?.message || "Change password failed";
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="text-sm font-semibold text-brand-text/70">My Profile</div>

        <div className="space-y-1">
          <div className="text-xl font-bold">{user?.full_name || "-"}</div>
          <div className="text-sm text-brand-text/80 break-all">{user?.email || "-"}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3">
            <div className="text-brand-text/60">Role</div>
            <div className="mt-1 font-semibold">{isAdmin ? "ADMIN" : "EMPLOYEE"}</div>
          </div>

          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3">
            <div className="text-brand-text/60">Shift ID</div>
            <div className="mt-1 font-semibold">{user?.shift_id ?? "-"}</div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold text-brand-text/70">Update Contact</div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Phone</div>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+252..."
          />
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Address</div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Buurta Kala Jeexan..."
          />
        </div>

        <Button disabled={savingProfile || !canSaveProfile} onClick={onSaveProfile}>
          {savingProfile ? "Saving..." : "Save"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold text-brand-text/70">Change Password</div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Current password</div>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">New password</div>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <Button disabled={changingPassword} onClick={onChangePassword}>
          {changingPassword ? "Changing..." : "Change Password"}
        </Button>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-brand-text/70">App Status</div>
        <div className="mt-2 text-sm">
          Network:{" "}
          <b className={online ? "text-green-300" : "text-red-300"}>
            {online ? "Online" : "Offline"}
          </b>
        </div>
      </Card>

      <Button className="bg-brand-red border-brand-red hover:bg-red-700" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}