import { Outlet, Link } from "react-router-dom";
import AppLogo from "../../components/common/AppLogo";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text safe-area">
      <div className="mx-auto w-full max-w-md px-4 pt-3 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <AppLogo />

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-brand-line bg-brand-card px-4 py-2 text-sm font-semibold text-brand-text transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/60 hover:bg-brand-blue/10 hover:shadow-soft"
          >
            Back
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Manage users, shifts, payroll, and settings.
          </p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}