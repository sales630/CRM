/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "context/AuthContext";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Card, CardContent, Typography, Button, Chip, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Divider, Tooltip, Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Snackbar, Alert, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, CircularProgress, LinearProgress,
  Stepper, Step, StepLabel, StepContent, Tabs, Tab, Badge,
} from "@mui/material";
import {
  Add, Close, PlayArrow, CheckCircle, Edit, Delete, Search, Assignment,
  Flight, CardGiftcard, ShoppingCart, ReceiptLong, BeachAccess, Settings,
  Refresh, History, DynamicFeed, Cancel, ArrowForward, CheckBox,
  ThumbDown, Timeline, Info, Person, CalendarToday, MoreVert,
} from "@mui/icons-material";
import Icon from "@mui/material/Icon";
import { workflowsAPI, usersAPI } from "services/api";

// ── Config ────────────────────────────────────────────────────────────────────
const ICON_MAP = {
  beach_access:  <BeachAccess />,
  assignment:    <Assignment />,
  flight:        <Flight />,
  card_giftcard: <CardGiftcard />,
  shopping_cart: <ShoppingCart />,
  receipt_long:  <ReceiptLong />,
  settings:      <Settings />,
};
const ICON_COLOR = {
  beach_access:  "#1976d2", assignment: "#7b1fa2", flight: "#0288d1",
  card_giftcard: "#388e3c", shopping_cart: "#e64a19", receipt_long: "#0097a7",
  settings:      "#546e7a",
};
const CATEGORY_COLOR = {
  HR: "#1976d2", Finance: "#388e3c", Admin: "#7b1fa2", General: "#f57c00",
};
const STATUS_META = {
  "In Progress": { color: "#1976d2", bg: "#e3f2fd" },
  "Completed":   { color: "#388e3c", bg: "#e8f5e9" },
  "Rejected":    { color: "#d32f2f", bg: "#ffebee" },
  "Cancelled":   { color: "#9e9e9e", bg: "#f5f5f5" },
  "Waiting":     { color: "#f57c00", bg: "#fff3e0" },
};

const CATEGORIES = ["HR", "Finance", "Admin", "General"];
const ICONS_LIST = ["beach_access","assignment","flight","card_giftcard","shopping_cart","receipt_long","settings"];

function WorkflowIcon({ icon, size = 22, color }) {
  const el = ICON_MAP[icon] || ICON_MAP.settings;
  const c  = color || ICON_COLOR[icon] || "#546e7a";
  return <Box sx={{ "& svg": { fontSize: size, color: c } }}>{el}</Box>;
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name = "") {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00"];
  let s = 0; for (let c of name) s += c.charCodeAt(0);
  return C[s % C.length];
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Create/Edit Workflow Dialog ───────────────────────────────────────────────
function WorkflowFormDialog({ open, onClose, existing, onSaved }) {
  const blank = { name: "", category: "General", description: "", icon: "settings", show_in_feed: true, steps: ["Submitted", "Review", "Approved/Rejected"] };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [stepInput, setStepInput] = useState("");

  useEffect(() => {
    if (existing) {
      const steps = typeof existing.steps === "string" ? JSON.parse(existing.steps || "[]") : (existing.steps || []);
      setForm({ ...blank, ...existing, steps });
    } else {
      setForm(blank);
    }
  }, [existing, open]);

  const addStep = () => {
    if (!stepInput.trim()) return;
    setForm(f => ({ ...f, steps: [...f.steps, stepInput.trim()] }));
    setStepInput("");
  };
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (existing) {
        await workflowsAPI.update(existing.id, form);
      } else {
        await workflowsAPI.create(form);
      }
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography fontWeight={700}>{existing ? "Edit Workflow" : "Create Workflow"}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth size="small" label="Workflow Name *" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={form.category} label="Category" onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Description" multiline rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: "block" }}>ICON</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {ICONS_LIST.map(key => (
                <Box key={key} onClick={() => setForm(f => ({ ...f, icon: key }))}
                  sx={{ p: 1, borderRadius: 1.5, border: `2px solid ${form.icon === key ? ICON_COLOR[key] : "#eee"}`,
                    bgcolor: form.icon === key ? ICON_COLOR[key] + "15" : "#fafafa", cursor: "pointer",
                    "&:hover": { borderColor: ICON_COLOR[key] }, transition: "all 0.15s" }}>
                  <WorkflowIcon icon={key} size={20} />
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: "block" }}>APPROVAL STEPS</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
              {form.steps.map((step, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, p: 0.75, bgcolor: "#f8f9fa", borderRadius: 1, border: "1px solid #eee" }}>
                  <Typography variant="caption" sx={{ width: 20, color: "text.secondary", fontWeight: 700 }}>{i + 1}.</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>{step}</Typography>
                  {i > 0 && <IconButton size="small" onClick={() => removeStep(i)} sx={{ p: 0.3 }}><Close sx={{ fontSize: 13 }} /></IconButton>}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField size="small" placeholder="Add step…" value={stepInput}
                onChange={e => setStepInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addStep()}
                sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" onClick={addStep}>Add</Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={!!form.show_in_feed} size="small" color="primary"
              onChange={e => setForm(f => ({ ...f, show_in_feed: e.target.checked }))} />}
              label={<Typography variant="body2">Show in Activity Feed</Typography>} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? <CircularProgress size={16} color="inherit" /> : existing ? "Save Changes" : "Create Workflow"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Start Workflow Dialog ─────────────────────────────────────────────────────
function StartWorkflowDialog({ open, onClose, workflow, onStarted }) {
  const [form, setForm] = useState({ reason: "", from_date: "", to_date: "", amount: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setForm({ reason: "", from_date: "", to_date: "", amount: "", notes: "" });
    setSuccess(false);
  }, [workflow, open]);

  if (!workflow) return null;
  const steps = typeof workflow.steps === "string" ? JSON.parse(workflow.steps || "[]") : (workflow.steps || []);
  const isHR = workflow.category === "HR";
  const isFinance = workflow.category === "Finance";

  const handleStart = async () => {
    if (!form.reason.trim()) return;
    setSubmitting(true);
    try {
      await workflowsAPI.startRun(workflow.id, { form_data: form });
      setSuccess(true);
      setTimeout(() => { onStarted(); onClose(); }, 1800);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: ICON_COLOR[workflow.icon] || "#1976d2", px: 2.5, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ "& svg": { fontSize: 22, color: "white" } }}>{ICON_MAP[workflow.icon] || <Settings />}</Box>
          <Typography fontWeight={700} color="white">{workflow.name}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><Close fontSize="small" /></IconButton>
      </Box>

      <DialogContent sx={{ pt: 2.5 }}>
        {success ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircle sx={{ fontSize: 56, color: "#43a047", mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} color="#43a047">Workflow Started!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Your request has been submitted for approval.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* Steps preview */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0, mb: 2, flexWrap: "wrap" }}>
                {steps.map((step, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
                    <Chip label={step} size="small"
                      sx={{ fontSize: 10, height: 20, bgcolor: i === 0 ? "#e3f2fd" : "#f5f5f5", color: i === 0 ? "#1976d2" : "text.secondary", fontWeight: i === 0 ? 700 : 400 }} />
                    {i < steps.length - 1 && <ArrowForward sx={{ fontSize: 12, color: "#bdbdbd", mx: 0.3 }} />}
                  </Box>
                ))}
              </Box>
            </Grid>
            {isHR && (
              <>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="From Date" type="date" InputLabelProps={{ shrink: true }}
                    value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="To Date" type="date" InputLabelProps={{ shrink: true }}
                    value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} />
                </Grid>
              </>
            )}
            {isFinance && (
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Amount ($)" type="number"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Reason / Description *" multiline rows={3}
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={`Describe your ${workflow.name.toLowerCase()} request…`} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Additional Notes (optional)"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      {!success && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
            onClick={handleStart} disabled={submitting || !form.reason.trim()}>
            {submitting ? "Starting…" : "Start Workflow"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

// ── Run Detail Dialog ─────────────────────────────────────────────────────────
function RunDetailDialog({ open, onClose, run, onAdvance, onCancel, isAdmin }) {
  const [action, setAction]   = useState("approved");
  const [comment, setComment] = useState("");
  const [acting, setActing]   = useState(false);

  if (!run) return null;

  const steps   = Array.isArray(run.steps)   ? run.steps   : JSON.parse(run.steps   || "[]");
  const history = Array.isArray(run.history) ? run.history : JSON.parse(run.history || "[]");
  const fd      = typeof run.form_data === "object" ? run.form_data : JSON.parse(run.form_data || "{}");
  const sm      = STATUS_META[run.status] || STATUS_META["In Progress"];
  const isActive = run.status === "In Progress";

  const handleAdvance = async () => {
    setActing(true);
    try {
      await onAdvance(run.id, { action, comment });
      setComment("");
      onClose();
    } catch (e) { console.error(e); }
    finally { setActing(false); }
  };
  const handleCancel = async () => {
    setActing(true);
    try { await onCancel(run.id); onClose(); }
    catch (e) { console.error(e); }
    finally { setActing(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography fontWeight={700}>{run.workflow_name}</Typography>
          <Chip label={run.status} size="small" sx={{ fontSize: 10, height: 18, mt: 0.4, bgcolor: sm.bg, color: sm.color, fontWeight: 700 }} />
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {/* Meta */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Person sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">Initiated by <strong>{run.initiated_by}</strong></Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">{timeAgo(run.created_at)}</Typography>
          </Box>
        </Box>

        {/* Form data */}
        {Object.keys(fd).filter(k => fd[k]).length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1.5, border: "1px solid #eee" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>SUBMITTED DETAILS</Typography>
            {Object.entries(fd).filter(([, v]) => v).map(([k, v]) => (
              <Box key={k} sx={{ display: "flex", gap: 1, mb: 0.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}:</Typography>
                <Typography variant="caption" fontWeight={600}>{String(v)}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Stepper */}
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>PROGRESS</Typography>
        <Stepper orientation="vertical" activeStep={run.current_step_idx || 0} sx={{ mb: 2 }}>
          {steps.map((step, i) => {
            const hist = history.find(h => h.step === step);
            const isDone = i < (run.current_step_idx || 0);
            return (
              <Step key={i} completed={isDone}>
                <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 12, fontWeight: isDone ? 600 : 400 } }}>
                  {step}
                  {hist && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>— {hist.action} by {hist.by}</Typography>}
                </StepLabel>
                {hist?.comment && (
                  <StepContent><Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>"{hist.comment}"</Typography></StepContent>
                )}
              </Step>
            );
          })}
        </Stepper>

        {/* Action panel for admins on active runs */}
        {isAdmin && isActive && (
          <Box sx={{ p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1.5, border: "1px solid #eee" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: "block" }}>TAKE ACTION</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              {["approved", "rejected"].map(a => (
                <Chip key={a} label={a === "approved" ? "✓ Approve" : "✗ Reject"}
                  clickable onClick={() => setAction(a)} size="small"
                  sx={{ textTransform: "capitalize", fontWeight: 700,
                    bgcolor: action === a ? (a === "approved" ? "#e8f5e9" : "#ffebee") : "#f0f0f0",
                    color: action === a ? (a === "approved" ? "#388e3c" : "#d32f2f") : "text.secondary",
                    border: `1px solid ${action === a ? (a === "approved" ? "#a5d6a7" : "#ef9a9a") : "#ddd"}`,
                  }} />
              ))}
            </Box>
            <TextField fullWidth size="small" label="Comment (optional)" value={comment}
              onChange={e => setComment(e.target.value)} sx={{ mb: 1.5 }} />
            <Button fullWidth variant="contained" size="small"
              color={action === "approved" ? "success" : "error"}
              startIcon={acting ? <CircularProgress size={14} color="inherit" /> : action === "approved" ? <CheckCircle /> : <ThumbDown />}
              onClick={handleAdvance} disabled={acting}>
              {action === "approved" ? "Approve & Advance" : "Reject Workflow"}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
        <Box>
          {isAdmin && isActive && (
            <Button size="small" color="error" variant="outlined" startIcon={<Cancel />} onClick={handleCancel} disabled={acting}>
              Cancel Run
            </Button>
          )}
        </Box>
        <Button size="small" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status Chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const sm = STATUS_META[status] || { color: "#9e9e9e", bg: "#f5f5f5" };
  return <Chip label={status} size="small" sx={{ fontSize: "0.7rem", fontWeight: 700, height: 22, bgcolor: sm.bg, color: sm.color }} />;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Workflows() {
  const { user: currentUser } = useAuth();
  const isAdmin = ["admin","super_admin","team_leader"].includes(currentUser?.role);

  const [tab, setTab]             = useState(0);
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns]           = useState([]);
  const [myRuns, setMyRuns]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("");

  const [startModal, setStartModal]   = useState(null);
  const [formDialog, setFormDialog]   = useState(null);  // null | "new" | workflow obj
  const [runDetail, setRunDetail]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const toast = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const [myRunsPage, setMyRunsPage] = useState(0);
  const [myRunsRpp, setMyRunsRpp]   = useState(25);
  const [activeRunsPage, setActiveRunsPage] = useState(0);
  const [activeRunsRpp, setActiveRunsRpp]   = useState(25);
  const [runsPage, setRunsPage] = useState(0);
  const [runsRpp, setRunsRpp]   = useState(25);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await workflowsAPI.getAll();
      setWorkflows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { toast("Failed to load workflows", "error"); }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        workflowsAPI.getRuns(),
        workflowsAPI.getRuns({ mine: "1" }),
      ]);
      setRuns(Array.isArray(allRes?.data) ? allRes.data : []);
      setMyRuns(Array.isArray(myRes?.data) ? myRes.data : []);
    } catch (e) { console.error(e); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchWorkflows(), fetchRuns()]);
    setLoading(false);
  }, [fetchWorkflows, fetchRuns]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggleFeed = async (wf) => {
    try {
      await workflowsAPI.update(wf.id, { show_in_feed: !wf.show_in_feed });
      fetchWorkflows();
    } catch (e) { toast("Update failed", "error"); }
  };

  const handleToggleActive = async (wf) => {
    try {
      await workflowsAPI.update(wf.id, { active: !wf.active });
      fetchWorkflows();
    } catch (e) { toast("Update failed", "error"); }
  };

  const handleDelete = async (wf) => {
    try {
      await workflowsAPI.delete(wf.id);
      setDeleteConfirm(null);
      fetchWorkflows();
      toast("Workflow deleted");
    } catch (e) { toast("Delete failed", "error"); }
  };

  const handleAdvance = async (runId, data) => {
    try {
      await workflowsAPI.advance(runId, data);
      fetchRuns();
      toast(data.action === "approved" ? "Step approved ✓" : "Workflow rejected");
    } catch (e) { toast("Action failed", "error"); }
  };

  const handleCancel = async (runId) => {
    try {
      await workflowsAPI.cancel(runId);
      fetchRuns();
      toast("Workflow cancelled");
    } catch (e) { toast("Cancel failed", "error"); }
  };

  const openRunDetail = async (run) => {
    try {
      const res = await workflowsAPI.getRun(run.id);
      setRunDetail(res?.data || run);
    } catch { setRunDetail(run); }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredWf = workflows.filter(w =>
    (!search || w.name.toLowerCase().includes(search.toLowerCase()) || w.description?.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || w.category === catFilter)
  );
  const activeRuns = runs.filter(r => r.status === "In Progress");

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Workflows", val: workflows.length,            color: "#1976d2" },
    { label: "Active Runs",     val: activeRuns.length,           color: "#f57c00" },
    { label: "My Requests",     val: myRuns.length,               color: "#7b1fa2" },
    { label: "Completed",       val: runs.filter(r => r.status === "Completed").length, color: "#388e3c" },
  ];

  const TABS = [
    { label: "Workflow Templates", icon: "settings" },
    { label: "My Requests",        icon: "history" },
    { label: "Running Workflows",  icon: "play_arrow" },
    ...(isAdmin ? [{ label: "All Activity", icon: "dynamic_feed" }] : []),
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>

        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Workflows</Typography>
            <Typography variant="body2" color="text.secondary">
              {loading ? "Loading…" : `${workflows.length} templates · ${activeRuns.length} running`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<Refresh sx={{ fontSize: 14 }} />} onClick={load}>Refresh</Button>
            {isAdmin && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setFormDialog("new")}>
                Create Workflow
              </Button>
            )}
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {stats.map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: "1px solid #eee", textAlign: "center" }}>
                <Typography variant="h5" fontWeight={800} color={s.color}>{s.val}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: "1px solid #e0e0e0", mb: 3 }}>
          <Box sx={{ display: "flex", gap: 0 }}>
            {TABS.map((t, i) => (
              <Button key={i} size="small" startIcon={<Icon sx={{ fontSize: "16px !important" }}>{t.icon}</Icon>}
                onClick={() => setTab(i)}
                sx={{ color: tab === i ? "primary.main" : "text.secondary",
                  borderBottom: tab === i ? "2px solid" : "2px solid transparent",
                  borderColor: "primary.main", borderRadius: 0, pb: 1, mr: 0.5,
                  fontWeight: tab === i ? 700 : 400, textTransform: "none", fontSize: 13 }}>
                {t.label}
                {i === 2 && activeRuns.length > 0 && (
                  <Chip label={activeRuns.length} size="small" color="warning"
                    sx={{ ml: 0.75, height: 16, fontSize: 9, "& .MuiChip-label": { px: 0.5 } }} />
                )}
              </Button>
            ))}
          </Box>
        </Box>

        {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}

        {/* ── Tab 0: Workflow Templates ── */}
        {!loading && tab === 0 && (
          <>
            {/* Filters */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField size="small" placeholder="Search workflows…" value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <Search sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} /> }}
                sx={{ width: 240 }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Category</InputLabel>
                <Select value={catFilter} label="Category" onChange={e => setCatFilter(e.target.value)}>
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                {filteredWf.length} workflow{filteredWf.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            {filteredWf.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Settings sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
                <Typography color="text.secondary">No workflows found</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredWf.map(wf => {
                  const iconColor = ICON_COLOR[wf.icon] || "#546e7a";
                  const catColor  = CATEGORY_COLOR[wf.category] || "#546e7a";
                  const wfRuns    = runs.filter(r => r.workflow_id === wf.id);
                  const active    = wfRuns.filter(r => r.status === "In Progress").length;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={wf.id}>
                      <Card sx={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                        border: wf.active ? "1px solid #eee" : "1px solid #f5f5f5",
                        opacity: wf.active ? 1 : 0.65,
                        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.12)", transform: "translateY(-1px)" },
                        transition: "all 0.2s" }}>
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                            <Box sx={{ p: 1, bgcolor: iconColor + "18", borderRadius: 1.5, flexShrink: 0 }}>
                              <WorkflowIcon icon={wf.icon} size={22} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>{wf.name}</Typography>
                              <Box sx={{ display: "flex", gap: 0.5, mt: 0.3, flexWrap: "wrap" }}>
                                <Chip label={wf.category} size="small"
                                  sx={{ fontSize: 9, height: 16, bgcolor: catColor + "18", color: catColor, fontWeight: 700 }} />
                                {active > 0 && <Chip label={`${active} running`} size="small" color="warning" sx={{ fontSize: 9, height: 16 }} />}
                                {!wf.active && <Chip label="Inactive" size="small" sx={{ fontSize: 9, height: 16, bgcolor: "#f5f5f5", color: "#9e9e9e" }} />}
                              </Box>
                            </Box>
                            {isAdmin && (
                              <Box sx={{ display: "flex", gap: 0 }}>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => setFormDialog(wf)}>
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => setDeleteConfirm(wf)}>
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem", mb: 1.5, minHeight: 36 }}>
                            {wf.description}
                          </Typography>

                          <Box sx={{ display: "flex", gap: 2, mb: 1.5 }}>
                            <Box sx={{ textAlign: "center" }}>
                              <Typography variant="h6" fontWeight={800} color={iconColor}>{wf.runs_total || 0}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>Total Runs</Typography>
                            </Box>
                            {isAdmin && (
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="h6" fontWeight={800} color="#f57c00">{active}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>Active</Typography>
                              </Box>
                            )}
                          </Box>

                          {isAdmin && (
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                              <FormControlLabel control={<Switch size="small" checked={!!wf.show_in_feed} onChange={() => handleToggleFeed(wf)} />}
                                label={<Typography variant="caption">In Feed</Typography>} sx={{ m: 0 }} />
                              <FormControlLabel control={<Switch size="small" checked={!!wf.active} onChange={() => handleToggleActive(wf)} color="success" />}
                                label={<Typography variant="caption">Active</Typography>} sx={{ m: 0 }} />
                            </Box>
                          )}

                          <Button fullWidth variant={wf.active ? "contained" : "outlined"} size="small"
                            startIcon={<PlayArrow sx={{ fontSize: 14 }} />}
                            disabled={!wf.active}
                            onClick={() => setStartModal(wf)}>
                            Start Workflow
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </>
        )}

        {/* ── Tab 1: My Requests ── */}
        {!loading && tab === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Workflows you have initiated ({myRuns.length})
            </Typography>
            {myRuns.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6, bgcolor: "#fafafa", borderRadius: 2, border: "1px dashed #e0e0e0" }}>
                <History sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
                <Typography color="text.secondary">You haven't started any workflows yet.</Typography>
                <Button size="small" variant="contained" startIcon={<PlayArrow />} sx={{ mt: 1.5 }} onClick={() => setTab(0)}>
                  Browse Workflows
                </Button>
              </Box>
            ) : (
              <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}>
                <ScrollableTable
                  totalCount={myRuns.length}
                  page={myRunsPage}
                  rowsPerPage={myRunsRpp}
                  onPageChange={(e, p) => setMyRunsPage(p)}
                  onRowsPerPageChange={(e) => { setMyRunsRpp(parseInt(e.target.value, 10)); setMyRunsPage(0); }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                        {["Workflow", "Started", "Current Step", "Status", "Actions"].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myRuns.slice(myRunsPage * myRunsRpp, (myRunsPage + 1) * myRunsRpp).map(r => (
                        <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => openRunDetail(r)}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <WorkflowIcon icon={r.workflow_icon} size={16} />
                              <Typography variant="body2" fontWeight={600}>{r.workflow_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{timeAgo(r.created_at)}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{r.current_step}</Typography></TableCell>
                          <TableCell><StatusChip status={r.status} /></TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); openRunDetail(r); }}>
                              <Info sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              </Card>
            )}
          </Box>
        )}

        {/* ── Tab 2: Running Workflows ── */}
        {!loading && tab === 2 && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                All active workflow runs ({activeRuns.length})
              </Typography>
            </Box>
            {activeRuns.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6, bgcolor: "#fafafa", borderRadius: 2, border: "1px dashed #e0e0e0" }}>
                <PlayArrow sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
                <Typography color="text.secondary">No workflows currently running.</Typography>
              </Box>
            ) : (
              <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}>
                <ScrollableTable
                  totalCount={activeRuns.length}
                  page={activeRunsPage}
                  rowsPerPage={activeRunsRpp}
                  onPageChange={(e, p) => setActiveRunsPage(p)}
                  onRowsPerPageChange={(e) => { setActiveRunsRpp(parseInt(e.target.value, 10)); setActiveRunsPage(0); }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                        {["#", "Workflow", "Initiated By", "Started", "Current Step", "Status", "Actions"].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeRuns.slice(activeRunsPage * activeRunsRpp, (activeRunsPage + 1) * activeRunsRpp).map((r, idx) => (
                        <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => openRunDetail(r)}>
                          <TableCell><Typography variant="caption" color="text.secondary">{idx + 1}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <WorkflowIcon icon={r.workflow_icon} size={16} />
                              <Typography variant="body2" fontWeight={600}>{r.workflow_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <Avatar sx={{ width: 22, height: 22, bgcolor: avatarColor(r.initiated_by), fontSize: 9 }}>
                                {getInitials(r.initiated_by)}
                              </Avatar>
                              <Typography variant="body2">{r.initiated_by}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{timeAgo(r.created_at)}</Typography></TableCell>
                          <TableCell>
                            <Chip label={r.current_step} size="small"
                              sx={{ fontSize: 10, height: 20, bgcolor: "#e3f2fd", color: "#1976d2" }} />
                          </TableCell>
                          <TableCell><StatusChip status={r.status} /></TableCell>
                          <TableCell>
                            <Tooltip title="View & Action">
                              <IconButton size="small" onClick={e => { e.stopPropagation(); openRunDetail(r); }}>
                                <ArrowForward sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              </Card>
            )}
          </Box>
        )}

        {/* ── Tab 3: All Activity (admin only) ── */}
        {!loading && tab === 3 && isAdmin && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All workflow runs across the organization ({runs.length})
            </Typography>
            <Card elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}>
              <ScrollableTable
                totalCount={runs.length}
                page={runsPage}
                rowsPerPage={runsRpp}
                onPageChange={(e, p) => setRunsPage(p)}
                onRowsPerPageChange={(e) => { setRunsRpp(parseInt(e.target.value, 10)); setRunsPage(0); }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      {["Workflow", "Initiated By", "Started", "Current Step", "Status", "Actions"].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No workflow runs yet.
                        </TableCell>
                      </TableRow>
                    ) : runs.slice(runsPage * runsRpp, (runsPage + 1) * runsRpp).map(r => (
                      <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => openRunDetail(r)}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <WorkflowIcon icon={r.workflow_icon} size={16} />
                            <Typography variant="body2" fontWeight={600}>{r.workflow_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: avatarColor(r.initiated_by), fontSize: 9 }}>
                              {getInitials(r.initiated_by)}
                            </Avatar>
                            <Typography variant="body2">{r.initiated_by}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{timeAgo(r.created_at)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{r.current_step}</Typography></TableCell>
                        <TableCell><StatusChip status={r.status} /></TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={e => { e.stopPropagation(); openRunDetail(r); }}>
                            <ArrowForward sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollableTable>
            </Card>
          </Box>
        )}

      </Box>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <WorkflowFormDialog
        open={!!formDialog}
        onClose={() => setFormDialog(null)}
        existing={formDialog !== "new" ? formDialog : null}
        onSaved={() => { fetchWorkflows(); toast(formDialog !== "new" ? "Workflow updated" : "Workflow created ✓"); }}
      />

      <StartWorkflowDialog
        open={!!startModal}
        onClose={() => setStartModal(null)}
        workflow={startModal}
        onStarted={() => { load(); toast("Workflow started! 🚀"); }}
      />

      <RunDetailDialog
        open={!!runDetail}
        onClose={() => setRunDetail(null)}
        run={runDetail}
        onAdvance={handleAdvance}
        onCancel={handleCancel}
        isAdmin={isAdmin}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone and all run history will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
