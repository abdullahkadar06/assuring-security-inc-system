import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportExcel(data, name = "dashboard") {
  const safeData =
    Array.isArray(data) && data.length ? data : [{ message: "No data available" }];

  const ws = XLSX.utils.json_to_sheet(safeData);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export function exportPDF(data, name = "dashboard") {
  const safeData =
    Array.isArray(data) && data.length ? data : [{ message: "No data available" }];

  const doc = new jsPDF();
  const headers = Object.keys(safeData[0]);
  const rows = safeData.map((item) => headers.map((h) => item[h]));

  doc.setFontSize(14);
  doc.text("Assuring Security Inc Dashboard Export", 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [11, 61, 145],
    },
  });

  doc.save(`${name}.pdf`);
}