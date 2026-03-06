import { useAuth } from "../../hooks/useAuth";
import { useRole } from "../../hooks/useRole";

export default function TopBar() {
  const { user, logout } = useAuth();
  const { isAdmin } = useRole();

  return (
    <header className="px-4 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-brand-text/70">ASSURING SECURITY INC</div>
          <div className="text-base font-semibold">{user?.full_name || user?.email || "User"}</div>
          <div className="text-xs text-brand-text/70">{isAdmin ? "ADMIN" : "EMPLOYEE"}</div>
        </div>

        <button className="px-3 py-2 rounded-xl bg-brand-card border border-brand-line text-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}