import Button from "../../../components/ui/Button";
import { useUiStore } from "../../../state/ui/ui.store";

function toCSV(rows) {
  const headers = ["user_id","full_name","email","role","paid_hours","absent_days","total_pay"];
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
      showToast("Export downloaded");
    } catch {
      showToast("Export failed", "error");
    }
  };

  if (!rows.length) return null;
  return <Button onClick={exportCSV}>Export CSV</Button>;
}