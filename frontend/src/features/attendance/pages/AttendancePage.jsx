import { ClipboardCheck, LogIn, LogOut, CalendarDays } from "lucide-react";
import TodaySummaryCard from "../components/TodaySummaryCard";
import CheckInButton from "../components/CheckInButton";
import CheckOutButton from "../components/CheckOutButton";

export default function AttendancePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-brand-blue">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">Attendance</div>
            <div className="mt-1 text-sm text-brand-text/65">
              Manage today attendance, shift status, and working session.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/20 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
          <CalendarDays size={16} className="text-brand-blue" />
          <span>Today Summary</span>
        </div>
        <TodaySummaryCard />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-2xl border border-brand-line/70 bg-brand-card/20 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
            <LogIn size={16} className="text-emerald-400" />
            <span>Start Shift</span>
          </div>
          <CheckInButton />
        </div>

        <div className="rounded-2xl border border-brand-line/70 bg-brand-card/20 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
            <LogOut size={16} className="text-red-400" />
            <span>End Shift</span>
          </div>
          <CheckOutButton />
        </div>
      </div>
    </div>
  );
}