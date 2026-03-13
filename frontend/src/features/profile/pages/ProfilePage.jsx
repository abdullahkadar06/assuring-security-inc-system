import { useMemo, useState } from "react";
import {
  UserRound,
  Shield,
  Clock3,
  Phone,
  MapPin,
  KeyRound,
  Wifi,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";
import { useRole } from "../../../hooks/useRole";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { useUiStore } from "../../../state/ui/ui.store";
import { usersApi } from "../../../api/users.api";
import { authApi } from "../../../api/auth.api";
import { formatUserShift } from "../../../utils/shiftFormatter";

export default function ProfilePage() {
  const { user, setUser, updateUser } = useAuth();
  const { isAdmin } = useRole();
  const { online } = useNetworkStatus();
  const showToast = useUiStore((s) => s.showToast);

  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        address: address?.trim() || null,
      };

      const res = await usersApi.updateMe(payload);

      if (res?.user) {
        setUser(res.user);
      } else {
        updateUser({ phone: payload.phone, address: payload.address });
      }

      showToast("Profile updated successfully", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Update failed";
      showToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return showToast("Please fill all password fields", "error");
    }

    if (newPassword !== confirmPassword) {
      return showToast("New passwords do not match!", "error");
    }

    if (newPassword.length < 6) {
      return showToast("New password must be at least 6 characters", "error");
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Password change failed";
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const shiftDisplay = formatUserShift(user);

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-brand-blue">
            <UserRound size={22} />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">My Profile</div>
            <div className="mt-1 text-sm text-brand-text/65">
              View your profile details and account information.
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xl font-bold">{user?.full_name || "-"}</div>
          <div className="break-all text-sm text-brand-text/80">
            {user?.email || "-"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3">
            <div className="mb-1 flex items-center gap-2 text-brand-text/60">
              <Shield size={14} className="text-amber-300" />
              <span>Role</span>
            </div>
            <div className="font-semibold">{isAdmin ? "ADMIN" : "EMPLOYEE"}</div>
          </div>

          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 p-3">
            <div className="mb-1 flex items-center gap-2 text-brand-text/60">
              <Clock3 size={14} className="text-brand-blue" />
              <span>Shift</span>
            </div>
            <div className="font-semibold">{shiftDisplay}</div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold text-brand-text/70">
          Contact Information
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Phone size={16} className="text-brand-blue" />
            <span>Phone Number</span>
          </div>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +252 63 4123456"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <MapPin size={16} className="text-emerald-400" />
            <span>Address</span>
          </div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your full address..."
          />
        </div>

        <Button disabled={savingProfile || !canSaveProfile} onClick={onSaveProfile}>
          {savingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold text-brand-text/70">
          Change Password
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <KeyRound size={16} className="text-amber-300" />
            <span>Current Password</span>
          </div>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <KeyRound size={16} className="text-emerald-400" />
            <span>New Password</span>
          </div>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <KeyRound size={16} className="text-red-400" />
            <span>Confirm New Password</span>
          </div>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        <Button disabled={changingPassword} onClick={onChangePassword}>
          {changingPassword ? "Updating..." : "Update Password"}
        </Button>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-brand-text/70">System Status</div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Wifi size={16} className={online ? "text-green-300" : "text-red-400"} />
          <span>
            Network:{" "}
            <b className={online ? "text-green-300" : "text-red-400"}>
              {online ? "Online" : "Offline"}
            </b>
          </span>
        </div>
      </Card>
    </div>
  );
}