/* eslint-disable */
import { useState, useEffect } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import EmployeeAvatar from "components/EmployeeAvatar";
import ScrollableTable from "components/ScrollableTable";
import {
  Box, Typography, Button, Chip, IconButton, TextField, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody, Avatar, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  CircularProgress, Tooltip, Select, FormControl, InputLabel, MenuItem, Paper, Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { activitiesAPI, usersAPI } from "services/api";

const ACT_TYPES = ["call", "email", "meeting", "task"];
const ACT_ICONS = { call: PhoneIcon, email: EmailIcon, meeting: EventIcon, task: AssignmentIcon };
const ACT_COLORS = { call: "#1976d2", email: "#388e3c", meeting: "#7b1fa2", task: "#f57c00" };
const ACT_LABELS = { call: "Call", email: "Email", meeting: "Meeting", task: "Task" };
const ENTITY_TYPES = ["lead", "deal", "contact", "company", "general"];
// ASSIGNEES loaded dynamically from usersAPI (see useEffect in ActivityForm)

function ActivityForm({ open, activity, onClose, onSave }) {
  const [form, setForm] = useState({ type: "call", title: "", description: "", entity_type: "general", entity_id: "", assigned_to: "", due_date: new Date().toISOString().split("T")[0], due_time: "10:00", duration: 30, direction: "outgoing" });
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  useEffect(() => { usersAPI.getAll().then(u => setUsers(Array.isArray(u) ? u : [])).catch(() => {}); }, []);
  useEffect(() => { if (activity) setForm({ ...activity }); else setForm({ type: "call", title: "", description: "", entity_type: "general", entity_id: "", assigned_to: "", due_date: new Date().toISOString().split("T")[0], due_time: "10:00", duration: 30, direction: "outgoing" }); }, [activity, open]);
  const handleSave = async () => { setSaving(true); try { await onSave(form); onClose(); } finally { setSaving(false); } };
  const Icon = ACT_ICONS[form.type] || AssignmentIcon;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon sx={{ color: ACT_COLORS[form.type] }} />
          <Typography fontWeight={700}>{activity ? "Edit Activity" : "Schedule Activity"}</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {/* Type selector */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {ACT_TYPES.map(t => {
            const TIcon = ACT_ICONS[t];
            return (
              <Box key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                sx={{ flex: 1, p: 1.5, borderRadius: 2, border: `2px solid ${form.type === t ? ACT_COLORS[t] : "#eee"}`, cursor: "pointer", textAlign: "center", bgcolor: form.type === t ? `${ACT_COLORS[t]}10` : "#fff", "&:hover": { borderColor: ACT_COLORS[t] } }}>
                <TIcon sx={{ color: ACT_COLORS[t], fontSize: 20 }} />
                <Typography variant="caption" fontWeight={600} color={ACT_COLORS[t]} sx={{ display: "block" }}>{ACT_LABELS[t]}</Typography>
              </Box>
            );
          })}
        </Box>
        <TextField label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} fullWidth size="small" />
        <TextField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth size="small" />
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField label="Due Date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="Time" type="time" value={form.due_time} onChange={e => setForm({ ...form, due_time: e.target.value })} fullWidth size="small" InputLabelProps={{ shrink: true }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControl fullWidth size="small"><InputLabel>Assigned To</InputLabel>
            <Select value={form.assigned_to} label="Assigned To" onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
              {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name} ({u.role || u.department || ""})</MenuItem>)}
            </Select>
          </FormControl>
          {(form.type === "call" || form.type === "meeting") && (
            <TextField label="Duration (min)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} fullWidth size="small" />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControl fullWidth size="small"><InputLabel>Related To</InputLabel>
            <Select value={form.entity_type} label="Related To" onChange={e => setForm({ ...form, entity_type: e.target.value })}>
              {ENTITY_TYPES.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small"><InputLabel>Direction</InputLabel>
            <Select value={form.direction} label="Direction" onChange={e => setForm({ ...form, direction: e.target.value })}>
              <MenuItem value="outgoing">Outgoing</MenuItem>
              <MenuItem value="incoming">Incoming</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.title}>
          {saving ? "Saving..." : activity ? "Update" : "Schedule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CRMActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAct, setEditAct] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== "all") params.type = typeFilter;
      if (filter === "pending") params.completed = "false";
      if (filter === "completed") params.completed = "true";
      const data = await activitiesAPI.getAll(params);
      setActivities(data);
    } catch { setSnack({ open: true, msg: "Failed to load. Is backend running?", severity: "error" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchActivities(); }, [filter, typeFilter]);
  useEffect(() => { setPage(0); }, [search, typeFilter, filter]);

  const handleSave = async (form) => {
    try {
      if (editAct) {
        const updated = await activitiesAPI.update(editAct.id, form);
        setActivities(p => p.map(a => a.id === editAct.id ? (updated || { ...a, ...form }) : a));
        setSnack({ open: true, msg: "Activity updated", severity: "success" });
      } else {
        const n = await activitiesAPI.create(form);
        setActivities(p => [n, ...p]);
        setSnack({ open: true, msg: "Activity scheduled!", severity: "success" });
      }
      setEditAct(null);
      fetchActivities();
    } catch { setSnack({ open: true, msg: "Save failed", severity: "error" }); }
  };

  const handleComplete = async (id) => {
    try {
      await activitiesAPI.complete(id);
      setActivities(p => p.map(a => a.id === id ? { ...a, completed: true } : a));
      setSnack({ open: true, msg: "Marked complete!", severity: "success" });
    } catch { setSnack({ open: true, msg: "Update failed", severity: "error" }); }
  };

  const handleDelete = async (id) => {
    try {
      await activitiesAPI.delete(id);
      setActivities(p => p.filter(a => a.id !== id));
      setSnack({ open: true, msg: "Deleted", severity: "success" });
    } catch { setSnack({ open: true, msg: "Delete failed", severity: "error" }); }
  };

  const filtered = activities.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const pending = activities.filter(a => !a.completed).length;
  const completed = activities.filter(a => a.completed).length;
  const today = new Date().toISOString().split("T")[0];
  const overdue = activities.filter(a => !a.completed && a.due_date && a.due_date < today).length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>Activities</Typography>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setEditAct(null); setFormOpen(true); }}>
            Schedule Activity
          </Button>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} mb={2.5}>
          {[
            { label: "Pending", val: pending, color: "#f57c00", icon: <AccessTimeIcon sx={{ color: "#f57c00", fontSize: 20 }} />, filt: "pending" },
            { label: "Completed", val: completed, color: "#388e3c", icon: <CheckCircleIcon sx={{ color: "#388e3c", fontSize: 20 }} />, filt: "completed" },
            { label: "Overdue", val: overdue, color: "#d32f2f", icon: <AccessTimeIcon sx={{ color: "#d32f2f", fontSize: 20 }} />, filt: "pending" },
            { label: "Total", val: activities.length, color: "#1976d2", icon: <AssignmentIcon sx={{ color: "#1976d2", fontSize: 20 }} />, filt: "all" },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Paper elevation={0} onClick={() => setFilter(s.filt)}
                sx={{ p: 2, borderRadius: 3, border: "1px solid #eee", cursor: "pointer", "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.1)" } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  {s.icon}
                </Box>
                <Typography variant="h5" fontWeight={800} color={s.color}>{s.val}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Type Filter */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField size="small" placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: 220 }} />
          {["all", ...ACT_TYPES].map(t => (
            <Chip key={t} label={t === "all" ? "All" : ACT_LABELS[t]} size="small" onClick={() => setTypeFilter(t)}
              sx={{ bgcolor: typeFilter === t ? (t === "all" ? "#1976d2" : ACT_COLORS[t]) : "transparent", color: typeFilter === t ? "#fff" : (t === "all" ? "#1976d2" : ACT_COLORS[t]), border: `1px solid ${t === "all" ? "#1976d2" : ACT_COLORS[t]}`, "&:hover": { opacity: 0.85 } }} />
          ))}
          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            {["all", "pending", "completed"].map(f => (
              <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} size="small" onClick={() => setFilter(f)}
                variant={filter === f ? "filled" : "outlined"} color={filter === f ? "primary" : "default"} />
            ))}
          </Box>
        </Box>

        {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}

        {!loading && (
          <Box sx={{ bgcolor: "#fff", borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <ScrollableTable
              totalCount={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
            >
                            <Table>

                            <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell sx={{ width: 40 }}></TableCell>
                  <TableCell><b>Activity</b></TableCell>
                  <TableCell><b>Type</b></TableCell>
                  <TableCell><b>Due Date</b></TableCell>
                  <TableCell><b>Time</b></TableCell>
                  <TableCell><b>Assigned To</b></TableCell>
                  <TableCell><b>Related To</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
                  <TableCell><b>Actions</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(act => {
                  const Icon = ACT_ICONS[act.type] || AssignmentIcon;
                  const color = ACT_COLORS[act.type] || "#666";
                  const isOverdue = !act.completed && act.due_date && act.due_date < today;
                  return (
                    <TableRow key={act.id} hover sx={{ opacity: act.completed ? 0.6 : 1 }}>
                      <TableCell>
                        <Tooltip title={act.completed ? "Completed" : "Mark Complete"}>
                          <IconButton size="small" onClick={() => !act.completed && handleComplete(act.id)}>
                            {act.completed ? <CheckCircleIcon sx={{ color: "#388e3c", fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: "#ccc" }} />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ bgcolor: `${color}15`, borderRadius: 1.5, p: 0.6, color }}>
                            <Icon sx={{ fontSize: 16 }} />
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ textDecoration: act.completed ? "line-through" : "none" }}>{act.title}</Typography>
                            {act.description && <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: "block" }}>{act.description}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={ACT_LABELS[act.type] || act.type} size="small" sx={{ bgcolor: `${color}15`, color, fontSize: 10 }} /></TableCell>
                      <TableCell>
                        <Typography variant="body2" color={isOverdue ? "error.main" : "text.primary"} fontWeight={isOverdue ? 700 : 400}>
                          {act.due_date || "—"}
                          {isOverdue && <Chip label="OVERDUE" size="small" color="error" sx={{ ml: 0.5, fontSize: 9, height: 16 }} />}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{act.due_time || "—"}</Typography></TableCell>
                      <TableCell>
                        <EmployeeAvatar name={act.assigned_to} size={24} showName />
                      </TableCell>
                      <TableCell>
                        {act.entity_type && act.entity_type !== "general" && (
                          <Chip label={act.entity_type} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={act.completed ? "Done" : "Pending"} size="small"
                          sx={{ bgcolor: act.completed ? "#e8f5e9" : "#fff8e1", color: act.completed ? "#2e7d32" : "#f57f17", fontSize: 10 }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(act.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && <TableRow><TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>No activities found</TableCell></TableRow>}
              </TableBody>
              </Table>
            </ScrollableTable>

          </Box>
        )}
      </Box>

      <ActivityForm open={formOpen} activity={editAct} onClose={() => { setFormOpen(false); setEditAct(null); }} onSave={handleSave} />
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
