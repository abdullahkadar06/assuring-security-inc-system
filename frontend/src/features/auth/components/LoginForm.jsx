import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { authApi } from "../../../api/auth.api";
import { useAuthStore } from "../../../state/auth/auth.store";
import { useUiStore } from "../../../state/ui/ui.store";

export default function LoginForm() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showToast = useUiStore((s) => s.showToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await authApi.login({ email, password });
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
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <div className="text-sm text-brand-text/70 mb-1">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
      </div>
      <div>
        <div className="text-sm text-brand-text/70 mb-1">Password</div>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
      </div>
      <Button disabled={busy}>{busy ? "Signing in..." : "Login"}</Button>
    </form>
  );
}