import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import AppLogo from "../common/AppLogo";
import { LogOut, ChevronLeft } from "lucide-react";

export default function TopBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide back button on main navigation tabs
  const mainTabs = ['/', '/attendance', '/breaks', '/profile', '/admin'];
  const showBackBtn = !mainTabs.includes(location.pathname);

  return (
    <header className="px-4 pt-4">
      <div className="flex items-center justify-between rounded-2xl border border-brand-line/60 bg-brand-card/40 backdrop-blur-md px-4 py-3 shadow-lg">
        
        {showBackBtn ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-brand-line bg-brand-card/60 text-sm font-semibold text-brand-text transition hover:bg-brand-blue hover:border-brand-blue hover:text-white active:scale-[0.98]"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        ) : (
          <AppLogo />
        )}

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-brand-line bg-brand-card/60 text-sm font-semibold text-red-400 transition hover:bg-red-500 hover:border-red-500 hover:text-white active:scale-[0.98]"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}