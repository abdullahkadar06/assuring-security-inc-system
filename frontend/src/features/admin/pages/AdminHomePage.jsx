import { Link } from "react-router-dom";
import Card from "../../../components/ui/Card";

export default function AdminHomePage() {
  const items = [
    { to: "/admin/users", label: "Users", desc: "Manage employees and admins" },
    { to: "/admin/shifts", label: "Shifts", desc: "Create and assign shifts" },
    { to: "/admin/reports", label: "Weekly Reports", desc: "Review weekly summaries" },
    { to: "/admin/payroll", label: "Payroll", desc: "Inspect payroll details" },
    { to: "/admin/settings", label: "Settings", desc: "Overtime and policies" },
    { to: "/admin/attendance-correct", label: "Attendance Correction", desc: "Patch attendance records" }
  ];

  return (
    <div className="space-y-3">
      {items.map((x) => (
        <Link key={x.to} to={x.to} className="block">
          <Card className="hover-lift">
            <div className="font-semibold">{x.label}</div>
            <div className="mt-1 text-sm text-brand-text/70">{x.desc}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}