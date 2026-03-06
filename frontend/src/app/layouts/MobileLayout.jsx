import { Outlet } from "react-router-dom";
import TopBar from "../../components/navigation/TopBar";
import BottomNav from "../../components/navigation/BottomNav";

export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text safe-area">
      <div className="mx-auto w-full max-w-md">
        <TopBar />
        <main className="px-4 pt-3 pb-28">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}