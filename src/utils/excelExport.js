/* eslint-disable */
/**
 * excelExport.js — DOM-driven Excel (.xlsx) exporter.
 *
 * Reads the rendered <table> inside a container element so the file always
 * matches what the user currently sees on screen (filters, sorting and
 * pagination are all "free" because the DOM has already applied them).
 *
 * Usage:
 *   import { exportTableToExcel } from "utils/excelExport";
 *   exportTableToExcel(tableRef.current, { moduleName: "leads" });
 *
 * The helper is intentionally text-only — chips, badges, avatars in cells
 * collapse to their visible text. That is what users normally want in a
 * spreadsheet.
 */
import * as XLSX from "xlsx";

export function exportTableToExcel(containerEl, opts = {}) {
  const { moduleName = "report" } = opts;
  if (!containerEl) throw new Error("Table container element not found");
  const table = containerEl.querySelector("table");
  if (!table) throw new Error("No <table> element found inside the container");

  // ── Header row ─────────────────────────────────────────────────────────
  // Prefer the first <thead> row; fall back to the first row of the table.
  const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
  const headers = headerRow
    ? Array.from(headerRow.querySelectorAll("th, td")).map((c) => cleanText(c.textContent))
    : [];

  // ── Body rows ──────────────────────────────────────────────────────────
  // Use <tbody> if present, otherwise all rows minus the first (header).
  let bodyRows;
  const tbody = table.querySelector("tbody");
  if (tbody) {
    bodyRows = Array.from(tbody.querySelectorAll("tr"));
  } else {
    bodyRows = Array.from(table.querySelectorAll("tr")).slice(1);
  }

  const rows = bodyRows
    .map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      // Skip "section" rows (a single full-width cell used as a group header)
      if (cells.length <= 1) return null;
      return cells.map((td) => cleanText(td.textContent));
    })
    .filter(Boolean);

  if (!headers.length && !rows.length) {
    throw new Error("Nothing to export — the table is empty");
  }

  // ── Build worksheet ────────────────────────────────────────────────────
  const aoa = headers.length ? [headers, ...rows] : rows;
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-size columns based on the longest cell in each column
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
  ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
    const headerLen = (headers[i] || "").length;
    const maxBodyLen = rows.reduce((m, r) => Math.max(m, (r[i] || "").length), 0);
    return { wch: Math.min(Math.max(headerLen, maxBodyLen) + 2, 60) };
  });

  // Freeze the header row so it stays visible when scrolling
  if (headers.length) ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Bold + grey background on the header row
  if (headers.length) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, color: { rgb: "1A1A1A" } },
          fill: { patternType: "solid", fgColor: { rgb: "F1F3F5" } },
          alignment: { vertical: "center" },
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const sheetName = slugify(moduleName).slice(0, 31) || "Report";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `${slugify(moduleName)}-${timeStamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, rowCount: rows.length, columnCount: colCount };
}

// ── helpers ───────────────────────────────────────────────────────────────
function cleanText(s) {
  if (s == null) return "";
  return String(s).replace(/[\u200b-\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
}
function slugify(s) {
  return String(s || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function timeStamp() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
}

// Derive a module name from the current pathname when one isn't supplied.
export function inferModuleNameFromPath() {
  if (typeof window === "undefined") return "report";
  const parts = (window.location.pathname || "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "report";
  return slugify(parts.join("-"));
}
