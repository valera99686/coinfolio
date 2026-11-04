/** Quotes a value for CSV: a field with a comma, a quote or a line break is wrapped in quotes. */
export const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (header, rows) => [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

/** Saves a table as a CSV file (the browser's download, nothing is sent anywhere). */
export function downloadCsv(filename, header, rows) {
  const blob = new Blob(["﻿" + toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
