import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const doc = new jsPDF();
let y = 20;
doc.text("Issues", 14, y);
y += 4;
autoTable(doc, {
  startY: y,
  head: [["Severity", "Category", "Line", "Title", "Detail"]],
  body: [["warning", "Style", "1", "Non-PEP8 function name", "Function \"findDuplicates\" uses camelCase."]],
  theme: "grid",
  styles: { fontSize: 8, cellWidth: "auto" },
  margin: { left: 14, right: 14 },
});
console.log('finalY:', doc['lastAutoTable']?.finalY);
