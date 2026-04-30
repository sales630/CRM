/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import ScrollableTable from "components/ScrollableTable";
import {
  Box, Typography, Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Avatar,
  Menu, MenuItem, Drawer, Divider, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  CircularProgress, Tabs, Tab, Tooltip, Grid,
} from "@mui/material";
import Icon from "@mui/material/Icon";
import { leadsAPI, activitiesAPI, usersAPI } from "services/api";
import EmployeeAvatar from "components/EmployeeAvatar";
import CallButton from "components/CallButton";
import { useCall } from "context/CallContext";

// ── Stages matching Bitrix24 ───────────────────────────────────────────────
const STAGES = [
  { id: "Fresh Leads",                color: "#1976d2", light: "#e3f2fd",  icon: "fiber_new" },
  { id: "Assigned Leads",             color: "#7b1fa2", light: "#f3e5f5",  icon: "assignment_ind" },
  { id: "Connected / In Progress",    color: "#f57c00", light: "#fff3e0",  icon: "phone_in_talk" },
  { id: "No Answer",                  color: "#d32f2f", light: "#ffebee",  icon: "phone_missed" },
  { id: "Need to connect in future",  color: "#388e3c", light: "#e8f5e9",  icon: "schedule" },
  { id: "Lead Won",                   color: "#1b5e20", light: "#c8e6c9",  icon: "emoji_events" },
  { id: "Lead Lost",                  color: "#757575", light: "#f5f5f5",  icon: "cancel" },
  { id: "Junk Lead",                  color: "#795548", light: "#efebe9",  icon: "delete_sweep" },
];

const SOURCE_OPTIONS = [
  "Website","Call(OSBK)","E-Mail","CRM form","Referral","By Recommendation",
  "Booking","Rent Manager","Facebook","Instagram","LinkedIn","Import","Other",
];
const LEAD_FOR_OPTIONS = [
  "Outsourced Bookkeeping","Back Office Accounting","Tax Services","Payroll","Other",
];
// Responsible options loaded dynamically from users API (see useEffect in Leads component)
const RESPONSIBLE_OPTIONS = []; // kept for legacy fallback only
const PRIORITY_OPTIONS = ["low","medium","high"];
const MEETING_FEEDBACK_OPTIONS = [
  "","Qualified Lead/Asking for proposal and aggrement","Non Qualified Lead","Others",
];

const stageOf = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── LeadCard (Bitrix24 style) ──────────────────────────────────────────────
function LeadCard({ lead, onDragStart, onOpenDetail, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const stage = stageOf(lead.stage);
  const { onlineUsers, startCall, callState } = useCall();
  const matchedUser = onlineUsers.find(u => (u.userName||"").trim().toLowerCase() === (lead.responsible||"").trim().toLowerCase());
  const actCount = (lead.activities || []).length;

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      sx={{
        background: "#fff",
        borderRadius: 1.5,
        mb: 1.5,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "grab",
        borderLeft: `3px solid ${stage.color}`,
        "&:hover": { boxShadow: "0 3px 10px rgba(0,0,0,0.14)" },
        transition: "box-shadow 0.2s",
        position: "relative",
      }}
    >
      {/* Header row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", px: 1.5, pt: 1.2, pb: 0.3 }}>
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ cursor: "pointer", "&:hover": { color: "#1976d2" }, flex: 1, fontSize: "0.78rem", lineHeight: 1.3, pr: 0.5 }}
          onClick={() => onOpenDetail(lead)}
        >
          {lead.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem", mr: 0.5 }}>
            {fmtDate(lead.created_at)}
          </Typography>
          <IconButton size="small" sx={{ p: 0.3 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Icon sx={{ fontSize: 16 }}>more_vert</Icon>
          </IconButton>
        </Box>
      </Box>

      {/* Amount */}
      <Box sx={{ px: 1.5, pb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.7rem" }}>
          ${Number(lead.amount || 0).toLocaleString()}
        </Typography>
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* Details */}
      <Box sx={{ px: 1.5, pt: 0.8, pb: 1, display: "flex", flexDirection: "column", gap: 0.3 }}>
        {lead.name && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", mt: "1px", flexShrink: 0 }}>person</Icon>
            <Typography variant="caption" sx={{ fontSize: "0.72rem", lineHeight: 1.4 }}>
              <b>Name</b> {lead.name}
            </Typography>
          </Box>
        )}
        {lead.source && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", mt: "1px", flexShrink: 0 }}>input</Icon>
            <Typography variant="caption" sx={{ fontSize: "0.72rem", lineHeight: 1.4 }}>
              <b>Source</b> {lead.source}
            </Typography>
          </Box>
        )}
        {lead.responsible && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", flexShrink: 0 }}>manage_accounts</Icon>
            <Typography variant="caption" sx={{ fontSize: "0.72rem", lineHeight: 1.4 }} component="span">
              <b>Responsible</b>&nbsp;
            </Typography>
            <EmployeeAvatar name={lead.responsible} size={18} showName />
            {matchedUser && (
              <CallButton userId={matchedUser.userId} userName={matchedUser.userName} iconSize={13} showAudio={false} compact />
            )}
          </Box>
        )}
        {lead.notes && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", mt: "1px", flexShrink: 0 }}>comment</Icon>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {lead.notes}
            </Typography>
          </Box>
        )}
        {lead.lead_for && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", mt: "1px", flexShrink: 0 }}>work</Icon>
            <Typography variant="caption" sx={{ fontSize: "0.72rem" }}>
              <b>Lead For</b> {lead.lead_for}
            </Typography>
          </Box>
        )}
        {lead.present_software && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Icon sx={{ fontSize: 13, color: "#999", mt: "1px", flexShrink: 0 }}>computer</Icon>
            <Typography variant="caption" sx={{ fontSize: "0.72rem" }}>
              <b>Present Software</b> {lead.present_software}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer: activity count */}
      <Box sx={{ px: 1.5, pb: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <Chip
          icon={<Icon sx={{ fontSize: "13px !important" }}>bolt</Icon>}
          label={`${actCount} + Activity`}
          size="small"
          onClick={() => onOpenDetail(lead)}
          sx={{ fontSize: "0.65rem", height: 20, cursor: "pointer", bgcolor: "#f0f4ff", color: "#1976d2", "& .MuiChip-icon": { color: "#1976d2" } }}
        />
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onOpenDetail(lead); }}>
          <Icon fontSize="small" sx={{ mr: 1 }}>edit</Icon> Edit
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onDelete(lead.id); }} sx={{ color: "error.main" }}>
          <Icon fontSize="small" sx={{ mr: 1 }}>delete</Icon> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ── Lead Detail Drawer ─────────────────────────────────────────────────────
function LeadDetailDrawer({ open, lead, onClose, onSave, onDelete, users = [] }) {
  const [form, setForm] = useState({});
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState(0);
  const [newAct, setNewAct] = useState({ type: "call", title: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) { setForm({ ...lead }); setActivities(lead.activities || []); }
  }, [lead]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(lead.id, form); } finally { setSaving(false); }
  };

  const handleAddAct = async () => {
    if (!newAct.title) return;
    try {
      const r = await activitiesAPI.create({ ...newAct, entity_type: "lead", entity_id: lead.id });
      setActivities([r, ...activities]);
      setNewAct({ type: "call", title: "" });
    } catch {}
  };

  if (!lead) return null;
  const stage = stageOf(form.stage);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 520 } }}>
      {/* Header */}
      <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", bgcolor: stage.light }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1rem" }}>{form.title || "Lead Detail"}</Typography>
          <Chip label={stage.id} size="small" sx={{ bgcolor: stage.color, color: "#fff", mt: 0.5, fontSize: "0.68rem" }} />
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <IconButton onClick={onClose}><Icon>close</Icon></IconButton>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: "1px solid #eee" }}>
        <Tab label="Details" />
        <Tab label={`Activities (${activities.length})`} />
      </Tabs>

      <Box sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField label="Title *" value={form.title || ""} onChange={e => set("title", e.target.value)} fullWidth size="small" />
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField label="Contact Name" value={form.name || ""} onChange={e => set("name", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Company" value={form.company || ""} onChange={e => set("company", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Phone" value={form.phone || ""} onChange={e => set("phone", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Email" value={form.email || ""} onChange={e => set("email", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Amount" type="number" value={form.amount || ""} onChange={e => set("amount", e.target.value)} fullWidth size="small"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Country" value={form.country || ""} onChange={e => set("country", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage</InputLabel>
                  <Select value={form.stage || "Fresh Leads"} label="Stage" onChange={e => set("stage", e.target.value)}>
                    {STAGES.map(s => <MenuItem key={s.id} value={s.id}>{s.id}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select value={form.source || "Website"} label="Source" onChange={e => set("source", e.target.value)}>
                    {SOURCE_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Responsible</InputLabel>
                  <Select value={form.responsible || ""} label="Responsible" onChange={e => set("responsible", e.target.value)}>
                    {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name} ({u.role || u.department || ""})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={form.priority || "medium"} label="Priority" onChange={e => set("priority", e.target.value)}>
                    {PRIORITY_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Lead For</InputLabel>
                  <Select value={form.lead_for || ""} label="Lead For" onChange={e => set("lead_for", e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {LEAD_FOR_OPTIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Present Accounting Software" value={form.present_software || ""} onChange={e => set("present_software", e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Meeting Feedback</InputLabel>
                  <Select value={form.meeting_feedback || ""} label="Meeting Feedback" onChange={e => set("meeting_feedback", e.target.value)}>
                    {MEETING_FEEDBACK_OPTIONS.map(m => <MenuItem key={m} value={m}>{m || "—"}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes / Comment" value={form.notes || ""} onChange={e => set("notes", e.target.value)} multiline rows={3} fullWidth size="small" />
              </Grid>
            </Grid>
            <Button color="error" variant="outlined" startIcon={<Icon>delete</Icon>} onClick={() => { onDelete(lead.id); onClose(); }}>
              Delete Lead
            </Button>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={newAct.type} onChange={e => setNewAct({ ...newAct, type: e.target.value })}>
                  {["call","email","task","meeting","note"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" placeholder="Activity title…" value={newAct.title}
                onChange={e => setNewAct({ ...newAct, title: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAddAct()} sx={{ flex: 1 }} />
              <Button variant="contained" size="small" onClick={handleAddAct}>Add</Button>
            </Box>
            {activities.length === 0 && (
              <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>No activities yet</Typography>
            )}
            {activities.map(act => (
              <Box key={act.id} sx={{ p: 1.5, mb: 1, border: "1px solid #eee", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Chip label={act.type} size="small" sx={{ textTransform: "capitalize" }} />
                  <Typography variant="caption" color="text.secondary">
                    {act.created_at ? new Date(act.created_at).toLocaleDateString() : ""}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600} mt={0.5}>{act.title}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

// ── Add Lead Dialog ────────────────────────────────────────────────────────
function AddLeadDialog({ open, onClose, onSave, users = [] }) {
  const defaultResponsible = users.length > 0 ? users[0].name : "";
  const empty = { title:"", name:"", phone:"", email:"", company:"", amount:"", stage:"Fresh Leads",
    source:"Website", priority:"medium", responsible:defaultResponsible, lead_for:"Outsourced Bookkeeping",
    present_software:"", notes:"", country:"" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if (!open) setForm(empty); }, [open]);

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Add New Lead</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField label="Title *" value={form.title} onChange={e => set("title", e.target.value)} fullWidth size="small" autoFocus />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Contact Name" value={form.name} onChange={e => set("name", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Company" value={form.company} onChange={e => set("company", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Email" value={form.email} onChange={e => set("email", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select value={form.stage} label="Stage" onChange={e => set("stage", e.target.value)}>
                {STAGES.map(s => <MenuItem key={s.id} value={s.id}>{s.id}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select value={form.source} label="Source" onChange={e => set("source", e.target.value)}>
                {SOURCE_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Responsible</InputLabel>
              <Select value={form.responsible} label="Responsible" onChange={e => set("responsible", e.target.value)}>
                {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name} ({u.role || u.department || ""})</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Lead For</InputLabel>
              <Select value={form.lead_for} label="Lead For" onChange={e => set("lead_for", e.target.value)}>
                {LEAD_FOR_OPTIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField label="Amount" type="number" value={form.amount} onChange={e => set("amount", e.target.value)} fullWidth size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Present Accounting Software" value={form.present_software} onChange={e => set("present_software", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notes / Comment" value={form.notes} onChange={e => set("notes", e.target.value)} multiline rows={2} fullWidth size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.title}>
          {saving ? "Saving…" : "Add Lead"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main CRMLeads Page ─────────────────────────────────────────────────────
export default function CRMLeads() {
  const [view, setView] = useState("kanban");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [stageFilter, setStageFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const dragId = useRef(null);
  const timerRef = useRef(null);

  // Dynamic user list for responsible dropdown
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    usersAPI.getAll().then(u => setAllUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, []);

  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await leadsAPI.getAll(search ? { search } : {});
      setLeads(data);
    } catch {
      if (!silent) showSnack("Failed to load leads. Make sure the backend is running on port 5000.", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchLeads(); }, []);
  useEffect(() => { const t = setTimeout(fetchLeads, 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [search, stageFilter, sourceFilter]);

  // Auto-refresh for watching webhook leads come in
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchLeads(true), 5000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, fetchLeads]);

  const handleDragStart = (e, id) => { dragId.current = id; };
  const handleDrop = async (e, stage) => {
    e.preventDefault();
    if (!dragId.current) return;
    const lead = leads.find(l => l.id === dragId.current);
    if (lead && lead.stage !== stage) {
      setLeads(prev => prev.map(l => l.id === dragId.current ? { ...l, stage } : l));
      try { await leadsAPI.updateStage(dragId.current, stage); showSnack("Stage updated"); } catch { fetchLeads(); }
    }
    setDragOverStage(null); dragId.current = null;
  };

  const handleDelete = async (id) => {
    try { await leadsAPI.delete(id); setLeads(prev => prev.filter(l => l.id !== id)); showSnack("Lead deleted"); }
    catch { showSnack("Delete failed", "error"); }
  };

  const handleBulkDelete = async () => {
    if (!selectedLeads.length) return;
    try {
      await leadsAPI.bulkDelete(selectedLeads);
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
      setSelectedLeads([]);
      showSnack(`${selectedLeads.length} leads deleted`);
    } catch { showSnack("Delete failed", "error"); }
  };

  const handleSaveLead = async (id, data) => {
    try {
      const updated = await leadsAPI.update(id, data);
      setLeads(prev => prev.map(l => l.id === id ? { ...updated } : l));
      setDetailLead(updated);
      showSnack("Lead updated");
    } catch { showSnack("Update failed", "error"); }
  };

  const handleAddLead = async (data) => {
    try {
      const created = await leadsAPI.create(data);
      setLeads(prev => [created, ...prev]);
      showSnack("Lead created!");
    } catch { showSnack("Create failed", "error"); }
  };

  // Filters
  let filteredLeads = leads;
  if (stageFilter !== "All") filteredLeads = filteredLeads.filter(l => l.stage === stageFilter);
  if (sourceFilter !== "All") filteredLeads = filteredLeads.filter(l => l.source === sourceFilter);

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
    else setSelectedLeads(filteredLeads.map(l => l.id));
  };

  // Unique sources from current leads
  const activeSources = ["All", ...Array.from(new Set(leads.map(l => l.source).filter(Boolean)))];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h5" fontWeight={700}>CRM Leads</Typography>
            <Chip label={`${leads.length} total`} size="small" color="primary" />
            <Chip
              label={autoRefresh ? "Auto-refreshing…" : "Auto-refresh off"}
              size="small"
              color={autoRefresh ? "success" : "default"}
              icon={<Icon sx={{ fontSize: "14px !important" }}>{autoRefresh ? "sync" : "sync_disabled"}</Icon>}
              onClick={() => setAutoRefresh(r => !r)}
              sx={{ cursor: "pointer" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {selectedLeads.length > 0 && (
              <Button variant="outlined" color="error" size="small" startIcon={<Icon>delete</Icon>} onClick={handleBulkDelete}>
                Delete ({selectedLeads.length})
              </Button>
            )}
            <Tooltip title="Refresh leads"><IconButton size="small" onClick={() => fetchLeads()} sx={{ border: "1px solid #ddd" }}><Icon>refresh</Icon></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Icon>add</Icon>} size="small" onClick={() => setAddOpen(true)}>Add Lead</Button>
            <IconButton onClick={() => setView(v => v === "kanban" ? "list" : "kanban")} sx={{ border: "1px solid #ddd" }}>
              <Icon>{view === "kanban" ? "list" : "view_kanban"}</Icon>
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Icon fontSize="small">search</Icon></InputAdornment> }}
            sx={{ width: 220 }} />

          {/* Stage filter chips */}
          {["All", ...STAGES.map(s => s.id)].map(sid => {
            const s = STAGES.find(x => x.id === sid);
            return (
              <Chip key={sid} label={sid === "All" ? "All" : sid}
                onClick={() => setStageFilter(sid)} size="small"
                sx={stageFilter === sid ? { bgcolor: s?.color || "#1976d2", color: "#fff" }
                  : { bgcolor: "transparent", color: s?.color || "#333", border: `1px solid ${s?.color || "#ccc"}` }} />
            );
          })}

          {/* Source filter */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} displayEmpty
              startAdornment={<Icon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }}>filter_list</Icon>}>
              {activeSources.map(s => <MenuItem key={s} value={s}>{s === "All" ? "All Sources" : s}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}

        {/* Kanban View */}
        {!loading && view === "kanban" && (
          <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2, alignItems: "flex-start" }}>
            {STAGES.filter(s => stageFilter === "All" || s.id === stageFilter).map(stage => {
              const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
              const total = stageLeads.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
              return (
                <Box key={stage.id}
                  onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDrop={e => handleDrop(e, stage.id)}
                  onDragLeave={() => setDragOverStage(null)}
                  sx={{
                    minWidth: 265, maxWidth: 280, flex: "0 0 265px",
                    background: dragOverStage === stage.id ? stage.light : "#f4f6f8",
                    borderRadius: 2, p: 1.5,
                    border: `2px solid ${dragOverStage === stage.id ? stage.color : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                >
                  {/* Stage header */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                      <Icon sx={{ fontSize: 16, color: stage.color }}>{stage.icon}</Icon>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color={stage.color} sx={{ fontSize: "0.75rem" }}>
                          {stage.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                          {stageLeads.length} leads{total > 0 ? ` · $${total.toLocaleString()}` : " · $0"}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label={stageLeads.length} size="small"
                      sx={{ bgcolor: stage.light, color: stage.color, fontWeight: 700, minWidth: 26, height: 20, fontSize: "0.7rem" }} />
                  </Box>

                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead}
                      onDragStart={handleDragStart} onOpenDetail={setDetailLead} onDelete={handleDelete} />
                  ))}
                  {stageLeads.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 4, color: "#ccc", border: "1px dashed #ddd", borderRadius: 1 }}>
                      <Icon sx={{ fontSize: 28 }}>inbox</Icon>
                      <Typography variant="caption" display="block">Drop leads here</Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* List View */}
        {!loading && view === "list" && (
          <ScrollableTable
            sx={{ background: "#fff", borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
            totalCount={filteredLeads.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
          >
            <Table size="small">
              <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} />
                  </TableCell>
                  <TableCell><b>Title</b></TableCell>
                  <TableCell><b>Name</b></TableCell>
                  <TableCell><b>Phone</b></TableCell>
                  <TableCell><b>Stage</b></TableCell>
                  <TableCell><b>Source</b></TableCell>
                  <TableCell><b>Responsible</b></TableCell>
                  <TableCell><b>Lead For</b></TableCell>
                  <TableCell><b>Amount</b></TableCell>
                  <TableCell><b>Created</b></TableCell>
                  <TableCell><b>Actions</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLeads.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(lead => {
                  const s = stageOf(lead.stage);
                  return (
                    <TableRow key={lead.id} hover selected={selectedLeads.includes(lead.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedLeads.includes(lead.id)}
                          onChange={e => setSelectedLeads(e.target.checked ? [...selectedLeads, lead.id] : selectedLeads.filter(id => id !== lead.id))} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}
                          onClick={() => setDetailLead(lead)}>{lead.title}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{lead.name || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{lead.phone || "—"}</Typography></TableCell>
                      <TableCell><Chip label={lead.stage} size="small" sx={{ bgcolor: s.light, color: s.color, fontSize: "0.65rem" }} /></TableCell>
                      <TableCell><Typography variant="body2">{lead.source || "—"}</Typography></TableCell>
                      <TableCell><EmployeeAvatar name={lead.responsible} size={22} showName /></TableCell>
                      <TableCell><Typography variant="body2">{lead.lead_for || "—"}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          {lead.amount > 0 ? `$${Number(lead.amount).toLocaleString()}` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{fmtDate(lead.created_at)}</Typography></TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => setDetailLead(lead)}><Icon fontSize="small">edit</Icon></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(lead.id)}><Icon fontSize="small">delete</Icon></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No leads found</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollableTable>
        )}
      </Box>

      <LeadDetailDrawer
        open={Boolean(detailLead)}
        lead={detailLead}
        onClose={() => setDetailLead(null)}
        onSave={handleSaveLead}
        onDelete={handleDelete}
        users={allUsers}
      />
      <AddLeadDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddLead} users={allUsers} />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
