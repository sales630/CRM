/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { projectsAPI, tasksAPI } from "services/api";

// ── Shared helpers ──────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Total Projects", value: stats.total_projects, color: "#1976d2", icon: "folder" },
    { label: "Active Projects", value: stats.active_projects, color: "#2e7d32", icon: "folder_open" },
    { label: "Total Rules", value: stats.total_rules, color: "#7b1fa2", icon: "rule" },
    { label: "Published Rules", value: stats.published_rules, color: "#ed6c02", icon: "publish" },
    { label: "Total Matches", value: stats.total_matches, color: "#0288d1", icon: "check_circle" },
  ];
  return (
    <Grid container spacing={2} mb={3}>
      {items.map((it) => (
        <Grid item xs={6} sm={4} md={2.4} key={it.label}>
          <Card sx={{ p: 2, textAlign: "center", borderTop: `3px solid ${it.color}` }}>
            <Icon sx={{ fontSize: 28, color: it.color }}>{it.icon}</Icon>
            <MDTypography variant="h4" fontWeight="bold" sx={{ color: it.color }}>
              {it.value ?? 0}
            </MDTypography>
            <MDTypography variant="caption" color="text">{it.label}</MDTypography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────

function ProjectsTab({ onStatsChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null); // null | { mode: "add"|"edit", data: {} }
  const [form, setForm] = useState({ name: "", group_id: "", description: "", client_name: "", client_email: "", assigned_to: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [snack, setSnack] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsAPI.getAll(search ? { search } : {});
      setProjects(data);
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openAdd = () => {
    setForm({ name: "", group_id: "", description: "", client_name: "", client_email: "", assigned_to: "", status: "active" });
    setDialog({ mode: "add" });
  };

  const openEdit = (p) => {
    setForm({ name: p.name || "", group_id: p.group_id || "", description: p.description || "", client_name: p.client_name || "", client_email: p.client_email || "", assigned_to: p.assigned_to || "", status: p.status || "active" });
    setDialog({ mode: "edit", id: p.id });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setSnack({ msg: "Project name is required", sev: "warning" });
    setSaving(true);
    try {
      if (dialog.mode === "add") {
        await projectsAPI.create(form);
        setSnack({ msg: "Project created successfully", sev: "success" });
      } else {
        await projectsAPI.update(dialog.id, form);
        setSnack({ msg: "Project updated successfully", sev: "success" });
      }
      setDialog(null);
      load();
      onStatsChange?.();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await projectsAPI.delete(deleteId);
      setSnack({ msg: "Project deleted", sev: "success" });
      setDeleteId(null);
      load();
      onStatsChange?.();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const filtered = projects.filter(p =>
    !search || (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(p.group_id || "").includes(search)
  );

  return (
    <MDBox>
      {/* Toolbar */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <TextField
          size="small"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Icon sx={{ mr: 0.5, color: "text.secondary" }}>search</Icon> }}
          sx={{ minWidth: 240 }}
        />
        <MDButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={openAdd}>
          Add Group
        </MDButton>
      </MDBox>

      {/* Table */}
      <ScrollableTable
        totalCount={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
        <Table size="small">
          <TableHead style={{ display: "table-header-group" }}>
            <TableRow sx={{ bgcolor: "#f5f5f5" }}>
              {["NO.", "GROUP NAME", "GROUP ID", "CLIENT", "STATUS", "RULES", "CREATED", "MANAGE"].map(h => (
                <TableCell key={h} sx={{ fontWeight: "bold", fontSize: "0.75rem", py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>No projects found. Click "Add Group" to create one.</TableCell></TableRow>
            ) : filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((p, i) => (
              <TableRow key={p.id} hover sx={{ "&:hover": { bgcolor: "#f9f9f9" } }}>
                <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{i + 1}</TableCell>
                <TableCell>
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <Icon sx={{ color: "#1976d2", fontSize: 18 }}>folder</Icon>
                    <MDTypography variant="button" fontWeight="medium">{p.name}</MDTypography>
                  </MDBox>
                  {p.description && <MDTypography variant="caption" color="text" display="block">{p.description}</MDTypography>}
                </TableCell>
                <TableCell>
                  <Chip label={p.group_id} size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: "bold", fontFamily: "monospace" }} />
                </TableCell>
                <TableCell>
                  <MDTypography variant="caption">{p.client_name || "—"}</MDTypography>
                  {p.client_email && <MDTypography variant="caption" color="text" display="block">{p.client_email}</MDTypography>}
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.status}
                    size="small"
                    sx={{
                      bgcolor: p.status === "active" ? "#e8f5e9" : "#fff3e0",
                      color: p.status === "active" ? "#2e7d32" : "#e65100",
                      fontWeight: "bold",
                      textTransform: "capitalize",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={p.rules_count || 0} size="small" color="default" />
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{fmtDate(p.created_at)}</TableCell>
                <TableCell>
                  <MDBox display="flex" gap={0.5}>
                    <Tooltip title="Edit">
                      <MDButton iconOnly variant="text" color="info" size="small" onClick={() => openEdit(p)}>
                        <Icon>edit</Icon>
                      </MDButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <MDButton iconOnly variant="text" color="error" size="small" onClick={() => setDeleteId(p.id)}>
                        <Icon>delete</Icon>
                      </MDButton>
                    </Tooltip>
                  </MDBox>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollableTable>

      {/* Add/Edit Dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon color="info">{dialog?.mode === "add" ? "add_circle" : "edit"}</Icon>
          {dialog?.mode === "add" ? "Add New Project Group" : "Edit Project Group"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Group Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Group ID (auto)" value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))} size="small" helperText="Leave blank to auto-assign" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} size="small" multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Client Name" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Client Email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} size="small" type="email" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Assigned To" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <MDButton variant="outlined" color="secondary" onClick={() => setDialog(null)}>Cancel</MDButton>
          <MDButton variant="gradient" color="info" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : dialog?.mode === "add" ? "Create Project" : "Save Changes"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Project?</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">This will also delete all rules associated with this project. This action cannot be undone.</MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setDeleteId(null)}>Cancel</MDButton>
          <MDButton variant="gradient" color="error" onClick={handleDelete}>Delete</MDButton>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={3500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </MDBox>
  );
}

// ── Rules Tab ─────────────────────────────────────────────────────────────

function RulesTab({ onStatsChange }) {
  const [rules, setRules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ from_email: "", to_email: "", project_id: "", condition: "from", action: "assign_to_project" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [testDialog, setTestDialog] = useState(false);
  const [testFrom, setTestFrom] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [snack, setSnack] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      if (search) params.search = search;
      const data = await projectsAPI.getRules(params);
      setRules(data);
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setLoading(false);
    }
  }, [search, filterProject]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll();
      setProjects(data);
    } catch {}
  }, []);

  useEffect(() => { loadRules(); loadProjects(); }, [loadRules, loadProjects]);

  useEffect(() => {
    setPage(0);
  }, [search, filterProject]);

  const openAdd = () => {
    setForm({ from_email: "", to_email: "", project_id: "", condition: "from", action: "assign_to_project" });
    setDialog({ mode: "add" });
  };

  const openEdit = (r) => {
    setForm({ from_email: r.from_email || "", to_email: r.to_email || "", project_id: r.project_id || "", condition: r.condition || "from", action: r.action || "assign_to_project" });
    setDialog({ mode: "edit", id: r.id });
  };

  const handleSave = async () => {
    if (!form.from_email.trim()) return setSnack({ msg: "From email is required", sev: "warning" });
    if (!form.project_id) return setSnack({ msg: "Please select a project", sev: "warning" });
    setSaving(true);
    try {
      if (dialog.mode === "add") {
        await projectsAPI.createRule(form);
        setSnack({ msg: "Rule created successfully", sev: "success" });
      } else {
        await projectsAPI.updateRule(dialog.id, form);
        setSnack({ msg: "Rule updated successfully", sev: "success" });
      }
      setDialog(null);
      loadRules();
      onStatsChange?.();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await projectsAPI.deleteRule(deleteId);
      setSnack({ msg: "Rule deleted", sev: "success" });
      setDeleteId(null);
      loadRules();
      onStatsChange?.();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await projectsAPI.publishRules();
      setSnack({ msg: result.message || "Rules published successfully", sev: "success" });
      loadRules();
      onStatsChange?.();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setPublishing(false);
    }
  };

  const handleTestRule = async () => {
    if (!testFrom.trim()) return setSnack({ msg: "Enter a from email to test", sev: "warning" });
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await projectsAPI.matchRule({ from_email: testFrom, to_email: testTo });
      setTestResult(result);
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setTestLoading(false);
    }
  };

  const unpublishedCount = rules.filter(r => !r.published).length;

  const filtered = rules.filter(r => {
    if (filterProject && r.project_id !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.from_email || "").includes(q) || (r.to_email || "").includes(q) || (r.project_name || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <MDBox>
      {/* Toolbar */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <MDBox display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search rules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Icon sx={{ mr: 0.5, color: "text.secondary" }}>search</Icon> }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter by Project</InputLabel>
            <Select value={filterProject} label="Filter by Project" onChange={e => setFilterProject(e.target.value)}>
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </MDBox>
        <MDBox display="flex" gap={1} flexWrap="wrap">
          <Tooltip title="Test whether an email matches any active rule">
            <MDButton variant="outlined" color="info" size="small" startIcon={<Icon>science</Icon>} onClick={() => setTestDialog(true)}>
              Test Rule
            </MDButton>
          </Tooltip>
          <Tooltip title={unpublishedCount > 0 ? `Publish ${unpublishedCount} unpublished rule(s)` : "All rules are published"}>
            <span>
              <MDButton
                variant="gradient"
                color="warning"
                startIcon={publishing ? <CircularProgress size={16} color="inherit" /> : <Icon>publish</Icon>}
                onClick={handlePublish}
                disabled={publishing || unpublishedCount === 0}
              >
                Publish Rules {unpublishedCount > 0 && `(${unpublishedCount})`}
              </MDButton>
            </span>
          </Tooltip>
          <MDButton variant="gradient" color="success" startIcon={<Icon>add</Icon>} onClick={openAdd}>
            Add Rules
          </MDButton>
        </MDBox>
      </MDBox>

      {unpublishedCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Icon>info</Icon>}>
          You have <strong>{unpublishedCount}</strong> unpublished rule(s). Click <strong>Publish Rules</strong> to activate them.
        </Alert>
      )}

      {/* Table */}
      <ScrollableTable
        totalCount={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
        <Table size="small">
          <TableHead style={{ display: "table-header-group" }}>
            <TableRow sx={{ bgcolor: "#f5f5f5" }}>
              {["NO.", "FROM EMAIL", "TO EMAIL", "PROJECT / GROUP", "CONDITION", "STATUS", "MATCHES", "MANAGE"].map(h => (
                <TableCell key={h} sx={{ fontWeight: "bold", fontSize: "0.75rem", py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                No rules found. Click "Add Rules" to create email routing rules.
              </TableCell></TableRow>
            ) : filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((r, i) => (
              <TableRow key={r.id} hover sx={{ "&:hover": { bgcolor: "#f9f9f9" } }}>
                <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{i + 1}</TableCell>
                <TableCell>
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ color: "#1976d2", fontSize: 14 }}>email</Icon>
                    <MDTypography variant="caption" fontWeight="medium" sx={{ fontFamily: "monospace" }}>
                      {r.from_email || "—"}
                    </MDTypography>
                  </MDBox>
                </TableCell>
                <TableCell>
                  <MDTypography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                    {r.to_email || <em style={{ color: "#aaa" }}>any</em>}
                  </MDTypography>
                </TableCell>
                <TableCell>
                  <MDBox>
                    <MDTypography variant="button" fontWeight="medium">{r.project_name || "—"}</MDTypography>
                    {r.group_id && (
                      <Chip label={`ID: ${r.group_id}`} size="small" sx={{ ml: 1, height: 18, fontSize: "10px", bgcolor: "#e3f2fd", color: "#1565c0" }} />
                    )}
                  </MDBox>
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.condition === "from" ? "From" : r.condition === "to" ? "To" : r.condition}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.7rem" }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.published ? "Published" : "Draft"}
                    size="small"
                    sx={{
                      bgcolor: r.published ? "#e8f5e9" : "#fff8e1",
                      color: r.published ? "#2e7d32" : "#f57f17",
                      fontWeight: "bold",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={r.match_count || 0} size="small" color={r.match_count > 0 ? "success" : "default"} />
                </TableCell>
                <TableCell>
                  <MDBox display="flex" gap={0.5}>
                    <Tooltip title="Edit">
                      <MDButton iconOnly variant="text" color="info" size="small" onClick={() => openEdit(r)}>
                        <Icon>edit</Icon>
                      </MDButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <MDButton iconOnly variant="text" color="error" size="small" onClick={() => setDeleteId(r.id)}>
                        <Icon>delete</Icon>
                      </MDButton>
                    </Tooltip>
                  </MDBox>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollableTable>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon color="success">{dialog?.mode === "add" ? "add_circle" : "edit"}</Icon>
          {dialog?.mode === "add" ? "Add New Rule" : "Edit Rule"}
        </DialogTitle>
        <DialogContent dividers>
          <MDBox mt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="info" icon={<Icon>info</Icon>} sx={{ py: 0.5 }}>
              Rules route incoming emails to projects. Use <code>@domain.com</code> as FROM to match all emails from a domain.
            </Alert>
            <TextField
              fullWidth
              label="From Email *"
              placeholder="e.g. client@company.com or @company.com"
              value={form.from_email}
              onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
              size="small"
              helperText="Use @domain.com to match all emails from that domain"
            />
            <TextField
              fullWidth
              label="To Email (optional)"
              placeholder="e.g. support@yourcompany.com"
              value={form.to_email}
              onChange={e => setForm(f => ({ ...f, to_email: e.target.value }))}
              size="small"
              helperText="Leave blank to match any recipient"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Project / Group *</InputLabel>
              <Select
                value={form.project_id}
                label="Project / Group *"
                onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              >
                <MenuItem value=""><em>Select a project</em></MenuItem>
                {projects.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} <span style={{ color: "#999", marginLeft: 8 }}>(ID: {p.group_id})</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Condition</InputLabel>
              <Select value={form.condition} label="Condition" onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                <MenuItem value="from">Match From Email</MenuItem>
                <MenuItem value="to">Match To Email</MenuItem>
                <MenuItem value="from_or_to">Match Either</MenuItem>
              </Select>
            </FormControl>
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <MDButton variant="outlined" color="secondary" onClick={() => setDialog(null)}>Cancel</MDButton>
          <MDButton variant="gradient" color="success" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : dialog?.mode === "add" ? "Create Rule" : "Save Changes"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Rule?</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">This rule will be permanently removed and emails will no longer be routed by it.</MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setDeleteId(null)}>Cancel</MDButton>
          <MDButton variant="gradient" color="error" onClick={handleDelete}>Delete</MDButton>
        </DialogActions>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog open={testDialog} onClose={() => { setTestDialog(false); setTestResult(null); setTestFrom(""); setTestTo(""); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon color="info">science</Icon>
          Test Email Rule Matching
        </DialogTitle>
        <DialogContent dividers>
          <MDBox mt={1} display="flex" flexDirection="column" gap={2}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Enter an email address to check which project rule would match it.
            </Alert>
            <TextField
              fullWidth
              label="From Email *"
              placeholder="e.g. client@company.com"
              value={testFrom}
              onChange={e => setTestFrom(e.target.value)}
              size="small"
            />
            <TextField
              fullWidth
              label="To Email (optional)"
              placeholder="e.g. support@yourcompany.com"
              value={testTo}
              onChange={e => setTestTo(e.target.value)}
              size="small"
            />
            <MDButton variant="gradient" color="info" onClick={handleTestRule} disabled={testLoading} startIcon={testLoading ? <CircularProgress size={16} color="inherit" /> : <Icon>play_arrow</Icon>}>
              Test Match
            </MDButton>

            {testResult && (
              <MDBox mt={1}>
                {testResult.matched ? (
                  <Alert severity="success">
                    <strong>✅ Match Found!</strong><br />
                    Rule: <code>{testResult.rule?.from_email}</code><br />
                    Project: <strong>{testResult.project?.name}</strong> (Group ID: {testResult.project?.group_id})
                  </Alert>
                ) : (
                  <Alert severity="warning">
                    <strong>❌ No Match</strong><br />
                    No active rule matches this email. The email would not be auto-assigned to any project.
                  </Alert>
                )}
              </MDBox>
            )}
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <MDButton variant="outlined" color="secondary" onClick={() => { setTestDialog(false); setTestResult(null); setTestFrom(""); setTestTo(""); }}>Close</MDButton>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={3500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </MDBox>
  );
}

// ── Email Tasks Tab ────────────────────────────────────────────────────────
function EmailTasksTab() {
  const [tasks, setTasks]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all"); // project id or "all"
  const [snack, setSnack]       = useState(null);

  const STATUS_COLOR = {
    pending:     { bg: "#fff3e0", color: "#e65100" },
    in_progress: { bg: "#e3f2fd", color: "#1565c0" },
    completed:   { bg: "#e8f5e9", color: "#2e7d32" },
    cancelled:   { bg: "#fce4ec", color: "#b71c1c" },
  };
  const PRIORITY_COLOR = { low: "#4caf50", medium: "#ff9800", high: "#f44336", urgent: "#9c27b0" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, projData] = await Promise.all([
        tasksAPI.getAll({ entity_type: "project" }),
        projectsAPI.getAll(),
      ]);
      // Also get auto-email tasks (tagged "auto") regardless of entity_type
      const allTasks = await tasksAPI.getAll({});
      const emailTasks = allTasks.filter(t =>
        (Array.isArray(t.tags) ? t.tags : []).includes("auto") &&
        (Array.isArray(t.tags) ? t.tags : []).includes("email")
      );
      setTasks(emailTasks);
      setProjects(projData || []);
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (task, newStatus) => {
    try {
      await tasksAPI.updateStatus(task.id, newStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      setSnack({ msg: "Status updated", sev: "success" });
    } catch {
      setSnack({ msg: "Failed to update", sev: "error" });
    }
  };

  const filtered = filter === "all"
    ? tasks
    : tasks.filter(t => t.project_id === filter || t.entity_id === filter);

  // Group by project
  const grouped = {};
  filtered.forEach(t => {
    const proj = projects.find(p => p.id === t.project_id || p.id === t.entity_id);
    const key = proj ? proj.id : "__none__";
    const label = proj ? proj.name : (t.group_name || "No Group");
    if (!grouped[key]) grouped[key] = { label, tasks: [], proj };
    grouped[key].tasks.push(t);
  });
  const groupEntries = Object.entries(grouped).sort(([, a], [, b]) => a.label.localeCompare(b.label));

  return (
    <MDBox>
      {/* Filter row */}
      <MDBox display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <MDTypography variant="h6" fontWeight="bold">
          <Icon sx={{ mr: 0.5, verticalAlign: "middle", color: "#1976d2" }}>email</Icon>
          Auto-created Email Tasks
        </MDTypography>
        <MDBox flex={1} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Group</InputLabel>
          <Select value={filter} label="Filter by Group" onChange={e => setFilter(e.target.value)}>
            <MenuItem value="all">All Groups</MenuItem>
            {projects.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <MDButton size="small" variant="outlined" color="info" onClick={load}>
          <Icon sx={{ mr: 0.5 }}>refresh</Icon>Refresh
        </MDButton>
      </MDBox>

      {loading ? (
        <MDBox display="flex" justifyContent="center" py={4}><CircularProgress /></MDBox>
      ) : filtered.length === 0 ? (
        <MDBox textAlign="center" py={5}>
          <Icon sx={{ fontSize: 48, color: "#bdbdbd" }}>inbox</Icon>
          <MDTypography variant="body2" color="text" mt={1}>
            No auto-email tasks yet. Tasks will appear here when emails from group clients are received.
          </MDTypography>
        </MDBox>
      ) : (
        groupEntries.map(([key, { label, tasks: gTasks, proj }]) => (
          <MDBox key={key} mb={3}>
            {/* Group header */}
            <MDBox
              display="flex" alignItems="center" gap={1} mb={1}
              sx={{ borderLeft: "4px solid #1976d2", pl: 1.5, py: 0.5, bgcolor: "#f0f4ff", borderRadius: "0 6px 6px 0" }}
            >
              <Icon sx={{ color: "#1976d2", fontSize: 20 }}>folder</Icon>
              <MDTypography variant="subtitle2" fontWeight="bold" color="primary">{label}</MDTypography>
              {proj?.assigned_to && (
                <Chip size="small" label={`Team Leader: ${proj.assigned_to}`} sx={{ ml: 1, bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 600, fontSize: "0.7rem" }} />
              )}
              {proj?.client_email && (
                <Chip size="small" label={proj.client_email} sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a", fontSize: "0.68rem" }} />
              )}
              <MDBox flex={1} />
              <Chip size="small" label={`${gTasks.length} task${gTasks.length !== 1 ? "s" : ""}`} sx={{ bgcolor: "#1976d2", color: "white", fontWeight: 700, fontSize: "0.7rem" }} />
            </MDBox>

            {/* Task table */}
            <ScrollableTable sx={{ border: "1px solid #e8eaf6", borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#f5f7ff" }}>
                  <TableRow>
                    {["Task", "From", "Assigned To", "Priority", "Status", "Created", "Actions"].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: "#546e7a", py: 1 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gTasks.map(task => {
                    const sc = STATUS_COLOR[task.status] || { bg: "#f5f5f5", color: "#616161" };
                    return (
                      <TableRow key={task.id} hover>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Tooltip title={task.description || ""}>
                            <MDTypography variant="caption" fontWeight="medium" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                              {task.title}
                            </MDTypography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption" color="text" sx={{ fontSize: "0.72rem" }}>
                            {task.source_email || "—"}
                          </MDTypography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={task.assigned_to || "—"}
                            sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600, fontSize: "0.68rem" }} />
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption" sx={{ color: PRIORITY_COLOR[task.priority] || "#9e9e9e", fontWeight: 700, textTransform: "capitalize", fontSize: "0.72rem" }}>
                            {task.priority || "medium"}
                          </MDTypography>
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={task.status || "pending"}
                            onChange={e => updateStatus(task, e.target.value)}
                            sx={{
                              fontSize: "0.7rem", fontWeight: 600, height: 26,
                              bgcolor: sc.bg, color: sc.color,
                              "& fieldset": { border: "none" },
                            }}
                          >
                            {["pending", "in_progress", "completed", "cancelled"].map(s => (
                              <MenuItem key={s} value={s} sx={{ fontSize: "0.75rem", textTransform: "capitalize" }}>
                                {s.replace("_", " ")}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption" color="text" sx={{ fontSize: "0.7rem" }}>
                            {task.created_at ? new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </MDTypography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={task.source_subject || "View"}>
                            <Icon sx={{ cursor: "pointer", color: "#1976d2", fontSize: 18 }} onClick={() => setSnack({ msg: task.description || "No details", sev: "info" })}>
                              info
                            </Icon>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollableTable>
          </MDBox>
        ))
      )}

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </MDBox>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Projects() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await projectsAPI.getRulesStats();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        {/* Page header */}
        <MDBox mb={3}>
          <MDBox display="flex" alignItems="center" gap={1} mb={0.5}>
            <Icon sx={{ fontSize: 28, color: "#1976d2" }}>folder_special</Icon>
            <MDTypography variant="h4" fontWeight="bold">Projects & Rules</MDTypography>
          </MDBox>
          <MDTypography variant="body2" color="text">
            Manage project groups and configure email routing rules to automatically assign emails to projects.
          </MDTypography>
        </MDBox>

        {/* Stats bar */}
        <StatsBar stats={stats} />

        {/* Main card */}
        <Card>
          <MDBox px={3} pt={2}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ borderBottom: "1px solid #eee" }}
            >
              <Tab
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ fontSize: 18 }}>folder</Icon>
                    Projects (Groups)
                  </MDBox>
                }
              />
              <Tab
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ fontSize: 18 }}>rule</Icon>
                    Rules List
                  </MDBox>
                }
              />
              <Tab
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ fontSize: 18 }}>email</Icon>
                    Email Tasks
                  </MDBox>
                }
              />
            </Tabs>
          </MDBox>

          <MDBox p={3}>
            {tab === 0 && <ProjectsTab onStatsChange={loadStats} />}
            {tab === 1 && <RulesTab onStatsChange={loadStats} />}
            {tab === 2 && <EmailTasksTab />}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
