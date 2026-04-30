/* eslint-disable */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import EmployeeAvatar from "components/EmployeeAvatar";
import ScrollableTable from "components/ScrollableTable";
import {
  Box, Card, CardContent, Typography, Button, Chip, Avatar, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  TextField, Divider, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Grid, Paper, LinearProgress, CircularProgress, Snackbar, Alert,
  Switch, FormControlLabel,
} from "@mui/material";
import {
  Add, Close, Download, Send, Refresh, Schedule, CheckCircle,
  WorkOutline, BarChart, Today, Person, Email, Delete, Edit,
  PictureAsPdf, TableChart, AccessTime, TrendingUp, TrendingDown,
  RadioButtonUnchecked, Star, Pending, EventNote, ChevronLeft, ChevronRight,
} from "@mui/icons-material";
import { reportsAPI, usersAPI, timemanAPI, tasksAPI } from "services/api";
import { useAuth } from "context/AuthContext";

const getColor = (name) => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0;
  for (let c of name || "U") s += c.charCodeAt(0);
  return C[s % C.length];
};

const UserAvatar = ({ name, size = 32 }) => (
  <Avatar sx={{ width: size, height: size, bgcolor: getColor(name), fontSize: size * 0.38 }}>
    {(name || "U").charAt(0).toUpperCase()}
  </Avatar>
);

const StatCard = ({ title, value, sub, icon, color = "#1976d2", trend }) => (
  <Card sx={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 0.5, color }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          )}
          {trend !== undefined && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              {trend >= 0
                ? <TrendingUp sx={{ fontSize: 14, color: "success.main" }} />
                : <TrendingDown sx={{ fontSize: 14, color: "error.main" }} />}
              <Typography variant="caption" color={trend >= 0 ? "success.main" : "error.main"}>
                {Math.abs(trend)}% vs last period
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color + "22", color, width: 44, height: 44 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ── Scheduled Report Dialog ─────────────────────────────────────────────────
function ScheduledReportDialog({ open, onClose, existing, onSaved, users }) {
  const blank = { name: "", frequency: "weekly", recipients: "", report_type: "work_summary", enabled: true };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    setForm(existing ? { ...existing, recipients: Array.isArray(existing.recipients) ? existing.recipients.join(", ") : existing.recipients } : blank);
  }, [existing, open]);

  const handleSave = async () => {
    const payload = {
      ...form,
      recipients: form.recipients.split(",").map(e => e.trim()).filter(Boolean),
    };
    try {
      if (existing) {
        await reportsAPI.updateScheduled(existing.id, payload);
      } else {
        await reportsAPI.createScheduled(payload);
      }
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {existing ? "Edit Scheduled Report" : "New Scheduled Report"}
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Report Name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select value={form.report_type} label="Report Type"
                onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}>
                <MenuItem value="work_summary">Work Summary</MenuItem>
                <MenuItem value="crm_overview">CRM Overview</MenuItem>
                <MenuItem value="task_performance">Task Performance</MenuItem>
                <MenuItem value="time_tracking">Time Tracking</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Frequency</InputLabel>
              <Select value={form.frequency} label="Frequency"
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="biweekly">Bi-Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Recipients (comma-separated emails)"
              value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))}
              placeholder="client@company.com, manager@firm.com"
              helperText="Enter email addresses separated by commas" />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />}
              label="Active (send automatically)" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!form.name}>
          {existing ? "Save Changes" : "Schedule Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Excel Export ─────────────────────────────────────────────────────────────
function exportToCSV(data, filename = "report.csv") {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const val = row[h];
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return str.includes(",") || str.includes('"') ? `"${str}"` : str;
  }).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportToExcelHTML(rows, filename = "report.xls") {
  const table = `<TableHead style={{ display: "table-header-group" }}><thead><tr>${Object.keys(rows[0] || {}).map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${Object.values(r).map(v => `<td>${v ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${table}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function WorkReports() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [crmOverview, setCrmOverview] = useState(null);
  const [dailyReports, setDailyReports] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyPeriod, setDailyPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filterReportUser, setFilterReportUser] = useState("");
  const [scheduledReports, setScheduledReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [editCompletionId, setEditCompletionId] = useState(null);
  const [editCompletionDate, setEditCompletionDate] = useState("");
  const [editCompletionH, setEditCompletionH] = useState("");
  const [editCompletionM, setEditCompletionM] = useState("");
  const [perfPage, setPerfPage] = useState(0);
  const [perfRowsPerPage, setPerfRowsPerPage] = useState(25);
  const [taskPage, setTaskPage] = useState(0);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(25);
  const [schedPage, setSchedPage] = useState(0);
  const [schedRowsPerPage, setSchedRowsPerPage] = useState(25);

  const startEditCompletion = (t) => {
    const dt = t.completed_at ? new Date(t.completed_at) : new Date();
    const pad = n => String(n).padStart(2, "0");
    setEditCompletionDate(`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
    const totalMins = t.task_duration_minutes || 0;
    setEditCompletionH(String(Math.floor(totalMins / 60)));
    setEditCompletionM(String(totalMins % 60));
    setEditCompletionId(t.id);
  };

  const saveCompletionFromTable = async (t) => {
    const totalMins = (parseInt(editCompletionH, 10) || 0) * 60 + (parseInt(editCompletionM, 10) || 0);
    const completedAt = editCompletionDate ? new Date(editCompletionDate).toISOString() : t.completed_at;
    try {
      await tasksAPI.update(t.id, { ...t, completed_at: completedAt, task_duration_minutes: totalMins });
      setSnack({ open: true, message: "Completion time updated!", severity: "success" });
      fetchSummary();
    } catch(e) { setSnack({ open: true, message: e.message, severity: "error" }); }
    setEditCompletionId(null);
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all tasks directly — compute report client-side so it always has
      // real data regardless of which server version is running
      const params = {};
      if (filterUser) params.assigned_to = filterUser;
      const rawTasks = await tasksAPI.getAll(params);
      let tasks = Array.isArray(rawTasks) ? rawTasks : [];

      // Date filter
      if (filterFrom || filterTo) {
        tasks = tasks.filter(t => {
          const d = (t.created_at || t.due_date || t.deadline || "").substring(0, 10);
          if (!d) return true;
          if (filterFrom && d < filterFrom) return false;
          if (filterTo   && d > filterTo)   return false;
          return true;
        });
      }

      const now = new Date();

      // Helper: effective hours for a task (task_duration_minutes preferred over time_logged)
      const getHours = (t) => {
        const mins = Number(t.task_duration_minutes || 0) || Number(t.time_logged || 0);
        return Math.round((mins / 60) * 10) / 10;
      };

      // Per-user summary
      const byUser = {};
      tasks.forEach(t => {
        const a = t.assigned_to || "Unassigned";
        if (!byUser[a]) byUser[a] = { name: a, role: "", department: "", tasks_completed: 0, tasks_in_progress: 0, tasks_pending: 0, tasks_total: 0, hours_logged: 0, completion_rate: 0 };
        byUser[a].tasks_total++;
        if (t.status === "completed")   byUser[a].tasks_completed++;
        else if (t.status === "in_progress") byUser[a].tasks_in_progress++;
        else byUser[a].tasks_pending++;
        byUser[a].hours_logged = Math.round((byUser[a].hours_logged + getHours(t)) * 10) / 10;
      });
      Object.values(byUser).forEach(u => {
        u.completion_rate = u.tasks_total > 0 ? Math.round((u.tasks_completed / u.tasks_total) * 100) : 0;
      });

      // Totals
      const totalHours = Math.round(tasks.reduce((s, t) => s + getHours(t), 0) * 10) / 10;
      const totals = {
        tasks_total: tasks.length,
        tasks_completed: tasks.filter(t => t.status === "completed").length,
        tasks_in_progress: tasks.filter(t => t.status === "in_progress").length,
        hours_logged: totalHours,
        completion_rate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) : 0,
      };

      // Task breakdown — include all real fields
      const taskBreakdown = tasks.map(t => {
        const dueDate = t.due_date || t.deadline || null;
        const mins = Number(t.task_duration_minutes || 0) || Number(t.time_logged || 0);
        return {
          id:                   t.id,
          title:                t.title,
          assigned_to:          t.assigned_to,
          priority:             t.priority,
          status:               t.status,
          due_date:             dueDate,
          completed_at:         t.completed_at || null,
          started_at:           t.started_at || null,
          client_name:          t.client_name || t.client || null,
          hours_logged:         getHours(t),
          task_duration_minutes: mins,
          overdue:              dueDate && t.status !== "completed" && new Date(dueDate) < now,
          // Accounting fields
          project_name:         t.project_name || t.group_name || null,
          crm_item:             t.crm_item || null,
          work_performed:       t.work_performed || null,
          is_tax_return:        Boolean(t.is_tax_return),
          tax_return_total:     t.tax_return_total || null,
          is_payroll:           Boolean(t.is_payroll),
          payroll_total:        t.payroll_total || null,
          senior_accountant:    t.senior_accountant || null,
          tags:                 Array.isArray(t.tags) ? t.tags : [],
        };
      });

      setSummary({ period: { from: filterFrom, to: filterTo }, totals, users: Object.values(byUser), task_breakdown: taskBreakdown });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterFrom, filterTo, filterUser]);

  const fetchCRM = useCallback(async () => {
    try {
      const data = await reportsAPI.getCRMOverview();
      setCrmOverview(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchScheduled = useCallback(async () => {
    try {
      const data = await reportsAPI.getScheduled();
      setScheduledReports(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchDailyReports = useCallback(async () => {
    setDailyLoading(true);
    try {
      const start = new Date(dailyPeriod.year, dailyPeriod.month, 1).toISOString().split("T")[0];
      const end = new Date(dailyPeriod.year, dailyPeriod.month + 1, 0).toISOString().split("T")[0];
      const params = { start, end };
      const data = await timemanAPI.getReports(params);
      let reports = Array.isArray(data) ? data : [];
      if (filterReportUser) reports = reports.filter(r => r.user_name === filterReportUser);
      // Parse tasks field if stored as JSON string
      reports = reports.map(r => ({
        ...r,
        tasks: (() => { try { return typeof r.tasks === "string" ? JSON.parse(r.tasks) : (Array.isArray(r.tasks) ? r.tasks : []); } catch { return []; } })(),
      }));
      setDailyReports(reports.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) { console.error(e); setDailyReports([]); }
    finally { setDailyLoading(false); }
  }, [dailyPeriod, filterReportUser]);

  useEffect(() => {
    usersAPI.getAll().then(setUsers).catch(() => {});
    fetchSummary();
    fetchCRM();
    fetchScheduled();
    fetchDailyReports();
  }, []);

  useEffect(() => {
    if (tab === 0) fetchSummary();
    if (tab === 1) fetchCRM();
    if (tab === 2) fetchDailyReports();
    if (tab === 3) fetchScheduled();
  }, [tab]);

  useEffect(() => {
    if (tab === 2) fetchDailyReports();
  }, [dailyPeriod, filterReportUser]);

  useEffect(() => {
    setPerfPage(0);
  }, [filterFrom, filterTo, filterUser]);

  useEffect(() => {
    setTaskPage(0);
  }, [filterFrom, filterTo, filterUser]);

  useEffect(() => {
    setSchedPage(0);
  }, []);

  const handleDeleteScheduled = async (id) => {
    try {
      await reportsAPI.deleteScheduled(id);
      fetchScheduled();
      setSnack({ open: true, message: "Scheduled report deleted", severity: "success" });
    } catch (e) {
      setSnack({ open: true, message: "Failed to delete", severity: "error" });
    }
  };

  const handleExportWork = () => {
    if (!summary?.task_breakdown?.length) return;
    const rows = summary.task_breakdown.map(t => ({
      "Task":              t.title,
      "Assigned To":       t.assigned_to || "—",
      "Status":            t.status?.replace(/_/g, " ") || "—",
      "Priority":          t.priority || "—",
      "Client":            t.client_name || "—",
      "Project":           t.project_name || "—",
      "CRM Item":          t.crm_item || "—",
      "Work Performed":    t.work_performed || "—",
      "Tax Return?":       t.is_tax_return ? "Yes" : "No",
      "Tax Return Total":  t.tax_return_total || "—",
      "Payroll Working?":  t.is_payroll ? "Yes" : "No",
      "Payroll Total":     t.payroll_total || "—",
      "Senior Accountant": t.senior_accountant || "—",
      "Tags":              (t.tags || []).join(", ") || "—",
      "Hours":             t.hours_logged > 0 ? `${t.hours_logged.toFixed(1)}h` : "—",
      "Minutes":           t.task_duration_minutes > 0 ? `${t.task_duration_minutes}m` : "—",
      "Due Date":          t.due_date ? new Date(t.due_date.length > 10 ? t.due_date : t.due_date + "T00:00:00").toLocaleDateString("en-US") : "—",
      "Completed At":      t.completed_at ? new Date(t.completed_at).toLocaleString("en-US") : "—",
    }));
    exportToExcelHTML(rows, `work-report-${filterFrom}-to-${filterTo}.xls`);
    setSnack({ open: true, message: "Report exported to Excel!", severity: "success" });
  };

  const handleExportCRM = () => {
    if (!crmOverview) return;
    const rows = [
      { Metric: "Total Leads", Value: crmOverview.leads?.total || 0 },
      { Metric: "New Leads", Value: crmOverview.leads?.new || 0 },
      { Metric: "Converted Leads", Value: crmOverview.leads?.converted || 0 },
      { Metric: "Total Deals", Value: crmOverview.deals?.total || 0 },
      { Metric: "Won Deals", Value: crmOverview.deals?.won || 0 },
      { Metric: "Deal Revenue", Value: `$${(crmOverview.deals?.revenue || 0).toLocaleString()}` },
      { Metric: "Total Contacts", Value: crmOverview.contacts?.total || 0 },
      { Metric: "Total Companies", Value: crmOverview.companies?.total || 0 },
      { Metric: "Total Invoices", Value: crmOverview.invoices?.total || 0 },
      { Metric: "Paid Invoices", Value: `$${(crmOverview.invoices?.paid_amount || 0).toLocaleString()}` },
    ];
    exportToExcelHTML(rows, `crm-overview-${new Date().toISOString().split("T")[0]}.xls`);
    setSnack({ open: true, message: "CRM report exported!", severity: "success" });
  };

  const statCards = summary ? [
    { title: "Total Tasks", value: summary.totals?.tasks_total || 0, icon: <WorkOutline />, color: "#1976d2" },
    { title: "Completed", value: summary.totals?.tasks_completed || 0, icon: <CheckCircle />, color: "#43a047" },
    { title: "Hours Logged", value: `${(summary.totals?.hours_logged || 0).toFixed(1)}h`, icon: <AccessTime />, color: "#f4511e" },
    { title: "Completion Rate", value: `${summary.totals?.completion_rate || 0}%`, icon: <BarChart />, color: "#8e24aa" },
  ] : [];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Work Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Performance analytics, work summaries, and scheduled reporting
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={() => { fetchSummary(); fetchCRM(); fetchScheduled(); }} size="small">
              Refresh
            </Button>
            {tab === 0 && (
              <Button variant="contained" startIcon={<Download />} onClick={handleExportWork} size="small" color="success">
                Export Excel
              </Button>
            )}
            {tab === 1 && (
              <Button variant="contained" startIcon={<Download />} onClick={handleExportCRM} size="small" color="success">
                Export CRM Report
              </Button>
            )}
            {tab === 3 && (
              <Button variant="contained" startIcon={<Add />} onClick={() => { setEditReport(null); setScheduleOpen(true); }} size="small">
                Schedule Report
              </Button>
            )}
            {tab === 2 && (
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDailyReports} size="small">
                Refresh
              </Button>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
            <Tab icon={<WorkOutline fontSize="small" />} iconPosition="start" label="Task Performance" />
            <Tab icon={<BarChart fontSize="small" />} iconPosition="start" label="CRM Overview" />
            <Tab icon={<Today fontSize="small" />} iconPosition="start" label="Daily Reports" />
            <Tab icon={<Schedule fontSize="small" />} iconPosition="start" label="Scheduled" />
          </Tabs>
        </Paper>

        {/* ── Work Summary Tab ── */}
        {tab === 0 && (
          <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth size="small" label="From Date" type="date"
                    value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth size="small" label="To Date" type="date"
                    value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Employee</InputLabel>
                    <Select value={filterUser} label="Employee" onChange={e => setFilterUser(e.target.value)}>
                      <MenuItem value="">All Employees</MenuItem>
                      {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button fullWidth variant="contained" onClick={fetchSummary} startIcon={<Refresh />}>
                    Generate Report
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Stat cards */}
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  {statCards.map((s, i) => (
                    <Grid item xs={6} sm={3} key={i}>
                      <StatCard {...s} />
                    </Grid>
                  ))}
                </Grid>

                {/* Per-user table */}
                <Paper sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle1" fontWeight="bold">Employee Performance</Typography>
                    <Button size="small" startIcon={<Download />} onClick={handleExportWork} color="success" variant="outlined">
                      Export to Excel
                    </Button>
                  </Box>
                  <ScrollableTable
                    totalCount={(summary?.users || []).length}
                    page={perfPage}
                    rowsPerPage={perfRowsPerPage}
                    onPageChange={setPerfPage}
                    onRowsPerPageChange={(rpp) => { setPerfRowsPerPage(rpp); setPerfPage(0); }}>
                    <Table size="small">
                      <TableHead style={{ display: "table-header-group" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Completed</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>In Progress</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Hours Logged</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Completion</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(summary?.users || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                              No data for this period
                            </TableCell>
                          </TableRow>
                        ) : (summary?.users || []).slice(perfPage * perfRowsPerPage, (perfPage + 1) * perfRowsPerPage).map((u, i) => (
                          <TableRow key={i} hover>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <EmployeeAvatar name={u.name} size={30} />
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{u.role}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{u.department || "—"}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={u.tasks_completed} size="small" color="success" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={u.tasks_in_progress} size="small" color="warning" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={600}>{u.tasks_total}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              {u.hours_logged > 0 ? (
                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                  {u.hours_logged.toFixed(1)}h
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 120 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <LinearProgress variant="determinate" value={u.completion_rate || 0}
                                  sx={{ flex: 1, height: 6, borderRadius: 3,
                                    bgcolor: "#e0e0e0",
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor: u.completion_rate >= 80 ? "#43a047" : u.completion_rate >= 50 ? "#fb8c00" : "#e53935"
                                    }
                                  }} />
                                <Typography variant="caption" fontWeight={600} sx={{ minWidth: 32 }}>
                                  {u.completion_rate || 0}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollableTable>

                  {/* Task breakdown per user */}
                  {(summary?.task_breakdown || []).length > 0 && (
                    <>
                      <Divider />
                      <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="subtitle1" fontWeight="bold">Recent Tasks</Typography>
                        <Typography variant="caption" color="text.secondary">{(summary.task_breakdown || []).length} task(s)</Typography>
                      </Box>
                      <ScrollableTable
                        totalCount={(summary?.task_breakdown || []).length}
                        page={taskPage}
                        rowsPerPage={taskRowsPerPage}
                        onPageChange={setTaskPage}
                        onRowsPerPageChange={(rpp) => { setTaskRowsPerPage(rpp); setTaskPage(0); }}>
                        <Table size="small" sx={{ minWidth: 1700 }}>
                          <TableHead style={{ display: "table-header-group" }}>
                            <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 220 }}>TASK</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>ASSIGNED TO</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>STATUS</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>PRIORITY</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 110 }}>CLIENT</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>PROJECT</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>CRM ITEM</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 150 }}>WORK PERFORMED</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>TAX RETURN</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>PAYROLL</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>SR. ACCOUNTANT</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>TAGS</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 55 }}>HOURS</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 55 }}>MINS</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 100 }}>DUE DATE</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 120 }}>COMPLETED AT</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(summary?.task_breakdown || []).slice(taskPage * taskRowsPerPage, (taskPage + 1) * taskRowsPerPage).map((t, i) => (
                              <TableRow key={i} hover sx={{ bgcolor: t.overdue ? "#fff8f8" : "inherit" }}>
                                {/* TASK */}
                                <TableCell sx={{ maxWidth: 260 }}>
                                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, lineHeight: 1.3 }}>{t.title}</Typography>
                                </TableCell>

                                {/* ASSIGNED TO */}
                                <TableCell>
                                  <EmployeeAvatar name={t.assigned_to} size={20} showName />
                                </TableCell>

                                {/* STATUS */}
                                <TableCell>
                                  <Chip label={t.status?.replace(/_/g, " ") || "—"} size="small"
                                    color={t.status === "completed" ? "success" : t.status === "in_progress" ? "primary" : "default"}
                                    sx={{ fontSize: 10, height: 20 }} />
                                </TableCell>

                                {/* PRIORITY */}
                                <TableCell>
                                  <Chip label={t.priority || "—"} size="small"
                                    color={t.priority === "high" ? "error" : t.priority === "medium" ? "warning" : "default"}
                                    variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                                </TableCell>

                                {/* CLIENT */}
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontSize: 11 }}>{t.client_name || "—"}</Typography>
                                </TableCell>

                                {/* PROJECT */}
                                <TableCell>
                                  {t.project_name ? (
                                    <Chip label={t.project_name} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e8f5e9", color: "#2e7d32", maxWidth: 130 }} />
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* CRM ITEM */}
                                <TableCell>
                                  {t.crm_item ? (
                                    <Chip label={t.crm_item} size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#e3f2fd", color: "#1565c0" }} />
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* WORK PERFORMED */}
                                <TableCell sx={{ maxWidth: 180 }}>
                                  {t.work_performed ? (
                                    <Tooltip title={t.work_performed}>
                                      <Typography variant="caption" sx={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {t.work_performed}
                                      </Typography>
                                    </Tooltip>
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* TAX RETURN */}
                                <TableCell>
                                  {t.is_tax_return ? (
                                    <Box>
                                      <Chip label="✓ Yes" size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#fff3e0", color: "#e65100" }} />
                                      {t.tax_return_total && <Typography variant="caption" display="block" sx={{ fontSize: 10, mt: 0.25 }}>{t.tax_return_total}</Typography>}
                                    </Box>
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* PAYROLL */}
                                <TableCell>
                                  {t.is_payroll ? (
                                    <Box>
                                      <Chip label="✓ Yes" size="small" sx={{ height: 18, fontSize: 9, bgcolor: "#fce4ec", color: "#c62828" }} />
                                      {t.payroll_total && <Typography variant="caption" display="block" sx={{ fontSize: 10, mt: 0.25 }}>{t.payroll_total}</Typography>}
                                    </Box>
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* SENIOR ACCOUNTANT */}
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontSize: 11 }}>{t.senior_accountant || "—"}</Typography>
                                </TableCell>

                                {/* TAGS */}
                                <TableCell>
                                  <Box display="flex" gap={0.3} flexWrap="wrap">
                                    {(t.tags || []).slice(0, 3).map(tag => (
                                      <Chip key={tag} label={tag} size="small" sx={{ height: 16, fontSize: 9 }} />
                                    ))}
                                    {(t.tags || []).length > 3 && <Typography variant="caption" sx={{ fontSize: 9 }}>+{t.tags.length - 3}</Typography>}
                                    {(!t.tags || t.tags.length === 0) && <Typography variant="caption" color="text.secondary">—</Typography>}
                                  </Box>
                                </TableCell>

                                {/* HOURS */}
                                <TableCell>
                                  {t.hours_logged > 0 ? (
                                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: 11 }}>
                                      {t.hours_logged.toFixed(1)}h
                                    </Typography>
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>

                                {/* MINUTES */}
                                <TableCell>
                                  <Typography variant="caption" fontWeight={t.task_duration_minutes > 0 ? 700 : 400} color={t.task_duration_minutes > 0 ? "primary.main" : "text.secondary"} sx={{ fontSize: 11 }}>
                                    {t.task_duration_minutes > 0 ? `${t.task_duration_minutes}m` : "—"}
                                  </Typography>
                                </TableCell>

                                {/* DUE DATE */}
                                <TableCell>
                                  <Typography variant="caption" color={t.overdue ? "error.main" : "text.primary"} fontWeight={t.overdue ? 700 : 400} sx={{ fontSize: 11 }}>
                                    {t.overdue ? "⚠ " : ""}
                                    {t.due_date
                                      ? new Date(t.due_date.length > 10 ? t.due_date : t.due_date + "T00:00:00")
                                          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                      : "—"}
                                  </Typography>
                                </TableCell>

                                {/* COMPLETED AT */}
                                <TableCell>
                                  {editCompletionId === t.id ? (
                                    <Box sx={{ minWidth: 190 }}>
                                      <TextField size="small" type="datetime-local" value={editCompletionDate} onChange={e => setEditCompletionDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: "100%", mb: 0.5, "& input": { fontSize: 11 } }} />
                                      <Box display="flex" gap={0.5} mb={0.5}>
                                        <TextField size="small" label="Hrs" type="number" inputProps={{ min: 0 }} value={editCompletionH} onChange={e => setEditCompletionH(e.target.value)} sx={{ width: 60, "& input": { fontSize: 11 } }} />
                                        <TextField size="small" label="Min" type="number" inputProps={{ min: 0, max: 59 }} value={editCompletionM} onChange={e => setEditCompletionM(e.target.value)} sx={{ width: 60, "& input": { fontSize: 11 } }} />
                                      </Box>
                                      <Box display="flex" gap={0.5}>
                                        <Button size="small" variant="contained" onClick={() => saveCompletionFromTable(t)} sx={{ fontSize: 10, textTransform: "none", py: 0.2, minWidth: 44, bgcolor: "#388e3c", "&:hover": { bgcolor: "#2e7d32" } }}>Save</Button>
                                        <Button size="small" onClick={() => setEditCompletionId(null)} sx={{ fontSize: 10, textTransform: "none", py: 0.2, minWidth: 44 }}>✕</Button>
                                      </Box>
                                    </Box>
                                  ) : t.completed_at ? (
                                    <Box>
                                      <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="caption" sx={{ color: "#388e3c", fontWeight: 600, display: "block", fontSize: 11 }}>
                                          ✅ {new Date(t.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </Typography>
                                        <Tooltip title="Edit completion time">
                                          <IconButton size="small" onClick={() => startEditCompletion(t)} sx={{ p: 0.1, color: "#388e3c", "&:hover": { bgcolor: "#e8f5e9" } }}>
                                            <Edit sx={{ fontSize: 11 }} />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                        {new Date(t.completed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                      </Typography>
                                    </Box>
                                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollableTable>
                    </>
                  )}
                </Paper>
              </>
            )}
          </Box>
        )}

        {/* ── CRM Overview Tab ── */}
        {tab === 1 && (
          <Box>
            {!crmOverview ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Leads Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Leads</Typography>
                      <Typography variant="h3" fontWeight="bold" color="primary">{crmOverview.leads?.total || 0}</Typography>
                      <Divider sx={{ my: 1 }} />
                      {[
                        { label: "New", val: crmOverview.leads?.new || 0, color: "#1976d2" },
                        { label: "Qualified", val: crmOverview.leads?.qualified || 0, color: "#43a047" },
                        { label: "Converted", val: crmOverview.leads?.converted || 0, color: "#8e24aa" },
                      ].map(r => (
                        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.25 }}>
                          <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                          <Chip label={r.val} size="small" sx={{ bgcolor: r.color + "22", color: r.color, fontWeight: 700, height: 20 }} />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Deals Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Deals</Typography>
                      <Typography variant="h3" fontWeight="bold" color="#43a047">{crmOverview.deals?.total || 0}</Typography>
                      <Divider sx={{ my: 1 }} />
                      {[
                        { label: "Won", val: crmOverview.deals?.won || 0, color: "#43a047" },
                        { label: "Lost", val: crmOverview.deals?.lost || 0, color: "#e53935" },
                        { label: "Revenue", val: `$${(crmOverview.deals?.revenue || 0).toLocaleString()}`, color: "#1976d2" },
                      ].map(r => (
                        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.25 }}>
                          <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                          <Chip label={r.val} size="small" sx={{ bgcolor: r.color + "22", color: r.color, fontWeight: 700, height: 20 }} />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Invoices Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Invoices</Typography>
                      <Typography variant="h3" fontWeight="bold" color="#f4511e">{crmOverview.invoices?.total || 0}</Typography>
                      <Divider sx={{ my: 1 }} />
                      {[
                        { label: "Paid", val: `$${(crmOverview.invoices?.paid_amount || 0).toLocaleString()}`, color: "#43a047" },
                        { label: "Outstanding", val: `$${(crmOverview.invoices?.outstanding || 0).toLocaleString()}`, color: "#fb8c00" },
                        { label: "Overdue", val: crmOverview.invoices?.overdue_count || 0, color: "#e53935" },
                      ].map(r => (
                        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.25 }}>
                          <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                          <Chip label={r.val} size="small" sx={{ bgcolor: r.color + "22", color: r.color, fontWeight: 700, height: 20 }} />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Contacts + Companies */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Contacts & Companies</Typography>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box>
                          <Typography variant="h4" fontWeight="bold" color="#00897b">{crmOverview.contacts?.total || 0}</Typography>
                          <Typography variant="caption" color="text.secondary">Contacts</Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="h4" fontWeight="bold" color="#3949ab">{crmOverview.companies?.total || 0}</Typography>
                          <Typography variant="caption" color="text.secondary">Companies</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Tasks Overview */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Tasks</Typography>
                      <Typography variant="h3" fontWeight="bold" color="#8e24aa">{crmOverview.tasks?.total || 0}</Typography>
                      <Divider sx={{ my: 1 }} />
                      {[
                        { label: "Completed", val: crmOverview.tasks?.completed || 0, color: "#43a047" },
                        { label: "In Progress", val: crmOverview.tasks?.in_progress || 0, color: "#1976d2" },
                        { label: "Overdue", val: crmOverview.tasks?.overdue || 0, color: "#e53935" },
                      ].map(r => (
                        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.25 }}>
                          <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                          <Chip label={r.val} size="small" sx={{ bgcolor: r.color + "22", color: r.color, fontWeight: 700, height: 20 }} />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Export */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button variant="contained" color="success" startIcon={<Download />} onClick={handleExportCRM}>
                      Export CRM Overview to Excel
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* ── Daily Work Reports Tab ── */}
        {tab === 2 && (
          <Box>
            {/* Period navigation + filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton size="small" onClick={() => setDailyPeriod(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}>
                      <ChevronLeft />
                    </IconButton>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ minWidth: 140, textAlign: "center" }}>
                      {new Date(dailyPeriod.year, dailyPeriod.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </Typography>
                    <IconButton size="small" onClick={() => setDailyPeriod(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}>
                      <ChevronRight />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Employee</InputLabel>
                    <Select value={filterReportUser} label="Filter by Employee" onChange={e => setFilterReportUser(e.target.value)}>
                      <MenuItem value="">All Employees</MenuItem>
                      {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip label={`${dailyReports.length} reports`} color="primary" variant="outlined" size="small" />
                    <Chip label={`${dailyReports.filter(r => r.status === "reviewed").length} reviewed`} color="success" variant="outlined" size="small" />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {dailyLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : dailyReports.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <EventNote sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                <Typography color="text.secondary">No work reports submitted for this period</Typography>
                <Typography variant="caption" color="text.secondary">Employees can submit reports from Time Management → Work Reports</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {dailyReports.map(rep => {
                  const statusColor = { draft: "#ff9800", sent: "#1976d2", reviewed: "#4caf50" };
                  const repTasks = Array.isArray(rep.tasks) ? rep.tasks : [];
                  return (
                    <Grid item xs={12} md={6} key={rep.id}>
                      <Card sx={{ borderLeft: `4px solid ${statusColor[rep.status] || "#ccc"}`, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">{rep.user_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{rep.date}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Chip size="small" label={rep.status?.toUpperCase() || "DRAFT"}
                                sx={{ bgcolor: `${statusColor[rep.status] || "#ccc"}20`, color: statusColor[rep.status] || "#999", fontWeight: "bold", fontSize: "0.65rem" }} />
                              {rep.score !== null && rep.score !== undefined && (
                                <Chip size="small" label={`${rep.score}/10`} color="warning" sx={{ fontSize: "0.65rem" }} />
                              )}
                            </Box>
                          </Box>
                          {rep.report_text && (
                            <Typography variant="body2" sx={{ mb: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              <strong>Today:</strong> {rep.report_text}
                            </Typography>
                          )}
                          {rep.plan_text && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", mb: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              <strong>Plan:</strong> {rep.plan_text}
                            </Typography>
                          )}
                          {repTasks.length > 0 && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: "#f9f9f9", borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>
                                TASKS ({repTasks.filter(t => t.done).length}/{repTasks.length} done)
                              </Typography>
                              {repTasks.slice(0, 4).map((t, i) => (
                                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }}>
                                  {t.done
                                    ? <CheckCircle fontSize="small" color="success" sx={{ fontSize: 14 }} />
                                    : <RadioButtonUnchecked fontSize="small" sx={{ fontSize: 14, color: "text.secondary" }} />}
                                  <Typography variant="caption" sx={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "text.secondary" : "text.primary" }}>
                                    {t.text}
                                  </Typography>
                                </Box>
                              ))}
                              {repTasks.length > 4 && (
                                <Typography variant="caption" color="text.secondary">+{repTasks.length - 4} more tasks</Typography>
                              )}
                            </Box>
                          )}
                          {rep.comment && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: "#e8f4fd", borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                <strong>Supervisor:</strong> {rep.comment}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* ── Scheduled Reports Tab ── */}
        {tab === 3 && (
          <Box>
            <Paper sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" fontWeight="bold">Scheduled Reports</Typography>
                <Button variant="contained" startIcon={<Add />} size="small"
                  onClick={() => { setEditReport(null); setScheduleOpen(true); }}>
                  New Schedule
                </Button>
              </Box>

              {scheduledReports.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Schedule sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                  <Typography color="text.secondary">No scheduled reports yet</Typography>
                  <Button variant="outlined" startIcon={<Add />} sx={{ mt: 2 }}
                    onClick={() => { setEditReport(null); setScheduleOpen(true); }}>
                    Create Your First Report
                  </Button>
                </Box>
              ) : (
                <ScrollableTable
                  totalCount={scheduledReports.length}
                  page={schedPage}
                  rowsPerPage={schedRowsPerPage}
                  onPageChange={setSchedPage}
                  onRowsPerPageChange={(rpp) => { setSchedRowsPerPage(rpp); setSchedPage(0); }}>
                                      <Table>

                                      <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Frequency</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Recipients</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Sent</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scheduledReports.slice(schedPage * schedRowsPerPage, (schedPage + 1) * schedRowsPerPage).map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{r.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={r.report_type?.replace(/_/g, " ")} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={r.frequency} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {Array.isArray(r.recipients) ? r.recipients.join(", ") : r.recipients || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={r.enabled ? "Active" : "Paused"} size="small"
                              color={r.enabled ? "success" : "default"} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {r.last_sent ? new Date(r.last_sent).toLocaleDateString() : "Never"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => { setEditReport(r); setScheduleOpen(true); }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Send Now">
                              <IconButton size="small" color="primary"
                                onClick={() => setSnack({ open: true, message: `Report "${r.name}" queued for sending`, severity: "info" })}>
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteScheduled(r.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              )}
            </Paper>

            {/* Info box */}
            <Paper sx={{ mt: 2, p: 2.5, borderRadius: 2, bgcolor: "#e8f4fd", border: "1px solid #90caf9" }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <Email sx={{ color: "#1976d2", mt: 0.25 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="#1565c0">Automated Report Delivery</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Scheduled reports are automatically generated and emailed to recipients at the configured frequency.
                    Reports include work summaries, task completion rates, time logs, and CRM metrics in Excel format.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      <ScheduledReportDialog
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setEditReport(null); }}
        existing={editReport}
        onSaved={fetchScheduled}
        users={users}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
