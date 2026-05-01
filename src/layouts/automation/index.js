/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, Chip, IconButton, Tabs, Tab, Grid, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Snackbar, Alert, CircularProgress, Divider,
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  LinearProgress, InputAdornment,
} from "@mui/material";
import Icon from "@mui/material/Icon";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { usersAPI } from "services/api";
import { useAuth } from "context/AuthContext";

const API = "http://localhost:5000/api";
const token = () => localStorage.getItem("crm_token");
const req = async (method, path, body) => {
  try {
    const r = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    if (!text) return { success: false, error: "Empty response from server" };
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text.slice(0, 200));
      return { success: false, error: "Server returned invalid JSON. Make sure the backend is running." };
    }
  } catch (e) {
    return { success: false, error: e.message || "Network error — is the backend running on port 5000?" };
  }
};

// ── Constants ─────────────────────────────────────────────────────────────
const STAGES = [
  { id: "Fresh Leads",               color: "#1976d2", icon: "fiber_new" },
  { id: "Assigned Leads",            color: "#7b1fa2", icon: "assignment_ind" },
  { id: "Connected / In Progress",   color: "#f57c00", icon: "phone_in_talk" },
  { id: "No Answer",                 color: "#d32f2f", icon: "phone_missed" },
  { id: "Need to connect in future", color: "#388e3c", icon: "schedule" },
  { id: "Lead Won",                  color: "#1b5e20", icon: "emoji_events" },
  { id: "Lead Lost",                 color: "#757575", icon: "cancel" },
  { id: "Junk Lead",                 color: "#795548", icon: "delete_sweep" },
];

const ACTION_TYPES = [
  { id: "create_task",        label: "Create Task",            icon: "task_alt",         color: "#1976d2" },
  { id: "send_notification",  label: "Add Notification",       icon: "notifications",    color: "#ff9800" },
  { id: "change_stage",       label: "Change Stage",           icon: "swap_horiz",       color: "#9c27b0" },
  { id: "change_responsible", label: "Change Responsible",     icon: "manage_accounts",  color: "#00897b" },
  { id: "send_email",         label: "Send Email",             icon: "email",            color: "#e53935" },
  { id: "create_contact",     label: "Create Contact",         icon: "person_add",       color: "#43a047" },
  { id: "edit_element",       label: "Edit Element (Field)",   icon: "edit",             color: "#8d6e63" },
];

// RESPONSIBLE loaded dynamically from backend users
const LEAD_FIELDS = ["responsible","stage","source","lead_for","present_software","priority","status","country"];
const PRIORITY_OPTIONS = ["low","medium","high"];

const actionColor = (t) => ACTION_TYPES.find(a => a.id === t)?.color || "#888";
const actionLabel = (t) => ACTION_TYPES.find(a => a.id === t)?.label || t;
const actionIcon  = (t) => ACTION_TYPES.find(a => a.id === t)?.icon  || "bolt";
const stageColor  = (s) => STAGES.find(x => x.id === s)?.color || "#333";

const timingLabel = (rule) => {
  const v = parseInt(rule.timing_value) || 0;
  if (v === 0) return "immediately";
  return `${v} ${rule.timing_unit === "days" ? "day" : "hour"}${v > 1 ? "s" : ""}`;
};

// ── Rule Dialog ────────────────────────────────────────────────────────────
function RuleDialog({ open, onClose, initial, defaultStage, onSave, users = [] }) {
  const defaultUser = users[0]?.name || "";
  const emptyForm = {
    name: "", stage: defaultStage || STAGES[0].id, entity_type: "lead",
    trigger: "stage_enter", timing_value: 0, timing_unit: "hours",
    condition: { field: "", operator: "equals", value: "" },
    action_type: "create_task",
    action_data: {
      title: "Follow up with {name}", description: "", assignee: defaultUser,
      deadline_days: 1, priority: "medium",
      message: "New lead {name} - action required",
      to: "responsible", new_stage: "", new_responsible: defaultUser,
      subject: "Follow up - {name}", body: "Hi {name},\n\nThis is a follow-up regarding your inquiry.\n\nBest regards,\nOutsourced Bookkeeping Team",
      field: "", value: "",
    },
    status: "active", description: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(initial ? { ...emptyForm, ...initial, action_data: { ...emptyForm.action_data, ...(initial.action_data || {}) }, condition: { ...emptyForm.condition, ...(initial.condition || {}) } } : { ...emptyForm, stage: defaultStage || STAGES[0].id });
  }, [open, initial, defaultStage]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAD = (k, v) => setForm(f => ({ ...f, action_data: { ...f.action_data, [k]: v } }));
  const setCond = (k, v) => setForm(f => ({ ...f, condition: { ...f.condition, [k]: v } }));
  const hasCondition = form.condition?.field;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #eee" }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon sx={{ color: actionColor(form.action_type) }}>{actionIcon(form.action_type)}</Icon>
          {initial ? "Edit Automation Rule" : "New Automation Rule"}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        <Grid container spacing={2}>
          {/* Basic Info */}
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Rule Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Assign task on Fresh Lead" />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => set("status", e.target.value)}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Stage (Trigger when lead enters)</InputLabel>
              <Select value={form.stage} label="Stage (Trigger when lead enters)" onChange={e => set("stage", e.target.value)}>
                {STAGES.map(s => <MenuItem key={s.id} value={s.id}><Box display="flex" alignItems="center" gap={1}><Icon sx={{ fontSize: 14, color: s.color }}>{s.icon}</Icon>{s.id}</Box></MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" type="number" label="After (0 = immediate)" value={form.timing_value}
              onChange={e => set("timing_value", parseInt(e.target.value) || 0)} inputProps={{ min: 0 }} />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Unit</InputLabel>
              <Select value={form.timing_unit} label="Unit" onChange={e => set("timing_unit", e.target.value)}>
                <MenuItem value="hours">Hours</MenuItem>
                <MenuItem value="days">Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Description (optional)" value={form.description} onChange={e => set("description", e.target.value)} />
          </Grid>

          {/* Condition */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">By Condition (optional — leave empty to always run)</Typography>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Field</InputLabel>
                <Select value={form.condition?.field || ""} label="Field" onChange={e => setCond("field", e.target.value)}>
                  <MenuItem value="">— No condition —</MenuItem>
                  {LEAD_FIELDS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Operator</InputLabel>
                <Select value={form.condition?.operator || "equals"} label="Operator" onChange={e => setCond("operator", e.target.value)}>
                  <MenuItem value="equals">equals</MenuItem>
                  <MenuItem value="contains">contains</MenuItem>
                  <MenuItem value="not_empty">is not empty</MenuItem>
                  <MenuItem value="is_empty">is empty</MenuItem>
                </Select>
              </FormControl>
              {(form.condition?.operator === "equals" || form.condition?.operator === "contains") && (
                <TextField size="small" label="Value" value={form.condition?.value || ""} onChange={e => setCond("value", e.target.value)} sx={{ minWidth: 160 }} />
              )}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          {/* Action */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Action to Perform</Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {ACTION_TYPES.map(a => (
                <Chip key={a.id} icon={<Icon sx={{ fontSize: "14px !important" }}>{a.icon}</Icon>} label={a.label}
                  onClick={() => set("action_type", a.id)} size="small"
                  sx={{ bgcolor: form.action_type === a.id ? a.color : "#f5f5f5",
                    color: form.action_type === a.id ? "#fff" : "#333",
                    border: `1px solid ${form.action_type === a.id ? a.color : "#ddd"}`,
                    "& .MuiChip-icon": { color: form.action_type === a.id ? "#fff" : a.color },
                    cursor: "pointer", fontWeight: form.action_type === a.id ? 700 : 400 }} />
              ))}
            </Box>

            {/* Action-specific fields */}
            {form.action_type === "create_task" && (
              <Grid container spacing={1.5}>
                <Grid item xs={12}><TextField fullWidth size="small" label="Task Title" value={form.action_data.title} onChange={e => setAD("title", e.target.value)} helperText="Use {name}, {email}, {company} as placeholders" /></Grid>
                <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Task Description" value={form.action_data.description} onChange={e => setAD("description", e.target.value)} /></Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assign To</InputLabel>
                    <Select value={form.action_data.assignee} label="Assign To" onChange={e => setAD("assignee", e.target.value)}>
                      <MenuItem value="responsible">Responsible Person</MenuItem>
                      {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}><TextField fullWidth size="small" type="number" label="Deadline (days)" value={form.action_data.deadline_days} onChange={e => setAD("deadline_days", parseInt(e.target.value) || 1)} /></Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select value={form.action_data.priority} label="Priority" onChange={e => setAD("priority", e.target.value)}>
                      {PRIORITY_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {form.action_type === "send_notification" && (
              <Grid container spacing={1.5}>
                <Grid item xs={12}><TextField fullWidth size="small" label="Message" multiline rows={2} value={form.action_data.message} onChange={e => setAD("message", e.target.value)} helperText="Use {name}, {stage}, {responsible} as placeholders" /></Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Send To</InputLabel>
                    <Select value={form.action_data.to} label="Send To" onChange={e => setAD("to", e.target.value)}>
                      <MenuItem value="responsible">Responsible Person</MenuItem>
                      {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {form.action_type === "change_stage" && (
              <FormControl fullWidth size="small">
                <InputLabel>Move to Stage</InputLabel>
                <Select value={form.action_data.new_stage} label="Move to Stage" onChange={e => setAD("new_stage", e.target.value)}>
                  {STAGES.map(s => <MenuItem key={s.id} value={s.id}>{s.id}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {form.action_type === "change_responsible" && (
              <FormControl fullWidth size="small">
                <InputLabel>New Responsible Person</InputLabel>
                <Select value={form.action_data.new_responsible} label="New Responsible Person" onChange={e => setAD("new_responsible", e.target.value)}>
                  {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {form.action_type === "send_email" && (
              <Grid container spacing={1.5}>
                <Grid item xs={12}><TextField fullWidth size="small" label="Subject" value={form.action_data.subject} onChange={e => setAD("subject", e.target.value)} /></Grid>
                <Grid item xs={12}><TextField fullWidth size="small" multiline rows={5} label="Email Body" value={form.action_data.body} onChange={e => setAD("body", e.target.value)} helperText="Placeholders: {name}, {email}, {company}, {responsible}" /></Grid>
              </Grid>
            )}

            {form.action_type === "create_contact" && (
              <FormControl fullWidth size="small">
                <InputLabel>Assign Contact To</InputLabel>
                <Select value={form.action_data.assignee} label="Assign Contact To" onChange={e => setAD("assignee", e.target.value)}>
                  {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {form.action_type === "edit_element" && (
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Field to Edit</InputLabel>
                    <Select value={form.action_data.field} label="Field to Edit" onChange={e => setAD("field", e.target.value)}>
                      {LEAD_FIELDS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}><TextField fullWidth size="small" label="New Value" value={form.action_data.value} onChange={e => setAD("value", e.target.value)} /></Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name || !form.action_type}
          sx={{ bgcolor: actionColor(form.action_type) }}>
          {initial ? "Save Changes" : "Create Rule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Task Template Dialog ───────────────────────────────────────────────────
function TemplateDialog({ open, onClose, initial, onSave, users = [] }) {
  const defaultUser = users[0]?.name || "";
  const empty = { name:"", description:"", assignee: defaultUser, priority:"medium",
    deadline_days:1, checklist:[], tags:[], group:"", recurring:"none" };
  const [form, setForm] = useState(empty);
  const [checkItem, setCheckItem] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if (open) setForm(initial ? { ...empty, ...initial } : empty); }, [open, initial]);

  const addCheck = () => {
    if (!checkItem.trim()) return;
    setForm(f => ({ ...f, checklist: [...f.checklist, checkItem.trim()] }));
    setCheckItem("");
  };
  const removeCheck = (i) => setForm(f => ({ ...f, checklist: f.checklist.filter((_, idx) => idx !== i) }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{initial ? "Edit Task Template" : "New Task Template"}</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12}><TextField fullWidth size="small" label="Template Name *" value={form.name} onChange={e => set("name", e.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" multiline rows={3} label="Description" value={form.description} onChange={e => set("description", e.target.value)} /></Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Assign To</InputLabel>
              <Select value={form.assignee} label="Assign To" onChange={e => set("assignee", e.target.value)}>
                {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={e => set("priority", e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}><TextField fullWidth size="small" type="number" label="Deadline (days)" value={form.deadline_days} onChange={e => set("deadline_days", parseInt(e.target.value) || 1)} /></Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="Group / Department" value={form.group} onChange={e => set("group", e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Recurring</InputLabel>
              <Select value={form.recurring} label="Recurring" onChange={e => set("recurring", e.target.value)}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="biweekly">Bi-weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Checklist Items</Typography>
            <Box display="flex" gap={1} mb={1}>
              <TextField size="small" placeholder="Add checklist item…" value={checkItem} onChange={e => setCheckItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCheck()} sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" onClick={addCheck}>Add</Button>
            </Box>
            {form.checklist.map((c, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                <Icon sx={{ fontSize: 14, color: "#aaa" }}>check_box_outline_blank</Icon>
                <Typography variant="body2" flex={1}>{c}</Typography>
                <IconButton size="small" onClick={() => removeCheck(i)}><Icon fontSize="small">close</Icon></IconButton>
              </Box>
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name}>
          {initial ? "Save" : "Create Template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Automation Page ───────────────────────────────────────────────────
export default function AutomationPage() {
  const [tab, setTab] = useState(0);
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState(null);
  const [ruleDialog, setRuleDialog] = useState({ open: false, initial: null, defaultStage: null });
  const [tplDialog, setTplDialog] = useState({ open: false, initial: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [tplPage, setTplPage] = useState(0);
  const [tplRpp, setTplRpp]   = useState(25);
  const [logsPage, setLogsPage] = useState(0);
  const [logsRpp, setLogsRpp]   = useState(25);

  useEffect(() => {
    usersAPI.getAll().then(u => setAllUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, []);

  const showSnack = (msg, sev = "success") => setSnack({ msg, sev });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, l, s] = await Promise.all([
        req("GET", "/automation/rules"),
        req("GET", "/automation/templates"),
        req("GET", "/automation/logs?limit=100"),
        req("GET", "/automation/stats"),
      ]);
      if (r.success) setRules(r.data || []);
      else if (r.error) showSnack("Rules: " + r.error, "error");
      if (t.success) setTemplates(t.data || []);
      if (l.success) setLogs(l.data || []);
      if (s.success) setStats(s.data);
    } catch (e) {
      showSnack("Failed to load: " + e.message, "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { setTplPage(0); }, [search]);

  // Rules CRUD
  const handleSaveRule = async (form) => {
    const r = ruleDialog.initial
      ? await req("PUT", `/automation/rules/${ruleDialog.initial.id}`, form)
      : await req("POST", "/automation/rules", form);
    if (r.success) { showSnack(ruleDialog.initial ? "Rule updated" : "Rule created"); setRuleDialog({ open: false }); load(); }
    else showSnack(r.error || "Error", "error");
  };

  const handleToggleRule = async (rule) => {
    const r = await req("POST", `/automation/rules/${rule.id}/toggle`);
    if (r.success) { load(); showSnack(`Rule ${r.data.status}`); }
  };

  const handleDeleteRule = async (id) => {
    await req("DELETE", `/automation/rules/${id}`);
    showSnack("Rule deleted"); setDeleteConfirm(null); load();
  };

  const handleTestRule = async (id) => {
    const r = await req("POST", `/automation/rules/${id}/test`);
    setTestResult(r);
    showSnack(r.success ? "Test executed — check logs" : (r.error || "Test failed"), r.success ? "success" : "error");
    if (r.success) load();
  };

  // Templates CRUD
  const handleSaveTpl = async (form) => {
    const r = tplDialog.initial
      ? await req("PUT", `/automation/templates/${tplDialog.initial.id}`, form)
      : await req("POST", "/automation/templates", form);
    if (r.success) { showSnack(tplDialog.initial ? "Template updated" : "Template created"); setTplDialog({ open: false }); load(); }
    else showSnack(r.error || "Error", "error");
  };

  const handleApplyTpl = async (id) => {
    const r = await req("POST", `/automation/templates/${id}/apply`);
    if (r.success) showSnack(`Task "${r.data.title}" created!`);
    else showSnack(r.error || "Error", "error");
  };

  const handleDeleteTpl = async (id) => {
    await req("DELETE", `/automation/templates/${id}`);
    showSnack("Template deleted"); load();
  };

  const processPending = async () => {
    const r = await req("POST", "/automation/process-pending");
    showSnack(`Processed ${r.data?.processed || 0} pending rules`); load();
  };

  // ── Tab 0: CRM Automation (per-stage) ─────────────────────────────────
  const renderCRMAutomation = () => (
    <Box>
      {/* Stats bar */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          {[
            { l: "Total Rules",    v: stats.total_rules,     icon: "rule",        c: "#1976d2" },
            { l: "Active",         v: stats.active_rules,    icon: "check_circle", c: "#4caf50" },
            { l: "Total Runs",     v: stats.total_executions,icon: "bolt",         c: "#ff9800" },
            { l: "Today",          v: stats.today_executions,icon: "today",        c: "#9c27b0" },
            { l: "Errors",         v: stats.error_count,     icon: "error",        c: "#f44336" },
            { l: "Pending (delayed)", v: stats.pending_count,icon: "hourglass_empty", c: "#607d8b" },
          ].map(s => (
            <Grid item xs={6} sm={4} md={2} key={s.l}>
              <Card elevation={0} sx={{ textAlign: "center", p: 1.5, border: "1px solid #eee" }}>
                <Icon sx={{ color: s.c, fontSize: 28 }}>{s.icon}</Icon>
                <Typography variant="h5" fontWeight={700}>{s.v}</Typography>
                <Typography variant="caption" color="text.secondary">{s.l}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Process pending button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Automation Rules by Stage</Typography>
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" startIcon={<Icon>hourglass_top</Icon>} onClick={processPending}>
            Process Delayed Rules
          </Button>
          <Button size="small" variant="contained" startIcon={<Icon>add</Icon>} onClick={() => setRuleDialog({ open: true, initial: null, defaultStage: "Fresh Leads" })}>
            Add Rule
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Per-stage accordions */}
      {STAGES.map(stage => {
        const stageRules = rules.filter(r => r.stage === stage.id);
        return (
          <Accordion key={stage.id} defaultExpanded={stageRules.length > 0}
            elevation={0} sx={{ border: "1px solid #eee", mb: 1, borderRadius: "8px !important", "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={{ bgcolor: stage.color + "12", borderRadius: "8px" }}>
              <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                <Icon sx={{ color: stage.color, fontSize: 20 }}>{stage.icon}</Icon>
                <Typography variant="subtitle1" fontWeight={700} color={stage.color}>{stage.id}</Typography>
                <Chip label={stageRules.length} size="small" sx={{ bgcolor: stage.color, color: "#fff", fontWeight: 700 }} />
                <Chip label={`${stageRules.filter(r => r.status === "active").length} active`} size="small" color="success" variant="outlined" sx={{ fontSize: "0.65rem" }} />
              </Box>
              <Button size="small" variant="outlined" startIcon={<Icon>add</Icon>}
                onClick={e => { e.stopPropagation(); setRuleDialog({ open: true, initial: null, defaultStage: stage.id }); }}
                sx={{ mr: 1, color: stage.color, borderColor: stage.color }}>
                add
              </Button>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {stageRules.length === 0 ? (
                <Box textAlign="center" py={3} color="text.disabled">
                  <Icon sx={{ fontSize: 36 }}>automation</Icon>
                  <Typography variant="body2">No automation rules for this stage</Typography>
                  <Button size="small" startIcon={<Icon>add</Icon>} onClick={() => setRuleDialog({ open: true, initial: null, defaultStage: stage.id })} sx={{ mt: 1 }}>
                    Add first rule
                  </Button>
                </Box>
              ) : (
                <ScrollableTable>
                  <Table size="small">
                    <TableHead style={{ display: "table-header-group" }}><TableRow sx={{ bgcolor: "#fafafa" }}>
                      <TableCell><b>Rule</b></TableCell>
                      <TableCell><b>Action</b></TableCell>
                      <TableCell><b>Timing</b></TableCell>
                      <TableCell><b>Condition</b></TableCell>
                      <TableCell><b>Status</b></TableCell>
                      <TableCell align="right"><b>Actions</b></TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {stageRules.map(rule => (
                        <TableRow key={rule.id} hover sx={{ opacity: rule.status === "disabled" ? 0.55 : 1 }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{rule.name}</Typography>
                            {rule.description && <Typography variant="caption" color="text.secondary">{rule.description}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip icon={<Icon sx={{ fontSize: "13px !important" }}>{actionIcon(rule.action_type)}</Icon>}
                              label={actionLabel(rule.action_type)} size="small"
                              sx={{ bgcolor: actionColor(rule.action_type) + "18", color: actionColor(rule.action_type), fontWeight: 600 }} />
                            {rule.action_data?.assignee && <Typography variant="caption" display="block" color="text.secondary">→ {rule.action_data.assignee}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "#f5f5f5", px: 0.8, py: 0.2, borderRadius: 0.5 }}>
                              {timingLabel(rule)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {rule.condition?.field
                              ? <Typography variant="caption" color="primary.main">{rule.condition.field} {rule.condition.operator} "{rule.condition.value}"</Typography>
                              : <Typography variant="caption" color="text.disabled">always</Typography>}
                          </TableCell>
                          <TableCell>
                            <Switch size="small" checked={rule.status === "active"} onChange={() => handleToggleRule(rule)} color="success" />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Test Run"><IconButton size="small" color="info" onClick={() => handleTestRule(rule.id)}><Icon fontSize="small">play_arrow</Icon></IconButton></Tooltip>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => setRuleDialog({ open: true, initial: rule, defaultStage: rule.stage })}><Icon fontSize="small">edit</Icon></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteConfirm({ type: "rule", id: rule.id })}><Icon fontSize="small">delete</Icon></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );

  // ── Tab 1: Task Templates ──────────────────────────────────────────────
  const renderTemplates = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Task Templates</Typography>
          <Typography variant="body2" color="text.secondary">Create reusable task templates. Apply them manually or link to automation rules.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Icon>add</Icon>} onClick={() => setTplDialog({ open: true, initial: null })}>
          New Template
        </Button>
      </Box>
      <TextField size="small" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 300 }} InputProps={{ startAdornment: <InputAdornment position="start"><Icon fontSize="small">search</Icon></InputAdornment> }} />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <ScrollableTable component={Paper} elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}
        totalCount={templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())).length}
        page={tplPage}
        rowsPerPage={tplRpp}
        onPageChange={(e, p) => setTplPage(p)}
        onRowsPerPageChange={(e) => { setTplRpp(parseInt(e.target.value, 10)); setTplPage(0); }}
      >
        <Table size="small">
          <TableHead style={{ display: "table-header-group" }}><TableRow sx={{ bgcolor: "#f5f5f5" }}>
            <TableCell><b>Template Name</b></TableCell>
            <TableCell><b>Assignee</b></TableCell>
            <TableCell><b>Deadline</b></TableCell>
            <TableCell><b>Priority</b></TableCell>
            <TableCell><b>Checklist</b></TableCell>
            <TableCell><b>Recurring</b></TableCell>
            <TableCell align="right"><b>Actions</b></TableCell>
          </TableRow></TableHead>
          <TableBody>
            {templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())).slice(tplPage * tplRpp, (tplPage + 1) * tplRpp).map(tpl => (
              <TableRow key={tpl.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{tpl.name}</Typography>
                  {tpl.description && <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.description}</Typography>}
                </TableCell>
                <TableCell><Typography variant="body2">{tpl.assignee || "—"}</Typography></TableCell>
                <TableCell><Typography variant="body2">{tpl.deadline_days ? `${tpl.deadline_days} days` : "—"}</Typography></TableCell>
                <TableCell>
                  <Chip size="small" label={tpl.priority} sx={{ bgcolor: tpl.priority === "high" ? "#ffebee" : tpl.priority === "medium" ? "#fff8e1" : "#e8f5e9", color: tpl.priority === "high" ? "#c62828" : tpl.priority === "medium" ? "#f57f17" : "#2e7d32" }} />
                </TableCell>
                <TableCell><Chip size="small" label={`${tpl.checklist?.length || 0} items`} variant="outlined" /></TableCell>
                <TableCell><Chip size="small" label={tpl.recurring || "none"} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Apply (create task now)"><IconButton size="small" color="success" onClick={() => handleApplyTpl(tpl.id)}><Icon fontSize="small">play_circle</Icon></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => setTplDialog({ open: true, initial: tpl })}><Icon fontSize="small">edit</Icon></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteTpl(tpl.id)}><Icon fontSize="small">delete</Icon></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                <Icon sx={{ fontSize: 48, color: "text.disabled" }}>assignment</Icon>
                <Typography color="text.secondary" display="block">No task templates yet. Create your first template.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollableTable>
    </Box>
  );

  // ── Tab 2: Automation Logs ─────────────────────────────────────────────
  const renderLogs = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Automation Execution Logs</Typography>
        <Button size="small" startIcon={<Icon>refresh</Icon>} onClick={load}>Refresh</Button>
      </Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <ScrollableTable component={Paper} elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}
        totalCount={logs.length}
        page={logsPage}
        rowsPerPage={logsRpp}
        onPageChange={(e, p) => setLogsPage(p)}
        onRowsPerPageChange={(e) => { setLogsRpp(parseInt(e.target.value, 10)); setLogsPage(0); }}
      >
        <Table size="small">
          <TableHead style={{ display: "table-header-group" }}><TableRow sx={{ bgcolor: "#f5f5f5" }}>
            <TableCell><b>Rule</b></TableCell>
            <TableCell><b>Lead</b></TableCell>
            <TableCell><b>Stage</b></TableCell>
            <TableCell><b>Action</b></TableCell>
            <TableCell><b>Result</b></TableCell>
            <TableCell><b>Status</b></TableCell>
            <TableCell><b>Time</b></TableCell>
          </TableRow></TableHead>
          <TableBody>
            {logs.slice(logsPage * logsRpp, (logsPage + 1) * logsRpp).map(log => (
              <TableRow key={log.id} hover>
                <TableCell><Typography variant="body2" fontWeight={600}>{log.rule_name}</Typography></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{log.entity_name || log.entity_id?.slice(0, 8) || "—"}</Typography></TableCell>
                <TableCell><Chip size="small" label={log.stage} sx={{ bgcolor: stageColor(log.stage) + "18", color: stageColor(log.stage), fontSize: "0.6rem" }} /></TableCell>
                <TableCell><Chip size="small" icon={<Icon sx={{ fontSize: "12px !important" }}>{actionIcon(log.action_type)}</Icon>} label={actionLabel(log.action_type)} sx={{ bgcolor: actionColor(log.action_type) + "18", color: actionColor(log.action_type), fontSize: "0.65rem" }} /></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.result?.created || log.result?.updated ? JSON.stringify(log.result).slice(0, 60) : log.result?.error || log.result?.reason || "ok"}</Typography></TableCell>
                <TableCell><Chip size="small" label={log.status} color={log.status === "success" ? "success" : log.status === "skipped" ? "warning" : "error"} /></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{new Date(log.created_at).toLocaleString()}</Typography></TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                <Typography color="text.secondary">No automation logs yet. Rules will log here when they fire.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollableTable>
    </Box>
  );

  // ── Tab 3: How It Works ────────────────────────────────────────────────
  const renderGuide = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: "1px solid #eee", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}><Icon sx={{ mr: 1, verticalAlign: "middle", color: "#1976d2" }}>bolt</Icon>How Automation Works</Typography>
              {[
                { step: "1", title: "Lead enters a stage", desc: "When a lead is dragged to a new stage (or created), the automation engine fires." },
                { step: "2", title: "Rules are matched", desc: "All active rules for that stage are checked. Conditions (if any) are evaluated." },
                { step: "3", title: "Actions execute", desc: "Matching rules run immediately or are queued for delayed execution (hours/days later)." },
                { step: "4", title: "Results logged", desc: "Every execution is logged in the Automation Logs tab with full details." },
              ].map(s => (
                <Box display="flex" gap={2} mb={2} key={s.step}>
                  <Box sx={{ bgcolor: "#1976d2", color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{s.step}</Box>
                  <Box><Typography fontWeight={700} variant="body2">{s.title}</Typography><Typography variant="body2" color="text.secondary">{s.desc}</Typography></Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: "1px solid #eee", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}><Icon sx={{ mr: 1, verticalAlign: "middle", color: "#ff9800" }}>help</Icon>Available Action Types</Typography>
              {ACTION_TYPES.map(a => (
                <Box display="flex" gap={1.5} mb={1.5} alignItems="flex-start" key={a.id}>
                  <Box sx={{ bgcolor: a.color + "20", color: a.color, borderRadius: 1, p: 0.5, display: "flex", flexShrink: 0 }}><Icon sx={{ fontSize: 18 }}>{a.icon}</Icon></Box>
                  <Box>
                    <Typography fontWeight={700} variant="body2">{a.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.id === "create_task" && "Auto-create a task with assignee and deadline"}
                      {a.id === "send_notification" && "Send an in-app notification to a team member"}
                      {a.id === "change_stage" && "Automatically move the lead to another stage"}
                      {a.id === "change_responsible" && "Reassign the lead to a different person"}
                      {a.id === "send_email" && "Send a follow-up email to the lead"}
                      {a.id === "create_contact" && "Create a Contact record from lead data"}
                      {a.id === "edit_element" && "Update a specific field on the lead"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid #e3f2fd", bgcolor: "#f8fbff" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}><Icon sx={{ verticalAlign: "middle", mr: 0.5, color: "#1976d2" }}>tips_and_updates</Icon>Template Variables</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>Use these placeholders in task titles, notifications, and email bodies. They are replaced with actual lead data when the automation fires.</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {["{name}","{email}","{phone}","{company}","{title}","{responsible}","{stage}","{source}","{lead_for}","{present_software}","{country}"].map(v => (
                  <Chip key={v} label={v} size="small" sx={{ fontFamily: "monospace", bgcolor: "#e3f2fd", color: "#1565c0" }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box p={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box sx={{ bgcolor: "#1976d220", color: "#1976d2", borderRadius: 2, p: 1.5, display: "flex" }}>
            <Icon sx={{ fontSize: 32 }}>bolt</Icon>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Task Automation</Typography>
            <Typography variant="body2" color="text.secondary">Auto-create tasks, send notifications, change stages — triggered by lead movement</Typography>
          </Box>
          <Box ml="auto"><Button size="small" startIcon={<Icon>refresh</Icon>} onClick={load}>Refresh</Button></Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab icon={<Icon>auto_awesome</Icon>} iconPosition="start" label={`CRM Automation${rules.length ? ` (${rules.length})` : ""}`} />
            <Tab icon={<Icon>assignment</Icon>} iconPosition="start" label={`Task Templates${templates.length ? ` (${templates.length})` : ""}`} />
            <Tab icon={<Icon>history</Icon>} iconPosition="start" label={`Logs${logs.length ? ` (${logs.length})` : ""}`} />
            <Tab icon={<Icon>help_outline</Icon>} iconPosition="start" label="How It Works" />
          </Tabs>
        </Box>

        {tab === 0 && renderCRMAutomation()}
        {tab === 1 && renderTemplates()}
        {tab === 2 && renderLogs()}
        {tab === 3 && renderGuide()}
      </Box>

      <RuleDialog open={ruleDialog.open} onClose={() => setRuleDialog({ open: false })} initial={ruleDialog.initial} defaultStage={ruleDialog.defaultStage} onSave={handleSaveRule} users={allUsers} />
      <TemplateDialog open={tplDialog.open} onClose={() => setTplDialog({ open: false })} initial={tplDialog.initial} onSave={handleSaveTpl} users={allUsers} />

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle>Delete {deleteConfirm?.type === "rule" ? "Rule" : "Template"}?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDeleteRule(deleteConfirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
