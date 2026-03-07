import { useAuth } from "../../hooks/useAuth";
import AppLogo from "../common/AppLogo";

export default function TopBar() {
  const { logout } = useAuth();

  return (
    <header className="px-4 pt-4">
      <div className="flex items-center justify-between rounded-2xl border border-brand-line/60 bg-brand-card/40 backdrop-blur-md px-4 py-3 shadow-lg">

        <AppLogo />

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-brand-line bg-brand-card/60 text-sm font-semibold text-brand-text transition hover:bg-brand-blue hover:border-brand-blue hover:text-white active:scale-[0.98]"
        >
          Logout
        </button>

      </div>
    </header>
  );
}