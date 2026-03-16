import Card from "../../../components/ui/Card";
import { formatHours, formatMoney } from "../../../utils/format";

export default function ReportTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <Card className="space-y-2">
        <div className="text-base font-semibold text-white">No weekly report data</div>
        <div className="text-sm text-brand-text/70">
          Select a payroll week ending Friday, then load the report to review employee
          totals before export or finalization.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.user_id} className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">{r.full_name}</div>
              <div className="mt-1 break-all text-xs text-brand-text/65">{r.email}</div>
            </div>

            <div className="inline-flex w-fit items-center rounded-xl border border-brand-line/70 bg-brand-bg/35 px-3 py-1 text-xs font-semibold text-brand-text/80">
              {r.role}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Paid Hours
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatHours(r.paid_hours)}h
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Absent Days
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {Number(r.absent_days ?? 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line/60 bg-brand-bg/25 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
                Total Pay
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatMoney(r.total_pay)}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}