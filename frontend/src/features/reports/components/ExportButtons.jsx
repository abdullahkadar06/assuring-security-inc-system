import { Download } from "lucide-react";
import Button from "../../../components/ui/Button";
import { useUiStore } from "../../../state/ui/ui.store";

function toCSV(rows) {
  const headers = [
    "user_id",
    "full_name",
    "email",
    "role",
    "paid_hours",
    "absent_days",
    "total_pay",
  ];

  const lines = [headers.join(",")];

  for (const r of rows) {
    const vals = headers.map((h) => JSON.stringify(r[h] ?? ""));
    lines.push(vals.join(","));
  }

  return lines.join("\n");
}

export default function ExportButtons({ meta, rows = [] }) {
  const showToast = useUiStore((s) => s.showToast);

  const exportCSV = () => {
    try {
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weekly-${meta?.week_end || "export"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Export downloaded", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  if (!rows.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-semibold text-white">Export Weekly Summary</div>
        <div className="mt-1 text-xs text-brand-text/65">
          Download the currently loaded payroll week as a CSV file.
        </div>
      </div>

      <Button onClick={exportCSV} className="inline-flex items-center gap-2 md:w-auto">
        <Download size={16} />
        Export CSV
      </Button>
    </div>
  );
}