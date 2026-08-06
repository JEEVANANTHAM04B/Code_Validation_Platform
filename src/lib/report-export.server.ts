import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType } from "docx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { Language, ValidationReport } from "./validation-types";

export interface ExportSubmission {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  language: Language;
  question: string;
  expectedOutput?: string | null;
  code: string;
  report: ValidationReport;
  createdAt: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function generateDocxReport(submission: ExportSubmission): Promise<Buffer> {
  const { report, code, language, question, expectedOutput, employeeName, employeeCode, department, createdAt } = submission;

  const sections: (Paragraph | Table)[] = [
    new Paragraph({
      text: "Smart Code Validator — Validation Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: `Generated: ${formatDate(createdAt)}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Submission Details", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Employee Name")] }), new TableCell({ children: [new Paragraph(employeeName)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Employee ID")] }), new TableCell({ children: [new Paragraph(employeeCode)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Department")] }), new TableCell({ children: [new Paragraph(department)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Language")] }), new TableCell({ children: [new Paragraph(language.toUpperCase())] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Verdict")] }), new TableCell({ children: [new Paragraph(report.verdict.toUpperCase())] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph("Overall Score")] }), new TableCell({ children: [new Paragraph(`${report.scores.overall}/100`)] })] }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Question", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: question }),
  ];

  if (expectedOutput) {
    sections.push(new Paragraph({ text: "" }));
    sections.push(new Paragraph({ text: "Expected Output", heading: HeadingLevel.HEADING_2 }));
    sections.push(new Paragraph({ text: expectedOutput, style: "Code" }));
  }

  sections.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Submitted Code", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: code, style: "Code" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Score Breakdown", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Logic")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.logic))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Syntax")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.syntax))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Code Quality")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.quality))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Efficiency")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.efficiency))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Best Practices")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.bestPractices))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Output Match")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.outputMatch))] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Readability")] }),
            new TableCell({ children: [new Paragraph(String(report.scores.readability))] }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Execution Result", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Output: ${report.execution.output || "(no output)"}`, style: "Code" }),
  );

  if (report.execution.error) {
    sections.push(new Paragraph({ text: `Error: ${report.execution.error}`, style: "Code" }));
  }

  sections.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Complexity & Difficulty", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Time Complexity: ${report.complexity.time} — ${report.complexity.timeExplanation}` }),
    new Paragraph({ text: `Space Complexity: ${report.complexity.space} — ${report.complexity.spaceExplanation}` }),
    new Paragraph({ text: `Difficulty: ${report.difficulty.level} (${report.difficulty.score}/100)` }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Issues", heading: HeadingLevel.HEADING_1 }),
  );

  if (report.issues.length === 0) {
    sections.push(new Paragraph({ text: "No issues reported." }));
  } else {
    sections.push(
      new Table({
        rows: report.issues.map(
          (issue) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(issue.severity)] }),
                new TableCell({ children: [new Paragraph(issue.category)] }),
                new TableCell({ children: [new Paragraph(issue.line != null ? `Line ${issue.line}` : "—")] }),
                new TableCell({ children: [new Paragraph(issue.title)] }),
                new TableCell({ children: [new Paragraph(issue.detail)] }),
                new TableCell({ children: [new Paragraph(issue.fix)] }),
              ],
            }),
        ),
      }),
    );
  }

  sections.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "What Is Wrong", heading: HeadingLevel.HEADING_1 }),
    ...report.whatIsWrong.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "How To Fix", heading: HeadingLevel.HEADING_1 }),
    ...report.howToFix.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Better Approach", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: report.betterApproach || "Not provided." }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Learning Notes", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "Concepts", heading: HeadingLevel.HEADING_2 }),
    ...report.learning.concepts.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: "Best Practices", heading: HeadingLevel.HEADING_2 }),
    ...report.learning.bestPractices.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: "Common Mistakes", heading: HeadingLevel.HEADING_2 }),
    ...report.learning.commonMistakes.map((item) => new Paragraph({ text: `• ${item}` })),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections as Paragraph[],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function generatePdfReport(submission: ExportSubmission): Uint8Array {
  const { report, code, question, expectedOutput, employeeName, employeeCode, department, createdAt } = submission;
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.text("Smart Code Validator — Validation Report", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(createdAt)}`, margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text("Submission Details", margin, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    body: [
      ["Employee Name", employeeName],
      ["Employee ID", employeeCode],
      ["Department", department],
      ["Language", submission.language.toUpperCase()],
      ["Verdict", report.verdict.toUpperCase()],
      ["Overall Score", `${report.scores.overall}/100`],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;

  doc.setFontSize(12);
  doc.text("Question", margin, y);
  y += 6;
  doc.setFontSize(10);
  const questionLines = doc.splitTextToSize(question, 180);
  doc.text(questionLines, margin, y);
  y += questionLines.length * 5 + 6;

  if (expectedOutput) {
    doc.setFontSize(12);
    doc.text("Expected Output", margin, y);
    y += 6;
    doc.setFontSize(9);
    const expLines = doc.splitTextToSize(expectedOutput, 180);
    doc.text(expLines, margin, y);
    y += expLines.length * 4 + 6;
  }

  doc.setFontSize(12);
  doc.text("Submitted Code", margin, y);
  y += 6;
  doc.setFontSize(8);
  const codeLines = doc.splitTextToSize(code, 180);
  doc.text(codeLines, margin, y);
  y += codeLines.length * 3.5 + 6;

  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Score Breakdown", margin, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    body: [
      ["Logic", String(report.scores.logic)],
      ["Syntax", String(report.scores.syntax)],
      ["Code Quality", String(report.scores.quality)],
      ["Efficiency", String(report.scores.efficiency)],
      ["Best Practices", String(report.scores.bestPractices)],
      ["Output Match", String(report.scores.outputMatch)],
      ["Readability", String(report.scores.readability)],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Execution Result", margin, y);
  y += 6;
  doc.setFontSize(9);
  const outputLines = doc.splitTextToSize(`Output: ${report.execution.output || "(no output)"}`, 180);
  doc.text(outputLines, margin, y);
  y += outputLines.length * 4 + 4;

  if (report.execution.error) {
    const errorLines = doc.splitTextToSize(`Error: ${report.execution.error}`, 180);
    doc.text(errorLines, margin, y);
    y += errorLines.length * 4 + 4;
  }

  doc.setFontSize(12);
  doc.text("Complexity & Difficulty", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Time: ${report.complexity.time} — ${report.complexity.timeExplanation}`, margin, y);
  y += 6;
  doc.text(`Space: ${report.complexity.space} — ${report.complexity.spaceExplanation}`, margin, y);
  y += 6;
  doc.text(`Difficulty: ${report.difficulty.level} (${report.difficulty.score}/100)`, margin, y);
  y += 10;

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Issues", margin, y);
  y += 4;
  if (report.issues.length === 0) {
    doc.setFontSize(10);
    doc.text("No issues reported.", margin, y);
    y += 6;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Severity", "Category", "Line", "Title", "Detail"]],
      body: report.issues.map((issue) => [
        issue.severity,
        issue.category,
        issue.line != null ? String(issue.line) : "—",
        issue.title,
        issue.detail,
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellWidth: "auto" },
      margin: { left: margin, right: margin },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30) + 10;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("What Is Wrong", margin, y);
  y += 6;
  doc.setFontSize(10);
  report.whatIsWrong.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  });

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("How To Fix", margin, y);
  y += 6;
  doc.setFontSize(10);
  report.howToFix.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  });

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text("Learning Notes", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text("Concepts:", margin, y);
  y += 6;
  report.learning.concepts.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  });

  return new Uint8Array(doc.output("arraybuffer"));
}
