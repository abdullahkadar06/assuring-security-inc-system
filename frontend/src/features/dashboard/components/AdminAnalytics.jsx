import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import MiniChartCard from "./MiniChartCard";

const COLORS = ["#0B3D91", "#D32F2F", "#7DD3FC", "#60A5FA"];

function safeOverview(data) {
  return {
    total_staff: Number(data?.summary?.total_staff ?? 0),
    present: Number(data?.summary?.present ?? 0),
    absent: Number(data?.summary?.absent ?? 0),
    late: Number(data?.summary?.late ?? 0),
  };
}

function safeWeekly(data) {
  const summary = data?.summary || {};

  return {
    worked_hours: Number(summary.worked_hours ?? 0),
    paid_hours: Number(summary.paid_hours ?? 0),
    total_pay: Number(summary.total_pay ?? 0),
    late_count: Number(summary.late_count ?? 0),
    weekly_activity: [
      { day: "Worked", value: Number(summary.worked_hours ?? 0) },
      { day: "Paid", value: Number(summary.paid_hours ?? 0) },
      { day: "Late", value: Number(summary.late_count ?? 0) },
    ],
    trend: [
      { label: "Staff", value: Number(data?.summary?.worked_hours ?? 0) },
      { label: "Pay", value: Number(data?.summary?.paid_hours ?? 0) },
      { label: "Total", value: Number(data?.summary?.total_pay ?? 0) / 10 },
    ],
  };
}

export default function AdminAnalytics({ overview, weekly }) {
  const ov = safeOverview(overview);
  const wk = safeWeekly(weekly);

  const distributionData = [
    { name: "Present", value: ov.present },
    { name: "Absent", value: ov.absent },
    { name: "Late", value: ov.late },
  ].filter((x) => x.value > 0);

  const summaryCards = [
    { label: "Total Staff", value: ov.total_staff },
    { label: "Present Today", value: ov.present },
    { label: "Absent", value: ov.absent },
    { label: "Late", value: ov.late },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-brand-line/70 bg-brand-card/35 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/50 hover:shadow-soft"
          >
            <div className="text-xs text-brand-text/60">{item.label}</div>
            <div className="mt-2 text-xl font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <MiniChartCard
        title="Staff Attendance Overview"
        subtitle="Present / absent / late distribution"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={
                distributionData.length
                  ? distributionData
                  : [{ name: "No Data", value: 1 }]
              }
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={4}
              dataKey="value"
            >
              {(distributionData.length
                ? distributionData
                : [{ name: "No Data", value: 1 }]
              ).map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </MiniChartCard>

      <MiniChartCard
        title="Weekly Activity"
        subtitle="System-wide weekly attendance activity"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wk.weekly_activity || []}>
            <CartesianGrid stroke="#1D2A44" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke="#EAF0FF"
              tick={{ fill: "#EAF0FF", fontSize: 12 }}
            />
            <YAxis
              stroke="#EAF0FF"
              tick={{ fill: "#EAF0FF", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF",
              }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0B3D91" />
          </BarChart>
        </ResponsiveContainer>
      </MiniChartCard>

      <MiniChartCard
        title="Attendance Trend"
        subtitle="Recent system-wide attendance trend"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={wk.trend || []}>
            <CartesianGrid stroke="#1D2A44" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#EAF0FF"
              tick={{ fill: "#EAF0FF", fontSize: 12 }}
            />
            <YAxis
              stroke="#EAF0FF"
              tick={{ fill: "#EAF0FF", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7DD3FC"
              strokeWidth={3}
              dot={{ r: 4, fill: "#7DD3FC" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </MiniChartCard>
    </div>
  );
}