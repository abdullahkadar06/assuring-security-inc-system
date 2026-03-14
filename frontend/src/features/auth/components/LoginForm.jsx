import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { authApi } from "../../../api/auth.api";
import { useAuthStore } from "../../../state/auth/auth.store";
import { useUiStore } from "../../../state/ui/ui.store";
import { isStandardEmail } from "../../../utils/format";

export default function LoginForm() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showToast = useUiStore((s) => s.showToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const onSubmit = async (e) => {
    e.preventDefault();

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

    setBusy(true);
    try {
      const data = await authApi.login({
        email: normalizedEmail,
        password,
      });

      setAuth({ token: data.token, user: data.user });
      showToast("Welcome!");
      nav("/", { replace: true });
    } catch (err) {
      showToast(err?.response?.data?.message || "Login failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
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
          autoComplete="email"
        />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Password</div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}