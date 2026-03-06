import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text safe-area">
      <div className="mx-auto w-full max-w-md px-4 pt-3 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <Link className="text-sm underline text-brand-text/80" to="/">
            Back
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  );
}