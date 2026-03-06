import Card from "../../../components/ui/Card";

export default function ShiftCard({ shift }) {
  return (
    <Card>
      <div className="font-semibold">{shift.name} ({shift.code})</div>
      <div className="text-sm text-brand-text/70 mt-1">
        {shift.start_time} → {shift.end_time}
      </div>
      <div className="text-xs text-brand-text/60 mt-1">
        Grace: before {shift.grace_before_minutes}m / after {shift.grace_after_minutes}m | Active: {String(shift.is_active)}
      </div>
    </Card>
  );
}