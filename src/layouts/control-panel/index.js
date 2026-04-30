/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { controlPanelAPI, usersAPI, rolePermissionsAPI } from "services/api";
import {
  Box, Typography, Card, CardContent, Grid, Button, IconButton, Chip, Avatar,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Snackbar, Alert, Divider, LinearProgress, Tooltip,
  List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Badge,
} from "@mui/material";
import {
  Settings, People, Speed, Language, ManageAccounts, Security,
  Add, Delete, Edit, Refresh, CheckCircle, Cancel, Warning, Info,
  Storage, Memory, Computer, Timer, Email, Lock, Public, Translate,
  Schedule, ClearAll, ExpandMore, Person, Group, VpnKey, DevicesOther,
  History, Upload, ToggleOn, ToggleOff, Save, RestartAlt, Shield,
  TrendingUp, DataUsage, Hub, Circle, LockPerson,
} from "@mui/icons-material";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtBytes = (mb) => mb > 1024 ? `${(mb/1024).toFixed(1)} GB` : `${mb} MB`;
const roleColor = { super_admin:"error", admin:"warning", team_leader:"info", employee:"success" };

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — MANAGE USERS
// ─────────────────────────────────────────────────────────────────────────────
function ManageUsers() {
  const [subTab, setSubTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [groupDialog, setGroupDialog] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", permissions: [], members: [] });
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [importDialog, setImportDialog] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [usersPage, setUsersPage] = useState(0);
  const [usersRpp, setUsersRpp]   = useState(25);
  const [histPage, setHistPage]   = useState(0);
  const [histRpp, setHistRpp]     = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, g, h] = await Promise.all([
        usersAPI.getAll(), controlPanelAPI.getUserGroups(), controlPanelAPI.getLoginHistory({ limit: 100 })
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setGroups(Array.isArray(g) ? g : []);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setUsersPage(0); }, [search, roleFilter]);

  const handleToggleStatus = async (user) => {
    try {
      await usersAPI.update(user.id, { status: user.status === "active" ? "inactive" : "active" });
      setUsers(u => u.map(x => x.id === user.id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x));
      setSnack({ open: true, msg: "User status updated", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await usersAPI.delete(id);
      setUsers(u => u.filter(x => x.id !== id));
      setSnack({ open: true, msg: "User deleted", sev: "info" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const handleRoleChange = async (user, role) => {
    try {
      await usersAPI.updateRole(user.id, role);
      setUsers(u => u.map(x => x.id === user.id ? { ...x, role } : x));
      setSnack({ open: true, msg: `Role updated to ${role}`, sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const openGroupDialog = (g = null) => {
    setEditGroup(g);
    setGroupForm(g ? { name: g.name, description: g.description || "", permissions: g.permissions || [], members: g.members || [] }
      : { name: "", description: "", permissions: [], members: [] });
    setGroupDialog(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (editGroup) {
        await controlPanelAPI.updateUserGroup(editGroup.id, groupForm);
        setGroups(g => g.map(x => x.id === editGroup.id ? { ...x, ...groupForm } : x));
      } else {
        const n = await controlPanelAPI.createUserGroup(groupForm);
        setGroups(g => [n, ...g]);
      }
      setGroupDialog(false);
      setSnack({ open: true, msg: editGroup ? "Group updated" : "Group created", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const handleDeleteGroup = async (id) => {
    try {
      await controlPanelAPI.deleteUserGroup(id);
      setGroups(g => g.filter(x => x.id !== id));
      setSnack({ open: true, msg: "Group deleted", sev: "info" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const filtered = users.filter(u => {
    const match = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return match && (roleFilter === "all" || u.role === roleFilter);
  });

  const ROLES = ["super_admin","admin","team_leader","employee"];
  const PERMS = ["crm:read","crm:write","tasks:read","tasks:write","users:read","users:write","reports:read","timeman:read","timeman:write","admin:access"];

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ borderBottom: "1px solid #e0e0e0", mb: 3 }}>
        <Tab icon={<People fontSize="small" />} label="User List" iconPosition="start" sx={{ minHeight:40, textTransform:"none" }} />
        <Tab icon={<Group fontSize="small" />} label="User Groups" iconPosition="start" sx={{ minHeight:40, textTransform:"none" }} />
        <Tab icon={<Shield fontSize="small" />} label="Access Levels" iconPosition="start" sx={{ minHeight:40, textTransform:"none" }} />
        <Tab icon={<History fontSize="small" />} label="Login History" iconPosition="start" sx={{ minHeight:40, textTransform:"none" }} />
        <Tab icon={<Upload fontSize="small" />} label="User Import" iconPosition="start" sx={{ minHeight:40, textTransform:"none" }} />
      </Tabs>

      {/* ── User List ── */}
      {subTab === 0 && (
        <Box>
          <Box sx={{ display:"flex", gap: 2, mb: 2, flexWrap:"wrap" }}>
            <TextField size="small" placeholder="Search users..." value={search}
              onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} label="Role" onChange={e => setRoleFilter(e.target.value)}>
                <MenuItem value="all">All Roles</MenuItem>
                {ROLES.map(r => <MenuItem key={r} value={r}>{r.replace("_"," ")}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ flex:1 }} />
            <Button variant="outlined" startIcon={<Upload />} onClick={() => setImportDialog(true)}>Import CSV</Button>
            <Chip label={`${users.length} total`} color="primary" variant="outlined" />
          </Box>
          {loading ? <CircularProgress /> : (
            <ScrollableTable component={Paper} sx={{ borderRadius:2 }}
              totalCount={filtered.length}
              page={usersPage}
              rowsPerPage={usersRpp}
              onPageChange={(e, p) => setUsersPage(p)}
              onRowsPerPageChange={(e) => { setUsersRpp(parseInt(e.target.value, 10)); setUsersPage(0); }}
            >
              <Table size="small">
                <TableHead style={{ display: "table-header-group" }}>
                  <TableRow sx={{ bgcolor:"#f5f5f5" }}>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Last Login</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(usersPage * usersRpp, (usersPage + 1) * usersRpp).map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                          <Avatar sx={{ width:32, height:32, bgcolor:`${roleColor[u.role] || "info"}.main`, fontSize:"0.8rem" }}>
                            {(u.name||"?").charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">{u.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell>
                      <TableCell>
                        <Select size="small" value={u.role} onChange={e => handleRoleChange(u, e.target.value)}
                          sx={{ fontSize:"0.78rem", height:28 }}>
                          {ROLES.map(r => <MenuItem key={r} value={r} sx={{ fontSize:"0.78rem" }}>{r.replace("_"," ")}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell><Typography variant="body2">{u.department || "—"}</Typography></TableCell>
                      <TableCell>
                        <Switch size="small" checked={u.status !== "inactive"}
                          onChange={() => handleToggleStatus(u)} color="success" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </Box>
      )}

      {/* ── User Groups ── */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ display:"flex", justifyContent:"flex-end", mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => openGroupDialog()}>New Group</Button>
          </Box>
          {groups.length === 0 ? (
            <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>
              <Group sx={{ fontSize:48, opacity:0.3, mb:1 }} />
              <Typography>No user groups created yet</Typography>
              <Button variant="outlined" sx={{ mt:2 }} onClick={() => openGroupDialog()}>Create First Group</Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {groups.map(g => (
                <Grid item xs={12} md={6} key={g.id}>
                  <Card sx={{ borderRadius:2 }}>
                    <CardContent>
                      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:1 }}>
                        <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                          <Avatar sx={{ bgcolor:"#1976d2", width:36, height:36 }}><Group /></Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">{g.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{(g.members||[]).length} members</Typography>
                          </Box>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => openGroupDialog(g)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteGroup(g.id)}><Delete fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                      {g.description && <Typography variant="body2" color="text.secondary" sx={{ mb:1 }}>{g.description}</Typography>}
                      <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.5 }}>
                        {(g.permissions||[]).map(p => <Chip key={p} size="small" label={p} variant="outlined" color="primary" sx={{ fontSize:"0.65rem" }} />)}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ── Access Levels ── */}
      {subTab === 2 && <AccessLevelsTab />}

      {/* ── Login History ── */}
      {subTab === 3 && (
        <Box>
          {history.length === 0 ? (
            <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>
              <History sx={{ fontSize:48, opacity:0.3, mb:1 }} />
              <Typography>No login history recorded yet</Typography>
              <Typography variant="caption">Login events will appear here after users sign in.</Typography>
            </Box>
          ) : (
            <ScrollableTable component={Paper} sx={{ borderRadius:2 }}
              totalCount={history.length}
              page={histPage}
              rowsPerPage={histRpp}
              onPageChange={(e, p) => setHistPage(p)}
              onRowsPerPageChange={(e) => { setHistRpp(parseInt(e.target.value, 10)); setHistPage(0); }}
            >
              <Table size="small">
                <TableHead style={{ display: "table-header-group" }}>
                  <TableRow sx={{ bgcolor:"#f5f5f5" }}>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>IP Address</strong></TableCell>
                    <TableCell><strong>Device</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.slice(histPage * histRpp, (histPage + 1) * histRpp).map(h => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.user_name}</TableCell>
                      <TableCell><Typography variant="caption">{new Date(h.created_at).toLocaleString()}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{h.ip || "127.0.0.1"}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{h.device || "Browser"}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" label={h.status || "success"} color={h.status === "failed" ? "error" : "success"} sx={{ fontSize:"0.65rem" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </Box>
      )}

      {/* ── User Import ── */}
      {subTab === 4 && (
        <Box sx={{ maxWidth: 680 }}>
          <Card sx={{ borderRadius:2, mb:2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb:1 }}>Import Users from CSV</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
                Paste CSV data with columns: <code>name,email,role,department,phone</code>
              </Typography>
              <TextField fullWidth multiline rows={8} placeholder={`name,email,role,department,phone\nJohn Doe,john@example.com,employee,IT,+91-9999999999\nJane Smith,jane@example.com,team_leader,HR,+91-8888888888`}
                value={csvText} onChange={e => setCsvText(e.target.value)}
                sx={{ mb:2, fontFamily:"monospace", "& textarea": { fontSize:"0.82rem" } }} />
              <Box sx={{ display:"flex", gap:2 }}>
                <Button variant="contained" startIcon={<Upload />}
                  onClick={() => { setSnack({ open:true, msg:"CSV import parsed — feature connects to /api/users/bulk-import", sev:"info" }); }}>
                  Import Users
                </Button>
                <Button variant="outlined" onClick={() => setCsvText("")}>Clear</Button>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius:2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb:1 }}>Sample CSV Template</Typography>
              <Box sx={{ bgcolor:"#f5f5f5", p:1.5, borderRadius:1, fontFamily:"monospace", fontSize:"0.78rem" }}>
                name,email,role,department,phone<br/>
                Brandon Cheema,brandon@backoffice.com,admin,Management,+91-9999999999<br/>
                Govind Kaushik,govind@backoffice.com,team_leader,IT,+91-8888888888
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editGroup ? "Edit Group" : "Create User Group"}</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size="small" label="Group Name" sx={{ mb:2 }}
            value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
          <TextField fullWidth size="small" label="Description" sx={{ mb:2 }}
            value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} />
          <Typography variant="caption" color="text.secondary" sx={{ mb:1, display:"block" }}>Permissions</Typography>
          <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.5, mb:2 }}>
            {PERMS.map(p => (
              <Chip key={p} size="small" label={p} clickable
                onClick={() => setGroupForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x=>x!==p) : [...f.permissions,p] }))}
                sx={{ bgcolor: groupForm.permissions.includes(p) ? "#1976d2" : "#eee", color: groupForm.permissions.includes(p) ? "white" : "#555" }} />
            ))}
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Members</InputLabel>
            <Select multiple value={groupForm.members} label="Members"
              onChange={e => setGroupForm(f => ({ ...f, members: e.target.value }))}
              renderValue={sel => `${sel.length} selected`}>
              {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} — {u.role}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGroup} disabled={!groupForm.name}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS LEVELS — interactive permissions matrix
// ─────────────────────────────────────────────────────────────────────────────

// All permission groups with their module keys (must match role-permissions keys)
const ACCESS_GROUPS = [
  {
    group: "CRM",
    color: "#7b1fa2",
    items: [
      { key: "crm-leads",     label: "Leads — View & Manage",      sa: true, admin: true },
      { key: "crm-deals",     label: "Deals — View & Manage",      sa: true, admin: true },
      { key: "crm-contacts",  label: "Contacts — View & Manage",   sa: true, admin: true },
      { key: "crm-companies", label: "Companies — View & Manage",  sa: true, admin: true },
      { key: "crm-analytics", label: "CRM Analytics",              sa: true, admin: true },
      { key: "crm-activities",label: "Activities & Events",        sa: true, admin: true },
      { key: "crm-stream",    label: "Activity Stream / Feed",     sa: true, admin: true },
    ],
  },
  {
    group: "HR & People",
    color: "#0288d1",
    items: [
      { key: "hr-structure",  label: "HR Structure & Departments", sa: true, admin: true },
      { key: "employees",     label: "Employee Directory",         sa: true, admin: true },
    ],
  },
  {
    group: "Tasks & Projects",
    color: "#388e3c",
    items: [
      { key: "tasks",         label: "Tasks — View & Work",        sa: true, admin: true },
      { key: "workgroups",    label: "Workgroups",                 sa: true, admin: true },
      { key: "workflows",     label: "Workflows & Automation",     sa: true, admin: true },
      { key: "projects",      label: "Projects & Rules",           sa: true, admin: true },
    ],
  },
  {
    group: "Communication",
    color: "#f57c00",
    items: [
      { key: "mail",          label: "Mail — Inbox & Compose",     sa: true, admin: true },
      { key: "messenger",     label: "Messenger / Chat",           sa: true, admin: true },
    ],
  },
  {
    group: "Reports & Time",
    color: "#c62828",
    items: [
      { key: "work-reports",  label: "Work Reports",               sa: true, admin: true },
      { key: "timeman",       label: "Time Management",            sa: true, admin: true },
    ],
  },
  {
    group: "Admin & System",
    color: "#37474f",
    items: [
      { key: "admin-logs",    label: "Activity Logs",              sa: true, admin: true },
      { key: "automation",    label: "Task Automation",            sa: true, admin: true },
      { key: "devops",        label: "Developer / DevOps Tools",   sa: true, admin: true },
    ],
  },
];

const ROLE_COLS = [
  { key: "super_admin", label: "Super Admin", color: "#d32f2f", bg: "#ffebee", locked: true,  desc: "Full system access — cannot be restricted" },
  { key: "admin",       label: "Admin",       color: "#e65100", bg: "#fff3e0", locked: true,  desc: "Full access — cannot be restricted" },
  { key: "team_leader", label: "Team Leader", color: "#1565c0", bg: "#e3f2fd", locked: false, desc: "Toggle to grant or revoke access" },
  { key: "employee",    label: "Employee",    color: "#2e7d32", bg: "#e8f5e9", locked: false, desc: "Toggle to grant or revoke access" },
];

function AccessLevelsTab() {
  const [perms, setPerms]   = useState({ team_leader: [], employee: [] });
  const [original, setOriginal] = useState({ team_leader: [], employee: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [snack, setSnack]   = useState({ open: false, msg: "", sev: "success" });
  const [expandedGroup, setExpandedGroup] = useState(null);

  useEffect(() => {
    rolePermissionsAPI.getAll()
      .then(res => {
        const d = { team_leader: res.data?.team_leader || [], employee: res.data?.employee || [] };
        setPerms(d); setOriginal(JSON.parse(JSON.stringify(d)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (role, key) => {
    setPerms(prev => {
      const list = [...(prev[role] || [])];
      const idx = list.indexOf(key);
      if (idx >= 0) list.splice(idx, 1); else list.push(key);
      setChanged(true);
      return { ...prev, [role]: list };
    });
  };

  const toggleGroup = (role, keys, enable) => {
    setPerms(prev => {
      let list = [...(prev[role] || [])];
      if (enable) { keys.forEach(k => { if (!list.includes(k)) list.push(k); }); }
      else { list = list.filter(k => !keys.includes(k)); }
      setChanged(true);
      return { ...prev, [role]: list };
    });
  };

  const toggleAll = (role, enable) => {
    const allKeys = ACCESS_GROUPS.flatMap(g => g.items.map(i => i.key));
    setPerms(prev => ({ ...prev, [role]: enable ? allKeys : [] }));
    setChanged(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        rolePermissionsAPI.update("team_leader", perms.team_leader),
        rolePermissionsAPI.update("employee", perms.employee),
      ]);
      setOriginal(JSON.parse(JSON.stringify(perms)));
      setChanged(false);
      setSnack({ open: true, msg: "✅ Access levels saved! Changes apply on next login.", sev: "success" });
    } catch (e) {
      setSnack({ open: true, msg: "Failed to save", sev: "error" });
    }
    setSaving(false);
  };

  const reset = () => { setPerms(JSON.parse(JSON.stringify(original))); setChanged(false); };

  const has = (role, key) => {
    if (role === "super_admin" || role === "admin") return true;
    return (perms[role] || []).includes(key);
  };

  const allKeys = ACCESS_GROUPS.flatMap(g => g.items.map(i => i.key));
  const countEnabled = (role) => {
    if (role === "super_admin" || role === "admin") return allKeys.length;
    return (perms[role] || []).filter(k => allKeys.includes(k)).length;
  };

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      {/* ── Top bar ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="#1a2332">Role-Based Access Control</Typography>
          <Typography variant="caption" color="text.secondary">
            Toggle permissions for Team Leaders and Employees. Admins always have full access.
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {changed && <Chip label="Unsaved changes" size="small" sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />}
          <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={reset} disabled={!changed || saving} sx={{ textTransform: "none", borderRadius: "8px" }}>Reset</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={save} disabled={!changed || saving}
            sx={{ textTransform: "none", borderRadius: "8px", bgcolor: "#1976d2", "&:hover": { bgcolor: "#1565c0" } }}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </Box>
      </Box>

      {/* ── Role header row ── */}
      <ScrollableTable component={Paper} sx={{ borderRadius: "12px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", overflow: "visible" }}>
        <Table size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead style={{ display: "table-header-group" }}>
            <TableRow sx={{ bgcolor: "#f8f9fb" }}>
              <TableCell sx={{ width: "34%", fontWeight: 700, fontSize: 12, color: "#546e7a", py: 1.5, pl: 2.5 }}>
                PERMISSION / MODULE
              </TableCell>
              {ROLE_COLS.map(col => (
                <TableCell key={col.key} align="center" sx={{ width: "16.5%", py: 1.5 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                    <Box sx={{ bgcolor: col.color, color: "#fff", borderRadius: "20px", px: 1.8, py: 0.4, fontSize: 11, fontWeight: 800, letterSpacing: 0.3 }}>
                      {col.label}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {countEnabled(col.key)}/{allKeys.length} access
                    </Typography>
                    {!col.locked && (
                      <Box display="flex" gap={0.5}>
                        <Typography onClick={() => toggleAll(col.key, true)}
                          sx={{ fontSize: 10, color: "#388e3c", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>All</Typography>
                        <Typography sx={{ fontSize: 10, color: "#bbb" }}>|</Typography>
                        <Typography onClick={() => toggleAll(col.key, false)}
                          sx={{ fontSize: 10, color: "#d32f2f", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>None</Typography>
                      </Box>
                    )}
                    {col.locked && (
                      <Chip label="Full Access" size="small" sx={{ height: 16, fontSize: 9, bgcolor: col.color + "20", color: col.color, fontWeight: 700 }} />
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {ACCESS_GROUPS.map((grp) => {
              const groupKeys = grp.items.map(i => i.key);
              const isExpanded = expandedGroup === grp.group || expandedGroup === null;
              return [
                /* Group header row */
                <TableRow key={`grp-${grp.group}`}
                  onClick={() => setExpandedGroup(expandedGroup === grp.group ? null : grp.group)}
                  sx={{ bgcolor: grp.color + "0d", cursor: "pointer", "&:hover": { bgcolor: grp.color + "18" }, borderTop: "2px solid " + grp.color + "30" }}>
                  <TableCell sx={{ py: 1, pl: 2.5 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 4, height: 18, bgcolor: grp.color, borderRadius: 1 }} />
                      <Typography fontWeight={800} fontSize={12} color={grp.color} textTransform="uppercase" letterSpacing={0.6}>
                        {grp.group}
                      </Typography>
                      <Chip label={`${grp.items.length} modules`} size="small"
                        sx={{ height: 16, fontSize: 9, bgcolor: grp.color + "20", color: grp.color }} />
                      <Typography sx={{ fontSize: 11, color: grp.color, ml: "auto", mr: 1 }}>{isExpanded ? "▲" : "▼"}</Typography>
                    </Box>
                  </TableCell>
                  {ROLE_COLS.map(col => {
                    const groupHas = col.locked
                      ? true
                      : groupKeys.every(k => (perms[col.key] || []).includes(k));
                    const groupSome = !col.locked && groupKeys.some(k => (perms[col.key] || []).includes(k));
                    return (
                      <TableCell key={col.key} align="center" sx={{ py: 0.8 }}>
                        {col.locked ? (
                          <CheckCircle sx={{ color: "#4caf50", fontSize: 18 }} />
                        ) : (
                          <Tooltip title={groupHas ? `Remove all ${grp.group} from ${col.label}` : `Grant all ${grp.group} to ${col.label}`}>
                            <Switch
                              size="small"
                              checked={groupHas}
                              indeterminate={!groupHas && groupSome}
                              onChange={e => { e.stopPropagation(); toggleGroup(col.key, groupKeys, !groupHas); }}
                              onClick={e => e.stopPropagation()}
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": { color: col.color },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: col.color },
                              }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>,

                /* Individual permission rows */
                ...(isExpanded ? grp.items.map((item, idx) => (
                  <TableRow key={item.key} hover sx={{ "&:hover": { bgcolor: "#fafbfc" } }}>
                    <TableCell sx={{ py: 1, pl: 4, borderLeft: `3px solid ${grp.color}30` }}>
                      <Typography fontSize={13} color="#37474f">{item.label}</Typography>
                      <Typography fontSize={10} color="#90a4ae" sx={{ fontFamily: "monospace" }}>{item.key}</Typography>
                    </TableCell>
                    {ROLE_COLS.map(col => (
                      <TableCell key={col.key} align="center" sx={{ py: 0.6 }}>
                        {col.locked ? (
                          <CheckCircle sx={{ color: "#4caf50", fontSize: 17 }} />
                        ) : (
                          <Tooltip title={has(col.key, item.key) ? `Revoke from ${col.label}` : `Grant to ${col.label}`}>
                            <Switch
                              size="small"
                              checked={has(col.key, item.key)}
                              onChange={() => toggle(col.key, item.key)}
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": { color: col.color },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: col.color },
                              }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )) : []),
              ];
            })}
          </TableBody>
        </Table>
      </ScrollableTable>

      {/* ── Legend ── */}
      <Box display="flex" gap={3} mt={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={0.7}>
          <CheckCircle sx={{ color: "#4caf50", fontSize: 16 }} />
          <Typography variant="caption" color="text.secondary">Always enabled (locked)</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.7}>
          <Box sx={{ width: 28, height: 14, bgcolor: "#1565c0", borderRadius: "7px" }} />
          <Typography variant="caption" color="text.secondary">Enabled for this role</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.7}>
          <Box sx={{ width: 28, height: 14, bgcolor: "#e0e0e0", borderRadius: "7px" }} />
          <Typography variant="caption" color="text.secondary">Not enabled</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.7}>
          <Lock sx={{ fontSize: 14, color: "#90a4ae" }} />
          <Typography variant="caption" color="text.secondary">Admin / Super Admin: permanently full access</Typography>
        </Box>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────
function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { const r = await controlPanelAPI.getPerformance(); setData(r); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(true), 10000); return () => clearInterval(t); }, [load]);

  if (loading) return <Box sx={{ display:"flex", justifyContent:"center", pt:6 }}><CircularProgress /></Box>;

  const { server, memory, cpu, database, process: proc } = data || {};

  const StatCard = ({ title, icon, color, children }) => (
    <Card sx={{ borderRadius:2, height:"100%", borderTop:`3px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
          <Box sx={{ color, display:"flex" }}>{icon}</Box>
          <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
          {refreshing && <CircularProgress size={12} sx={{ ml:"auto" }} />}
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  const StatRow = ({ label, value, sub }) => (
    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", py:0.75, borderBottom:"1px solid #f5f5f5" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Box sx={{ textAlign:"right" }}>
        <Typography variant="body2" fontWeight="medium">{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:3 }}>
        <Typography variant="body2" color="text.secondary">Auto-refreshes every 10 seconds</Typography>
        <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => load(true)}>Refresh Now</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb:3 }}>
        {/* Server Info */}
        <Grid item xs={12} md={6} lg={3}>
          <StatCard title="Server" icon={<Computer />} color="#1976d2">
            <StatRow label="Node.js" value={server?.node_version} />
            <StatRow label="Platform" value={`${server?.platform} (${server?.arch})`} />
            <StatRow label="Uptime" value={server?.uptime_formatted} />
            <StatRow label="Hostname" value={server?.hostname} />
            <StatRow label="Environment" value={proc?.env} />
            <StatRow label="Port" value={proc?.port} />
          </StatCard>
        </Grid>

        {/* Memory */}
        <Grid item xs={12} md={6} lg={3}>
          <StatCard title="Memory" icon={<Memory />} color="#9c27b0">
            <Box sx={{ mb:1.5 }}>
              <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.5 }}>
                <Typography variant="caption">RAM Usage</Typography>
                <Typography variant="caption" fontWeight="bold">{memory?.usage_percent}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={memory?.usage_percent || 0}
                color={memory?.usage_percent > 80 ? "error" : memory?.usage_percent > 60 ? "warning" : "success"} sx={{ height:8, borderRadius:4 }} />
            </Box>
            <StatRow label="Total RAM" value={fmtBytes(memory?.total_mb)} />
            <StatRow label="Used" value={fmtBytes(memory?.used_mb)} />
            <StatRow label="Free" value={fmtBytes(memory?.free_mb)} />
            <StatRow label="Heap Used" value={fmtBytes(memory?.heap_used_mb)} />
            <StatRow label="Heap Total" value={fmtBytes(memory?.heap_total_mb)} />
            <StatRow label="RSS" value={fmtBytes(memory?.rss_mb)} />
          </StatCard>
        </Grid>

        {/* CPU */}
        <Grid item xs={12} md={6} lg={3}>
          <StatCard title="CPU" icon={<Speed />} color="#f44336">
            <StatRow label="Cores" value={cpu?.cores} />
            <StatRow label="Model" value={cpu?.model?.split(" ").slice(0,3).join(" ")} />
            <Divider sx={{ my:1 }} />
            <Typography variant="caption" color="text.secondary">Load Average</Typography>
            {[["1 min", cpu?.load_1m], ["5 min", cpu?.load_5m], ["15 min", cpu?.load_15m]].map(([label, val]) => (
              <Box key={label} sx={{ mt:1 }}>
                <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.3 }}>
                  <Typography variant="caption">{label}</Typography>
                  <Typography variant="caption" fontWeight="bold">{val}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(parseFloat(val || 0) * 100 / cpu?.cores, 100)}
                  color={parseFloat(val) > cpu?.cores * 0.8 ? "error" : "primary"} sx={{ height:5, borderRadius:3 }} />
              </Box>
            ))}
          </StatCard>
        </Grid>

        {/* Database */}
        <Grid item xs={12} md={6} lg={3}>
          <StatCard title="Database" icon={<Storage />} color="#4caf50">
            <StatRow label="DB Type" value={database?.db_type} />
            <StatRow label="Total Records" value={database?.total_records?.toLocaleString()} />
            <Divider sx={{ my:1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:1 }}>Collections</Typography>
            <Box sx={{ maxHeight:180, overflowY:"auto" }}>
              {Object.entries(database?.collections || {}).map(([col, count]) => (
                <Box key={col} sx={{ display:"flex", justifyContent:"space-between", py:0.4, borderBottom:"1px solid #f5f5f5" }}>
                  <Typography variant="caption" color="text.secondary">{col}</Typography>
                  <Chip size="small" label={count} sx={{ height:18, fontSize:"0.6rem" }} />
                </Box>
              ))}
            </Box>
          </StatCard>
        </Grid>
      </Grid>

      {/* DB Server Stats Table (like Bitrix24) */}
      <Card sx={{ borderRadius:2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb:2 }}>
            <Storage sx={{ verticalAlign:"middle", mr:0.5, color:"#4caf50" }} />
            DB Server Statistics
          </Typography>
          <ScrollableTable>
            <Table size="small">
              <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor:"#f5f5f5" }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { name:"DB Engine", value:"JSON File DB (JsonDB)", status:"ok", note:"Lightweight JSON-based storage" },
                  { name:"Total Records", value:(database?.total_records||0).toLocaleString(), status:"ok", note:"Across all collections" },
                  { name:"Collections", value:Object.keys(database?.collections||{}).length, status:"ok", note:"Active collections" },
                  { name:"Server Uptime", value:server?.uptime_formatted, status:"ok", note:"Node.js process uptime" },
                  { name:"Memory Usage", value:`${memory?.usage_percent}%`, status:memory?.usage_percent>80?"warn":"ok", note:`${fmtBytes(memory?.used_mb)} of ${fmtBytes(memory?.total_mb)}` },
                  { name:"Heap Used", value:fmtBytes(memory?.heap_used_mb), status:memory?.heap_used_mb>512?"warn":"ok", note:`of ${fmtBytes(memory?.heap_total_mb)} heap total` },
                  { name:"CPU Cores", value:cpu?.cores, status:"ok", note:cpu?.model },
                  { name:"CPU Load (1m)", value:cpu?.load_1m, status:parseFloat(cpu?.load_1m)>cpu?.cores*0.8?"warn":"ok", note:"1-minute load average" },
                  { name:"Node.js Version", value:server?.node_version, status:"ok", note:"Runtime version" },
                  { name:"Process PID", value:proc?.pid, status:"ok", note:"Current process ID" },
                ].map(({ name, value, status, note }) => (
                  <TableRow key={name} hover>
                    <TableCell><Typography variant="body2" fontWeight="medium">{name}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{value}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                        {status === "ok" ? <CheckCircle sx={{ color:"#4caf50", fontSize:16 }} /> : <Warning sx={{ color:"#ff9800", fontSize:16 }} />}
                        <Typography variant="caption" color="text.secondary">{note}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTable>
        </CardContent>
      </Card>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — SYSTEM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open:false, msg:"", sev:"success" });

  useEffect(() => {
    controlPanelAPI.getSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const setModule = (key, value) => setSettings(s => ({ ...s, modules_enabled: { ...s.modules_enabled, [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await controlPanelAPI.updateSettings(settings);
      setSnack({ open:true, msg:"✅ Settings saved successfully!", sev:"success" });
    } catch (e) { setSnack({ open:true, msg:e.message, sev:"error" }); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display:"flex", justifyContent:"center", pt:6 }}><CircularProgress /></Box>;

  const Section = ({ title, icon, children }) => (
    <Accordion defaultExpanded sx={{ borderRadius:"8px !important", mb:2, "&:before":{ display:"none" }, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor:"#f8f9fa", borderRadius:1 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
          {icon}
          <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );

  const Row = ({ label, children, sub }) => (
    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", py:1.2, borderBottom:"1px solid #f5f5f5" }}>
      <Box>
        <Typography variant="body2">{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ minWidth: 220, textAlign:"right" }}>{children}</Box>
    </Box>
  );

  return (
    <Box>
      {/* General */}
      <Section title="General Settings" icon={<Settings sx={{ color:"#1976d2" }} />}>
        <Row label="Site Name" sub="Displayed in browser title and emails">
          <TextField size="small" value={settings?.site_name||""} onChange={e => set("site_name",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="Site Description">
          <TextField size="small" value={settings?.site_description||""} onChange={e => set("site_description",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="Maintenance Mode" sub="Blocks all non-admin access">
          <Switch checked={!!settings?.maintenance_mode} onChange={e => set("maintenance_mode",e.target.checked)} color="warning" />
        </Row>
        <Row label="Allow Self-Registration" sub="Users can sign up themselves">
          <Switch checked={!!settings?.allow_registration} onChange={e => set("allow_registration",e.target.checked)} />
        </Row>
      </Section>

      {/* Email / SMTP */}
      <Section title="Email & Notifications" icon={<Email sx={{ color:"#f44336" }} />}>
        <Row label="SMTP Host">
          <TextField size="small" value={settings?.smtp_host||""} onChange={e => set("smtp_host",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="SMTP Port">
          <TextField size="small" type="number" value={settings?.smtp_port||587} onChange={e => set("smtp_port",parseInt(e.target.value))} sx={{ width:120 }} />
        </Row>
        <Row label="SMTP Username">
          <TextField size="small" value={settings?.smtp_user||""} onChange={e => set("smtp_user",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="From Name">
          <TextField size="small" value={settings?.smtp_from_name||""} onChange={e => set("smtp_from_name",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="From Email">
          <TextField size="small" type="email" value={settings?.smtp_from_email||""} onChange={e => set("smtp_from_email",e.target.value)} sx={{ width:240 }} />
        </Row>
        <Row label="Email Notifications" sub="Send email alerts system-wide">
          <Switch checked={!!settings?.email_notifications} onChange={e => set("email_notifications",e.target.checked)} />
        </Row>
        <Row label="Email on Task Assign">
          <Switch checked={!!settings?.email_on_task_assign} onChange={e => set("email_on_task_assign",e.target.checked)} />
        </Row>
        <Row label="Email on Deal Update">
          <Switch checked={!!settings?.email_on_deal_update} onChange={e => set("email_on_deal_update",e.target.checked)} />
        </Row>
      </Section>

      {/* Security */}
      <Section title="Security" icon={<Lock sx={{ color:"#9c27b0" }} />}>
        <Row label="Session Timeout" sub="Minutes until auto-logout">
          <TextField size="small" type="number" value={settings?.session_timeout_minutes||480}
            onChange={e => set("session_timeout_minutes",parseInt(e.target.value))} sx={{ width:120 }}
            InputProps={{ endAdornment:<Typography variant="caption" sx={{ ml:0.5 }}>min</Typography> }} />
        </Row>
        <Row label="Max Login Attempts" sub="Before account is locked">
          <TextField size="small" type="number" value={settings?.max_login_attempts||5} onChange={e => set("max_login_attempts",parseInt(e.target.value))} sx={{ width:120 }} />
        </Row>
        <Row label="Minimum Password Length">
          <TextField size="small" type="number" value={settings?.password_min_length||8} onChange={e => set("password_min_length",parseInt(e.target.value))} sx={{ width:120 }} />
        </Row>
        <Row label="Require Strong Password" sub="Uppercase, numbers, symbols">
          <Switch checked={!!settings?.require_strong_password} onChange={e => set("require_strong_password",e.target.checked)} />
        </Row>
        <Row label="Two-Factor Authentication">
          <Switch checked={!!settings?.two_factor_auth} onChange={e => set("two_factor_auth",e.target.checked)} />
        </Row>
      </Section>

      {/* Modules */}
      <Section title="Modules" icon={<Hub sx={{ color:"#ff9800" }} />}>
        <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:1 }}>Enable or disable individual CRM modules</Typography>
        <Grid container spacing={1}>
          {Object.entries(settings?.modules_enabled || {}).map(([mod, enabled]) => (
            <Grid item xs={6} md={4} key={mod}>
              <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", p:1, bgcolor:"#f8f9fa", borderRadius:1 }}>
                <Typography variant="body2" sx={{ textTransform:"capitalize" }}>{mod}</Typography>
                <Switch size="small" checked={!!enabled} onChange={e => setModule(mod, e.target.checked)} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Cache */}
      <Section title="Cache Settings" icon={<DataUsage sx={{ color:"#4caf50" }} />}>
        <Row label="Enable Cache">
          <Switch checked={!!settings?.cache_enabled} onChange={e => set("cache_enabled",e.target.checked)} />
        </Row>
        <Row label="Cache TTL" sub="Time-to-live in seconds">
          <TextField size="small" type="number" value={settings?.cache_ttl_seconds||300} onChange={e => set("cache_ttl_seconds",parseInt(e.target.value))} sx={{ width:120 }}
            InputProps={{ endAdornment:<Typography variant="caption" sx={{ ml:0.5 }}>sec</Typography> }} />
        </Row>
        <Row label="Clear All Cache">
          <Button size="small" variant="outlined" color="warning" startIcon={<ClearAll />}
            onClick={async () => { await controlPanelAPI.clearCache(); setSnack({ open:true, msg:"Cache cleared!", sev:"success" }); }}>
            Clear Cache
          </Button>
        </Row>
      </Section>

      {/* Push Notifications */}
      <Section title="Notifications" icon={<Hub sx={{ color:"#00bcd4" }} />}>
        <Row label="Push Notifications">
          <Switch checked={!!settings?.push_notifications} onChange={e => set("push_notifications",e.target.checked)} />
        </Row>
      </Section>

      <Box sx={{ display:"flex", justifyContent:"flex-end", mt:3 }}>
        <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — LOCALIZATION
// ─────────────────────────────────────────────────────────────────────────────
function Localization() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open:false, msg:"", sev:"success" });

  useEffect(() => {
    controlPanelAPI.getSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await controlPanelAPI.updateSettings(settings);
      setSnack({ open:true, msg:"✅ Localization settings saved!", sev:"success" });
    } catch (e) { setSnack({ open:true, msg:e.message, sev:"error" }); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display:"flex", justifyContent:"center", pt:6 }}><CircularProgress /></Box>;

  const Row = ({ label, children, sub }) => (
    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", py:1.5, borderBottom:"1px solid #f5f5f5" }}>
      <Box>
        <Typography variant="body2">{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ minWidth:240, textAlign:"right" }}>{children}</Box>
    </Box>
  );

  const TIMEZONES = ["Asia/Kolkata","Asia/Dubai","Asia/Singapore","UTC","America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Europe/Paris","Australia/Sydney"];
  const DATE_FORMATS = ["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","D MMM YYYY","MMM D, YYYY"];
  const CURRENCIES = [
    { code:"INR", symbol:"₹", name:"Indian Rupee" },
    { code:"USD", symbol:"$", name:"US Dollar" },
    { code:"GBP", symbol:"£", name:"British Pound" },
    { code:"EUR", symbol:"€", name:"Euro" },
    { code:"AED", symbol:"د.إ", name:"UAE Dirham" },
    { code:"CAD", symbol:"CA$", name:"Canadian Dollar" },
    { code:"AUD", symbol:"A$", name:"Australian Dollar" },
    { code:"SGD", symbol:"S$", name:"Singapore Dollar" },
  ];
  const LANGUAGES = [
    { code:"en", name:"English", flag:"🇬🇧" },
    { code:"hi", name:"Hindi", flag:"🇮🇳" },
    { code:"ar", name:"Arabic", flag:"🇦🇪" },
    { code:"fr", name:"French", flag:"🇫🇷" },
    { code:"de", name:"German", flag:"🇩🇪" },
    { code:"es", name:"Spanish", flag:"🇪🇸" },
    { code:"zh", name:"Chinese", flag:"🇨🇳" },
  ];

  return (
    <Box sx={{ maxWidth: 800 }}>
      {/* Language */}
      <Card sx={{ borderRadius:2, mb:2 }}>
        <CardContent>
          <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
            <Translate sx={{ color:"#1976d2" }} />
            <Typography variant="subtitle1" fontWeight="bold">Language</Typography>
          </Box>
          <Row label="Default Language" sub="System interface language">
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.default_language||"en"} onChange={e => set("default_language",e.target.value)}>
                {LANGUAGES.map(l => <MenuItem key={l.code} value={l.code}>{l.flag} {l.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Row>
          <Box sx={{ mt:2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:1 }}>Available Languages</Typography>
            <Box sx={{ display:"flex", flexWrap:"wrap", gap:1 }}>
              {LANGUAGES.map(l => (
                <Chip key={l.code} label={`${l.flag} ${l.name}`} size="small"
                  variant={settings?.default_language === l.code ? "filled" : "outlined"}
                  color={settings?.default_language === l.code ? "primary" : "default"}
                  onClick={() => set("default_language", l.code)} />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card sx={{ borderRadius:2, mb:2 }}>
        <CardContent>
          <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
            <Schedule sx={{ color:"#9c27b0" }} />
            <Typography variant="subtitle1" fontWeight="bold">Date & Time</Typography>
          </Box>
          <Row label="Timezone" sub="All dates & times will use this zone">
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.timezone||"Asia/Kolkata"} onChange={e => set("timezone",e.target.value)}>
                {TIMEZONES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Row>
          <Row label="Date Format" sub={`Preview: ${settings?.date_format === "YYYY-MM-DD" ? "2026-04-18" : settings?.date_format === "MM/DD/YYYY" ? "04/18/2026" : "18/04/2026"}`}>
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.date_format||"DD/MM/YYYY"} onChange={e => set("date_format",e.target.value)}>
                {DATE_FORMATS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
          </Row>
          <Row label="Time Format">
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.time_format||"12h"} onChange={e => set("time_format",e.target.value)}>
                <MenuItem value="12h">12-hour (2:30 PM)</MenuItem>
                <MenuItem value="24h">24-hour (14:30)</MenuItem>
              </Select>
            </FormControl>
          </Row>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card sx={{ borderRadius:2, mb:2 }}>
        <CardContent>
          <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
            <Public sx={{ color:"#4caf50" }} />
            <Typography variant="subtitle1" fontWeight="bold">Currency & Regional</Typography>
          </Box>
          <Row label="Default Currency">
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.currency||"INR"} onChange={e => {
                const c = CURRENCIES.find(x => x.code === e.target.value);
                set("currency", e.target.value);
                set("currency_symbol", c?.symbol || "₹");
              }}>
                {CURRENCIES.map(c => <MenuItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Row>
          <Row label="Currency Symbol" sub="Auto-set from currency selection">
            <TextField size="small" value={settings?.currency_symbol||"₹"} onChange={e => set("currency_symbol",e.target.value)} sx={{ width:100 }} />
          </Row>
          <Row label="Number Format" sub="How numbers are formatted">
            <FormControl size="small" sx={{ width:240 }}>
              <Select value={settings?.number_format||"1,00,000.00"} onChange={e => set("number_format",e.target.value)}>
                <MenuItem value="1,00,000.00">1,00,000.00 (Indian)</MenuItem>
                <MenuItem value="100,000.00">100,000.00 (Western)</MenuItem>
                <MenuItem value="100.000,00">100.000,00 (European)</MenuItem>
              </Select>
            </FormControl>
          </Row>

          {/* Currency Preview */}
          <Box sx={{ mt:2, p:1.5, bgcolor:"#f8f9fa", borderRadius:1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:0.5 }}>Preview</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {settings?.currency_symbol}{settings?.number_format === "100.000,00" ? "1.00.000,00" : settings?.number_format === "100,000.00" ? "1,00,000.00" : "1,00,000.00"} {settings?.currency}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display:"flex", justifyContent:"flex-end" }}>
        <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Localization"}
        </Button>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONTROL PANEL PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ControlPanel() {
  const [tab, setTab] = useState(0);

  const TABS = [
    { label:"Manage Users", icon:<ManageAccounts />, color:"#1976d2" },
    { label:"Performance", icon:<Speed />, color:"#f44336" },
    { label:"System Settings", icon:<Settings />, color:"#ff9800" },
    { label:"Localization", icon:<Language />, color:"#4caf50" },
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt:2, mb:4 }}>
        {/* Header */}
        <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3 }}>
          <Box sx={{ p:1.5, bgcolor:"#1a237e", borderRadius:2, display:"flex" }}>
            <Settings sx={{ color:"white", fontSize:28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">Control Panel</Typography>
            <Typography variant="body2" color="text.secondary">System administration — Users, Performance, Settings, Localization</Typography>
          </Box>
          <Chip label="Super Admin Only" color="error" size="small" sx={{ ml:"auto" }} />
        </Box>

        {/* Tab Navigation (styled like Bitrix24 control panel) */}
        <Box sx={{ display:"flex", gap:1, mb:3, flexWrap:"wrap" }}>
          {TABS.map((t, i) => (
            <Button key={i} variant={tab === i ? "contained" : "outlined"}
              startIcon={t.icon} onClick={() => setTab(i)}
              sx={{
                borderRadius:2, textTransform:"none", fontWeight:tab === i ? "bold" : "normal",
                bgcolor: tab === i ? t.color : "white",
                borderColor: t.color, color: tab === i ? "white" : t.color,
                "&:hover": { bgcolor: tab === i ? t.color : `${t.color}11` },
              }}>
              {t.label}
            </Button>
          ))}
        </Box>

        {/* Content */}
        <Box sx={{ bgcolor:"white", borderRadius:2, p:3, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", minHeight:500 }}>
          {tab === 0 && <ManageUsers />}
          {tab === 1 && <Performance />}
          {tab === 2 && <SystemSettings />}
          {tab === 3 && <Localization />}
        </Box>
 
      </Box>
    </DashboardLayout>
  );
}
