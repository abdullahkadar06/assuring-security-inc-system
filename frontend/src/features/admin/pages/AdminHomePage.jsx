import { Link } from "react-router-dom";
import Card from "../../../components/ui/Card";

export default function AdminHomePage() {
  const items = [
    { to: "/admin/users", label: "Users" },
    { to: "/admin/shifts", label: "Shifts" },
    { to: "/admin/reports", label: "Weekly Reports" },
    { to: "/admin/payroll", label: "Payroll" },
    { to: "/admin/settings", label: "Settings (Overtime)" },
    { to: "/admin/attendance-correct", label: "Attendance Correction" }
  ];

  return (
    <div className="space-y-3">
      {items.map((x) => (
        <Link key={x.to} to={x.to}>
          <Card className="active:scale-[0.99] transition">
            <div className="font-semibold">{x.label}</div>
            <div className="text-sm text-brand-text/70">Open</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}