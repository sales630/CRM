/* eslint-disable */
/**
 * ScrollableTable — drop-in replacement for MUI TableContainer.
 *
 * Features:
 *  • Left/right arrows FIXED to viewport — always centred in visible area.
 *  • Vertical scroll with responsive max-height (default 65 vh).
 *  • Sticky TableHead — headers stay pinned while scrolling vertically.
 *  • Built-in pagination bar (opt-in via totalCount prop).
 *  • "Download Report" button — exports the rendered table to .xlsx.
 *    Visibility is gated by role permissions fetched from
 *    /api/role-permissions. Set `moduleName` to control the filename.
 *  • Thin custom scrollbars on both axes.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Box, Button, IconButton, TableContainer, TablePagination, Tooltip,
} from "@mui/material";
import { ChevronLeft, ChevronRight, FileDownload } from "@mui/icons-material";
import { useAuth } from "context/AuthContext";
import { exportTableToExcel, inferModuleNameFromPath } from "utils/excelExport";
import { rolePermissionsAPI } from "services/api";

// Module-level cache so we don't fetch the permissions matrix on every table.
let _downloadPermCache = null;
let _downloadPermLoaded = false;
let _downloadPermInflight = null;

function loadDownloadPerms() {
  if (_downloadPermLoaded) return Promise.resolve(_downloadPermCache);
  if (_downloadPermInflight) return _downloadPermInflight;
  _downloadPermInflight = rolePermissionsAPI
    .getAll()
    .then((data) => {
      _downloadPermCache = (data && data.download_reports) || {
        admin: true, super_admin: true, team_leader: true, employee: false,
      };
      _downloadPermLoaded = true;
      return _downloadPermCache;
    })
    .catch(() => {
      _downloadPermCache = { admin: true, super_admin: true, team_leader: true, employee: false };
      _downloadPermLoaded = true;
      return _downloadPermCache;
    });
  return _downloadPermInflight;
}

export default function ScrollableTable({
  children,
  sx,
  maxHeight  = "65vh",
  arrowSize  = 32,
  scrollStep = 300,
  // Pagination (optional — only shown when totalCount is provided)
  totalCount,
  page               = 0,
  rowsPerPage        = 25,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  // Download report
  moduleName,             // override the filename slug
  hideDownload  = false,  // opt-out for a specific table
  ...tableContainerProps
}) {
  const tableRef = useRef(null);
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [wrapRect, setWrapRect] = useState(null);

  const { currentUser } = useAuth();
  const [canDownload, setCanDownload] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDownloadPerms().then((perms) => {
      if (!alive) return;
      const role = currentUser?.role;
      // admin / super_admin always allowed; other roles read from server matrix.
      if (role === "admin" || role === "super_admin") setCanDownload(true);
      else setCanDownload(!!(perms && perms[role]));
    });
    return () => { alive = false; };
  }, [currentUser?.role]);

  const syncScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  const syncRect = useCallback(() => {
    if (wrapRef.current) setWrapRect(wrapRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    syncScroll(); syncRect();
    el.addEventListener("scroll",     syncScroll, { passive: true });
    window.addEventListener("scroll", syncRect,   { passive: true });
    window.addEventListener("resize", syncRect);
    const ro = new ResizeObserver(() => { syncScroll(); syncRect(); });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll",     syncScroll);
      window.removeEventListener("scroll", syncRect);
      window.removeEventListener("resize", syncRect);
      ro.disconnect();
    };
  }, [syncScroll, syncRect]);

  const nudge     = (dir) => tableRef.current?.scrollBy({ left: dir * scrollStep, behavior: "smooth" });
  const startHold = (dir) => { nudge(dir); timerRef.current = setInterval(() => nudge(dir), 120); };
  const endHold   = () => clearInterval(timerRef.current);

  const handleDownload = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      exportTableToExcel(tableRef.current, {
        moduleName: moduleName || inferModuleNameFromPath(),
      });
    } catch (e) {
      // Surface a console error — the button is best-effort.
      console.error("Excel export failed:", e);
      try { window.alert("Export failed: " + (e.message || "Unknown error")); } catch (_) {}
    } finally {
      setExporting(false);
    }
  };

  const getButtonStyle = (dir) => {
    if (!wrapRect) return { display: "none" };
    const vpH = window.innerHeight, vpW = window.innerWidth;
    const visTop    = Math.max(wrapRect.top,    0);
    const visBottom = Math.min(wrapRect.bottom, vpH);
    if (visBottom <= visTop) return { display: "none" };
    const centerY = visTop + (visBottom - visTop) / 2;
    const M = 6;
    const base = { position: "fixed", top: centerY - arrowSize / 2, zIndex: 1400, pointerEvents: "auto" };
    return dir === -1
      ? { ...base, left:  Math.max(wrapRect.left  + M, M) }
      : { ...base, right: Math.max(vpW - wrapRect.right + M, M) };
  };

  const Fade = ({ dir }) => {
    const visible = dir === -1 ? canLeft : canRight;
    const side    = dir === -1 ? "left"  : "right";
    return (
      <Box sx={{
        position: "absolute", top: 0, bottom: 0, [side]: 0,
        width: arrowSize * 2.5, pointerEvents: "none", zIndex: 10,
        opacity: visible ? 1 : 0, transition: "opacity 0.2s",
        background: dir === -1
          ? "linear-gradient(to right, rgba(255,255,255,0.92) 40%, transparent)"
          : "linear-gradient(to left,  rgba(255,255,255,0.92) 40%, transparent)",
      }} />
    );
  };

  const Arrow = ({ dir }) => {
    const visible  = dir === -1 ? canLeft : canRight;
    const btnStyle = getButtonStyle(dir);
    if (!visible) return null;
    return (
      <Box sx={btnStyle}>
        <IconButton
          size="small"
          onMouseDown={() => startHold(dir)}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(dir); }}
          onTouchEnd={endHold}
          sx={{
            width: arrowSize, height: arrowSize,
            bgcolor: "#fff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            border: "1px solid rgba(0,0,0,0.10)",
            "&:hover": { bgcolor: "#f0f4ff", boxShadow: "0 4px 16px rgba(0,0,0,0.28)", transform: "scale(1.08)" },
            transition: "all 0.15s",
          }}
        >
          {dir === -1
            ? <ChevronLeft  sx={{ fontSize: arrowSize * 0.62 }} />
            : <ChevronRight sx={{ fontSize: arrowSize * 0.62 }} />}
        </IconButton>
      </Box>
    );
  };

  const hasPagination = totalCount !== undefined && totalCount !== null;
  const showDownload  = !hideDownload && canDownload;

  return (
    <Box ref={wrapRef} sx={{ position: "relative", width: "100%" }}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {showDownload && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mb: 1,
            px: 0.5,
          }}
        >
          <Tooltip title="Download the current view as an Excel file">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownload sx={{ fontSize: 18 }} />}
              onClick={handleDownload}
              disabled={exporting}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                borderColor: "#1976d2",
                color: "#1976d2",
                "&:hover": { borderColor: "#1565c0", bgcolor: "#e3f2fd" },
              }}
            >
              {exporting ? "Exporting…" : "Download Report"}
            </Button>
          </Tooltip>
        </Box>
      )}

      <Fade dir={-1} />
      <Fade dir={1}  />

      <TableContainer
        ref={tableRef}
        {...tableContainerProps}
        sx={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight,
          "& thead th": {
            position: "sticky", top: 0, zIndex: 5,
            bgcolor: "inherit", backgroundClip: "padding-box",
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.12)",
          },
          "&::-webkit-scrollbar":        { width: 5, height: 5 },
          "&::-webkit-scrollbar-track":  { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb":  { bgcolor: "rgba(0,0,0,0.18)", borderRadius: 4 },
          "&::-webkit-scrollbar-corner": { bgcolor: "transparent" },
          ...(sx || {}),
        }}
      >
        {children}
      </TableContainer>

      {/* ── Pagination bar ─────────────────────────────────────────────── */}
      {hasPagination && (
        <Box sx={{
          borderTop: "1px solid #f0f0f0",
          bgcolor: "#fafafa",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={(_, newPage) => onPageChange?.(newPage)}
            onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
            sx={{
              "& .MuiTablePagination-toolbar": { minHeight: 44, px: 1 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontSize: "0.78rem", color: "#666",
              },
              "& .MuiTablePagination-select": { fontSize: "0.78rem" },
              "& .MuiIconButton-root": { padding: "6px" },
            }}
          />
        </Box>
      )}

      <Arrow dir={-1} />
      <Arrow dir={1}  />
    </Box>
  );
}
