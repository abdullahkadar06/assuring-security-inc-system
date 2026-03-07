import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-[32px] border border-brand-line/70 bg-brand-card/30 p-3 shadow-soft">
          <Outlet />
        </div>
      </div>
    </div>
  );
}