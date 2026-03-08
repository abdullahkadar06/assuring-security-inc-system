import { Link } from "react-router-dom";
import {
  Users,
  Clock3,
  FileBarChart2,
  Wallet,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Card from "../../../components/ui/Card";

export default function AdminHomePage() {
  const items = [
    {
      to: "/admin/users",
      label: "Users",
      desc: "Manage employees and admins",
      icon: <Users size={18} className="text-brand-blue" />,
    },
    {
      to: "/admin/shifts",
      label: "Shifts",
      desc: "Create and assign shifts",
      icon: <Clock3 size={18} className="text-amber-400" />,
    },
    {
      to: "/admin/reports",
      label: "Weekly Reports",
      desc: "Review weekly summaries",
      icon: <FileBarChart2 size={18} className="text-emerald-400" />,
    },
    {
      to: "/admin/payroll",
      label: "Payroll",
      desc: "Inspect payroll details",
      icon: <Wallet size={18} className="text-brand-blue" />,
    },
    {
      to: "/admin/settings",
      label: "Settings",
      desc: "Overtime and policies",
      icon: <Settings2 size={18} className="text-purple-400" />,
    },
    {
      to: "/admin/attendance-correct",
      label: "Attendance Correction",
      desc: "Patch attendance records",
      icon: <ShieldCheck size={18} className="text-red-400" />,
    },
  ];

  return (
    <div className="space-y-4">
      {items.map((x) => (
        <Link key={x.to} to={x.to}>
          <Card className="transition-all duration-200 hover:-translate-y-[2px] hover:border-brand-blue/60 hover:shadow-soft">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35">
                {x.icon}
              </div>

              <div>
                <div className="font-semibold text-white">{x.label}</div>
                <div className="mt-1 text-sm text-brand-text/65">{x.desc}</div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}