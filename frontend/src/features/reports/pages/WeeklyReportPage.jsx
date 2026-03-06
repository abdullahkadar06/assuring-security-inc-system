import { useState } from "react";
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
      setMeta({ week_start: d.week_start, week_end: d.week_end, cutoff_day: d.cutoff_day });
      setRows(d.summary || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Weekly load failed", "error");
    }
  };

  const finalize = async () => {
    try {
      const d = await reportsApi.finalizeWeek(week_end ? { week_end } : {});
      setMeta({ week_start: d.week_start, week_end: d.week_end, cutoff_day: d.cutoff_day });
      setRows(d.summary || []);
      showToast("Week finalized");
    } catch (e) {
      showToast(e?.response?.data?.message || "Finalize failed", "error");
    }
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <div className="text-sm text-brand-text/70">Weekly Reports (SAT → FRI)</div>
        <Input value={week_end} onChange={(e) => setWeekEnd(e.target.value)} placeholder="week_end (Friday) e.g 2026-03-07" />
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={load}>Load</Button>
          <Button className="bg-brand-red border-brand-red" onClick={finalize}>Finalize</Button>
        </div>

        {meta && (
          <div className="text-xs text-brand-text/70">
            {meta.week_start} → {meta.week_end} | cutoff: {meta.cutoff_day}
          </div>
        )}

        <ExportButtons meta={meta} rows={rows} />
      </Card>

      <ReportTable rows={rows} />
    </div>
  );
}