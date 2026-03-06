import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

const cls = ({ isActive }) =>
  "flex-1 py-3 text-center rounded-2xl font-semibold " +
  (isActive ? "bg-brand-blue text-white" : "bg-brand-card border border-brand-line");

export default function BottomNav() {
  const { isAdmin } = useRole();

  return (
    <nav className="fixed bottom-0 left-0 right-0 safe-bottom z-40">
      <div className="mx-auto w-full max-w-md px-3 pb-3">
        <div className="bg-brand-bg/90 backdrop-blur rounded-3xl p-2 flex gap-2 border border-brand-line">
          <NavLink to="/" className={cls}>Home</NavLink>
          <NavLink to="/attendance" className={cls}>Attendance</NavLink>
          <NavLink to="/breaks" className={cls}>Breaks</NavLink>
          <NavLink to="/profile" className={cls}>Profile</NavLink>
        </div>

        {isAdmin && (
          <div className="mt-2">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                "block w-full py-3 text-center rounded-2xl font-semibold border " +
                (isActive ? "bg-brand-blue text-white border-brand-blue" : "bg-brand-card border-brand-line")
              }
            >
              Admin Panel
            </NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}