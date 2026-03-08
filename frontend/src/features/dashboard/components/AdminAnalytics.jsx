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
  Line
} from "recharts";
import MiniChartCard from "./MiniChartCard";

const COLORS = ["#0B3D91", "#D32F2F", "#7DD3FC", "#60A5FA"];

const FALLBACK_OVERVIEW = {
  total_staff: 24,
  present: 17,
  absent: 4,
  late: 3,
  payroll_total: 12840
};

const FALLBACK_WEEKLY = {
  weekly_activity: [
    { day: "Sat", value: 14 },
    { day: "Sun", value: 16 },
    { day: "Mon", value: 18 },
    { day: "Tue", value: 15 },
    { day: "Wed", value: 20 },
    { day: "Thu", value: 19 },
    { day: "Fri", value: 13 }
  ],
  trend: [
    { label: "W1", value: 61 },
    { label: "W2", value: 66 },
    { label: "W3", value: 72 },
    { label: "W4", value: 68 }
  ]
};

function safeOverview(data) {
  return data || FALLBACK_OVERVIEW;
}

function safeWeekly(data) {
  return data || FALLBACK_WEEKLY;
}

export default function AdminAnalytics({ overview, weekly }) {
  const ov = safeOverview(overview);
  const wk = safeWeekly(weekly);

  const distributionData = [
    { name: "Present", value: Number(ov.present || 0) },
    { name: "Absent", value: Number(ov.absent || 0) },
    { name: "Late", value: Number(ov.late || 0) }
  ].filter((x) => x.value > 0);

  const summaryCards = [
    { label: "Total Staff", value: ov.total_staff ?? 0 },
    { label: "Present Today", value: ov.present ?? 0 },
    { label: "Absent", value: ov.absent ?? 0 },
    { label: "Payroll Total", value: ov.payroll_total ?? 0 }
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
              data={distributionData.length ? distributionData : [{ name: "No Data", value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={4}
              dataKey="value"
            >
              {(distributionData.length ? distributionData : [{ name: "No Data", value: 1 }]).map(
                (_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                )
              )}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF"
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
            <XAxis dataKey="day" stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <YAxis stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF"
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
            <XAxis dataKey="label" stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <YAxis stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF"
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