import Card from "../../../components/ui/Card";

export default function UserTable({ rows = [] }) {
  return (
    <div className="space-y-2">
      {rows.map((u) => (
        <Card key={u.id}>
          <div className="font-semibold">{u.full_name}</div>
          <div className="text-xs text-brand-text/70">{u.email}</div>
          <div className="text-xs text-brand-text/70">
            {u.role} | rate: {u.hourly_rate} | shift: {u.shift_code || u.shift_id || "-"}
          </div>
        </Card>
      ))}
    </div>
  );
}