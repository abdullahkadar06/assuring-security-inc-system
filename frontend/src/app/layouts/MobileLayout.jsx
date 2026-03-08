import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";
// 🚀 SAXID: Laba dhibcood ayaa loo baahnaa si loo gaaro components
import TopBar from "../../components/navigation/TopBar";
import BottomNav from "../../components/navigation/BottomNav";

const SWIPE_ROUTES = ["/", "/attendance", "/breaks", "/profile"];

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const currentIndex = SWIPE_ROUTES.indexOf(location.pathname);

  const isInteractiveElement = (target) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest('input, textarea, select, button, a, [role="button"], [data-no-swipe="true"]');
  };

  const onTouchStart = (e) => {
    const target = e.target;
    if (isInteractiveElement(target)) return;
    const touch = e.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const onTouchEnd = (e) => {
    const target = e.target;
    if (isInteractiveElement(target)) return;
    if (currentIndex === -1) return;

    const deltaX = touchEndX.current - touchStartX.current;
    const absX = Math.abs(deltaX);

    if (absX < 60) return;

    if (deltaX < 0 && currentIndex < SWIPE_ROUTES.length - 1) {
      navigate(SWIPE_ROUTES[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      navigate(SWIPE_ROUTES[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text safe-area" onTouchEnd={onTouchEnd} onTouchMove={(e) => {
      const touch = e.changedTouches[0];
      touchEndX.current = touch.clientX;
      touchEndY.current = touch.clientY;
    }} onTouchStart={onTouchStart}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-3 pb-28">
        <div className="flex-1 rounded-[32px] overflow-hidden border border-brand-line/60 bg-gradient-to-b from-brand-card/40 to-brand-bg shadow-xl">
          <TopBar />
          <main className="px-4 pt-4 pb-4 h-full"><Outlet /></main>
        </div>
        <div className="mt-3"><BottomNav /></div>
      </div>
    </div>
  );
}