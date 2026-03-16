import Card from "../../../components/ui/Card";
import {
  formatHours,
  formatMoney,
  formatDateCompact,
} from "../../../utils/format";

export default function PayrollTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <Card className="space-y-2">
        <div className="text-base font-semibold text-white">No payroll records</div>
        <div className="text-sm text-brand-text/70">
          Payroll entries will appear here after attendance has been processed and
          payroll has been calculated.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <Card key={p.id} className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Payroll #{p.id}
              </div>
              <div className="mt-1 text-xs text-brand-text/60">
                Created: {formatDateCompact(p.created_at)}
              </div>
            </div>

            <div className="inline-flex w-fit items-center rounded-xl border border-brand-line/70 bg-brand-bg/30 px-3 py-1 text-xs font-semibold text-brand-text/80">
              Attendance #{p.attendance_id}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Regular Hours
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatHours(p.regular_hours)}h
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Overtime
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatHours(p.overtime_hours)}h
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Hourly Rate
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatMoney(p.hourly_rate)}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/75">
                Total Pay
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatMoney(p.total_pay)}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}