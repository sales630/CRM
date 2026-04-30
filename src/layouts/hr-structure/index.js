/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Card, Typography, Button, IconButton, TextField, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Grid, Chip, Tooltip, Tabs, Tab, Table,
  TableHead, TableBody, TableRow, TableCell, InputAdornment,
  Snackbar, Alert, CircularProgress, Divider, LinearProgress, Switch,
  Popover, List, ListItemButton, ListItemIcon, ListItemText, Menu,
  CardContent,
} from "@mui/material";
import {
  Add, Edit, Delete, Search, Close, Person, Business, AccountTree,
  People, Phone, Email, LocationOn, ExpandMore, ExpandLess,
  PersonAdd, Work, Refresh, ZoomIn, ZoomOut, CenterFocusStrong,
  Star, DeleteSweep, MoreVert, Group, SupervisorAccount,
} from "@mui/icons-material";
import { hrAPI } from "services/api";

// ── Design tokens ──────────────────────────────────────────────────────────
const TEAL         = "#17c1e8";
const TEAL_LT      = "#e0f7fa";
const TL_COLOR     = "#7b1fa2";
const TL_LT        = "#f3e5f5";
const LINE_COLOR   = "#17c1e8";
const CARD_W       = 258;
const CARD_GAP     = 52;
const STATUS_META  = {
  active:     { label: "Active",      color: "#388e3c", bg: "#e8f5e9" },
  inactive:   { label: "Inactive",    color: "#757575", bg: "#f5f5f5" },
  on_leave:   { label: "On Leave",    color: "#f57c00", bg: "#fff3e0" },
  terminated: { label: "Terminated",  color: "#d32f2f", bg: "#ffebee" },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (n = "") => n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const avatarColor = (name = "") => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0; for (const c of name) s += c.charCodeAt(0); return C[s % C.length];
};

function EmpAvatar({ emp, size = 40 }) {
  if (emp?.avatar) return <Avatar src={emp.avatar} sx={{ width: size, height: size }} />;
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: avatarColor(emp?.name || ""), fontSize: size * 0.36, fontWeight: 700 }}>
      {getInitials(emp?.name)}
    </Avatar>
  );
}

// ── Bitrix24-style Card ────────────────────────────────────────────────────
function BxCard({ node, isSelected, isCompany, onClick, onAdd, onToggleExpand, isExpanded, onEdit, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [addAnchor, setAddAnchor]   = useState(null);

  const head = node.teamLeader || node.head || null;
  const empCount  = node.employee_count || 0;
  const childCount = node.children?.length || 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* ── The card itself ── */}
      <Card
        onClick={() => onClick(node)}
        sx={{
          width: CARD_W,
          borderRadius: "12px",
          border: isSelected ? `2px solid ${TEAL}` : "1.5px solid #dde6f0",
          boxShadow: isSelected
            ? `0 0 0 3px ${TEAL}28, 0 4px 16px rgba(23,193,232,0.18)`
            : "0 2px 10px rgba(0,0,0,0.07)",
          cursor: "pointer",
          bgcolor: "#fff",
          transition: "all 0.16s",
          "&:hover": { borderColor: TEAL, boxShadow: `0 4px 18px rgba(23,193,232,0.2)` },
          overflow: "hidden",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {/* Header row */}
        <Box sx={{ px: 1.4, py: 0.9, display: "flex", alignItems: "center", gap: 0.75, borderBottom: "1px solid #f0f4f8" }}>
          <AccountTree sx={{ fontSize: 14, color: "#78909c", flexShrink: 0 }} />
          <Typography noWrap sx={{ flex: 1, fontSize: "0.76rem", fontWeight: 700, color: "#263238" }}>
            {node.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, flexShrink: 0 }}>
            {/* Person count badge */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, bgcolor: "#eceff1", borderRadius: "6px", px: 0.6, py: 0.2 }}>
              <Person sx={{ fontSize: 11, color: "#90a4ae" }} />
              <Typography sx={{ fontSize: "0.62rem", color: "#607d8b", fontWeight: 700, lineHeight: 1 }}>{empCount}</Typography>
            </Box>
            {/* 3-dot menu */}
            <IconButton size="small" onClick={e => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }} sx={{ p: 0.3, color: "#b0bec5", "&:hover": { color: "#607d8b" } }}>
              <MoreVert sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Person row */}
        <Box sx={{ px: 1.4, py: 1.2, display: "flex", alignItems: "center", gap: 1.2 }}>
          {head ? (
            <>
              <EmpAvatar emp={head} size={38} />
              <Box minWidth={0}>
                <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: "#263238" }} noWrap>{head.name}</Typography>
                <Typography sx={{ fontSize: "0.64rem", color: "#78909c" }} noWrap>
                  {head.position || "Position not specified"}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Avatar sx={{ width: 38, height: 38, bgcolor: "#eceff1", color: "#b0bec5" }}><Person sx={{ fontSize: 18 }} /></Avatar>
              <Typography sx={{ fontSize: "0.66rem", color: "#b0bec5", fontStyle: "italic" }}>No head assigned</Typography>
            </>
          )}
        </Box>

        {/* Employee count row */}
        <Box sx={{ px: 1.4, pb: 0.8, borderBottom: "1px solid #f5f7fa" }}>
          <Typography sx={{ fontSize: "0.64rem", color: "#90a4ae" }}>
            Employees:{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "#546e7a" }}>
              {empCount} {empCount === 1 ? "employee" : "employees"}
            </Box>
          </Typography>
        </Box>

        {/* Sub-departments footer */}
        <Box
          onClick={e => { e.stopPropagation(); if (childCount > 0) onToggleExpand(); }}
          sx={{
            px: 1.4, py: 0.65,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5,
            cursor: childCount > 0 ? "pointer" : "default",
            bgcolor: childCount > 0 && isExpanded ? TEAL_LT : "transparent",
            "&:hover": childCount > 0 ? { bgcolor: TEAL_LT } : {},
            transition: "background 0.15s",
          }}
        >
          {childCount > 0 ? (
            <>
              <Typography sx={{ fontSize: "0.67rem", color: TEAL, fontWeight: 700 }}>
                {childCount} department{childCount !== 1 ? "s" : ""}
              </Typography>
              {isExpanded
                ? <ExpandLess sx={{ fontSize: 14, color: TEAL }} />
                : <ExpandMore sx={{ fontSize: 14, color: TEAL }} />
              }
            </>
          ) : (
            <Typography sx={{ fontSize: "0.64rem", color: "#b0bec5" }}>no sub-departments</Typography>
          )}
        </Box>
      </Card>

      {/* ── "+" button below card ── */}
      {!isCompany && (
        <Box sx={{ mt: 0.75, mb: -0.5, position: "relative", zIndex: 2 }}>
          <Tooltip title="Add to this department" placement="right">
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); setAddAnchor(e.currentTarget); }}
              sx={{
                width: 26, height: 26,
                bgcolor: "#fff",
                border: `1.5px solid ${Boolean(addAnchor) ? TEAL : "#b0bec5"}`,
                color: Boolean(addAnchor) ? TEAL : "#78909c",
                "&:hover": { bgcolor: TEAL_LT, borderColor: TEAL, color: TEAL },
                transition: "all 0.15s",
              }}
            >
              <Add sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* ── 3-dot context menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={e => e.stopPropagation()}
        PaperProps={{ sx: { borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 170 } }}
      >
        <MenuItem onClick={() => { setMenuAnchor(null); onEdit(node); }} sx={{ fontSize: "0.8rem", gap: 1 }}>
          <Edit sx={{ fontSize: 15, color: "#607d8b" }} /> Edit Department
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setMenuAnchor(null); onDelete(node.id); }} sx={{ fontSize: "0.8rem", color: "error.main", gap: 1 }}>
          <Delete sx={{ fontSize: 15 }} /> Delete
        </MenuItem>
      </Menu>

      {/* ── Add popover ── */}
      <Popover
        open={Boolean(addAnchor)}
        anchorEl={addAnchor}
        onClose={() => setAddAnchor(null)}
        onClick={e => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{ sx: { borderRadius: "12px", boxShadow: "0 8px 28px rgba(0,0,0,0.14)", overflow: "hidden", minWidth: 210, mt: 0.5 } }}
      >
        <Box sx={{ bgcolor: "#37474f", px: 2, py: 1.1, display: "flex", alignItems: "center", gap: 0.75 }}>
          <AccountTree sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#fff" }} noWrap>
            {node.name}
          </Typography>
        </Box>
        <List dense disablePadding sx={{ py: 0.5 }}>
          {/* Sub-Department */}
          <ListItemButton onClick={() => { setAddAnchor(null); onAdd(node, "sub_department"); }}
            sx={{ py: 1, px: 2, mx: 0.5, borderRadius: "8px", mb: 0.25, "&:hover": { bgcolor: "#f5f5f5" } }}>
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#eceff1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AccountTree sx={{ fontSize: 14, color: "#607d8b" }} />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#263238" }}>Sub-Department</Typography>}
              secondary={<Typography sx={{ fontSize: "0.63rem", color: "#90a4ae" }}>Create a child department</Typography>}
            />
          </ListItemButton>
          <Divider sx={{ mx: 1.5 }} />
          {/* Team Leader */}
          <ListItemButton onClick={() => { setAddAnchor(null); onAdd(node, "team_leader"); }}
            sx={{ py: 1, px: 2, mx: 0.5, borderRadius: "8px", my: 0.25, "&:hover": { bgcolor: TL_LT } }}>
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: TL_LT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star sx={{ fontSize: 14, color: TL_COLOR }} />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: TL_COLOR }}>Team Leader</Typography>}
              secondary={<Typography sx={{ fontSize: "0.63rem", color: "#90a4ae" }}>Head of this department</Typography>}
            />
          </ListItemButton>
          <Divider sx={{ mx: 1.5 }} />
          {/* Employee */}
          <ListItemButton onClick={() => { setAddAnchor(null); onAdd(node, "employee"); }}
            sx={{ py: 1, px: 2, mx: 0.5, borderRadius: "8px", mt: 0.25, "&:hover": { bgcolor: TEAL_LT } }}>
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: TEAL_LT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Person sx={{ fontSize: 14, color: TEAL }} />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: TEAL }}>Employee</Typography>}
              secondary={<Typography sx={{ fontSize: "0.63rem", color: "#90a4ae" }}>Reports to team leader</Typography>}
            />
          </ListItemButton>
        </List>
      </Popover>
    </Box>
  );
}

// ── Recursive tree renderer ────────────────────────────────────────────────
function BxTreeNode({ node, isCompany, selectedId, onSelect, expandedSet, onToggle, onAdd, onEdit, onDelete }) {
  const isSelected = selectedId === node.id;
  const isExpanded = expandedSet.has(node.id);
  const visibleChildren = isExpanded ? (node.children || []) : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <BxCard
        node={node}
        isCompany={isCompany}
        isSelected={isSelected}
        onClick={n => onSelect(isSelected ? null : n)}
        onAdd={onAdd}
        onToggleExpand={() => onToggle(node.id)}
        isExpanded={isExpanded}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Children */}
      {visibleChildren.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Vertical line down from card */}
          <Box sx={{ width: 2, height: 30, bgcolor: LINE_COLOR, opacity: 0.5 }} />
          {/* Horizontal + vertical connectors to children */}
          <Box sx={{ position: "relative" }}>
            {visibleChildren.length > 1 && (
              <Box sx={{
                position: "absolute", top: 0,
                left: `${CARD_W / 2}px`, right: `${CARD_W / 2}px`,
                height: 2, bgcolor: LINE_COLOR, opacity: 0.5, zIndex: 0,
              }} />
            )}
            <Box sx={{ display: "flex", gap: `${CARD_GAP}px`, alignItems: "flex-start" }}>
              {visibleChildren.map(child => (
                <Box key={child.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box sx={{ width: 2, height: 30, bgcolor: LINE_COLOR, opacity: 0.5 }} />
                  <BxTreeNode
                    node={child} isCompany={false}
                    selectedId={selectedId} onSelect={onSelect}
                    expandedSet={expandedSet} onToggle={onToggle}
                    onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Right Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ selected, employees, departments, onClose, onEdit, onDelete, onAdd }) {
  if (!selected) return null;
  const tl = selected.teamLeader;
  const teamMembers = selected.teamMembers || [];
  const unassigned = selected.unassigned || [];
  const allMembers = [...teamMembers, ...unassigned];
  const parent = departments.find(d => d.id === selected.parent_id);

  return (
    <Box sx={{ width: 300, flexShrink: 0, bgcolor: "#fff", borderLeft: "1.5px solid #e8edf3", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ bgcolor: "#37474f", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <AccountTree sx={{ fontSize: 15, color: "#fff" }} />
        <Typography fontWeight={700} color="#fff" fontSize="0.82rem" flex={1} noWrap>{selected.name}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.4, color: "rgba(255,255,255,0.8)" }}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {parent && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#f8f9fa", borderRadius: 1, px: 1.5, py: 0.85 }}>
            <Business sx={{ fontSize: 13, color: "#90a4ae" }} />
            <Box>
              <Typography sx={{ fontSize: "0.6rem", color: "#999", textTransform: "uppercase" }}>Sub-dept of</Typography>
              <Typography variant="caption" fontWeight={600}>{parent.name}</Typography>
            </Box>
          </Box>
        )}
        {selected.description && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{selected.description}</Typography>
        )}

        {/* Team Leader */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontSize: "0.67rem", fontWeight: 700, color: TL_COLOR, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 0.5 }}>
              <Star sx={{ fontSize: 12 }} /> Team Leader
            </Typography>
            <Button size="small" startIcon={<Add sx={{ fontSize: 11 }} />}
              onClick={() => onAdd(selected, "team_leader")}
              sx={{ textTransform: "none", fontSize: "0.62rem", color: TL_COLOR, border: `1px solid ${TL_COLOR}60`, px: 0.8, py: 0.2, minHeight: 0 }}>
              {tl ? "Replace" : "Add"}
            </Button>
          </Box>
          {tl ? (
            <Box sx={{ bgcolor: TL_LT, borderRadius: 1.5, px: 1.5, py: 1.2, border: `1px solid ${TL_COLOR}30`, display: "flex", alignItems: "center", gap: 1.5 }}>
              <EmpAvatar emp={tl} size={40} />
              <Box minWidth={0} flex={1}>
                <Typography variant="body2" fontWeight={700} noWrap color={TL_COLOR}>{tl.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{tl.position || "Team Leader"}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ bgcolor: "#f8f9fa", borderRadius: 1.5, border: "1px dashed #cfd8dc", py: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">No team leader assigned</Typography>
            </Box>
          )}
        </Box>

        {/* Employees */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontSize: "0.67rem", fontWeight: 700, color: "#607d8b", textTransform: "uppercase" }}>
              Employees ({allMembers.length})
            </Typography>
            <Button size="small" startIcon={<PersonAdd sx={{ fontSize: 11 }} />}
              onClick={() => onAdd(selected, "employee")}
              sx={{ textTransform: "none", fontSize: "0.62rem", color: TEAL, border: `1px solid ${TEAL}60`, px: 0.8, py: 0.2, minHeight: 0 }}>
              Add
            </Button>
          </Box>
          {allMembers.length === 0 ? (
            <Box sx={{ bgcolor: "#f8f9fa", borderRadius: 1, border: "1px dashed #e0e0e0", py: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">No employees yet</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {allMembers.map(emp => (
                <Box key={emp.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75, borderRadius: 1, bgcolor: "#f8f9fa", border: "1px solid #edf0f4" }}>
                  <EmpAvatar emp={emp} size={28} />
                  <Box minWidth={0} flex={1}>
                    <Typography variant="caption" fontWeight={600} display="block" noWrap>{emp.name}</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }} noWrap>{emp.position || "—"}</Typography>
                  </Box>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: STATUS_META[emp.status]?.color || "#aaa", flexShrink: 0 }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pt: 1, borderTop: "1px solid #edf0f4" }}>
          <Button size="small" variant="outlined" startIcon={<Edit sx={{ fontSize: 12 }} />}
            onClick={() => onEdit(selected)}
            sx={{ textTransform: "none", fontSize: "0.72rem", borderColor: TEAL, color: TEAL }}>
            Edit Department
          </Button>
          <Button size="small" color="error" startIcon={<Delete sx={{ fontSize: 12 }} />}
            onClick={() => onDelete(selected.id)}
            sx={{ textTransform: "none", fontSize: "0.72rem" }}>
            Delete Department
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// ── Zoom Controls ──────────────────────────────────────────────────────────
function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <Box sx={{
      position: "absolute", bottom: 16, left: 16, zIndex: 10,
      display: "flex", alignItems: "center", gap: 0,
      bgcolor: "#fff", border: "1.5px solid #dde3eb", borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.10)", overflow: "hidden",
    }}>
      <Tooltip title="Zoom out"><IconButton size="small" onClick={onZoomOut} sx={{ borderRadius: 0, p: 0.75, "&:hover": { bgcolor: TEAL_LT } }}><ZoomOut sx={{ fontSize: 17, color: "#607d8b" }} /></IconButton></Tooltip>
      <Box sx={{ px: 1, borderLeft: "1px solid #e8edf3", borderRight: "1px solid #e8edf3", cursor: "pointer" }} onClick={onReset}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#546e7a", lineHeight: "32px" }}>{Math.round(zoom * 100)} %</Typography>
      </Box>
      <Tooltip title="Zoom in"><IconButton size="small" onClick={onZoomIn} sx={{ borderRadius: 0, p: 0.75, "&:hover": { bgcolor: TEAL_LT } }}><ZoomIn sx={{ fontSize: 17, color: "#607d8b" }} /></IconButton></Tooltip>
    </Box>
  );
}

// ── Department Dialog ──────────────────────────────────────────────────────
function DeptDialog({ open, onClose, initial, departments, onSave, defaultParentId }) {
  const blank = { name: "", parent_id: defaultParentId || "", description: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  useEffect(() => {
    if (open) setForm(initial
      ? { name: initial.name || "", parent_id: initial.parent_id || "", description: initial.description || "" }
      : { ...blank, parent_id: defaultParentId || "" }
    );
  }, [open, initial, defaultParentId]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1}><AccountTree color="primary" /><Typography fontWeight="bold">{initial ? "Edit Department" : "Add Department"}</Typography></Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField fullWidth size="small" label="Department Name *" value={form.name} onChange={e => set("name", e.target.value)} />
          <TextField fullWidth size="small" label="Description" multiline rows={2} value={form.description} onChange={e => set("description", e.target.value)} />
          <FormControl fullWidth size="small">
            <InputLabel>Parent Department (optional)</InputLabel>
            <Select value={form.parent_id} label="Parent Department (optional)" onChange={e => set("parent_id", e.target.value)}>
              <MenuItem value="">— Top Level —</MenuItem>
              {departments.filter(d => d.id !== initial?.id).map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name.trim()} sx={{ textTransform: "none" }}>
          {initial ? "Save Changes" : "Create Department"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Employee Dialog ────────────────────────────────────────────────────────
function EmployeeDialog({ open, onClose, initial, departments, employees, defaultDeptId, defaultManagerId, defaultIsTeamLeader, onSave }) {
  const blank = { name: "", position: "", department_id: defaultDeptId || "", manager_id: defaultManagerId || "", email: "", phone: "", location: "", status: "active", hire_date: "", bio: "", avatar: "", is_team_leader: defaultIsTeamLeader || false };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setForm(initial
      ? { ...blank, ...initial, department_id: initial.department_id || "", manager_id: initial.manager_id || "", is_team_leader: !!initial.is_team_leader }
      : { ...blank, department_id: defaultDeptId || "", manager_id: defaultManagerId || "", is_team_leader: defaultIsTeamLeader || false }
    );
  }, [open, initial, defaultDeptId, defaultManagerId, defaultIsTeamLeader]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1}>
          {form.is_team_leader ? <Star sx={{ color: TL_COLOR }} /> : <Person color="primary" />}
          <Typography fontWeight="bold">{initial ? "Edit Employee" : (form.is_team_leader ? "Add Team Leader" : "Add Employee")}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} mt={0.5}>
          {/* Avatar preview */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <EmpAvatar emp={form} size={52} />
              <TextField size="small" label="Avatar URL (optional)" value={form.avatar} onChange={e => set("avatar", e.target.value)} sx={{ flex: 1 }} />
            </Box>
          </Grid>

          {/* Role toggle */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: form.is_team_leader ? TL_LT : "#f8f9fa", px: 2, py: 1.2, borderRadius: 1.5, border: `1px solid ${form.is_team_leader ? TL_COLOR + "60" : "#e0e0e0"}` }}>
              <Star sx={{ color: form.is_team_leader ? TL_COLOR : "#b0bec5", fontSize: 20 }} />
              <Box flex={1}>
                <Typography variant="body2" fontWeight={700} color={form.is_team_leader ? TL_COLOR : "text.secondary"}>
                  {form.is_team_leader ? "Team Leader" : "Regular Employee"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.is_team_leader ? "Will be set as department head" : "Reports to team leader"}
                </Typography>
              </Box>
              <Switch
                checked={form.is_team_leader}
                onChange={e => set("is_team_leader", e.target.checked)}
                sx={{ "& .Mui-checked + .MuiSwitch-track": { bgcolor: TL_COLOR + " !important" } }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Position / Job Title" value={form.position} onChange={e => set("position", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Department *</InputLabel>
              <Select value={form.department_id} label="Department *" onChange={e => { set("department_id", e.target.value); set("manager_id", ""); }}>
                <MenuItem value="">— Select Dept —</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {!form.is_team_leader && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Reports To</InputLabel>
                <Select value={form.manager_id} label="Reports To" onChange={e => set("manager_id", e.target.value)}>
                  <MenuItem value="">— None —</MenuItem>
                  {employees.filter(e => e.id !== initial?.id && e.status === "active" && e.is_team_leader).map(e => (
                    <MenuItem key={e.id} value={e.id}>
                      <Box display="flex" alignItems="center" gap={1}><EmpAvatar emp={e} size={20} />{e.name}</Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Location" value={form.location} onChange={e => set("location", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Hire Date" type="date" InputLabelProps={{ shrink: true }} value={form.hire_date} onChange={e => set("hire_date", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Bio / Notes" multiline rows={2} value={form.bio} onChange={e => set("bio", e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name.trim() || !form.department_id}
          sx={{ textTransform: "none", bgcolor: form.is_team_leader ? TL_COLOR : undefined }}>
          {initial ? "Save Changes" : (form.is_team_leader ? "Add Team Leader" : "Add Employee")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Employee Card (list view) ──────────────────────────────────────────────
function EmployeeCard({ emp, departments, onEdit, onDelete }) {
  const sm = STATUS_META[emp.status] || STATUS_META.active;
  const dept = departments.find(d => d.id === emp.department_id);
  return (
    <Card sx={{ p: 2, "&:hover": { boxShadow: 4, transform: "translateY(-2px)" }, transition: "all 0.2s", height: "100%" }}>
      <Box display="flex" alignItems="flex-start" gap={1.5} mb={1.5}>
        <Box sx={{ position: "relative" }}>
          <EmpAvatar emp={emp} size={46} />
          {emp.is_team_leader && (
            <Box sx={{ position: "absolute", bottom: -2, right: -2, bgcolor: TL_COLOR, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
              <Star sx={{ fontSize: 9, color: "#fff" }} />
            </Box>
          )}
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" fontWeight="bold" noWrap>{emp.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">{emp.position || "—"}</Typography>
          <Box display="flex" gap={0.5} mt={0.3} flexWrap="wrap">
            <Chip label={sm.label} size="small" sx={{ height: 17, fontSize: 10, bgcolor: sm.bg, color: sm.color, fontWeight: 700 }} />
            {emp.is_team_leader && <Chip label="Team Leader" size="small" sx={{ height: 17, fontSize: 10, bgcolor: TL_LT, color: TL_COLOR, fontWeight: 700 }} />}
          </Box>
        </Box>
        <Box>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(emp)}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(emp.id)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>
        </Box>
      </Box>
      <Divider sx={{ mb: 1 }} />
      {[[<Business sx={{ fontSize: 12 }} />, dept?.name],[<Email sx={{ fontSize: 12 }} />, emp.email],[<Phone sx={{ fontSize: 12 }} />, emp.phone],[<LocationOn sx={{ fontSize: 12 }} />, emp.location]].filter(([,v]) => v).map(([icon, val], i) => (
        <Box key={i} display="flex" alignItems="center" gap={0.75} mb={0.3}>
          <Box sx={{ color: "text.secondary" }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" noWrap>{val}</Typography>
        </Box>
      ))}
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HRStructure() {
  const [tab, setTab]                   = useState(0);
  const [tree, setTree]                 = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [deptFilter, setDeptFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom]                 = useState(1);
  const [expandedSet, setExpandedSet]   = useState(new Set());
  const [seeding, setSeeding]           = useState(false);
  const [clearing, setClearing]         = useState(false);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(25);

  const [deptDialog, setDeptDialog]     = useState({ open: false, initial: null, parentId: null });
  const [empDialog, setEmpDialog]       = useState({ open: false, initial: null, deptId: null, managerId: null, isTeamLeader: false });
  const [snack, setSnack]               = useState(null);

  const notify = (msg, sev = "success") => setSnack({ msg, sev });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d, e, s] = await Promise.all([hrAPI.getTree(), hrAPI.getDepartments(), hrAPI.getEmployees(), hrAPI.getStats()]);
      const tArr = Array.isArray(t) ? t : [];
      setTree(tArr);
      setDepartments(Array.isArray(d) ? d : []);
      setEmployees(Array.isArray(e) ? e : []);
      setStats(s);
      setExpandedSet(prev => {
        const next = new Set(prev);
        tArr.forEach(n => next.add(n.id));
        return next;
      });
    } catch { notify("Cannot connect to backend. Restart the server.", "error"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setPage(0); }, [search, deptFilter, statusFilter]);

  const toggleExpand = id => setExpandedSet(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Sync selected node after reload
  useEffect(() => {
    if (!selectedNode) return;
    const find = (nodes, id) => {
      for (const n of nodes) { if (n.id === id) return n; const f = find(n.children || [], id); if (f) return f; }
      return null;
    };
    const updated = find(tree, selectedNode.id);
    if (updated) setSelectedNode(updated);
  }, [tree]);

  // ── CRUD ──
  const handleSaveDept = async (form) => {
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (deptDialog.initial) await hrAPI.updateDepartment(deptDialog.initial.id, payload);
      else await hrAPI.createDepartment({ ...payload, parent_id: payload.parent_id || deptDialog.parentId || null });
      notify(deptDialog.initial ? "Department updated ✅" : "Department created ✅");
      setDeptDialog({ open: false, initial: null, parentId: null });
      loadAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try { await hrAPI.deleteDepartment(id); notify("Department deleted", "info"); setSelectedNode(null); loadAll(); }
    catch (e) { notify(e.message, "error"); }
  };

  const handleSaveEmp = async (form) => {
    try {
      const payload = { ...form, department_id: form.department_id || null, manager_id: form.manager_id || null };
      if (empDialog.initial) await hrAPI.updateEmployee(empDialog.initial.id, payload);
      else await hrAPI.createEmployee(payload);
      notify(empDialog.initial ? "Updated ✅" : (form.is_team_leader ? "Team Leader added ✅" : "Employee added ✅"));
      setEmpDialog({ open: false, initial: null, deptId: null, managerId: null, isTeamLeader: false });
      loadAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const handleDeleteEmp = async (id) => {
    if (!window.confirm("Remove this employee?")) return;
    try { await hrAPI.deleteEmployee(id); notify("Removed", "info"); loadAll(); }
    catch (e) { notify(e.message, "error"); }
  };

  const handleClearAll = async () => {
    if (!window.confirm("⚠️ Delete ALL departments and employees? This cannot be undone.")) return;
    setClearing(true);
    try { await hrAPI.clearAll(); notify("All HR data cleared.", "info"); setSelectedNode(null); loadAll(); }
    catch (e) { notify(e.message, "error"); }
    setClearing(false);
  };

  const handleSeedHierarchy = async () => {
    if (!window.confirm("Load the Outsourced Bookkeeping hierarchy? This replaces existing data.")) return;
    setSeeding(true);
    try { await hrAPI.seed(); notify("✅ Company hierarchy loaded! 19 employees, 5 departments.", "success"); loadAll(); }
    catch (e) { notify(e.message, "error"); }
    setSeeding(false);
  };

  // Called from the "+" button on a card
  const handleCardAdd = (node, type) => {
    if (type === "sub_department") {
      setDeptDialog({ open: true, initial: null, parentId: node.id });
    } else {
      const isTeamLeader = type === "team_leader";
      const tl = node.teamLeader || null;
      setEmpDialog({ open: true, initial: null, deptId: node.id, managerId: isTeamLeader ? null : (tl?.id || null), isTeamLeader });
    }
  };

  const filteredEmps = employees.filter(e => {
    if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (e.name || "").toLowerCase().includes(s) || (e.position || "").toLowerCase().includes(s) || (e.email || "").toLowerCase().includes(s);
    }
    return true;
  });

  // Company root node
  const companyRoot = {
    id: "__company__",
    name: "Outsourced Bookkeeping",
    head: tree.length > 0 ? tree[0]?.head : null,
    teamLeader: null,
    employee_count: stats?.total || 0,
    children: tree,
    members: [], teamMembers: [], unassigned: [],
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={800}>HR Structure</Typography>
            <Typography variant="body2" color="text.secondary">Departments → Team Leaders → Employees</Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadAll} sx={{ textTransform: "none" }}>Refresh</Button>
            <Button variant="outlined" size="small" color="error"
              startIcon={clearing ? <CircularProgress size={13} color="error" /> : <DeleteSweep />}
              onClick={handleClearAll} disabled={clearing} sx={{ textTransform: "none" }}>
              {clearing ? "Clearing..." : "Clear All"}
            </Button>
            <Button variant="outlined" size="small" startIcon={<Add />}
              onClick={() => setDeptDialog({ open: true, initial: null, parentId: null })}
              sx={{ textTransform: "none", borderColor: TEAL, color: TEAL }}>
              Add Department
            </Button>
            <Button variant="contained" size="small" startIcon={<PersonAdd />}
              onClick={() => setEmpDialog({ open: true, initial: null, deptId: null, managerId: null, isTeamLeader: false })}
              sx={{ textTransform: "none", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" } }}>
              Add Employee
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        {stats && (
          <Grid container spacing={1.5} mb={2.5}>
            {[
              { label: "Total Employees", value: stats.total,               color: "#1976d2", icon: <People /> },
              { label: "Active",          value: stats.active,              color: "#388e3c", icon: <Person /> },
              { label: "Departments",     value: stats.departments,         color: TEAL,      icon: <Business /> },
              { label: "Inactive/Leave",  value: stats.total - stats.active,color: "#f57c00", icon: <Work /> },
            ].map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Card sx={{ borderLeft: `4px solid ${s.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <CardContent sx={{ p: "12px 16px !important" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, fontSize: 10, color: "text.secondary" }}>{s.label}</Typography>
                        <Typography variant="h4" fontWeight={800} color={s.color}>{s.value ?? 0}</Typography>
                      </Box>
                      <Box sx={{ color: s.color, bgcolor: s.color + "18", borderRadius: 2, p: 1.2, display: "flex" }}>{s.icon}</Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tabs */}
        <Card sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: "1px solid #e0e0e0", "& .MuiTab-root": { textTransform: "none", fontSize: 13, minHeight: 44 },
              "& .Mui-selected": { color: TEAL }, "& .MuiTabs-indicator": { bgcolor: TEAL } }}>
            <Tab label={<Box display="flex" alignItems="center" gap={0.75}><AccountTree fontSize="small" />Org Chart</Box>} />
            <Tab label={<Box display="flex" alignItems="center" gap={0.75}><People fontSize="small" />Employees <Chip label={employees.length} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#e3f2fd", color: "#1976d2", ml: 0.5 }} /></Box>} />
            <Tab label={<Box display="flex" alignItems="center" gap={0.75}><Business fontSize="small" />Departments <Chip label={departments.length} size="small" sx={{ height: 18, fontSize: 10, bgcolor: TEAL_LT, color: TEAL, ml: 0.5 }} /></Box>} />
          </Tabs>

          {loading && <LinearProgress sx={{ "& .MuiLinearProgress-bar": { bgcolor: TEAL } }} />}

          {/* Org Chart */}
          {tab === 0 && !loading && (
            <Box sx={{ display: "flex", height: "calc(100vh - 340px)", minHeight: 520, position: "relative" }}>
              <Box sx={{ flex: 1, overflow: "auto", bgcolor: "#eef2f7", position: "relative" }}>
                {tree.length === 0 ? (
                  <Box textAlign="center" py={10}>
                    <AccountTree sx={{ fontSize: 72, color: "#c8d6e5", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={600} mb={1}>No departments yet</Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      Start by creating a department, then add a Team Leader and Employees using the <strong>+</strong> button on each card
                    </Typography>
                    <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                      <Button variant="contained" startIcon={<Add />}
                        onClick={() => setDeptDialog({ open: true, initial: null, parentId: null })}
                        sx={{ textTransform: "none", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" } }}>
                        Add First Department
                      </Button>
                      <Button variant="outlined" startIcon={seeding ? <CircularProgress size={14} /> : <Refresh />}
                        onClick={handleSeedHierarchy} disabled={seeding}
                        sx={{ textTransform: "none", borderColor: "#7b1fa2", color: "#7b1fa2" }}>
                        {seeding ? "Loading..." : "Load Sample Data"}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ p: 5, minWidth: "max-content", transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s" }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {/* Company root card */}
                      <BxCard
                        node={companyRoot} isCompany={true}
                        isSelected={selectedNode?.id === "__company__"}
                        onClick={n => setSelectedNode(selectedNode?.id === "__company__" ? null : n)}
                        onAdd={handleCardAdd}
                        onToggleExpand={() => {}}
                        isExpanded={true}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />

                      {/* Lines + dept row */}
                      {tree.length > 0 && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <Box sx={{ width: 2, height: 30, bgcolor: LINE_COLOR, opacity: 0.5 }} />
                          <Box sx={{ position: "relative" }}>
                            {tree.length > 1 && (
                              <Box sx={{ position: "absolute", top: 0, left: `${CARD_W / 2}px`, right: `${CARD_W / 2}px`, height: 2, bgcolor: LINE_COLOR, opacity: 0.5, zIndex: 0 }} />
                            )}
                            <Box sx={{ display: "flex", gap: `${CARD_GAP}px`, alignItems: "flex-start" }}>
                              {tree.map(dept => (
                                <Box key={dept.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <Box sx={{ width: 2, height: 30, bgcolor: LINE_COLOR, opacity: 0.5 }} />
                                  <BxTreeNode
                                    node={dept} isCompany={false}
                                    selectedId={selectedNode?.id}
                                    onSelect={n => setSelectedNode(n)}
                                    expandedSet={expandedSet} onToggle={toggleExpand}
                                    onAdd={handleCardAdd}
                                    onEdit={d => setDeptDialog({ open: true, initial: d, parentId: null })}
                                    onDelete={handleDeleteDept}
                                  />
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {tree.length > 0 && (
                  <ZoomControls
                    zoom={zoom}
                    onZoomIn={() => setZoom(z => Math.min(z + 0.1, 2.5))}
                    onZoomOut={() => setZoom(z => Math.max(z - 0.1, 0.2))}
                    onReset={() => setZoom(1)}
                  />
                )}

                {/* Find me button */}
                {tree.length > 0 && (
                  <Box sx={{ position: "absolute", bottom: 16, left: 140, bgcolor: "#fff", border: "1.5px solid #dde3eb", borderRadius: "8px", px: 2, py: 0.75, boxShadow: "0 2px 8px rgba(0,0,0,0.10)", cursor: "pointer", "&:hover": { bgcolor: TEAL_LT } }}
                    onClick={() => setZoom(1)}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#546e7a" }}>Find me</Typography>
                  </Box>
                )}
              </Box>

              {/* Right panel */}
              {selectedNode && selectedNode.id !== "__company__" && (
                <DetailPanel
                  selected={selectedNode}
                  employees={employees}
                  departments={departments}
                  onClose={() => setSelectedNode(null)}
                  onEdit={d => setDeptDialog({ open: true, initial: d, parentId: null })}
                  onDelete={handleDeleteDept}
                  onAdd={handleCardAdd}
                />
              )}
            </Box>
          )}

          {/* Employees Tab */}
          {tab === 1 && !loading && (
            <Box>
              <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", borderBottom: "1px solid #f0f0f0" }}>
                <TextField size="small" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 240 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }} />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Department</InputLabel>
                  <Select value={deptFilter} label="Department" onChange={e => setDeptFilter(e.target.value)}>
                    <MenuItem value="all">All Departments</MenuItem>
                    {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box flex={1} />
                <Typography variant="caption" color="text.secondary" alignSelf="center">{filteredEmps.length} employees</Typography>
              </Box>
              {filteredEmps.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <People sx={{ fontSize: 60, color: "#e0e0e0", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">{search || deptFilter !== "all" || statusFilter !== "all" ? "No match" : "No employees yet"}</Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}><Grid container spacing={2}>{filteredEmps.map(emp => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
                    <EmployeeCard emp={emp} departments={departments}
                      onEdit={e => setEmpDialog({ open: true, initial: e, deptId: null, managerId: null, isTeamLeader: false })}
                      onDelete={handleDeleteEmp} />
                  </Grid>
                ))}</Grid></Box>
              )}
            </Box>
          )}

          {/* Departments Tab */}
          {tab === 2 && !loading && (
            <ScrollableTable
              totalCount={departments.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
            >
              <Table size="small">
                <TableHead style={{ display: "table-header-group" }}>
                  <TableRow sx={{ bgcolor: "#fafafa" }}>
                    {["DEPARTMENT","TEAM LEADER","EMPLOYEES","DESCRIPTION","ACTIONS"].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No departments yet</Typography>
                      <Button size="small" variant="contained" startIcon={<Add />}
                        onClick={() => setDeptDialog({ open: true, initial: null, parentId: null })}
                        sx={{ mt: 2, textTransform: "none", bgcolor: TEAL }}>Add Department</Button>
                    </TableCell></TableRow>
                  )}
                  {departments.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(d => {
                    const head = employees.find(e => e.id === d.head_id);
                    const find = (nodes) => { for (const n of nodes) { if (n.id === d.id) return n; const f = find(n.children || []); if (f) return f; } return null; };
                    const dn = find(tree);
                    return (
                      <TableRow key={d.id} hover>
                        <TableCell><Box display="flex" alignItems="center" gap={1}><AccountTree sx={{ fontSize: 14, color: TEAL }} /><Typography variant="body2" fontWeight="bold">{d.name}</Typography></Box></TableCell>
                        <TableCell>{head ? <Box display="flex" alignItems="center" gap={0.75}><EmpAvatar emp={head} size={22} /><Box><Typography variant="caption" fontWeight={600}>{head.name}</Typography><Chip label="TL" size="small" sx={{ ml: 0.5, height: 14, fontSize: 9, bgcolor: TL_LT, color: TL_COLOR }} /></Box></Box>
                          : <Button size="small" startIcon={<Star sx={{ fontSize: 11 }} />} onClick={() => setEmpDialog({ open: true, initial: null, deptId: d.id, managerId: null, isTeamLeader: true })} sx={{ textTransform: "none", fontSize: "0.68rem", color: TL_COLOR, p: 0 }}>Add TL</Button>}</TableCell>
                        <TableCell><Chip label={dn?.employee_count || 0} size="small" sx={{ bgcolor: TEAL_LT, color: TEAL, fontWeight: 700, height: 20 }} /></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{d.description || "—"}</Typography></TableCell>
                        <TableCell><Box display="flex" gap={0.5}>
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => setDeptDialog({ open: true, initial: d, parentId: null })}><Edit sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                          <Tooltip title="Add TL"><IconButton size="small" sx={{ color: TL_COLOR }} onClick={() => setEmpDialog({ open: true, initial: null, deptId: d.id, managerId: null, isTeamLeader: true })}><Star sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                          <Tooltip title="Add Employee"><IconButton size="small" sx={{ color: TEAL }} onClick={() => setEmpDialog({ open: true, initial: null, deptId: d.id, managerId: null, isTeamLeader: false })}><PersonAdd sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteDept(d.id)}><Delete sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                        </Box></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </Card>
      </Box>

      {/* Dialogs */}
      <DeptDialog
        open={deptDialog.open}
        onClose={() => setDeptDialog({ open: false, initial: null, parentId: null })}
        initial={deptDialog.initial}
        departments={departments}
        defaultParentId={deptDialog.parentId}
        onSave={handleSaveDept}
      />
      <EmployeeDialog
        open={empDialog.open}
        onClose={() => setEmpDialog({ open: false, initial: null, deptId: null, managerId: null, isTeamLeader: false })}
        initial={empDialog.initial}
        departments={departments}
        employees={employees}
        defaultDeptId={empDialog.deptId}
        defaultManagerId={empDialog.managerId}
        defaultIsTeamLeader={empDialog.isTeamLeader}
        onSave={handleSaveEmp}
      />

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
