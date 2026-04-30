/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import EmployeeAvatar from "components/EmployeeAvatar";
import {
  Box, Grid, Card, CardContent, Typography, Button, IconButton, TextField, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Table, TableHead, TableBody, TableRow, TableCell, Avatar, Tooltip, Drawer, Divider, Tabs, Tab, Badge,
  LinearProgress, CircularProgress, Snackbar, Alert, InputAdornment,
  Switch, FormControlLabel, Paper, List, ListItem, ListItemText, Checkbox,
  ListItemAvatar, Menu, Collapse,
} from "@mui/material";
import {
  Add, Delete, Edit, Search, Close, AccessTime, CheckCircle,
  Email as EmailIcon, Repeat, Timer, PersonAdd, AttachFile,
  FilterList, PlayArrow, Stop, Flag, Schedule, AssignmentTurnedIn,
  MailOutline, RadioButtonUnchecked, FiberManualRecord, MoreVert, Refresh,
  KeyboardArrowDown, Person, Group, ViewKanban, ViewList, Sort,
  Star, StarBorder, AlarmOn, CheckBox, IndeterminateCheckBox, Visibility,
  Send, ArrowForward, InfoOutlined, Comment, ExpandMore, ExpandLess,
  DragIndicator, Circle, Link as LinkIcon, LibraryAdd, Description,
} from "@mui/icons-material";
import { tasksAPI, usersAPI, companiesAPI, automationAPI } from "services/api";
import { useAuth } from "context/AuthContext";
import { useCall } from "context/CallContext";
import CallButton from "components/CallButton";

// ── Constants ──────────────────────────────────────────────────────────────
const STATUSES   = ["pending", "in_progress", "review", "completed", "declined"];
const STATUS_META = {
  pending:     { label: "Pending",         color: "#f57c00", bg: "#fff3e0" },
  in_progress: { label: "In Progress",     color: "#1976d2", bg: "#e3f2fd" },
  review:      { label: "Under Review",    color: "#7b1fa2", bg: "#f3e5f5" },
  completed:   { label: "Completed",       color: "#388e3c", bg: "#e8f5e9" },
  declined:    { label: "Declined",        color: "#d32f2f", bg: "#ffebee" },
};
const PRIORITY_META = {
  low:    { label: "Low",    color: "#78909c", icon: "↓" },
  medium: { label: "Normal", color: "#f57c00", icon: "→" },
  high:   { label: "High",   color: "#d32f2f", icon: "↑" },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const fmtMins = (m) => { if (!m) return "0m"; const h = Math.floor(m / 60); const r = m % 60; return h > 0 ? `${h}h ${r}m` : `${r}m`; };
const getDueDate  = (t) => t.due_date || t.deadline || null;
const isOverdue   = (t) => { const d = getDueDate(t); return d && d.split("T")[0] < new Date().toISOString().split("T")[0] && t.status !== "completed" && t.status !== "declined"; };
const fmtDate     = (d) => { if (!d) return "—"; const s = d.length > 10 ? d : d + "T00:00:00"; return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const fmtDateTime = (d) => { if (!d) return "—"; return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
const avatarColor = (name) => { const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00"]; let s = 0; for (let c of name || "U") s += c.charCodeAt(0); return C[s % C.length]; };
const stripHtml = (html) => {
  if (!html) return "";
  // Use a temporary DOM element to decode HTML entities and strip tags
  try {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    // Replace block-level tags with newlines before stripping
    tmp.querySelectorAll("br, p, div, tr, li").forEach(el => {
      el.before(document.createTextNode("\n"));
    });
    return (tmp.textContent || tmp.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  }
};

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, sub, onClick, active }) {
  return (
    <Card onClick={onClick} sx={{ cursor: onClick ? "pointer" : "default", borderLeft: `4px solid ${color}`, boxShadow: active ? `0 0 0 2px ${color}` : "0 1px 4px rgba(0,0,0,0.08)", transition: "all 0.2s", "&:hover": onClick ? { boxShadow: 3 } : {} }}>
      <CardContent sx={{ p: "12px 16px !important" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, fontSize: 10, color: "text.secondary" }}>{label}</Typography>
            <Typography variant="h4" fontWeight={800} color={color}>{value ?? "—"}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          <Box sx={{ color, bgcolor: color + "18", borderRadius: 2, p: 1.2, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Priority Chip ──────────────────────────────────────────────────────────
function PriorityChip({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return <Chip label={`${m.icon} ${m.label}`} size="small" sx={{ bgcolor: m.color + "18", color: m.color, fontWeight: 700, fontSize: 11, height: 22 }} />;
}

// ── Status Chip ────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return <Chip label={m.label} size="small" sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: 11, height: 22 }} />;
}

// ── Time Tracker ──────────────────────────────────────────────────────────
function TimeTracker({ taskId, onLogged }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState("");
  const startRef = useRef(null);
  const timerRef = useRef(null);

  const start = () => { startRef.current = Date.now(); setRunning(true); timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000); };
  const stop = async () => {
    clearInterval(timerRef.current); setRunning(false);
    const mins = Math.max(1, Math.round(elapsed / 60));
    try {
      await tasksAPI.logTime(taskId, { duration_minutes: mins, notes, started_at: new Date(startRef.current).toISOString(), ended_at: new Date().toISOString() });
      onLogged?.(); setElapsed(0); setNotes("");
    } catch {}
  };
  const fmt = (s) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  return (
    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1.5, bgcolor: running ? "#e8f5e9" : "#fafafa" }}>
      <Box display="flex" alignItems="center" gap={1} mb={running ? 1 : 0}>
        <Typography variant="h6" fontWeight="mono" sx={{ fontFamily: "monospace", minWidth: 80 }}>{fmt(elapsed)}</Typography>
        {!running ? (
          <Button size="small" variant="contained" color="success" startIcon={<PlayArrow />} onClick={start} sx={{ textTransform: "none" }}>Start Timer</Button>
        ) : (
          <Button size="small" variant="contained" color="error" startIcon={<Stop />} onClick={stop} sx={{ textTransform: "none" }}>Stop & Save</Button>
        )}
      </Box>
      {running && <TextField size="small" fullWidth placeholder="What are you working on?" value={notes} onChange={e => setNotes(e.target.value)} sx={{ mt: 1 }} />}
    </Box>
  );
}

// ── Manual Time Log ────────────────────────────────────────────────────────
function ManualTimeLog({ taskId, userName, onLogged }) {
  const [hours, setHours] = useState(""); const [mins, setMins] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  const save = async () => {
    const total = (parseInt(hours)||0)*60 + (parseInt(mins)||0);
    if (!total) return;
    setSaving(true);
    try { await tasksAPI.logTime(taskId, { user: userName, duration_minutes: total, notes }); onLogged?.(); setHours(""); setMins(""); setNotes(""); } catch {}
    setSaving(false);
  };
  return (
    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1.5, bgcolor: "#fafafa", mt: 1 }}>
      <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">Log Time Manually</Typography>
      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <TextField size="small" label="Hours" type="number" value={hours} onChange={e => setHours(e.target.value)} sx={{ width: 80 }} />
        <TextField size="small" label="Mins" type="number" value={mins} onChange={e => setMins(e.target.value)} sx={{ width: 80 }} />
        <TextField size="small" label="Notes" value={notes} onChange={e => setNotes(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
        <Button size="small" variant="contained" onClick={save} disabled={saving} sx={{ textTransform: "none" }}>Save</Button>
      </Box>
    </Box>
  );
}

// ── Task Form Dialog ───────────────────────────────────────────────────────
function TaskForm({ open, onClose, initial, onSave, users = [], currentUser }) {
  const blank = {
    title: "", description: "", type: "task", status: "pending", priority: "medium",
    assigned_to: currentUser?.name || "", due_date: "", start_date: new Date().toISOString().split("T")[0],
    client: "", client_name: "", tags: [], time_estimate: 0,
    recurring: { enabled: false, frequency: "monthly" }, subtasks: [],
    // Accounting fields
    project_name: "", crm_item: "", crm_company: "", work_performed: "",
    is_tax_return: false, tax_return_total: "",
    is_payroll: false, payroll_total: "",
    senior_accountant: "",
  };
  const [form, setForm]           = useState(blank);
  const [newSub, setNewSub]       = useState("");
  const [newTag, setNewTag]       = useState("");
  const [companies, setCompanies] = useState([]);
  // Time logging state (edit mode only)
  const [timeLogs, setTimeLogs]   = useState([]);
  const [addH, setAddH]           = useState("");
  const [addM, setAddM]           = useState("");
  const [addNotes, setAddNotes]   = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const [editLogId, setEditLogId] = useState(null);
  const [editH, setEditH]         = useState("");
  const [editM, setEditM]         = useState("");
  const [editNotes, setEditNotes] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Stable ref so we can call reload from event handlers without stale closure issues
  const taskIdRef = useRef(null);

  const reloadTimeLogs = async () => {
    const id = taskIdRef.current;
    if (!id) return;
    try {
      const result = await tasksAPI.getTimeLogs(id);
      // getTimeLogs returns { logs: [...], total_minutes: n }
      const logs = Array.isArray(result?.logs) ? result.logs
                 : Array.isArray(result)        ? result
                 : [];
      setTimeLogs(logs);
    } catch (e) {
      console.error("Failed to load time logs:", e);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Set form values
    setForm(initial ? {
      ...blank, ...initial,
      tags:        Array.isArray(initial.tags)     ? initial.tags     : [],
      subtasks:    Array.isArray(initial.subtasks) ? initial.subtasks : [],
      recurring:   initial.recurring || { enabled: false, frequency: "monthly" },
      client_name: initial.client_name || initial.client || "",
      crm_company: initial.crm_company || "",
    } : { ...blank });

    // Reset time entry state
    setAddH(""); setAddM(""); setAddNotes(""); setEditLogId(null); setTimeLogs([]);
    taskIdRef.current = initial?.id || null;

    // Fetch time logs for existing task
    if (initial?.id) {
      tasksAPI.getTimeLogs(initial.id).then(result => {
        const logs = Array.isArray(result?.logs) ? result.logs
                   : Array.isArray(result)        ? result
                   : [];
        setTimeLogs(logs);
      }).catch(() => {});
    }

    // Load CRM companies
    companiesAPI.getAll().then(data => setCompanies(Array.isArray(data) ? data : [])).catch(() => {});
  }, [open, initial?.id]); // use initial?.id as dep (primitive) to avoid re-running on same-task re-renders

  const isAdminOrTLForm = ["admin","super_admin","team_leader"].includes(currentUser?.role);
  // Anyone can ADD time once task is started/completed; admins/TL/assignee always can
  const canLogTime = isAdminOrTLForm
    || (initial && initial.assigned_to === currentUser?.name)
    || ["in_progress","completed"].includes(initial?.status);
  // Own log entries are always editable by the creator; admins/TL can edit any
  const canEditLogForm = (log) => isAdminOrTLForm || log.user === currentUser?.name;

  const handleAddTime = async () => {
    const total = (parseInt(addH) || 0) * 60 + (parseInt(addM) || 0);
    if (!total || !taskIdRef.current) return;
    setSavingTime(true);
    try {
      await tasksAPI.logTime(taskIdRef.current, { user: currentUser?.name, duration_minutes: total, notes: addNotes });
      setAddH(""); setAddM(""); setAddNotes("");
      await reloadTimeLogs();
    } catch (e) { console.error(e); }
    setSavingTime(false);
  };

  const startEditLog = (l) => {
    setEditLogId(l.id);
    setEditH(String(Math.floor(Number(l.duration_minutes) / 60)));
    setEditM(String(Number(l.duration_minutes) % 60));
    setEditNotes(l.notes || "");
  };
  const saveEditLog = async () => {
    const total = (parseInt(editH) || 0) * 60 + (parseInt(editM) || 0);
    if (!total || !taskIdRef.current || !editLogId) return;
    await tasksAPI.updateTimeLog(taskIdRef.current, editLogId, { duration_minutes: total, notes: editNotes });
    setEditLogId(null);
    await reloadTimeLogs();
  };
  const deleteLog = async (logId) => {
    if (!taskIdRef.current) return;
    await tasksAPI.deleteTimeLog(taskIdRef.current, logId);
    await reloadTimeLogs();
  };

  const addSub = () => { if (!newSub.trim()) return; set("subtasks", [...(form.subtasks||[]), { id: Date.now().toString(), title: newSub.trim(), completed: false }]); setNewSub(""); };
  const addTag = () => { const tags = Array.isArray(form.tags) ? form.tags : []; if (!newTag.trim() || tags.includes(newTag.trim())) return; set("tags", [...tags, newTag.trim()]); setNewTag(""); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography fontWeight="bold">{initial?.id && !initial?._fromTemplate ? "Edit Task" : initial?._fromTemplate ? "New Task from Template" : "Create New Task"}</Typography>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Task Title *" size="small" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter task title..." />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" size="small" multiline rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <MenuItem key={s} value={s}><Box display="flex" alignItems="center" gap={1}><Circle sx={{ fontSize: 10, color: STATUS_META[s]?.color }} />{STATUS_META[s]?.label}</Box></MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={e => set("priority", e.target.value)}>
                {Object.entries(PRIORITY_META).map(([k,v]) => <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Assigned To</InputLabel>
              <Select value={form.assigned_to} label="Assigned To" onChange={e => set("assigned_to", e.target.value)}>
                {users.map(u => <MenuItem key={u.id} value={u.name}><Box display="flex" alignItems="center" gap={1}><Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: avatarColor(u.name) }}>{getInitials(u.name)}</Avatar>{u.name}</Box></MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Client Name" value={form.client_name || form.client} onChange={e => { set("client_name", e.target.value); set("client", e.target.value); }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Project Name" value={form.project_name} onChange={e => set("project_name", e.target.value)} placeholder="e.g. Smith Corp 2025" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>CRM Company</InputLabel>
              <Select value={form.crm_company} label="CRM Company" onChange={e => set("crm_company", e.target.value)}>
                <MenuItem value=""><em>— None —</em></MenuItem>
                {companies.map(c => (
                  <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>CRM Item Type</InputLabel>
              <Select value={form.crm_item} label="CRM Item Type" onChange={e => set("crm_item", e.target.value)}>
                <MenuItem value=""><em>— None —</em></MenuItem>
                <MenuItem value="Lead">Lead</MenuItem>
                <MenuItem value="Deal">Deal</MenuItem>
                <MenuItem value="Contact">Contact</MenuItem>
                <MenuItem value="Company">Company</MenuItem>
                <MenuItem value="Invoice">Invoice</MenuItem>
                <MenuItem value="Quote">Quote</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Senior Accountant" value={form.senior_accountant} onChange={e => set("senior_accountant", e.target.value)} placeholder="e.g. Amit Sharma" />
          </Grid>

          {/* Accounting Service Flags */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1.5, bgcolor: "#fafafa" }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>SERVICE TYPE</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Switch size="small" checked={Boolean(form.is_tax_return)} onChange={e => set("is_tax_return", e.target.checked)} />}
                    label={<Typography variant="body2">Tax Return</Typography>}
                  />
                  {form.is_tax_return && (
                    <TextField size="small" fullWidth label="Tax Return Amount / Notes" value={form.tax_return_total} onChange={e => set("tax_return_total", e.target.value)} placeholder="e.g. $1,500 or T1 Personal" sx={{ mt: 1 }} />
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Switch size="small" checked={Boolean(form.is_payroll)} onChange={e => set("is_payroll", e.target.checked)} />}
                    label={<Typography variant="body2">Payroll Working</Typography>}
                  />
                  {form.is_payroll && (
                    <TextField size="small" fullWidth label="Payroll Amount / Notes" value={form.payroll_total} onChange={e => set("payroll_total", e.target.value)} placeholder="e.g. $3,200 or Q1 Payroll" sx={{ mt: 1 }} />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Work Performed" multiline rows={2} value={form.work_performed} onChange={e => set("work_performed", e.target.value)} placeholder="Brief description of work done on this task..." />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={form.start_date} onChange={e => set("start_date", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Due Date" type="date" InputLabelProps={{ shrink: true }} value={form.due_date} onChange={e => set("due_date", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Time Estimate (minutes)" type="number" value={form.time_estimate} onChange={e => set("time_estimate", parseInt(e.target.value)||0)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Task Type</InputLabel>
              <Select value={form.type} label="Task Type" onChange={e => set("type", e.target.value)}>
                <MenuItem value="task">📋 Task</MenuItem>
                <MenuItem value="email_task">📧 Email Task</MenuItem>
                <MenuItem value="meeting">📅 Meeting</MenuItem>
                <MenuItem value="call">📞 Call</MenuItem>
                <MenuItem value="follow_up">🔁 Follow Up</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Tags</Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
              {(Array.isArray(form.tags) ? form.tags : []).map(t => <Chip key={t} label={t} size="small" onDelete={() => set("tags", (Array.isArray(form.tags) ? form.tags : []).filter(x => x !== t))} />)}
            </Box>
            <Box display="flex" gap={1}>
              <TextField size="small" placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} sx={{ width: 160 }} />
              <Button size="small" onClick={addTag} variant="outlined" sx={{ textTransform: "none" }}>Add</Button>
            </Box>
          </Grid>

          {/* Subtasks / Checklist */}
          <Grid item xs={12}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Checklist ({(form.subtasks||[]).filter(s=>s.completed).length}/{(form.subtasks||[]).length})</Typography>
            {(form.subtasks||[]).map(st => (
              <Box key={st.id} display="flex" alignItems="center" gap={1} mb={0.5}>
                <Checkbox size="small" checked={st.completed} onChange={() => set("subtasks", (form.subtasks||[]).map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))} sx={{ p: 0.5 }} />
                <Typography variant="body2" sx={{ flex: 1, textDecoration: st.completed ? "line-through" : "none", color: st.completed ? "text.secondary" : "text.primary" }}>{st.title}</Typography>
                <IconButton size="small" onClick={() => set("subtasks", (form.subtasks||[]).filter(s => s.id !== st.id))}><Close sx={{ fontSize: 14 }} /></IconButton>
              </Box>
            ))}
            <Box display="flex" gap={1} mt={0.5}>
              <TextField size="small" placeholder="Add checklist item..." value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === "Enter" && addSub()} sx={{ flex: 1 }} />
              <Button size="small" onClick={addSub} variant="outlined" sx={{ textTransform: "none" }}>Add</Button>
            </Box>
          </Grid>

          {/* Recurring */}
          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={form.recurring?.enabled || false} onChange={e => set("recurring", { ...form.recurring, enabled: e.target.checked })} size="small" />} label={<Typography variant="body2">Recurring Task</Typography>} />
            {form.recurring?.enabled && (
              <FormControl size="small" sx={{ ml: 2, minWidth: 140 }}>
                <InputLabel>Frequency</InputLabel>
                <Select value={form.recurring?.frequency || "monthly"} label="Frequency" onChange={e => set("recurring", { ...form.recurring, frequency: e.target.value })}>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="biweekly">Bi-weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>

          {/* ── Time Logging (edit mode only) ─────────────────────────── */}
          {initial?.id && (
            <Grid item xs={12}>
              <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2, bgcolor: "#fafafa" }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <Timer sx={{ fontSize: 18, color: "#1976d2" }} />
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                    TIME LOGGED
                  </Typography>
                  {timeLogs.length > 0 && (
                    <Chip
                      label={`Total: ${fmtMins(timeLogs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0))}`}
                      size="small"
                      sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, height: 20, fontSize: 10, ml: "auto" }}
                    />
                  )}
                </Box>

                {/* Existing logs */}
                {timeLogs.length === 0 && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>No time logged yet.</Typography>
                )}
                {timeLogs.map(l => (
                  <Box key={l.id}>
                    {editLogId === l.id ? (
                      <Box sx={{ border: "1px solid #1976d2", borderRadius: 2, p: 1.5, mb: 1, bgcolor: "#e3f2fd" }}>
                        <Typography variant="caption" fontWeight="bold" display="block" mb={1}>Edit Entry</Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                          <TextField size="small" label="Hours" type="number" inputProps={{ min: 0 }} value={editH} onChange={e => setEditH(e.target.value)} sx={{ width: 80 }} />
                          <TextField size="small" label="Mins" type="number" inputProps={{ min: 0, max: 59 }} value={editM} onChange={e => setEditM(e.target.value)} sx={{ width: 80 }} />
                          <TextField size="small" label="Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
                          <Button size="small" variant="contained" onClick={saveEditLog} sx={{ textTransform: "none" }}>Save</Button>
                          <Button size="small" onClick={() => setEditLogId(null)} sx={{ textTransform: "none" }}>Cancel</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75, px: 1, mb: 0.5, borderRadius: 1, bgcolor: "#fff", border: "1px solid #f0f0f0", "&:hover": { bgcolor: "#f5f5f5" } }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>{fmtMins(l.duration_minutes)}</Typography>
                          <Typography variant="caption" color="text.secondary">{l.notes || "—"} · {l.user}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontSize: "0.7rem" }}>
                            {l.started_at ? new Date(l.started_at).toLocaleDateString() : ""}
                          </Typography>
                          {canEditLogForm(l) && (
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => startEditLog(l)} sx={{ "&:hover": { bgcolor: "#e3f2fd" } }}>
                                <Edit sx={{ fontSize: 13, color: "#1976d2" }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canEditLogForm(l) && (
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => deleteLog(l.id)} sx={{ "&:hover": { bgcolor: "#ffebee" } }}>
                                <Close sx={{ fontSize: 13, color: "#e53935" }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}

                {/* Add new time entry */}
                {canLogTime && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed #e0e0e0" }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>+ Add Time Entry</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                      <TextField size="small" label="Hours" type="number" inputProps={{ min: 0 }} value={addH} onChange={e => setAddH(e.target.value)} sx={{ width: 80 }} />
                      <TextField size="small" label="Mins" type="number" inputProps={{ min: 0, max: 59 }} value={addM} onChange={e => setAddM(e.target.value)} sx={{ width: 80 }} />
                      <TextField size="small" label="Notes (optional)" value={addNotes} onChange={e => setAddNotes(e.target.value)} sx={{ flex: 1, minWidth: 150 }} />
                      <Button
                        size="small" variant="contained" onClick={handleAddTime} disabled={savingTime || (!(parseInt(addH)||0) && !(parseInt(addM)||0))}
                        startIcon={<AccessTime sx={{ fontSize: 14 }} />}
                        sx={{ textTransform: "none", bgcolor: "#1976d2", whiteSpace: "nowrap" }}
                      >
                        {savingTime ? "Saving…" : "Log Time"}
                      </Button>
                    </Box>
                  </Box>
                )}
                {!canLogTime && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
                    Time logging unlocks once the task is marked In Progress or Completed.
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.title.trim()} sx={{ textTransform: "none" }}>
          {(initial?.id && !initial?._fromTemplate) ? "Save Changes" : "Create Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Task Template Picker ───────────────────────────────────────────────────
function TemplatePickerDialog({ open, onClose, onSelectTemplate, onApplyDirect, users = [] }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [applying, setApplying]   = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    automationAPI.getTemplates()
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = templates.filter(t =>
    !search ||
    (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const PRIORITY_COLORS = { high: "#d32f2f", medium: "#f57c00", low: "#388e3c" };

  const handleApply = async (tpl) => {
    setApplying(tpl.id);
    try {
      await onApplyDirect(tpl.id);
      onClose();
    } catch {}
    setApplying(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LibraryAdd color="primary" />
          <Box>
            <Typography fontWeight="bold">Task Templates</Typography>
            <Typography variant="caption" color="text.secondary">Pick a template to pre-fill or instantly create a task</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
          <TextField
            fullWidth size="small" placeholder="Search templates…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
          />
        </Box>

        {loading && <LinearProgress />}

        {!loading && filtered.length === 0 && (
          <Box textAlign="center" py={6}>
            <Description sx={{ fontSize: 56, color: "#e0e0e0", mb: 1 }} />
            <Typography variant="h6" color="text.secondary" fontWeight="medium">No templates found</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {templates.length === 0
                ? "Create templates in the Automation module first"
                : "No templates match your search"}
            </Typography>
            {templates.length === 0 && (
              <Button variant="outlined" size="small" startIcon={<Add />} onClick={onClose}
                href="/automation" sx={{ textTransform: "none" }}>
                Go to Automation
              </Button>
            )}
          </Box>
        )}

        {/* Template cards */}
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map(tpl => (
            <Box key={tpl.id}
              sx={{ border: "1px solid #e8edf2", borderRadius: 2, p: 2, bgcolor: "#fff",
                "&:hover": { borderColor: "#1976d2", boxShadow: "0 2px 8px rgba(25,118,210,0.12)" },
                transition: "all 0.15s" }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: "0.9rem" }}>{tpl.name}</Typography>
                    {tpl.priority && (
                      <Chip label={tpl.priority} size="small"
                        sx={{ height: 18, fontSize: 9, bgcolor: PRIORITY_COLORS[tpl.priority] + "22", color: PRIORITY_COLORS[tpl.priority], fontWeight: 700 }} />
                    )}
                    {tpl.recurring?.enabled && (
                      <Chip icon={<Repeat sx={{ fontSize: "9px !important" }} />} label={tpl.recurring.frequency} size="small"
                        sx={{ height: 18, fontSize: 9, bgcolor: "#f3e5f5", color: "#6a1b9a" }} />
                    )}
                  </Box>

                  {tpl.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mb: 0.75, lineHeight: 1.45 }}>
                      {tpl.description}
                    </Typography>
                  )}

                  <Box display="flex" gap={2} flexWrap="wrap">
                    {tpl.assignee && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={11}>Assign to:</Typography>
                        <Chip label={tpl.assignee} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e3f2fd", color: "#1565c0" }} />
                      </Box>
                    )}
                    {tpl.deadline_days > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={11}>Due in:</Typography>
                        <Chip label={`${tpl.deadline_days} days`} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#fff3e0", color: "#e65100" }} />
                      </Box>
                    )}
                    {Array.isArray(tpl.checklist) && tpl.checklist.length > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={11}>Checklist:</Typography>
                        <Chip label={`${tpl.checklist.length} items`} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e8f5e9", color: "#2e7d32" }} />
                      </Box>
                    )}
                    {tpl.group && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={11}>Group:</Typography>
                        <Typography variant="caption" fontWeight={600} fontSize={11}>{tpl.group}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Action buttons */}
                <Box display="flex" flexDirection="column" gap={0.75} flexShrink={0}>
                  <Tooltip title="Pre-fill task form with this template — you can edit before saving">
                    <Button size="small" variant="outlined" startIcon={<Edit sx={{ fontSize: 13 }} />}
                      onClick={() => { onSelectTemplate(tpl); onClose(); }}
                      sx={{ textTransform: "none", fontSize: 11, py: 0.5, whiteSpace: "nowrap" }}>
                      Customize & Create
                    </Button>
                  </Tooltip>
                  <Tooltip title="Instantly create a task from this template with all defaults">
                    <Button size="small" variant="contained" startIcon={applying === tpl.id ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <Add sx={{ fontSize: 13 }} />}
                      onClick={() => handleApply(tpl)}
                      disabled={applying === tpl.id}
                      sx={{ textTransform: "none", fontSize: 11, py: 0.5, bgcolor: "#1976d2", whiteSpace: "nowrap" }}>
                      {applying === tpl.id ? "Creating…" : "Quick Create"}
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          {templates.length !== filtered.length ? ` of ${templates.length}` : ""}
        </Typography>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Email → Task Quick Convert ─────────────────────────────────────────────
function EmailToTaskDialog({ open, onClose, onCreated, users = [] }) {
  const [form, setForm] = useState({ from: "", subject: "", body: "", received_at: new Date().toISOString() });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const submit = async () => {
    setLoading(true);
    try { const t = await tasksAPI.convertFromEmail(form); onCreated?.(t); onClose(); setForm({ from: "", subject: "", body: "", received_at: new Date().toISOString() }); }
    catch(e) { alert(e.message); }
    setLoading(false);
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1}><EmailIcon color="info" /><Typography fontWeight="bold">Convert Email to Task</Typography></Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField size="small" fullWidth label="From (email address)" value={form.from} onChange={e => set("from", e.target.value)} placeholder="client@example.com" />
          <TextField size="small" fullWidth label="Subject / Task Title" value={form.subject} onChange={e => set("subject", e.target.value)} />
          <TextField size="small" fullWidth label="Email Body" multiline rows={4} value={form.body} onChange={e => set("body", e.target.value)} />
          <Alert severity="info" sx={{ py: 0 }}>Email rules will automatically set assignee, priority and tags based on sender/subject.</Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !form.subject.trim()} startIcon={loading ? <CircularProgress size={14} /> : <ArrowForward />} sx={{ textTransform: "none" }}>Create Task</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Email Rules Dialog ─────────────────────────────────────────────────────
function EmailRulesDialog({ open, onClose, users = [] }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ name: "", condition_field: "subject", condition_value: "", assign_to: "", priority: "medium", tag: "" });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { try { const r = await tasksAPI.getEmailRules(); setRules(r); } catch {} }, []);
  useEffect(() => { if (open) load(); }, [open, load]);
  const save = async () => {
    if (!form.condition_value.trim()) return;
    setLoading(true);
    try { await tasksAPI.createEmailRule(form); setForm(p => ({ ...p, condition_value: "", name: "" })); load(); } catch {}
    setLoading(false);
  };
  const del = async (id) => { try { await tasksAPI.deleteEmailRule(id); load(); } catch {} };
  const toggle = async (rule) => { try { await tasksAPI.updateEmailRule(rule.id, { ...rule, active: !rule.active }); load(); } catch {} };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box display="flex" alignItems="center" gap={1}><Schedule color="primary" /><Typography fontWeight="bold">Email Auto-Task Rules</Typography></Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>When an email matches a rule's condition, a task is automatically created with the specified settings.</Alert>
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth label="Rule Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Field</InputLabel>
                <Select value={form.condition_field} label="Field" onChange={e => setForm(p => ({ ...p, condition_field: e.target.value }))}>
                  <MenuItem value="subject">Subject</MenuItem>
                  <MenuItem value="from">Sender</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" sx={{ flex: 1 }} label="Contains..." value={form.condition_value} onChange={e => setForm(p => ({ ...p, condition_value: e.target.value }))} />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Assign To</InputLabel>
                <Select value={form.assign_to} label="Assign To" onChange={e => setForm(p => ({ ...p, assign_to: e.target.value }))}>
                  {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={form.priority} label="Priority" onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {Object.entries(PRIORITY_META).map(([k,v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="contained" onClick={save} disabled={loading} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Add Rule</Button>
            </Box>
          </Grid>
        </Grid>
        <ScrollableTable sx={{ border: "1px solid #eee", borderRadius: 1 }}>
          <Table size="small">
            <TableHead style={{ display: "table-header-group" }}><TableRow sx={{ bgcolor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700 }}>Rule Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Condition</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Assign To</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
              <TableCell />
            </TableRow></TableHead>
            <TableBody>
              {rules.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>No rules yet. Add one above.</TableCell></TableRow>}
              {rules.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell><Typography variant="caption" fontWeight="bold">{r.name || "—"}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{r.condition_field} contains <strong>"{r.condition_value}"</strong></Typography></TableCell>
                  <TableCell><Typography variant="caption">{r.assign_to || "Auto"}</Typography></TableCell>
                  <TableCell><PriorityChip priority={r.priority} /></TableCell>
                  <TableCell><Switch size="small" checked={r.active} onChange={() => toggle(r)} /></TableCell>
                  <TableCell><IconButton size="small" color="error" onClick={() => del(r.id)}><Delete fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTable>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Task Live Timer ────────────────────────────────────────────────────────
function TaskLiveTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt)) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, color: "#1565c0", fontFamily: "monospace" }}>
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </Typography>
  );
}

// ── Time Log Tab (sub-component so hooks work correctly) ───────────────────
function TimeLogTab({ task, timeLogs, currentUser, onRefresh }) {
  const isAdminOrTL = ["admin","super_admin","team_leader"].includes(currentUser?.role);
  // Anyone can ADD time once task is started or completed; admins/TL always can
  const canLogTime = isAdminOrTL
    || task.assigned_to === currentUser?.name
    || ["in_progress","completed"].includes(task?.status);
  // Can edit/delete a specific log entry — own entries always editable; admins/TL can edit any
  const canEditLog = (log) => isAdminOrTL || log.user === currentUser?.name;
  const [editLogId, setEditLogId]   = useState(null);
  const [editH,     setEditH]       = useState("");
  const [editM,     setEditM]       = useState("");
  const [editNotes, setEditNotes]   = useState("");

  const startEdit = (l) => {
    setEditLogId(l.id);
    setEditH(String(Math.floor(Number(l.duration_minutes) / 60)));
    setEditM(String(Number(l.duration_minutes) % 60));
    setEditNotes(l.notes || "");
  };
  const saveEdit = async () => {
    const total = (parseInt(editH) || 0) * 60 + (parseInt(editM) || 0);
    if (!total) return;
    await tasksAPI.updateTimeLog(task.id, editLogId, { duration_minutes: total, notes: editNotes });
    setEditLogId(null);
    onRefresh();
  };

  return (
    <Box>
      {canLogTime && <TimeTracker taskId={task.id} onLogged={onRefresh} />}
      {canLogTime && <ManualTimeLog taskId={task.id} userName={currentUser?.name} onLogged={onRefresh} />}
      {!canLogTime && (
        <Box sx={{ p: 2, bgcolor: "#fff8e1", borderRadius: 2, mb: 1, border: "1px solid #ffcc02" }}>
          <Typography variant="caption" color="text.secondary">Time logging is available once the task is marked <strong>In Progress</strong> or <strong>Completed</strong>.</Typography>
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
      {timeLogs.length === 0 && <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>No time logged yet</Typography>}
      {timeLogs.map(l => (
        <Box key={l.id}>
          {editLogId === l.id ? (
            <Box sx={{ border: "1px solid #1976d2", borderRadius: 2, p: 1.5, mb: 1, bgcolor: "#e3f2fd" }}>
              <Typography variant="caption" fontWeight="bold" display="block" mb={1}>Edit Time Entry</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                <TextField size="small" label="Hours" type="number" value={editH} onChange={e => setEditH(e.target.value)} sx={{ width: 80 }} />
                <TextField size="small" label="Mins" type="number" value={editM} onChange={e => setEditM(e.target.value)} sx={{ width: 80 }} />
                <TextField size="small" label="Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
                <Button size="small" variant="contained" onClick={saveEdit} sx={{ textTransform: "none" }}>Save</Button>
                <Button size="small" onClick={() => setEditLogId(null)} sx={{ textTransform: "none" }}>Cancel</Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1, px: 0.5, borderBottom: "1px solid #f0f0f0", "&:hover": { bgcolor: "#fafafa" } }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{fmtMins(l.duration_minutes)}</Typography>
                <Typography variant="caption" color="text.secondary">{l.notes || "—"} · {l.user}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>{l.started_at ? new Date(l.started_at).toLocaleDateString() : "—"}</Typography>
                {canEditLog(l) && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => startEdit(l)} sx={{ "&:hover": { bgcolor: "#e3f2fd" } }}>
                      <Edit sx={{ fontSize: 14, color: "#1976d2" }} />
                    </IconButton>
                  </Tooltip>
                )}
                {canEditLog(l) && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => tasksAPI.deleteTimeLog(task.id, l.id).then(onRefresh)} sx={{ "&:hover": { bgcolor: "#ffebee" } }}>
                      <Close sx={{ fontSize: 14, color: "#e53935" }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )}
        </Box>
      ))}
      {timeLogs.length > 0 && (
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#e3f2fd", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" fontWeight={700}>Total Logged</Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {fmtMins(timeLogs.reduce((s, l) => s + Number(l.duration_minutes || 0), 0))}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────
function TaskDetail({ open, task, onClose, onSave, onDelete, currentUser, users = [] }) {
  const [tab, setTab]           = useState(0);
  const [detail, setDetail]     = useState(null);
  const [timeLogs, setTimeLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading]   = useState(false);
  const [rating, setRating]     = useState(0);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [editingCompletion, setEditingCompletion] = useState(false);
  const [completionDateDraft, setCompletionDateDraft] = useState("");
  const [completionDurH, setCompletionDurH] = useState("");
  const [completionDurM, setCompletionDurM] = useState("");
  const chatEndRef = useRef(null);
  const { onlineUsers } = useCall();

  const loadDetail = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const d = await tasksAPI.getById(task.id);
      setDetail(d); setTimeLogs(d.timeLogs || []); setComments(d.comments || []);
    } catch {}
    setLoading(false);
  }, [task]);

  useEffect(() => {
    if (!open || !task) return;
    loadDetail();
    setTab(0);
    setEditingDesc(false);
    // Auto-refresh chat every 5 seconds so both users see messages in real-time
    const interval = setInterval(loadDetail, 5000);
    return () => clearInterval(interval);
  }, [open, task?.id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  const addComment = async (text, type = "user") => {
    const msg = type === "user" ? text : text;
    if (!msg?.trim()) return;
    try {
      await tasksAPI.addComment(task.id, { author: type === "system" ? "System" : (currentUser?.name || "Team Member"), text: msg, type });
      if (type === "user") setNewComment("");
      loadDetail();
    } catch {}
  };
  const delComment = async (cid) => { try { await tasksAPI.deleteComment(task.id, cid); loadDetail(); } catch {} };

  const handleStatusChange = async (newStatus) => {
    const actor = currentUser?.name || "Team Member";
    const current = detail || task;
    await onSave({ ...current, status: newStatus });
    // Auto system message in chat
    if (newStatus === "in_progress") {
      await addComment(`▶ Task started by ${actor}`, "system");
    } else if (newStatus === "completed") {
      await addComment(`✅ Task completed by ${actor}`, "system");
    } else if (newStatus === "pending") {
      await addComment(`↩ Task reopened by ${actor}`, "system");
    } else if (newStatus === "review") {
      await addComment(`👁 Task sent for review by ${actor}`, "system");
    } else if (newStatus === "declined") {
      await addComment(`✗ Task declined by ${actor}`, "system");
    }
    loadDetail();
  };

  const saveDesc = async () => {
    const current = detail || task;
    try { await onSave({ ...current, description: descDraft }); setEditingDesc(false); } catch {}
  };

  const startEditCompletion = () => {
    const current = detail || task;
    // Format datetime-local value (YYYY-MM-DDTHH:MM)
    const dt = current.completed_at ? new Date(current.completed_at) : new Date();
    const pad = n => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setCompletionDateDraft(local);
    const totalMins = current.task_duration_minutes || 0;
    setCompletionDurH(String(Math.floor(totalMins / 60)));
    setCompletionDurM(String(totalMins % 60));
    setEditingCompletion(true);
  };

  const saveCompletion = async () => {
    const current = detail || task;
    const totalMins = (parseInt(completionDurH, 10) || 0) * 60 + (parseInt(completionDurM, 10) || 0);
    const completedAt = completionDateDraft ? new Date(completionDateDraft).toISOString() : current.completed_at;
    try {
      await onSave({ ...current, completed_at: completedAt, task_duration_minutes: totalMins });
      setEditingCompletion(false);
      loadDetail();
    } catch {}
  };

  const t = detail || task;
  if (!t) return null;
  const progress  = (t.subtasks||[]).length > 0 ? Math.round(((t.subtasks||[]).filter(s => s.completed).length / (t.subtasks||[]).length) * 100) : (t.status === "completed" ? 100 : 0);
  const overdue   = isOverdue(t);
  const createdAt = t.created_at ? new Date(t.created_at) : null;

  // Participants = task owner + assignee + unique commenters
  const participantNames = [...new Set([
    t.assigned_by || currentUser?.name,
    t.assigned_to,
    ...comments.filter(c => c.type !== "system").map(c => c.author),
  ].filter(Boolean))];

  // ── Section helpers ──
  const MetaRow = ({ label, children }) => (
    <Box sx={{ display: "flex", alignItems: "flex-start", py: 1, borderBottom: "1px solid #f0f4f8" }}>
      <Typography sx={{ width: 120, flexShrink: 0, fontSize: "0.75rem", color: "#90a4ae", fontWeight: 600, pt: 0.2 }}>{label}:</Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );

  const DETAIL_TABS = [
    { label: "Details" },
    { label: "Checklists", badge: (t.subtasks||[]).length },
    { label: "Files" },
    { label: `Participants (${participantNames.length})` },
    { label: "Tags", badge: (Array.isArray(t.tags) ? t.tags : []).length },
    { label: `Time (${timeLogs.length})` },
    { label: t.type === "email_task" ? "Email" : null },
  ].filter(x => x.label);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth
      PaperProps={{ sx: { width: "92vw", maxWidth: 1280, height: "90vh", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" } }}>

      {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }} />}

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", px: 2.5, py: 1.2, borderBottom: "1px solid #e8edf2", bgcolor: "#fff", gap: 1, flexShrink: 0 }}>
        <Box display="flex" gap={0.75} flex={1} flexWrap="wrap" alignItems="center">
          {t.task_number && (
            <Chip label={t.task_number} size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 800, fontSize: 11, fontFamily: "monospace", height: 22 }} />
          )}
          <StatusChip status={t.status} />
          <PriorityChip priority={t.priority} />
          {t.type === "email_task" && <Chip size="small" icon={<EmailIcon sx={{ fontSize: "11px !important" }} />} label="Email Task" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, height: 20, fontSize: 10 }} />}
          {t.recurring?.enabled && <Chip size="small" icon={<Repeat sx={{ fontSize: "11px !important" }} />} label={t.recurring?.frequency} sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a", height: 20, fontSize: 10 }} />}
          {overdue && <Chip size="small" label="OVERDUE" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />}
        </Box>
        <Tooltip title="Edit task"><IconButton size="small" onClick={() => { onClose(); onSave(t, "edit"); }}><Edit sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <Tooltip title="Delete task"><IconButton size="small" color="error" onClick={() => { onDelete(t.id); onClose(); }}><Delete sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <IconButton size="small" onClick={onClose}><Close sx={{ fontSize: 18 }} /></IconButton>
      </Box>

      {/* ── Body: left detail + right chat ──────────────────────────── */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ══ LEFT PANEL ══════════════════════════════════════════════ */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #e8edf2" }}>

          {/* Title */}
          <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: "1px solid #f0f4f8" }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.35, color: "#1a2332", mb: 1 }}>{t.title}</Typography>

            {/* Description */}
            {editingDesc ? (
              <Box>
                <TextField fullWidth multiline minRows={3} value={descDraft} onChange={e => setDescDraft(e.target.value)}
                  sx={{ mb: 1 }} size="small" />
                <Box display="flex" gap={1}>
                  <Button size="small" variant="contained" onClick={saveDesc} sx={{ textTransform: "none", bgcolor: "#1976d2", borderRadius: "8px" }}>Save</Button>
                  <Button size="small" onClick={() => setEditingDesc(false)} sx={{ textTransform: "none" }}>Cancel</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  {(() => {
                    const raw = stripHtml(t.description || "");
                    if (!raw) return <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>Click Edit to add a description…</Typography>;
                    // Split into metadata lines vs body
                    const lines = raw.split("\n");
                    const metaKeys = ["email received from", "email:", "subject:", "group:", "inbox:", "label:", "from:", "to:", "date:", "reply-to:"];
                    const metaLines = [];
                    let bodyStart = 0;
                    for (let i = 0; i < lines.length; i++) {
                      const lower = lines[i].trim().toLowerCase();
                      if (metaKeys.some(k => lower.startsWith(k))) { metaLines.push(lines[i].trim()); bodyStart = i + 1; }
                      else if (lines[i].trim() === "") { if (metaLines.length > 0) { bodyStart = i + 1; continue; } }
                      else if (metaLines.length > 0) { bodyStart = i; break; }
                    }
                    const bodyText = lines.slice(bodyStart).join("\n").trim();
                    return (
                      <>
                        {metaLines.length > 0 && (
                          <Box sx={{ bgcolor: "#f8f9fb", border: "1px solid #e8ecf0", borderRadius: "8px", p: 1.2, mb: 1.5 }}>
                            {metaLines.map((line, i) => {
                              const colonIdx = line.indexOf(":");
                              const key = colonIdx > -1 ? line.slice(0, colonIdx) : line;
                              const val = colonIdx > -1 ? line.slice(colonIdx + 1).trim() : "";
                              return (
                                <Box key={i} display="flex" gap={0.75} mb={0.3}>
                                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#78909c", minWidth: 90, textTransform: "capitalize" }}>{key}:</Typography>
                                  <Typography sx={{ fontSize: "0.75rem", color: "#455a64" }}>{val}</Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                        {bodyText && (
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", lineHeight: 1.7, color: "#263238" }}>
                            {bodyText}
                          </Typography>
                        )}
                      </>
                    );
                  })()}
                </Box>
                <Tooltip title="Edit description">
                  <IconButton size="small" onClick={() => { setDescDraft(t.description || ""); setEditingDesc(true); }} sx={{ flexShrink: 0 }}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Meta rows (Bitrix24 style) */}
          <Box sx={{ px: 3, py: 1, borderBottom: "1px solid #f0f4f8", flexShrink: 0, overflowY: "auto", maxHeight: 260 }}>
            <MetaRow label="Task owner">
              <Box display="flex" alignItems="center" gap={0.75}>
                <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: avatarColor(t.assigned_by || currentUser?.name || "") }}>
                  {getInitials(t.assigned_by || currentUser?.name || "?")}
                </Avatar>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{t.assigned_by || currentUser?.name || "—"}</Typography>
              </Box>
            </MetaRow>
            <MetaRow label="Assignee">
              <EmployeeAvatar name={t.assigned_to} size={22} showName />
            </MetaRow>
            <MetaRow label="Deadline">
              {getDueDate(t) ? (
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: overdue ? "#d32f2f" : "#263238" }}>
                  {overdue && "⚠ "}{fmtDate(getDueDate(t))}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: "0.82rem", color: "#90a4ae" }}>No deadline</Typography>
              )}
            </MetaRow>
            {/* ── Live task timer (shows when in_progress) ── */}
            {t.status === "in_progress" && t.started_at && (
              <Box sx={{ py: 1.5, borderBottom: "1px solid #f0f4f8" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, bgcolor: "#e3f2fd", borderRadius: "10px", px: 2, py: 1.2, border: "1px solid #90caf9" }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#1976d2", animation: "pulse 1.5s infinite", "@keyframes pulse": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.4, transform: "scale(0.8)" } } }} />
                  <Box>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1565c0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Task in progress — elapsed time</Typography>
                    <TaskLiveTimer startedAt={t.started_at} />
                  </Box>
                </Box>
              </Box>
            )}

            {/* ── Completed duration badge ── */}
            {t.status === "completed" && (
              <Box sx={{ py: 1.5, borderBottom: "1px solid #f0f4f8" }}>
                {editingCompletion ? (
                  <Box sx={{ bgcolor: "#e8f5e9", borderRadius: "10px", px: 2, py: 1.5, border: "1px solid #a5d6a7" }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#2e7d32", textTransform: "uppercase", letterSpacing: "0.5px", mb: 1 }}>
                      Edit Completion Time
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1.2}>
                      <TextField
                        size="small"
                        label="Completed At"
                        type="datetime-local"
                        value={completionDateDraft}
                        onChange={e => setCompletionDateDraft(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={{ bgcolor: "#fff", borderRadius: 1 }}
                      />
                      <Box display="flex" gap={1} alignItems="center">
                        <TextField size="small" label="Hours" type="number" inputProps={{ min: 0 }} value={completionDurH} onChange={e => setCompletionDurH(e.target.value)} sx={{ width: 90, bgcolor: "#fff", borderRadius: 1 }} />
                        <TextField size="small" label="Mins" type="number" inputProps={{ min: 0, max: 59 }} value={completionDurM} onChange={e => setCompletionDurM(e.target.value)} sx={{ width: 90, bgcolor: "#fff", borderRadius: 1 }} />
                        <Typography variant="caption" color="text.secondary">duration</Typography>
                      </Box>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Button size="small" variant="contained" onClick={saveCompletion} sx={{ textTransform: "none", bgcolor: "#388e3c", "&:hover": { bgcolor: "#2e7d32" } }}>Save</Button>
                        <Button size="small" onClick={() => setEditingCompletion(false)} sx={{ textTransform: "none" }}>Cancel</Button>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, bgcolor: "#e8f5e9", borderRadius: "10px", px: 2, py: 1.2, border: "1px solid #a5d6a7" }}>
                    <CheckCircle sx={{ color: "#388e3c", fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#2e7d32", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Completed
                      </Typography>
                      {t.completed_at && (
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1b5e20" }}>
                          {new Date(t.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      )}
                      {t.task_duration_minutes > 0 && (
                        <Typography sx={{ fontSize: "0.75rem", color: "#388e3c" }}>
                          ⏱ Duration: {fmtMins(t.task_duration_minutes)}
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="Edit completion time">
                      <IconButton size="small" onClick={startEditCompletion} sx={{ color: "#388e3c", "&:hover": { bgcolor: "#c8e6c9" } }}>
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            )}

            <MetaRow label="Status">
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {STATUSES.map(s => (
                  <Box key={s} onClick={() => handleStatusChange(s)}
                    sx={{ px: 1.1, py: 0.3, borderRadius: "6px", border: `1.5px solid ${t.status === s ? STATUS_META[s]?.color : "#dde2ea"}`,
                      bgcolor: t.status === s ? STATUS_META[s]?.bg : "#fff", cursor: "pointer", transition: "all 0.15s",
                      "&:hover": { borderColor: STATUS_META[s]?.color, bgcolor: STATUS_META[s]?.bg } }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: t.status === s ? 700 : 400, color: t.status === s ? STATUS_META[s]?.color : "#78909c" }}>
                      {STATUS_META[s]?.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </MetaRow>
            <MetaRow label="Created">
              <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>
                {createdAt ? createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </Typography>
            </MetaRow>
            <MetaRow label="Task #">
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1565c0", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                {t.task_number || `OB-${t.id?.slice(0,4).toUpperCase()}`}
              </Typography>
            </MetaRow>
            {t.start_date && (
              <MetaRow label="Start date">
                <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>{fmtDate(t.start_date)}</Typography>
              </MetaRow>
            )}
            {(t.time_estimate > 0 || t.time_logged > 0) && (
              <MetaRow label="Time">
                <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>
                  {t.time_logged > 0 && <span>Logged: <strong>{fmtMins(t.time_logged)}</strong></span>}
                  {t.time_estimate > 0 && <span style={{ marginLeft: 12 }}>Estimate: <strong>{fmtMins(t.time_estimate)}</strong></span>}
                </Typography>
              </MetaRow>
            )}
            {t.client && (
              <MetaRow label="Client">
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#263238" }}>{t.client}</Typography>
              </MetaRow>
            )}
            {t.crm_company && (
              <MetaRow label="CRM Company">
                <Chip label={t.crm_company} size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600, fontSize: "0.72rem", height: 20 }} />
              </MetaRow>
            )}
            {t.crm_item && (
              <MetaRow label="CRM Item">
                <Chip label={t.crm_item} size="small" sx={{ bgcolor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: "0.72rem", height: 20 }} />
              </MetaRow>
            )}
          </Box>

          {/* Checklist progress bar */}
          {(t.subtasks||[]).length > 0 && (
            <Box sx={{ px: 3, py: 1, borderBottom: "1px solid #f0f4f8", flexShrink: 0 }}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography sx={{ fontSize: "0.72rem", color: "#90a4ae", fontWeight: 600 }}>
                  CHECKLIST — {(t.subtasks||[]).filter(s=>s.completed).length}/{(t.subtasks||[]).length} done
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: progress === 100 ? "#388e3c" : "#f57c00" }}>{progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: progress === 100 ? "#388e3c" : "#1976d2" } }} />
            </Box>
          )}

          {/* ── Section tabs ── */}
          <Box sx={{ borderBottom: "1px solid #e8edf2", flexShrink: 0, bgcolor: "#fafbfc" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontSize: "0.72rem", textTransform: "none", fontWeight: 500, px: 1.5 } }}>
              {DETAIL_TABS.map((dt, i) => (
                <Tab key={i} label={dt.badge > 0 ? `${dt.label} (${dt.badge})` : dt.label} />
              ))}
            </Tabs>
          </Box>

          {/* Tab content */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 2.5, minHeight: 60 }}>

            {/* Details tab */}
            {tab === 0 && (
              <Box>
                {Array.isArray(t.tags) && t.tags.length > 0 && (
                  <Box mb={2}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>Tags</Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {t.tags.map(tag => <Chip key={tag} label={`# ${tag}`} size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontSize: "0.7rem", height: 22 }} />)}
                    </Box>
                  </Box>
                )}
                {t.source && (
                  <Box>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>Source</Typography>
                    <Chip label={t.source} size="small" sx={{ bgcolor: "#f3e5f5", color: "#7b1fa2", fontSize: "0.72rem" }} />
                  </Box>
                )}
                {!t.description && !t.tags?.length && (
                  <Typography color="text.secondary" variant="body2" sx={{ textAlign: "center", pt: 3, opacity: 0.6 }}>No additional details</Typography>
                )}
              </Box>
            )}

            {/* Checklists tab */}
            {tab === 1 && (
              <Box>
                {(t.subtasks||[]).length === 0 && <Typography color="text.secondary" variant="body2" textAlign="center" pt={3}>No checklist items</Typography>}
                {(t.subtasks||[]).map((st, idx) => (
                  <Box key={st.id} display="flex" alignItems="center" gap={1.5} py={1} sx={{ borderBottom: "1px solid #f5f7fa" }}>
                    <Checkbox size="small" checked={st.completed} readOnly sx={{ p: 0.5, color: st.completed ? "#388e3c" : "default" }} />
                    <Typography variant="body2" sx={{ flex: 1, textDecoration: st.completed ? "line-through" : "none", color: st.completed ? "#90a4ae" : "#263238", fontSize: "0.85rem" }}>{st.title}</Typography>
                    {st.completed && <CheckCircle sx={{ fontSize: 16, color: "#388e3c" }} />}
                  </Box>
                ))}
              </Box>
            )}

            {/* Files tab */}
            {tab === 2 && (
              <Box sx={{ textAlign: "center", pt: 4 }}>
                <AttachFile sx={{ fontSize: 48, color: "#b0bec5", mb: 1 }} />
                <Typography color="text.secondary" variant="body2">No files attached</Typography>
                <Button variant="outlined" size="small" startIcon={<Add />} sx={{ mt: 2, textTransform: "none", borderRadius: "8px" }}>Attach File</Button>
              </Box>
            )}

            {/* Participants tab */}
            {tab === 3 && (
              <Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", mb: 1.5 }}>Task Members</Typography>
                {[t.assigned_by || currentUser?.name, t.assigned_to].filter(Boolean).map((name, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={1.5} py={1} sx={{ borderBottom: "1px solid #f5f7fa" }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, bgcolor: avatarColor(name) }}>{getInitials(name)}</Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{name}</Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: "#90a4ae" }}>{i === 0 ? "Task Owner" : "Assignee"}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Tags tab */}
            {tab === 4 && (
              <Box>
                {(Array.isArray(t.tags) ? t.tags : []).length === 0
                  ? <Typography color="text.secondary" variant="body2" textAlign="center" pt={3}>No tags</Typography>
                  : <Box display="flex" gap={0.75} flexWrap="wrap">
                      {(Array.isArray(t.tags) ? t.tags : []).map(tag => (
                        <Chip key={tag} label={`# ${tag}`} sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 600 }} />
                      ))}
                    </Box>
                }
              </Box>
            )}

            {/* Time tab */}
            {tab === 5 && (
              <TimeLogTab
                task={t}
                timeLogs={timeLogs}
                currentUser={currentUser}
                onRefresh={loadDetail}
              />
            )}

            {/* Email tab (when email_task) */}
            {tab === 6 && t.email_data && (
              <Box>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", mb: 1 }}>Original Email</Typography>
                {[["From", t.email_data.from], ["Subject", t.email_data.subject], ["Received", t.email_data.received_at ? new Date(t.email_data.received_at).toLocaleString() : "—"]].map(([k,v]) => (
                  <Box key={k} mb={1}><Typography variant="caption" color="text.secondary">{k}</Typography><Typography variant="body2" fontWeight={600}>{v || "—"}</Typography></Box>
                ))}
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ bgcolor: "#f5f5f5", p: 1.5, borderRadius: 1, maxHeight: 280, overflowY: "auto" }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{t.email_data.body || "(no body)"}</Typography>
                </Box>
              </Box>
            )}
          </Box>

        </Box>

        {/* ══ RIGHT PANEL: Task Chat ══════════════════════════════════ */}
        <Box sx={{ width: 340, display: "flex", flexDirection: "column", bgcolor: "#f8f9fb", flexShrink: 0 }}>
          {/* Chat header */}
          <Box sx={{ px: 2, py: 1.2, borderBottom: "1px solid #e8edf2", bgcolor: "#fff" }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
              <Box>
                <Typography fontWeight={700} fontSize="0.9rem" sx={{ color: "#1a2332" }}>Task chat</Typography>
                <Typography variant="caption" color="text.secondary">
                  {comments.filter(c => c.type !== "system").length} message{comments.filter(c=>c.type!=="system").length!==1?"s":""}
                </Typography>
              </Box>
              <Chip size="small" label={`${participantNames.length} member${participantNames.length!==1?"s":""}`}
                sx={{ bgcolor: "#e3f2fd", color: "#1976d2", fontWeight: 600, fontSize: "0.68rem" }} />
            </Box>
            {/* Participant avatars + call buttons */}
            <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
              {participantNames.map((name, i) => {
                const onlineUser = onlineUsers.find(u => (u.userName||"").trim().toLowerCase() === name.trim().toLowerCase());
                const isMe = name === currentUser?.name;
                return (
                  <Box key={name} display="flex" alignItems="center" gap={0.25}>
                    <Tooltip title={`${name}${i === 0 ? " (Task Owner)" : i === 1 ? " (Assignee)" : ""}${onlineUser && !isMe ? " — Online" : ""}`} placement="top">
                      <Box sx={{ position: "relative" }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: avatarColor(name), border: "2px solid #fff", cursor: "pointer" }}>
                          {getInitials(name)}
                        </Avatar>
                        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", bgcolor: onlineUser ? "#4caf50" : "#b0bec5", border: "1.5px solid #fff" }} />
                      </Box>
                    </Tooltip>
                    {onlineUser && !isMe && (
                      <CallButton userId={onlineUser.userId} userName={onlineUser.userName} iconSize={13} showAudio={false} compact />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            {/* System message: task created */}
            <Box sx={{ textAlign: "center", my: 1 }}>
              <Typography sx={{ fontSize: "0.65rem", color: "#90a4ae", bgcolor: "#edf0f4", display: "inline-block", px: 1.5, py: 0.3, borderRadius: "10px" }}>
                {createdAt ? createdAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.5 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: avatarColor(t.assigned_by || currentUser?.name || "") }}>
                {getInitials(t.assigned_by || currentUser?.name || "?")}
              </Avatar>
              <Box sx={{ bgcolor: "#fff", borderRadius: "0 10px 10px 10px", px: 1.5, py: 0.75, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", maxWidth: 240 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#1976d2", mb: 0.25 }}>{t.assigned_by || currentUser?.name}</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#546e7a" }}>created this task.</Typography>
                <Typography sx={{ fontSize: "0.6rem", color: "#b0bec5", mt: 0.25 }}>{createdAt ? createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</Typography>
              </Box>
            </Box>

            {/* Messages */}
            {comments.map(c => {
              // System message (status changes, etc.)
              if (c.type === "system") {
                return (
                  <Box key={c.id} sx={{ textAlign: "center", my: 0.5 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: "#78909c", bgcolor: "#edf0f4", display: "inline-block", px: 1.5, py: 0.4, borderRadius: "10px", fontWeight: 500 }}>
                      {c.text}
                      <span style={{ color: "#b0bec5", marginLeft: 6, fontSize: "0.58rem" }}>
                        {c.created_at ? new Date(c.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </Typography>
                  </Box>
                );
              }
              // Regular user message
              const isMe = c.author === currentUser?.name;
              return (
                <Box key={c.id} sx={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-start", gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: avatarColor(c.author), flexShrink: 0 }}>{getInitials(c.author)}</Avatar>
                  <Box sx={{ maxWidth: 230 }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isMe ? "#1565c0" : "#546e7a", mb: 0.25, textAlign: isMe ? "right" : "left" }}>{isMe ? "You" : c.author}</Typography>
                    <Box sx={{ bgcolor: isMe ? "#1976d2" : "#fff", borderRadius: isMe ? "10px 0 10px 10px" : "0 10px 10px 10px",
                      px: 1.5, py: 0.75, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                      <Typography sx={{ fontSize: "0.78rem", color: isMe ? "#fff" : "#263238", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.text}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: isMe ? "rgba(255,255,255,0.7)" : "#b0bec5", mt: 0.25, textAlign: "right" }}>
                        {c.created_at ? new Date(c.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => delComment(c.id)} sx={{ opacity: 0, "&:hover": { opacity: 1 }, alignSelf: "center" }}>
                    <Close sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              );
            })}
            <div ref={chatEndRef} />
          </Box>

          {/* Message input */}
          <Box sx={{ borderTop: "1px solid #e8edf2", p: 1.5, bgcolor: "#fff" }}>
            <TextField
              fullWidth multiline maxRows={4} size="small"
              placeholder="Enter @ to mention or write a message…"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(newComment.trim()); } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.82rem", bgcolor: "#f5f7fa" } }}
            />
            <Box display="flex" justifyContent="flex-end" mt={0.75}>
              <Button variant="contained" size="small" onClick={() => addComment(newComment.trim())} disabled={!newComment.trim()} startIcon={<Send sx={{ fontSize: 14 }} />}
                sx={{ textTransform: "none", bgcolor: "#1976d2", borderRadius: "8px", fontSize: "0.75rem", px: 2 }}>
                Send
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Bottom action bar — pinned to dialog footer, always visible ── */}
      <Box sx={{ borderTop: "1px solid #e8edf2", px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "#fafbfc", flexShrink: 0 }}>
        {t.status !== "in_progress" && t.status !== "completed" && (
          <Button variant="contained" startIcon={<PlayArrow />} onClick={() => handleStatusChange("in_progress")}
            sx={{ textTransform: "none", bgcolor: "#1976d2", borderRadius: "8px", fontWeight: 700, px: 2.5 }}>
            Start
          </Button>
        )}
        {t.status !== "completed" && (
          <Button variant="contained" startIcon={<AssignmentTurnedIn />} onClick={() => handleStatusChange("completed")}
            sx={{ textTransform: "none", bgcolor: "#388e3c", "&:hover": { bgcolor: "#2e7d32" }, borderRadius: "8px", fontWeight: 700, px: 2.5 }}>
            Complete
          </Button>
        )}
        {t.status === "completed" && (
          <Button variant="outlined" startIcon={<RadioButtonUnchecked />} onClick={() => handleStatusChange("pending")}
            sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600 }}>
            Reopen
          </Button>
        )}
        {/* Rate task */}
        <Box display="flex" alignItems="center" gap={0.25} sx={{ ml: "auto" }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Rate:</Typography>
          {[1,2,3,4,5].map(star => (
            <Star key={star} onClick={() => setRating(star)}
              sx={{ fontSize: 20, cursor: "pointer", color: star <= rating ? "#f57c00" : "#ddd", transition: "color 0.15s", "&:hover": { color: "#f57c00" } }} />
          ))}
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Kanban Board ───────────────────────────────────────────────────────────
function KanbanBoard({ tasks, onOpen, onStatusChange }) {
  return (
    <Grid container spacing={2}>
      {STATUSES.map(s => {
        const col = tasks.filter(t => t.status === s);
        return (
          <Grid item xs={12} sm={6} md={2.4} key={s}>
            <Box sx={{ bgcolor: STATUS_META[s]?.bg, borderRadius: 2, p: 1.5, minHeight: 300, border: `1px solid ${STATUS_META[s]?.color}30` }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box display="flex" alignItems="center" gap={0.75}>
                  <Circle sx={{ fontSize: 10, color: STATUS_META[s]?.color }} />
                  <Typography variant="subtitle2" fontWeight="bold" color={STATUS_META[s]?.color} fontSize={12}>{STATUS_META[s]?.label}</Typography>
                </Box>
                <Chip label={col.length} size="small" sx={{ bgcolor: STATUS_META[s]?.color, color: "#fff", height: 18, fontSize: 11, minWidth: 24 }} />
              </Box>
              {col.map(t => (
                <Card key={t.id} sx={{ mb: 1, p: 1.5, cursor: "pointer", borderLeft: `3px solid ${PRIORITY_META[t.priority]?.color || "#999"}`, "&:hover": { boxShadow: 3, transform: "translateY(-1px)" }, transition: "all 0.15s" }} onClick={() => onOpen(t)}>
                  <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5, lineHeight: 1.3, fontSize: 13 }}>{t.title}</Typography>
                  {t.subtasks?.length > 0 && (
                    <Box mb={0.5}>
                      <LinearProgress variant="determinate" value={Math.round(((t.subtasks||[]).filter(s=>s.completed).length/((t.subtasks||[]).length||1))*100)} sx={{ height: 4, borderRadius: 2 }} />
                      <Typography variant="caption" color="text.secondary" fontSize={10}>{(t.subtasks||[]).filter(s=>s.completed).length}/{(t.subtasks||[]).length} checklist</Typography>
                    </Box>
                  )}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                    <Box display="flex" gap={0.3} alignItems="center">
                      {t.type === "email_task" && <EmailIcon sx={{ fontSize: 11, color: "#0288d1" }} />}
                      {t.recurring?.enabled && <Repeat sx={{ fontSize: 11, color: "#7b1fa2" }} />}
                      {isOverdue(t) && <Chip label="LATE" size="small" color="error" sx={{ height: 14, fontSize: 9, "& .MuiChip-label": { px: 0.75 } }} />}
                      {getDueDate(t) && !isOverdue(t) && <Typography variant="caption" color="text.secondary" fontSize={10}>{fmtDate(getDueDate(t))}</Typography>}
                    </Box>
                    <EmployeeAvatar name={t.assigned_to} size={20} />
                  </Box>
                  {t.time_logged > 0 && <Typography variant="caption" color="text.secondary" fontSize={10}>⏱ {fmtMins(t.time_logged)}</Typography>}
                </Card>
              ))}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

// ── Role-based tabs ────────────────────────────────────────────────────────
// Admin/team_leader see all tabs; employees see a trimmed set.
const ADMIN_TABS = [
  { label: "All Tasks",   filter: {} },
  { label: "My Tasks",    filter: "my" },
  { label: "I Assign",    filter: "i_assign" },
  { label: "In Progress", filter: { status: "in_progress" } },
  { label: "Overdue",     filter: { overdue: "true" } },
  { label: "Completed",   filter: { status: "completed" } },
];

const EMPLOYEE_TABS = [
  { label: "My Tasks",    filter: {} },          // server already scopes to them
  { label: "In Progress", filter: { status: "in_progress" } },
  { label: "Overdue",     filter: { overdue: "true" } },
  { label: "Completed",   filter: { status: "completed" } },
];

export default function Tasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [mainTab, setMainTab]       = useState(0);
  const [viewMode, setViewMode]     = useState("list");
  const [search, setSearch]         = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy]         = useState("created_at");
  const [selected, setSelected]     = useState([]);
  const [formOpen, setFormOpen]     = useState(false);
  const [editTask, setEditTask]     = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [rulesOpen, setRulesOpen]       = useState(false);
  const [emailOpen, setEmailOpen]       = useState(false);
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [snack, setSnack]               = useState(null);
  const [syncPolling, setSyncPolling] = useState(false);
  const [editCompletionId, setEditCompletionId] = useState(null);
  const [editCompletionDate, setEditCompletionDate] = useState("");
  const [editCompletionH, setEditCompletionH] = useState("");
  const [editCompletionM, setEditCompletionM] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const notify = (msg, sev = "success") => setSnack({ msg, sev });

  const startEditCompletion = (e, t) => {
    e.stopPropagation();
    const dt = t.completed_at ? new Date(t.completed_at) : new Date();
    const pad = n => String(n).padStart(2, "0");
    setEditCompletionDate(`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
    const totalMins = t.task_duration_minutes || 0;
    setEditCompletionH(String(Math.floor(totalMins / 60)));
    setEditCompletionM(String(totalMins % 60));
    setEditCompletionId(t.id);
  };

  const saveCompletionFromTable = async (e, t) => {
    e.stopPropagation();
    const totalMins = (parseInt(editCompletionH, 10) || 0) * 60 + (parseInt(editCompletionM, 10) || 0);
    const completedAt = editCompletionDate ? new Date(editCompletionDate).toISOString() : t.completed_at;
    try {
      await tasksAPI.update(t.id, { ...t, completed_at: completedAt, task_duration_minutes: totalMins });
      notify("Completion time updated");
      loadData();
    } catch(e2) { notify(e2.message, "error"); }
    setEditCompletionId(null);
  };

  const fixTaskTitles = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/tasks/fix-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

  const handleSyncFromInbox = async () => {
    setSyncPolling(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/tasks/reset-and-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        notify(`✅ Cleared old tasks. Created ${data.created} task(s) from today's emails!`, "success");
        loadData();
      } else {
        notify(data.error || "Sync failed", "error");
      }
    } catch (e) {
      notify("Sync failed: " + e.message, "error");
    } finally {
      setSyncPolling(false);
    }
  };

  // Pick the right tab set based on role
  const isEmployee = currentUser?.role === "employee";
  const MAIN_TABS = isEmployee ? EMPLOYEE_TABS : ADMIN_TABS;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tabs = currentUser?.role === "employee" ? EMPLOYEE_TABS : ADMIN_TABS;
      const tabFilter = tabs[mainTab]?.filter ?? {};
      let params = {};
      if (typeof tabFilter === "object") params = { ...tabFilter };
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (search) params.search = search;

      const [t, s] = await Promise.all([tasksAPI.getAll(params), tasksAPI.getStats()]);
      let list = Array.isArray(t) ? t : [];

      // For admin/leader tabs that filter client-side ("my" and "i_assign")
      if (tabFilter === "my") list = list.filter(x => x.assigned_to === currentUser?.name);
      if (tabFilter === "i_assign") list = list.filter(x => x.assigned_by === currentUser?.name && x.assigned_to !== currentUser?.name);

      // Sort
      list = list.sort((a, b) => {
        if (sortBy === "due_date") return (getDueDate(a) || "9999") < (getDueDate(b) || "9999") ? -1 : 1;
        if (sortBy === "priority") { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority]||1) - (o[b.priority]||1); }
        if (sortBy === "title") return (a.title||"").localeCompare(b.title||"");
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setTasks(list);
      setStats(s);
    } catch(e) { notify("Cannot connect to backend. Start the server.", "error"); setTasks([]); }
    setLoading(false);
  }, [mainTab, priorityFilter, typeFilter, search, sortBy, currentUser]);

  useEffect(() => {
    // Fix any existing task titles that still have the old "Follow up on email:" prefix
    if (!isEmployee) fixTaskTitles();
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [mainTab, priorityFilter, typeFilter, search, sortBy]);

  useEffect(() => {
    usersAPI.getAll().then(u => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, []);

  const handleCreate = async (form) => {
    try {
      await tasksAPI.create({
        ...form,
        assigned_by: currentUser?.name,
        created_by_id:   currentUser?.id,
        created_by_role: currentUser?.role,
      });
      notify("✅ Task created!"); loadData(); setFormOpen(false); setEditTask(null);
    }
    catch(e) { notify(e.message, "error"); }
  };

  // Convert a template object into the TaskForm's initial values
  const templateToFormValues = (tpl) => {
    const dueDate = tpl.deadline_days > 0
      ? new Date(Date.now() + tpl.deadline_days * 86400000).toISOString().slice(0, 10)
      : "";
    return {
      title:        tpl.name || "",
      description:  tpl.description || "",
      assigned_to:  tpl.assignee || "",
      priority:     tpl.priority || "medium",
      due_date:     dueDate,
      status:       "pending",
      type:         "task",
      tags:         [],
      subtasks:     (Array.isArray(tpl.checklist) ? tpl.checklist : []).map((item, idx) => ({
        id: `tpl-${idx}`,
        title: typeof item === "string" ? item : (item.text || item.title || ""),
        completed: false,
      })),
      recurring:    tpl.recurring || { enabled: false },
      client_name:  "",
      client:       "",
      project_name: "",
      crm_company:  "",
      crm_item:     "",
      senior_accountant: "",
      work_performed:    "",
      start_date:        "",
      time_estimate:     0,
      is_tax_return: false,
      tax_return_total: "",
      is_payroll: false,
      payroll_total: "",
    };
  };

  // Handle selecting a template → pre-fill the task form
  const handleSelectTemplate = (tpl) => {
    setEditTask(null);  // make sure we're in "create" mode
    setFormOpen(true);
    // We delay slightly so the form mounts fresh, then patch its values
    // We actually pass the prefilled form as editTask with no id (new task)
    const prefilled = templateToFormValues(tpl);
    // Use a sentinel: pass prefilled as editTask but without an id so handleCreate runs
    setEditTask({ ...prefilled, _fromTemplate: true });
  };

  // Handle quick-apply: call /apply endpoint then reload
  const handleApplyTemplate = async (tplId) => {
    const result = await automationAPI.applyTemplate(tplId, {
      assigned_by:     currentUser?.name,
      created_by_id:   currentUser?.id,
      created_by_role: currentUser?.role,
    });
    notify("✅ Task created from template!"); loadData();
    return result;
  };

  const handleUpdate = async (form) => {
    try {
      await tasksAPI.update(form.id, {
        ...form,
        updated_by:      currentUser?.name,
        updated_by_role: currentUser?.role,
      });
      notify("Task updated");
      loadData();
      if (detailTask?.id === form.id) setDetailTask(prev => ({ ...prev, ...form }));
      setFormOpen(false); setEditTask(null);
    } catch(e) { notify(e.message, "error"); }
  };

  const handleSaveFromDetail = async (form, action) => {
    if (action === "edit") { setEditTask(form); setFormOpen(true); return; }
    await handleUpdate(form);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try { await tasksAPI.delete(id); notify("Task deleted", "info"); setDetailTask(null); loadData(); }
    catch(e) { notify(e.message, "error"); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} tasks?`)) return;
    await Promise.all(selected.map(id => tasksAPI.delete(id)));
    setSelected([]); notify(`${selected.length} tasks deleted`, "info"); loadData();
  };

  const handleBulkStatus = async (status) => {
    await Promise.all(selected.map(id => tasksAPI.updateStatus(id, status)));
    setSelected([]); notify(`Moved to ${STATUS_META[status]?.label}`); loadData();
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === tasks.length ? [] : tasks.map(t => t.id));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ── */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Tasks</Typography>
            <Typography variant="body2" color="text.secondary">Manage tasks, track time, and automate from emails</Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            {!isEmployee && <Button variant="outlined" size="small" startIcon={<MailOutline />} onClick={() => setEmailOpen(true)} sx={{ textTransform: "none" }}>Email → Task</Button>}
            {!isEmployee && <Button variant="outlined" size="small" startIcon={<Schedule />} onClick={() => setRulesOpen(true)} sx={{ textTransform: "none" }}>Email Rules</Button>}
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadData} sx={{ textTransform: "none" }}>Refresh</Button>
            {!isEmployee && (
              <Tooltip title="Clear all tasks & create new tasks from today's received client emails">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={syncPolling ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <EmailIcon />}
                  onClick={handleSyncFromInbox}
                  disabled={syncPolling}
                  sx={{ textTransform: "none", bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                >
                  {syncPolling ? "Syncing..." : "Sync from Inbox"}
                </Button>
              </Tooltip>
            )}
            <Button variant="outlined" size="small" startIcon={<LibraryAdd />} onClick={() => setTplPickerOpen(true)}
              sx={{ textTransform: "none", borderColor: "#1976d2", color: "#1976d2", "&:hover": { bgcolor: "#e3f2fd" } }}>
              From Template
            </Button>
            {!isEmployee && <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditTask(null); setFormOpen(true); }} sx={{ textTransform: "none", bgcolor: "#1976d2" }}>New Task</Button>}
          </Box>
        </Box>

        {/* ── Stats ── */}
        {stats && (
          <Grid container spacing={1.5} mb={2.5}>
            <Grid item xs={6} sm={3}><StatCard label="Total" value={stats.total} color="#1976d2" icon={<AssignmentTurnedIn />} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="In Progress" value={stats.inProgress} color="#f57c00" icon={<PlayArrow />} onClick={() => setMainTab(isEmployee ? 1 : 3)} active={mainTab === (isEmployee ? 1 : 3)} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Completed" value={stats.completed} color="#388e3c" icon={<CheckCircle />} onClick={() => setMainTab(isEmployee ? 3 : 5)} active={mainTab === (isEmployee ? 3 : 5)} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="Overdue" value={stats.overdue} color="#d32f2f" icon={<Flag />} sub={`${fmtMins(stats.totalTimeLogged)} logged`} onClick={() => setMainTab(isEmployee ? 2 : 4)} active={mainTab === (isEmployee ? 2 : 4)} /></Grid>
          </Grid>
        )}

        {/* ── Main Tabs ── */}
        <Card sx={{ mb: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <Box sx={{ borderBottom: "1px solid #e0e0e0" }}>
            <Tabs value={mainTab} onChange={(_, v) => { setMainTab(v); setSelected([]); }} variant="scrollable" scrollButtons="auto"
              sx={{ "& .MuiTab-root": { textTransform: "none", fontSize: 13, minHeight: 44, py: 0 } }}>
              {MAIN_TABS.map((t, i) => (
                <Tab key={i} label={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    {t.label}
                    {i === 0 && stats && <Chip label={stats.total} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#e3f2fd", color: "#1976d2" }} />}
                    {i === 3 && stats && <Chip label={stats.inProgress} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#fff3e0", color: "#f57c00" }} />}
                    {i === 4 && stats && <Chip label={stats.overdue} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#ffebee", color: "#d32f2f" }} />}
                    {i === 5 && stats && <Chip label={stats.completed} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#e8f5e9", color: "#388e3c" }} />}
                  </Box>
                } />
              ))}
            </Tabs>
          </Box>

          {/* ── Filters & View Toggle ── */}
          <Box sx={{ p: 1.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
            <TextField size="small" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }} />

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} label="Priority" onChange={e => setPriorityFilter(e.target.value)}>
                <MenuItem value="all">All Priorities</MenuItem>
                {Object.entries(PRIORITY_META).map(([k,v]) => <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="task">Task</MenuItem>
                <MenuItem value="email_task">Email Task</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="call">Call</MenuItem>
                <MenuItem value="follow_up">Follow Up</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sortBy} label="Sort by" onChange={e => setSortBy(e.target.value)}>
                <MenuItem value="created_at">Date Created</MenuItem>
                <MenuItem value="due_date">Due Date</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="title">Title A–Z</MenuItem>
              </Select>
            </FormControl>

            <Box flex={1} />

            {/* Bulk actions */}
            {selected.length > 0 && (
              <Box display="flex" gap={0.75} alignItems="center">
                <Typography variant="caption" fontWeight="bold" color="primary.main">{selected.length} selected</Typography>
                <Button size="small" variant="outlined" color="success" onClick={() => handleBulkStatus("completed")} sx={{ textTransform: "none", fontSize: 11 }}>✓ Complete</Button>
                <Button size="small" variant="outlined" onClick={() => handleBulkStatus("in_progress")} sx={{ textTransform: "none", fontSize: 11 }}>▷ In Progress</Button>
                <Button size="small" variant="outlined" color="error" onClick={handleBulkDelete} sx={{ textTransform: "none", fontSize: 11 }}>Delete</Button>
              </Box>
            )}

            {/* View toggle */}
            <Box sx={{ display: "flex", border: "1px solid #e0e0e0", borderRadius: 1, overflow: "hidden" }}>
              {[["list", <ViewList sx={{ fontSize: 18 }} />], ["kanban", <ViewKanban sx={{ fontSize: 18 }} />]].map(([v, icon]) => (
                <Tooltip key={v} title={v === "list" ? "List View" : "Kanban Board"}>
                  <IconButton size="small" onClick={() => setViewMode(v)} sx={{ borderRadius: 0, bgcolor: viewMode === v ? "#1976d2" : "transparent", color: viewMode === v ? "#fff" : "#666", "&:hover": { bgcolor: viewMode === v ? "#1565d8" : "#f5f5f5" }, px: 1 }}>{icon}</IconButton>
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* ── Content ── */}
          {loading && <LinearProgress />}

          {!loading && tasks.length === 0 && (
            <Box textAlign="center" py={6}>
              <AssignmentTurnedIn sx={{ fontSize: 56, color: "#e0e0e0", mb: 1 }} />
              <Typography variant="h6" color="text.secondary" fontWeight="medium">No tasks found</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {isEmployee ? "No tasks have been assigned to you yet — you can create one from a template" : "Create your first task or adjust the filters"}
              </Typography>
              <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                <Button variant="outlined" startIcon={<LibraryAdd />} onClick={() => setTplPickerOpen(true)}
                  sx={{ textTransform: "none", borderColor: "#1976d2", color: "#1976d2" }}>
                  From Template
                </Button>
                {!isEmployee && (
                  <Button variant="contained" startIcon={<Add />} onClick={() => setFormOpen(true)} sx={{ textTransform: "none" }}>
                    New Task
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* Kanban View */}
          {!loading && tasks.length > 0 && viewMode === "kanban" && (
            <Box p={2}>
              <KanbanBoard tasks={tasks} onOpen={setDetailTask} onStatusChange={async (id, s) => { await tasksAPI.updateStatus(id, s); loadData(); }} />
            </Box>
          )}

          {/* List View */}
          {!loading && tasks.length > 0 && viewMode === "list" && (
            <ScrollableTable sx={{ overflowX: "auto" }}
              totalCount={tasks.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
              <Table size="small" sx={{ minWidth: 1600 }}>
                <TableHead style={{ display: "table-header-group" }}>
                  <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                    <TableCell padding="checkbox" sx={{ pl: 2 }}>
                      <Checkbox size="small" indeterminate={selected.length > 0 && selected.length < tasks.length} checked={selected.length === tasks.length && tasks.length > 0} onChange={toggleAll} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 90 }}>TASK #</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 220 }}>TASK</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>PRIORITY</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>ASSIGNED TO</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 110 }}>CLIENT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>PROJECT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>CRM ITEM</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 140 }}>WORK PERFORMED</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>TAX RETURN</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>PAYROLL</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>SR. ACCOUNTANT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>TAGS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 90 }}>DUE DATE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 60 }}>MINS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 60 }}>HOURS</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 140 }}>COMPLETED / TIME</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(t => {
                    const overdue = isOverdue(t);
                    const isSelected = selected.includes(t.id);
                    const mins = Number(t.task_duration_minutes || t.time_logged || 0);
                    const clientDisplay = t.client_name || t.client || "—";
                    const tags = Array.isArray(t.tags) ? t.tags : [];
                    return (
                      <TableRow key={t.id} hover selected={isSelected} sx={{ cursor: "pointer", bgcolor: isSelected ? "#e3f2fd" : overdue ? "#fff8f8" : "inherit", "&:hover": { bgcolor: isSelected ? "#bbdefb" : "#f9f9f9" } }}>
                        <TableCell padding="checkbox" sx={{ pl: 2 }} onClick={e => { e.stopPropagation(); toggleSelect(t.id); }}>
                          <Checkbox size="small" checked={isSelected} />
                        </TableCell>

                        {/* TASK # */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#1565c0", fontSize: 11 }}>
                            {t.task_number || "—"}
                          </Typography>
                        </TableCell>

                        {/* TASK */}
                        <TableCell onClick={() => setDetailTask(t)} sx={{ maxWidth: 260 }}>
                          <Box display="flex" alignItems="flex-start" gap={0.75}>
                            <Box sx={{ mt: 0.25, color: t.status === "completed" ? "#388e3c" : "text.secondary", flexShrink: 0 }}>
                              {t.status === "completed" ? <CheckCircle sx={{ fontSize: 15 }} /> : <RadioButtonUnchecked sx={{ fontSize: 15 }} />}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ textDecoration: t.status === "completed" ? "line-through" : "none", color: t.status === "completed" ? "text.secondary" : "text.primary", lineHeight: 1.3, fontSize: 12 }}>{t.title}</Typography>
                              <Box display="flex" gap={0.5} mt={0.25} flexWrap="wrap">
                                {t.type === "email_task" && <Chip icon={<EmailIcon sx={{ fontSize: "9px !important" }} />} label="Email" size="small" sx={{ height: 15, fontSize: 8, bgcolor: "#e3f2fd", color: "#1565c0" }} />}
                                {t.recurring?.enabled && <Chip icon={<Repeat sx={{ fontSize: "9px !important" }} />} label={t.recurring.frequency} size="small" sx={{ height: 15, fontSize: 8, bgcolor: "#f3e5f5", color: "#6a1b9a" }} />}
                                {Array.isArray(t.subtasks) && t.subtasks.length > 0 && <Typography variant="caption" color="text.secondary" fontSize={9}>✓ {t.subtasks.filter(s=>s.completed).length}/{t.subtasks.length}</Typography>}
                              </Box>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* STATUS / PRIORITY / ASSIGNED */}
                        <TableCell onClick={() => setDetailTask(t)}><StatusChip status={t.status} /></TableCell>
                        <TableCell onClick={() => setDetailTask(t)}><PriorityChip priority={t.priority} /></TableCell>
                        <TableCell><EmployeeAvatar name={t.assigned_to} size={22} showName /></TableCell>

                        {/* CLIENT */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Typography variant="caption" sx={{ fontSize: 11 }}>{clientDisplay}</Typography>
                        </TableCell>

                        {/* PROJECT */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          {t.project_name ? (
                            <Chip label={t.project_name} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e8f5e9", color: "#2e7d32", maxWidth: 120 }} />
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>

                        {/* CRM ITEM */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          {t.crm_item ? (
                            <Chip label={t.crm_item} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e3f2fd", color: "#1565c0" }} />
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>

                        {/* WORK PERFORMED */}
                        <TableCell onClick={() => setDetailTask(t)} sx={{ maxWidth: 160 }}>
                          {t.work_performed ? (
                            <Tooltip title={t.work_performed}>
                              <Typography variant="caption" sx={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {t.work_performed}
                              </Typography>
                            </Tooltip>
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>

                        {/* TAX RETURN */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          {t.is_tax_return ? (
                            <Box>
                              <Chip label="✓ Yes" size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#fff3e0", color: "#e65100" }} />
                              {t.tax_return_total && <Typography variant="caption" display="block" sx={{ fontSize: 10, mt: 0.25 }}>{t.tax_return_total}</Typography>}
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>

                        {/* PAYROLL */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          {t.is_payroll ? (
                            <Box>
                              <Chip label="✓ Yes" size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#fce4ec", color: "#c62828" }} />
                              {t.payroll_total && <Typography variant="caption" display="block" sx={{ fontSize: 10, mt: 0.25 }}>{t.payroll_total}</Typography>}
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>

                        {/* SENIOR ACCOUNTANT */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Typography variant="caption" sx={{ fontSize: 11 }}>{t.senior_accountant || "—"}</Typography>
                        </TableCell>

                        {/* TAGS */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Box display="flex" gap={0.25} flexWrap="wrap">
                            {tags.slice(0, 3).map(tag => (
                              <Chip key={tag} label={tag} size="small" sx={{ height: 16, fontSize: 9 }} />
                            ))}
                            {tags.length > 3 && <Typography variant="caption" color="text.secondary" fontSize={9}>+{tags.length - 3}</Typography>}
                            {tags.length === 0 && <Typography variant="caption" color="text.secondary">—</Typography>}
                          </Box>
                        </TableCell>

                        {/* DUE DATE */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Typography variant="caption" color={overdue ? "error" : "text.primary"} fontWeight={overdue ? 700 : 400} sx={{ fontSize: 11 }}>
                            {overdue ? "⚠ " : ""}{fmtDate(getDueDate(t))}
                          </Typography>
                        </TableCell>

                        {/* MINUTES */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          <Typography variant="caption" fontWeight={mins > 0 ? 700 : 400} color={mins > 0 ? "primary.main" : "text.secondary"} sx={{ fontSize: 11 }}>
                            {mins > 0 ? `${mins}m` : "—"}
                          </Typography>
                        </TableCell>

                        {/* HOURS */}
                        <TableCell onClick={() => setDetailTask(t)}>
                          {mins > 0 ? (
                            <Typography variant="caption" fontWeight={700} color="success.main" sx={{ fontSize: 11 }}>
                              {(mins / 60).toFixed(1)}h
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>—</Typography>
                          )}
                        </TableCell>

                        {/* COMPLETED / TIME */}
                        <TableCell>
                          {t.status === "completed" ? (
                            editCompletionId === t.id ? (
                              <Box sx={{ minWidth: 200 }} onClick={e => e.stopPropagation()}>
                                <TextField size="small" type="datetime-local" value={editCompletionDate} onChange={e => setEditCompletionDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: "100%", mb: 0.5, "& input": { fontSize: 11 } }} />
                                <Box display="flex" gap={0.5} mb={0.5}>
                                  <TextField size="small" label="Hrs" type="number" inputProps={{ min: 0 }} value={editCompletionH} onChange={e => setEditCompletionH(e.target.value)} sx={{ width: 60, "& input": { fontSize: 11 } }} />
                                  <TextField size="small" label="Min" type="number" inputProps={{ min: 0, max: 59 }} value={editCompletionM} onChange={e => setEditCompletionM(e.target.value)} sx={{ width: 60, "& input": { fontSize: 11 } }} />
                                </Box>
                                <Box display="flex" gap={0.5}>
                                  <Button size="small" variant="contained" onClick={e => saveCompletionFromTable(e, t)} sx={{ fontSize: 10, textTransform: "none", py: 0.2, minWidth: 44, bgcolor: "#388e3c", "&:hover": { bgcolor: "#2e7d32" } }}>Save</Button>
                                  <Button size="small" onClick={e => { e.stopPropagation(); setEditCompletionId(null); }} sx={{ fontSize: 10, textTransform: "none", py: 0.2, minWidth: 44 }}>✕</Button>
                                </Box>
                              </Box>
                            ) : (
                              <Box sx={{ cursor: "pointer" }} onClick={() => setDetailTask(t)}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Typography variant="caption" sx={{ color: "#388e3c", fontWeight: 700, display: "block", fontSize: 11 }}>
                                    ✅ {fmtDateTime(t.completed_at)}
                                  </Typography>
                                  {!isEmployee && (
                                    <Tooltip title="Edit completion time">
                                      <IconButton size="small" onClick={e => startEditCompletion(e, t)} sx={{ p: 0.1, color: "#388e3c", "&:hover": { bgcolor: "#e8f5e9" } }}>
                                        <Edit sx={{ fontSize: 11 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                                {t.task_duration_minutes > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                    ⏱ {fmtMins(t.task_duration_minutes)}
                                  </Typography>
                                )}
                              </Box>
                            )
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }} onClick={() => setDetailTask(t)}>
                              {t.time_logged ? `⏱ ${fmtMins(t.time_logged)}` : "—"}
                              {t.time_estimate > 0 && <span style={{ color: "#bbb" }}> / {fmtMins(t.time_estimate)}</span>}
                            </Typography>
                          )}
                        </TableCell>

                        {/* ACTIONS */}
                        <TableCell>
                          {!isEmployee && (
                            <Box display="flex" gap={0.25}>
                              <Tooltip title="Edit"><IconButton size="small" onClick={e => { e.stopPropagation(); setEditTask(t); setFormOpen(true); }}><Edit sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDelete(t.id); }}><Delete sx={{ fontSize: 13 }} /></IconButton></Tooltip>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
          {!loading && tasks.length > 0 && (
            <Box sx={{ p: 1.5, borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</Typography>
              <Typography variant="caption" color="text.secondary">{tasks.filter(t => t.status !== "completed").length} open · {tasks.filter(t => t.status === "completed").length} completed</Typography>
            </Box>
          )}
        </Card>
      </Box>

      {/* ── Dialogs ── */}
      <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditTask(null); }} initial={editTask} onSave={(editTask && editTask.id && !editTask._fromTemplate) ? handleUpdate : handleCreate} users={users} currentUser={currentUser} />
      <TaskDetail open={Boolean(detailTask)} task={detailTask} onClose={() => setDetailTask(null)} onSave={handleSaveFromDetail} onDelete={handleDelete} currentUser={currentUser} users={users} />
      <EmailToTaskDialog open={emailOpen} onClose={() => setEmailOpen(false)} onCreated={() => { notify("✅ Task created from email!"); loadData(); }} users={users} />
      <EmailRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} users={users} />
      <TemplatePickerDialog
        open={tplPickerOpen}
        onClose={() => setTplPickerOpen(false)}
        users={users}
        onSelectTemplate={handleSelectTemplate}
        onApplyDirect={handleApplyTemplate}
      />

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
