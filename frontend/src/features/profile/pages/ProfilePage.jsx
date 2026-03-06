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

  // Profile fields
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
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

      // ⚠️ needs backend: PUT /api/users/me
      const res = await usersApi.updateMe(payload);

      // update store user (backend should return updated user)
      if (res?.user) {
        setUser(res.user);
      } else {
        // fallback: update local store from payload (if backend returns {message})
        updateUser({ phone: payload.phone, address: payload.address });
      }

      showToast("Profile updated");
    } catch (e) {
      const msg = e?.response?.data?.message || "Update failed (backend endpoint missing?)";
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
      // ⚠️ needs backend: POST /api/auth/change-password
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      setCurrentPassword("");
      setNewPassword("");
      showToast("Password changed");
    } catch (e) {
      const msg = e?.response?.data?.message || "Change password failed (backend endpoint missing?)";
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Identity */}
      <Card>
        <div className="text-sm text-brand-text/70">My Profile</div>
        <div className="mt-2 space-y-1">
          <div className="text-lg font-semibold">{user?.full_name || "-"}</div>
          <div className="text-sm text-brand-text/80">{user?.email || "-"}</div>
          <div className="text-xs text-brand-text/70">
            Role: <b>{isAdmin ? "ADMIN" : "EMPLOYEE"}</b>
          </div>
          <div className="text-xs text-brand-text/70">
            Shift ID: <b>{user?.shift_id ?? "-"}</b>
          </div>
        </div>
      </Card>

      {/* Update Phone/Address */}
      <Card className="space-y-3">
        <div className="text-sm text-brand-text/70">Update Contact</div>

        <div>
          <div className="text-sm text-brand-text/70 mb-1">Phone</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+252..." />
        </div>

        <div>
          <div className="text-sm text-brand-text/70 mb-1">Address</div>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Buurta Kala Jeexan..." />
        </div>

        <Button disabled={savingProfile || !canSaveProfile} onClick={onSaveProfile}>
          {savingProfile ? "Saving..." : "Save"}
        </Button>

        <div className="text-xs text-brand-text/60">
          Note: requires backend endpoint <b>PUT /api/users/me</b>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="space-y-3">
        <div className="text-sm text-brand-text/70">Change Password</div>

        <div>
          <div className="text-sm text-brand-text/70 mb-1">Current password</div>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <div>
          <div className="text-sm text-brand-text/70 mb-1">New password</div>
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

        <div className="text-xs text-brand-text/60">
          Note: requires backend endpoint <b>POST /api/auth/change-password</b>
        </div>
      </Card>

      {/* App status */}
      <Card>
        <div className="text-sm text-brand-text/70">App Status</div>
        <div className="mt-2 text-sm">
          Network:{" "}
          <b className={online ? "text-green-300" : "text-red-300"}>
            {online ? "Online" : "Offline"}
          </b>
        </div>
        <div className="text-xs text-brand-text/60 mt-2">
          PWA install: browser menu → “Add to Home Screen”.
        </div>
      </Card>

      <Button className="bg-brand-red border-brand-red" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}