import { ClipboardCheck, LogIn, LogOut, CalendarDays, ListFilter } from "lucide-react";
import TodaySummaryCard from "../components/TodaySummaryCard";
import CheckInButton from "../components/CheckInButton";
import CheckOutButton from "../components/CheckOutButton";
import AttendanceTable from "../components/AttendanceTable"; // 🚀 SAXID: Waxaan soo dhex raacinay Table-ka

export default function AttendancePage() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="rounded-3xl border border-brand-line/70 bg-gradient-to-br from-brand-card/40 to-brand-bg/20 p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/60 text-brand-blue shadow-inner">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight">Attendance</div>
            <div className="mt-1 text-xs text-brand-text/60 leading-relaxed">
              Real-time monitoring of active shifts and daily working sessions.
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="rounded-3xl border border-brand-line/70 bg-brand-card/20 p-4">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-text/70 px-1">
          <CalendarDays size={14} className="text-brand-blue" />
          <span>Daily Performance</span>
        </div>
        <TodaySummaryCard />
      </div>

      {/* Action Buttons Group */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl border border-brand-line/70 bg-brand-card/20 p-4 hover:border-emerald-400/40 transition-colors">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase text-brand-text/70">
            <LogIn size={14} className="text-emerald-400" />
            <span>Check In</span>
          </div>
          <CheckInButton />
        </div>

        <div className="rounded-3xl border border-brand-line/70 bg-brand-card/20 p-4 hover:border-red-400/40 transition-colors">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase text-brand-text/70">
            <LogOut size={14} className="text-red-400" />
            <span>Check Out</span>
          </div>
          <CheckOutButton />
        </div>
      </div>

      {/* 🚀 QAYBTA CUSUB: Records Table with Search */}
      <div className="pt-2">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-text/70">
            <ListFilter size={14} className="text-brand-blue" />
            <span>Recent Activity</span>
          </div>
        </div>
        <AttendanceTable />
      </div>
    </div>
  );
}