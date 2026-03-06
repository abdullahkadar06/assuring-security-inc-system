import Card from "../../../components/ui/Card";

export default function ReportTable({ rows = [] }) {
  if (!rows.length) return <Card>No report data.</Card>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.user_id}>
          <div className="font-semibold">{r.full_name}</div>
          <div className="text-xs text-brand-text/70">{r.email} | {r.role}</div>
          <div className="text-sm text-brand-text/70 mt-1">
            Paid: <b>{r.paid_hours}</b> | Absent: <b>{r.absent_days}</b> | Pay: <b>{r.total_pay}</b>
          </div>
        </Card>
      ))}
    </div>
  );
}