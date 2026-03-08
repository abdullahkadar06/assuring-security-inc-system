import { useState } from "react";
import {
  CalendarRange,
  Download,
  CheckCircle2,
  BarChart3,
  Loader2,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { reportsApi } from "../../../api/reports.api";
import { useUiStore } from "../../../state/ui/ui.store";
import ReportTable from "../components/ReportTable";
import ExportButtons from "../components/ExportButtons";

export default function WeeklyReportPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [week_end, setWeekEnd] = useState("");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false); // Loading state cusub

  const load = async () => {
    setBusy(true);
    try {
      const d = await reportsApi.weekly(week_end ? { week_end } : {});
      setMeta({
        week_start: d.week_start,
        week_end: d.week_end,
        cutoff_day: d.cutoff_day,
      });
      setRows(d.summary || []);
      showToast("Report loaded successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Weekly load failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!window.confirm("Are you sure you want to finalize this week? This action cannot be undone.")) return;
    
    setBusy(true);
    try {
      const d = await reportsApi.finalizeWeek(week_end ? { week_end } : {});
      setMeta({
        week_start: d.week_start,
        week_end: d.week_end,
        cutoff_day: d.cutoff_day,
      });
      setRows(d.summary || []);
      showToast("Week finalized successfully", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Finalize failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35 text-brand-blue">
            <BarChart3 size={22} />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">Weekly Reports</div>
            <div className="mt-1 text-sm text-brand-text/65">
              Load and finalize SAT → FRI payroll report periods.
            </div>
          </div>
        </div>

        {/* Date Picker Section */}
        <div className="pt-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <CalendarRange size={16} className="text-amber-300" />
            <span>Select Week Ending Date (Friday)</span>
          </div>

          <Input
            type="date"
            value={week_end}
            onChange={(e) => setWeekEnd(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <Download size={16} className="text-brand-blue" />
              <span>Preview</span>
            </div>
            <Button disabled={busy} onClick={load} className="w-full">
              {busy ? <Loader2 className="animate-spin" size={18} /> : "Load"}
            </Button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CheckCircle2 size={16} className="text-red-400" />
              <span>Finalize Week</span>
            </div>
            <Button 
              disabled={busy} 
              className="bg-brand-red border-brand-red hover:bg-red-600 w-full" 
              onClick={finalize}
            >
              Finalize
            </Button>
          </div>
        </div>

        {meta && (
          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 px-4 py-3 text-sm text-brand-text/75 flex justify-between items-center">
            <span>Period: <b>{meta.week_start}</b> → <b>{meta.week_end}</b></span>
            <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-lg">Cutoff: {meta.cutoff_day}</span>
          </div>
        )}

        <ExportButtons meta={meta} rows={rows} />
      </Card>

      <div className="rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2 overflow-hidden shadow-xl">
        <ReportTable rows={rows} />
      </div>
    </div>
  );
}