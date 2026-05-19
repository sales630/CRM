/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Card, CardContent, Grid, Typography, Button, Chip, Avatar,
  IconButton, Table, TableBody, TableCell, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Tooltip,
  InputAdornment, Snackbar, Alert, Switch, FormControlLabel,
  CircularProgress, Divider, Badge,
} from "@mui/material";
import {
  Add, Edit, Delete, Search, Close, Person, AdminPanelSettings,
  ManageAccounts, Groups, Refresh, Email, Phone, Business,
  CheckCircle, Block, VpnKey, Shield, Lock, Save, SelectAll,
} from "@mui/icons-material";
import { usersAPI, rolePermissionsAPI } from "services/api";

const getColor = (name) => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0;
  for (let c of name || "U") s += c.charCodeAt(0);
  return C[s % C.length];
};

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "#e53935", icon: <AdminPanelSettings fontSize="small" />, bg: "#ffeef0" },
  team_leader: { label: "Team Leader", color: "#1976d2", icon: <ManageAccounts fontSize="small" />, bg: "#e3f2fd" },
  employee: { label: "Employee", color: "#43a047", icon: <Person fontSize="small" />, bg: "#e8f5e9" },
};

const DEPARTMENTS = ["Accounting", "Bookkeeping", "Tax", "Payroll", "Audit", "Advisory", "IT", "Operations", "Management"];

const blankUser = {
  name: "", email: "", role: "employee", department: "", phone: "",
  status: "active",
  can_download_reports: false,
};

// ── User Form Dialog ─────────────────────────────────────────────────────────
function UserFormDialog({ open, onClose, existing, onSaved }) {
  const [form, setForm] = useState(blankUser);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(existing ? { ...blankUser, ...existing } : blankUser);
  }, [existing, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existing) {
        await usersAPI.update(existing.id, form);
      } else {
        await usersAPI.create(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <VpnKey fontSize="small" color="primary" />
          {existing ? "Edit User" : "Add New User"}
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Full Name" required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Email" type="email" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={form.role} label="Role"
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <MenuItem value="admin">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AdminPanelSettings fontSize="small" sx={{ color: "#e53935" }} />
                    Admin
                  </Box>
                </MenuItem>
                <MenuItem value="team_leader">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ManageAccounts fontSize="small" sx={{ color: "#1976d2" }} />
                    Team Leader
                  </Box>
                </MenuItem>
                <MenuItem value="employee">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Person fontSize="small" sx={{ color: "#43a047" }} />
                    Employee
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select value={form.department || ""} label="Department"
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Phone"
              value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status || "active"} label="Status"
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Download Reports permission (per-user) */}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f1f8e9", borderRadius: 1, border: "1px solid #c5e1a5" }}>
          <FormControlLabel
            control={
              <Switch
                checked={!!form.can_download_reports}
                onChange={e => setForm(f => ({ ...f, can_download_reports: e.target.checked }))}
                size="small"
                disabled={form.role === "admin" || form.role === "super_admin"}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  ⬇️ Can download reports (Excel)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.role === "admin" || form.role === "super_admin"
                    ? "Admins always have download access"
                    : "Shows the “Download Report” button above tables for this user"}
                </Typography>
              </Box>
            }
          />
        </Box>

        {/* Role permissions info */}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            ROLE PERMISSIONS
          </Typography>
          {form.role === "admin" && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              • Full access to all modules, users, and settings
              • Can manage roles, create/delete users, view all reports
            </Typography>
          )}
          {form.role === "team_leader" && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              • Manage tasks, assign work to team members
              • View team reports and performance metrics
              • Cannot manage users or system settings
            </Typography>
          )}
          {form.role === "employee" && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              • Access to assigned tasks and personal time tracking
              • Can view own activities, leads, and contacts
              • Cannot access admin settings or manage other users
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={!form.name || !form.email || saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}>
          {existing ? "Save Changes" : "Add User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Permissions module list with groups ───────────────────────────────────────
const MODULE_GROUPS = [
  {
    group: "Main",
    color: "#1976d2",
    modules: [
      { key: "dashboard",    label: "Dashboard" },
    ],
  },
  {
    group: "CRM",
    color: "#7b1fa2",
    modules: [
      { key: "leads",        label: "Leads" },
      { key: "deals",        label: "Deals" },
      { key: "contacts",     label: "Contacts" },
      { key: "companies",    label: "Companies" },
      { key: "activities",   label: "Activities" },
      { key: "products",     label: "Products & Invoices" },
    ],
  },
  {
    group: "Collaboration",
    color: "#0288d1",
    modules: [
      { key: "tasks",        label: "Tasks" },
      { key: "work-reports", label: "Work Reports" },
      { key: "timeman",      label: "Time Manager" },
      { key: "projects",     label: "Projects" },
      { key: "messenger",    label: "Messenger / Chat" },
      { key: "mail",         label: "Mail" },
    ],
  },
  {
    group: "Admin Tools",
    color: "#e53935",
    modules: [
      { key: "hr",            label: "HR Structure" },
      { key: "reports",       label: "Analytics & Reports" },
      { key: "workgroups",    label: "Workgroups" },
      { key: "users",         label: "Users & Roles" },
      { key: "control-panel", label: "Control Panel" },
      { key: "admin-logs",    label: "Admin Logs" },
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules.map(m => m.key));

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Permissions state ────────────────────────────────────────────────────
  const [perms, setPerms] = useState({ team_leader: new Set(ALL_MODULES), employee: new Set([]) });
  const [permSaving, setPermSaving] = useState(false);
  const [permDirty, setPermDirty] = useState(false);

  const fetchPerms = useCallback(async () => {
    try {
      const data = await rolePermissionsAPI.getAll();
      setPerms({
        team_leader: new Set(Array.isArray(data?.team_leader) ? data.team_leader : ALL_MODULES),
        employee:    new Set(Array.isArray(data?.employee)    ? data.employee    : []),
      });
      setPermDirty(false);
    } catch (e) { console.error("perms load:", e); }
  }, []);

  useEffect(() => { if (tab === 1) fetchPerms(); }, [tab, fetchPerms]);

  const togglePerm = (role, key) => {
    setPerms(prev => {
      const next = new Set(prev[role]);
      next.has(key) ? next.delete(key) : next.add(key);
      return { ...prev, [role]: next };
    });
    setPermDirty(true);
  };

  const setAll = (role, enabled) => {
    setPerms(prev => ({ ...prev, [role]: new Set(enabled ? ALL_MODULES : []) }));
    setPermDirty(true);
  };

  const savePerms = async () => {
    setPermSaving(true);
    try {
      await rolePermissionsAPI.update("team_leader", [...perms.team_leader]);
      await rolePermissionsAPI.update("employee",    [...perms.employee]);
      setPermDirty(false);
      setSnack({ open: true, message: "Permissions saved successfully", severity: "success" });
    } catch (e) {
      setSnack({ open: true, message: "Failed to save permissions", severity: "error" });
    } finally {
      setPermSaving(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (user) => {
    try {
      await usersAPI.delete(user.id);
      setDeleteConfirm(null);
      fetchUsers();
      setSnack({ open: true, message: `User "${user.name}" deleted`, severity: "success" });
    } catch (e) {
      setSnack({ open: true, message: "Failed to delete user", severity: "error" });
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await usersAPI.update(user.id, { ...user, status: newStatus });
      fetchUsers();
    } catch (e) {
      setSnack({ open: true, message: "Failed to update status", severity: "error" });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase())
      || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  useEffect(() => {
    setPage(0);
  }, [search, filterRole]);

  const roleCounts = {
    admin: users.filter(u => u.role === "admin").length,
    team_leader: users.filter(u => u.role === "team_leader").length,
    employee: users.filter(u => u.role === "employee").length,
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Users & Roles</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage team members, assign roles, and control access permissions
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchUsers} size="small">
              Refresh
            </Button>
            <Button variant="contained" startIcon={<Add />}
              onClick={() => { setEditUser(null); setFormOpen(true); }}>
              Add User
            </Button>
          </Box>
        </Box>

        {/* Role Summary Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {Object.entries(ROLE_CONFIG).map(([role, config]) => (
            <Grid item xs={12} sm={4} key={role}>
              <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer",
                border: filterRole === role ? `2px solid ${config.color}` : "2px solid transparent",
                transition: "all 0.15s" }}
                onClick={() => setFilterRole(filterRole === role ? "" : role)}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>
                        {config.label}s
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ mt: 0.5, color: config.color }}>
                        {roleCounts[role]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role === "admin" ? "Full system access" : role === "team_leader" ? "Team management" : "Standard access"}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: config.bg, color: config.color, width: 44, height: 44 }}>
                      {config.icon}
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ display: "flex", borderBottom: "1px solid #e0e0e0", mb: 2 }}>
          {["Users", "Permissions Matrix"].map((t, i) => (
            <Button key={t} onClick={() => setTab(i)} size="small"
              sx={{ mr: 1, borderRadius: 0, pb: 1, borderBottom: tab === i ? "2px solid #1976d2" : "2px solid transparent",
                color: tab === i ? "primary.main" : "text.secondary", fontWeight: tab === i ? 600 : 400 }}>
              {t}
            </Button>
          ))}
        </Box>

        {/* ── Users Tab ── */}
        {tab === 0 && (
          <Paper sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            {/* Toolbar */}
            <Box sx={{ p: 2, display: "flex", gap: 2, borderBottom: "1px solid #e0e0e0" }}>
              <TextField size="small" placeholder="Search users..." value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />,
                  endAdornment: search && <IconButton size="small" onClick={() => setSearch("")}><Close fontSize="small" /></IconButton>,
                }}
                sx={{ width: 260, "& fieldset": { borderRadius: 3 } }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Role</InputLabel>
                <Select value={filterRole} label="Role" onChange={e => setFilterRole(e.target.value)}>
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="team_leader">Team Leader</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ ml: "auto", alignSelf: "center" }}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <ScrollableTable
                totalCount={filteredUsers.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
                                  <Table>

                                  <TableHead sx={{ bgcolor: "#f5f7fa" }} style={{ display: "table-header-group" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                          {search || filterRole ? "No users match your filters" : "No users yet. Add your first team member!"}
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(u => {
                      const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.employee;
                      return (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                badgeContent={
                                  <Box sx={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    bgcolor: u.status === "active" ? "#4caf50" : "#bdbdbd",
                                    border: "2px solid white",
                                  }} />
                                }>
                                <Avatar sx={{ width: 38, height: 38, bgcolor: getColor(u.name), fontSize: "0.9rem" }}>
                                  {(u.name || "?").charAt(0)}
                                </Avatar>
                              </Badge>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={rc.icon}
                              label={rc.label}
                              size="small"
                              sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 600, "& .MuiChip-icon": { color: rc.color } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Business sx={{ fontSize: 14, color: "text.secondary" }} />
                              <Typography variant="body2">{u.department || "—"}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {u.phone && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
                                <Typography variant="caption">{u.phone}</Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={u.status === "active"}
                                  onChange={() => handleToggleStatus(u)}
                                  size="small"
                                  color="success"
                                />
                              }
                              label={
                                <Typography variant="caption" color={u.status === "active" ? "success.main" : "text.secondary"}>
                                  {u.status === "active" ? "Active" : "Inactive"}
                                </Typography>
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit User">
                              <IconButton size="small" onClick={() => { setEditUser(u); setFormOpen(true); }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton size="small" color="error" onClick={() => setDeleteConfirm(u)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </Paper>
        )}

        {/* ── Permissions Matrix Tab ── */}
        {tab === 1 && (
          <Paper sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>

            {/* Header bar */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Shield fontSize="small" color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">Role Permissions Matrix</Typography>
                {permDirty && (
                  <Chip label="Unsaved changes" size="small" color="warning" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="outlined" onClick={fetchPerms} startIcon={<Refresh sx={{ fontSize: 14 }} />}>
                  Reset
                </Button>
                <Button size="small" variant="contained" color="primary"
                  onClick={savePerms} disabled={!permDirty || permSaving}
                  startIcon={permSaving ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: 14 }} />}>
                  {permSaving ? "Saving…" : "Save Permissions"}
                </Button>
              </Box>
            </Box>

            <ScrollableTable>
                              <Table>

                              <TableHead style={{ display: "table-header-group" }} sx={{ bgcolor: "#f5f7fa" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Module / Feature</TableCell>

                    {/* Admin — locked */}
                    <TableCell align="center" sx={{ fontWeight: 600, minWidth: 150 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 0.5 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "#ffeef0", color: "#e53935" }}>
                          <AdminPanelSettings sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="caption" fontWeight={700} color="#e53935">Admin</Typography>
                        <Chip label={`${ALL_MODULES.length}/${ALL_MODULES.length}`} size="small"
                          sx={{ fontSize: 10, height: 18, bgcolor: "#e8f5e9", color: "#388e3c" }} />
                      </Box>
                    </TableCell>

                    {/* Team Leader — editable */}
                    <TableCell align="center" sx={{ fontWeight: 600, minWidth: 160 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 0.5 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "#e3f2fd", color: "#1976d2" }}>
                          <ManageAccounts sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="caption" fontWeight={700} color="#1976d2">Team Leader</Typography>
                        <Chip label={`${perms.team_leader.size}/${ALL_MODULES.length}`} size="small"
                          sx={{ fontSize: 10, height: 18, bgcolor: "#e3f2fd", color: "#1976d2" }} />
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                          <Button size="small" onClick={() => setAll("team_leader", true)}
                            sx={{ fontSize: 9, py: 0.2, px: 0.8, minWidth: 0, lineHeight: 1.5, bgcolor: "#e8f5e9", color: "#388e3c", "&:hover": { bgcolor: "#c8e6c9" } }}>
                            All
                          </Button>
                          <Button size="small" onClick={() => setAll("team_leader", false)}
                            sx={{ fontSize: 9, py: 0.2, px: 0.8, minWidth: 0, lineHeight: 1.5, bgcolor: "#ffebee", color: "#d32f2f", "&:hover": { bgcolor: "#ffcdd2" } }}>
                            None
                          </Button>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Employee — editable */}
                    <TableCell align="center" sx={{ fontWeight: 600, minWidth: 160 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 0.5 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "#e8f5e9", color: "#43a047" }}>
                          <Person sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="caption" fontWeight={700} color="#43a047">Employee</Typography>
                        <Chip label={`${perms.employee.size}/${ALL_MODULES.length}`} size="small"
                          sx={{ fontSize: 10, height: 18, bgcolor: "#e8f5e9", color: "#43a047" }} />
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                          <Button size="small" onClick={() => setAll("employee", true)}
                            sx={{ fontSize: 9, py: 0.2, px: 0.8, minWidth: 0, lineHeight: 1.5, bgcolor: "#e8f5e9", color: "#388e3c", "&:hover": { bgcolor: "#c8e6c9" } }}>
                            All
                          </Button>
                          <Button size="small" onClick={() => setAll("employee", false)}
                            sx={{ fontSize: 9, py: 0.2, px: 0.8, minWidth: 0, lineHeight: 1.5, bgcolor: "#ffebee", color: "#d32f2f", "&:hover": { bgcolor: "#ffcdd2" } }}>
                            None
                          </Button>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {MODULE_GROUPS.map(({ group, color, modules }) => [
                    /* Group separator row */
                    <TableRow key={`group-${group}`}>
                      <TableCell colSpan={4} sx={{ py: 0.75, px: 2, bgcolor: color + "12", borderBottom: "none" }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color, letterSpacing: 0.8, textTransform: "uppercase", fontSize: 10 }}>
                          {group}
                        </Typography>
                      </TableCell>
                    </TableRow>,

                    /* Module rows */
                    ...modules.map(({ key, label }) => (
                      <TableRow key={key} hover sx={{ "&:last-child td": { borderBottom: "1px solid #f0f0f0" } }}>
                        <TableCell sx={{ pl: 3 }}>
                          <Typography variant="body2" fontWeight={500}>{label}</Typography>
                        </TableCell>

                        {/* Admin — always on, locked */}
                        <TableCell align="center">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            <Switch checked={true} disabled size="small"
                              sx={{ "& .MuiSwitch-thumb": { bgcolor: "#43a047" }, "& .MuiSwitch-track": { bgcolor: "#a5d6a7 !important" } }} />
                            <Lock sx={{ fontSize: 11, color: "#bdbdbd" }} />
                          </Box>
                        </TableCell>

                        {/* Team Leader */}
                        <TableCell align="center">
                          <Switch
                            checked={perms.team_leader.has(key)}
                            onChange={() => togglePerm("team_leader", key)}
                            size="small"
                            color="primary"
                          />
                        </TableCell>

                        {/* Employee */}
                        <TableCell align="center">
                          <Switch
                            checked={perms.employee.has(key)}
                            onChange={() => togglePerm("employee", key)}
                            size="small"
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    )),
                  ])}
                </TableBody>
              </Table>
            </ScrollableTable>

            {/* Footer */}
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#f8f9fa", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Switch checked size="small" color="success" disabled sx={{ transform: "scale(0.75)" }} />
                  <Typography variant="caption" color="text.secondary">Enabled</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Switch checked={false} size="small" disabled sx={{ transform: "scale(0.75)" }} />
                  <Typography variant="caption" color="text.secondary">Disabled</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Lock sx={{ fontSize: 14, color: "#bdbdbd" }} />
                  <Typography variant="caption" color="text.secondary">Admin always has full access</Typography>
                </Box>
              </Box>
              <Button size="small" variant="contained" color="primary"
                onClick={savePerms} disabled={!permDirty || permSaving}
                startIcon={permSaving ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: 14 }} />}>
                {permSaving ? "Saving…" : "Save Permissions"}
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* User Form Dialog */}
      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        existing={editUser}
        onSaved={fetchUsers}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
            </Snackbar>
    </DashboardLayout>
  );
}
