import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

const baseItem =
  "flex-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-soft active:translate-y-0";

const navItemClass = ({ isActive }) =>
  [
    baseItem,
    isActive
      ? "border-brand-blue bg-brand-blue text-white shadow-soft"
      : "border-brand-line bg-brand-card text-brand-text hover:border-brand-blue/50 hover:bg-brand-blue/10"
  ].join(" ");

export default function BottomNav() {
  const { isAdmin } = useRole();

  return (
    <nav className="fixed bottom-0 left-0 right-0 safe-bottom z-40">
      <div className="mx-auto w-full max-w-md px-3 pb-3">
        <div className="rounded-[28px] border border-brand-line/80 bg-brand-bg/90 p-2 shadow-soft backdrop-blur">
          <div className="flex gap-2">
            <NavLink to="/" className={navItemClass}>
              Home
            </NavLink>
            <NavLink to="/attendance" className={navItemClass}>
              Attendance
            </NavLink>
            <NavLink to="/breaks" className={navItemClass}>
              Breaks
            </NavLink>
            <NavLink to="/profile" className={navItemClass}>
              Profile
            </NavLink>
          </div>

          {isAdmin && (
            <div className="mt-2 border-t border-brand-line/70 pt-2">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  [
                    "block w-full rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] hover:shadow-soft active:translate-y-0",
                    isActive
                      ? "border-brand-blue bg-brand-blue text-white shadow-soft"
                      : "border-brand-line bg-brand-card text-brand-text hover:border-brand-blue/50 hover:bg-brand-blue/10"
                  ].join(" ")
                }
              >
                Admin Panel
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}