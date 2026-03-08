import { useState, useEffect } from "react";
import { Search, User, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Input from "../../../components/ui/Input";
import { attendanceApi } from "../../../api/attendance.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function AttendanceTable() {
  const showToast = useUiStore((s) => s.showToast);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Soo jiidashada xogta (Fetching Data)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Waxaan beegsanaynaa 'list' maadaama uu yahay standard-kaaga API-ga
        const d = await attendanceApi.list(); 
        setRecords(d?.attendance || []);
      } catch (e) {
        showToast("Failed to load attendance list", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // 2. Raadinta (Search Logic)
  const filtered = records.filter(r => 
    r.user?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 text-brand-text/50 gap-3">
      <Loader2 className="animate-spin text-brand-blue" size={24} />
      <span className="text-sm">Syncing attendance records...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Meesha Raadinta (Search Bar) */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-brand-text/40 group-focus-within:text-brand-blue transition-colors">
          <Search size={18} />
        </div>
        <Input 
          placeholder="Search employee by name..." 
          className="pl-10 bg-brand-bg/20 border-brand-line/50 focus:border-brand-blue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table-ka Xogta */}
      <div className="overflow-hidden rounded-[24px] border border-brand-line/60 bg-brand-card/10 backdrop-blur-sm shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-bg/40 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-text/50">
              <tr>
                <th className="px-5 py-4">Employee Info</th>
                <th className="px-5 py-4 text-center">In / Out</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-brand-text/40 italic">
                    {search ? `No results for "${search}"` : "No attendance recorded yet today."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-blue/5 transition-all duration-200">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-sm">{r.user?.full_name}</span>
                          <span className="text-[10px] text-brand-text/50 uppercase">{r.user?.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                         <div className="flex items-center gap-1.5 text-white font-medium">
                            <Clock size={12} className="text-emerald-400" />
                            {new Date(r.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                         {r.clock_out && (
                           <div className="flex items-center gap-1.5 text-brand-text/50 text-[11px]">
                              <Clock size={11} className="text-red-400" />
                              {new Date(r.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                         )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end">
                        {r.status === "LATE" ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-red-400/10 px-3 py-1 text-[10px] font-bold text-red-400 border border-red-400/20">
                            <AlertCircle size={12} /> LATE
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-400/20">
                            <CheckCircle2 size={12} /> ON-TIME
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}