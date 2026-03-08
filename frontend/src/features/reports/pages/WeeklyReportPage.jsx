import { useState } from "react";
import {
  CalendarRange,
  Download,
  CheckCircle2,
  BarChart3,
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

  const load = async () => {
    try {
      const d = await reportsApi.weekly(week_end ? { week_end } : {});
      setMeta({
        week_start: d.week_start,
        week_end: d.week_end,
        cutoff_day: d.cutoff_day,
      });
      setRows(d.summary || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Weekly load failed", "error");
    }
  };

  const finalize = async () => {
    try {
      const d = await reportsApi.finalizeWeek(week_end ? { week_end } : {});
      setMeta({
        week_start: d.week_start,
        week_end: d.week_end,
        cutoff_day: d.cutoff_day,
      });
      setRows(d.summary || []);
      showToast("Week finalized");
    } catch (e) {
      showToast(e?.response?.data?.message || "Finalize failed", "error");
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

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <CalendarRange size={16} className="text-amber-300" />
            <span>Week Ending Date</span>
          </div>

          <Input
            value={week_end}
            onChange={(e) => setWeekEnd(e.target.value)}
            placeholder="week_end (Friday) e.g 2026-03-07"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <Download size={16} className="text-brand-blue" />
              <span>Load Report</span>
            </div>
            <Button onClick={load}>Load</Button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CheckCircle2 size={16} className="text-red-400" />
              <span>Finalize</span>
            </div>
            <Button className="bg-brand-red border-brand-red" onClick={finalize}>
              Finalize
            </Button>
          </div>
        </div>

        {meta && (
          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/35 px-3 py-3 text-sm text-brand-text/70">
            {meta.week_start} → {meta.week_end} | cutoff: {meta.cutoff_day}
          </div>
        )}

        <ExportButtons meta={meta} rows={rows} />
      </Card>

      <div className="rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2">
        <ReportTable rows={rows} />
      </div>
    </div>
  );
}