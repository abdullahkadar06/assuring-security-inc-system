import { useMemo, useState } from "react";
import {
  CalendarRange,
  Download,
  CheckCircle2,
  BarChart3,
  Loader2,
  CalendarDays,
  BadgeDollarSign,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { reportsApi } from "../../../api/reports.api";
import { useUiStore } from "../../../state/ui/ui.store";
import ReportTable from "../components/ReportTable";
import ExportButtons from "../components/ExportButtons";

function toLocalDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateLike) {
  if (!dateLike) return "—";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getWeekStartFromFriday(weekEndValue) {
  if (!weekEndValue) return "";
  const endDate = new Date(`${weekEndValue}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) return "";

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  return toLocalDateInputValue(startDate);
}

function isFridayDate(value) {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getDay() === 5;
}

export default function WeeklyReportPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [week_end, setWeekEnd] = useState("");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [action, setAction] = useState(null);

  const selectedWeekStart = useMemo(() => getWeekStartFromFriday(week_end), [week_end]);
  const hasSelectedPeriod = Boolean(week_end && selectedWeekStart);
  const invalidFridaySelection = Boolean(week_end) && !isFridayDate(week_end);

  const load = async () => {
    if (invalidFridaySelection) {
      showToast("Please select a Friday as the payroll period end date", "error");
      return;
    }

    setAction("load");
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
      setAction(null);
    }
  };

  const finalize = async () => {
    if (invalidFridaySelection) {
      showToast("Please select a Friday as the payroll period end date", "error");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to finalize this payroll week? This action cannot be undone."
    );

    if (!confirmed) return;

    setAction("finalize");
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
      setAction(null);
    }
  };

  const loadingPreview = action === "load";
  const finalizing = action === "finalize";
  const busy = Boolean(action);

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35 text-brand-blue">
            <BarChart3 size={22} />
          </div>

          <div className="min-w-0">
            <div className="text-lg font-semibold text-white">Weekly Payroll Reports</div>
            <div className="mt-1 text-sm text-brand-text/65">
              Review, export, and finalize SAT → FRI payroll periods with a clearer start
              and end date flow.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
            <CalendarRange size={16} className="text-amber-300" />
            <span>Select Payroll Period End Date</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Period Start (Saturday)
              </div>
              <div className="flex h-12 items-center rounded-2xl border border-brand-line/70 bg-brand-card/25 px-4 text-sm text-white/90">
                {hasSelectedPeriod ? formatDisplayDate(selectedWeekStart) : "Auto-calculated"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Period End (Friday)
              </div>
              <Input
                type="date"
                value={week_end}
                onChange={(e) => setWeekEnd(e.target.value)}
                className="w-full text-white [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-brand-line/60 bg-brand-card/20 px-3 py-2">
            <CalendarDays size={16} className="mt-0.5 text-brand-blue" />
            <div className="text-xs text-brand-text/70">
              Select a <span className="font-semibold text-white">Friday</span> as the week
              ending date. The system will display the related Saturday → Friday payroll
              period.
            </div>
          </div>

          {invalidFridaySelection && (
            <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              The selected date is not a Friday. Please choose the payroll week ending Friday.
            </div>
          )}
        </div>

        {hasSelectedPeriod && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Selected Start
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {formatDisplayDate(selectedWeekStart)}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Selected End
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {formatDisplayDate(week_end)}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                <BadgeDollarSign size={14} className="text-emerald-300" />
                Payroll Window
              </div>
              <div className="mt-2 text-sm font-medium text-brand-text/85">
                Saturday → Friday
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
              <Download size={16} className="text-brand-blue" />
              <span>Preview Report</span>
            </div>

            <Button disabled={busy} onClick={load} className="w-full">
              {loadingPreview ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Loading...
                </span>
              ) : (
                "Load Weekly Report"
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
              <CheckCircle2 size={16} className="text-red-400" />
              <span>Finalize Payroll Week</span>
            </div>

            <Button
              disabled={busy}
              className="w-full border-brand-red bg-brand-red hover:bg-red-600"
              onClick={finalize}
            >
              {finalizing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Finalizing...
                </span>
              ) : (
                "Finalize Week"
              )}
            </Button>
          </div>
        </div>

        {meta && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-line/70 bg-brand-bg/35 px-4 py-4 text-sm text-brand-text/75 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Loaded Payroll Period
              </div>
              <div className="mt-1 text-sm text-white">
                <span className="font-semibold">{formatDisplayDate(meta.week_start)}</span>
                <span className="px-2 text-brand-text/50">→</span>
                <span className="font-semibold">{formatDisplayDate(meta.week_end)}</span>
              </div>
            </div>

            <div className="inline-flex w-fit items-center rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue">
              Cutoff: {meta.cutoff_day || "Friday"}
            </div>
          </div>
        )}

        <ExportButtons meta={meta} rows={rows} />
      </Card>

      <div className="overflow-hidden rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2 shadow-xl">
        <ReportTable rows={rows} />
      </div>
    </div>
  );
}