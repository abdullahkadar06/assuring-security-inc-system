import Card from "../../../components/ui/Card";

export default function PayrollTable({ rows = [] }) {
  if (!rows.length) return <Card>No payroll records.</Card>;

  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Payroll #{p.id}</div>
            <div className="text-xs text-brand-text/60">
              {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
            </div>
          </div>

          <div className="text-sm text-brand-text/70 mt-2">
            Attendance ID: <b>{p.attendance_id}</b>
          </div>

          <div className="text-sm text-brand-text/70 mt-1">
            Regular: <b>{p.regular_hours}</b> | OT: <b>{p.overtime_hours}</b>
          </div>

          <div className="text-sm text-brand-text/70 mt-1">
            Rate: <b>{p.hourly_rate}</b> | Total: <b>{p.total_pay}</b>
          </div>
        </Card>
      ))}
    </div>
  );
}