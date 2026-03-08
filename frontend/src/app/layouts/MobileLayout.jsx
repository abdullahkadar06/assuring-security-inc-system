import { Outlet } from "react-router-dom";
import TopBar from "../../components/navigation/TopBar";
import BottomNav from "../../components/navigation/BottomNav";

export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text safe-area">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-3 pb-28">
        <div className="flex-1 rounded-[32px] border border-brand-line/60 bg-gradient-to-b from-brand-card/40 to-brand-bg shadow-xl">
          <TopBar />

          <main className="px-4 pt-4 pb-4">
            <Outlet />
          </main>
        </div>

        <div className="mt-3">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}