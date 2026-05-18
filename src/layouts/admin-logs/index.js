/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Card, Grid, Typography, Chip, Avatar, Tabs, Tab,
  Table, TableHead, TableBody, TableRow, TableCell,
  CircularProgress, TextField, Select, MenuItem, FormControl,
  InputLabel, Button, Alert, Tooltip, Paper, Divider,
} from "@mui/material";
import {
  Refresh, Search, FilterList, History, Download, Close,
  CheckCircle, Login, Task, AccessTime, Delete, Edit,
  PersonOutline, SupervisorAccount, AdminPanelSettings, Person,
  FiberManualRecord, DevicesOther,
} from "@mui/icons-material";
import Icon from "@mui/material/Icon";
import { notificationsAPI, activityLogsAPI } from "services/api";
import { useAuth } from "context/AuthContext";

// ── Config ────────────────────────────────────────────────────────────────
const ACTION_META = {
  login:      { icon: "login",        color: "#1976d2", bg: "#e3f2fd", label: "Login"       },
  create:     { icon: "add_task",     color: "#388e3c", bg: "#e8f5e9", label: "Created"     },
  update:     { icon: "edit",         color: "#f57c00", bg: "#fff3e0", label: "Updated"     },
  complete:   { icon: "check_circle", color: "#388e3c", bg: "#e8f5e9", label: "Completed"   },
  start:      { icon: "play_arrow",   color: "#0288d1", bg: "#e1f5fe", label: "Started"     },
  assign:     { icon: "person_add",   color: "#7b1fa2", bg: "#f3e5f5", label: "Assigned"    },
  delete:     { icon: "delete",       color: "#d32f2f", bg: "#ffebee", label: "Deleted"     },
  log_time:   { icon: "timer",        color: "#f57c00", bg: "#fff3e0", label: "Time Logged" },
  comment:    { icon: "chat",         color: "#0288d1", bg: "#e1f5fe", label: "Comment"     },
  default:    { icon: "info",         color: "#546e7a", bg: "#eceff1", label: "Activity"    },
};
const NOTIF_META = {
  task_assigned:  { icon: "task_alt",        color: "#388e3c", bg: "#e8f5e9", label: "Task Assigned" },
  task_created:   { icon: "add_task",        color: "#388e3c", bg: "#e8f5e9", label: "Task Created"  },
  task_completed: { icon: "check_circle",    color: "#388e3c", bg: "#e8f5e9", label: "Completed"     },
  email_task:     { icon: "mark_email_read", color: "#0288d1", bg: "#e1f5fe", label: "Email Task"    },
  lead:           { icon: "person_add",      color: "#7b1fa2", bg: "#f3e5f5", label: "Lead"          },
  deal:           { icon: "handshake",       color: "#388e3c", bg: "#e8f5e9", label: "Deal"          },
  call:           { icon: "call",            color: "#d32f2f", bg: "#ffebee", label: "Call"          },
  system:         { icon: "info",            color: "#546e7a", bg: "#eceff1", label: "System"        },
  default:        { icon: "notifications",   color: "#0288d1", bg: "#e1f5fe", label: "Notice"        },
};
const ROLE_META = {
  super_admin:  { label: "Super Admin",  color: "#d32f2f", icon: <AdminPanelSettings sx={{ fontSize: 14 }} /> },
  admin:        { label: "Admin",        color: "#e65100", icon: <AdminPanelSettings sx={{ fontSize: 14 }} /> },
  team_leader:  { label: "Team Leader",  color: "#1565c0", icon: <SupervisorAccount sx={{ fontSize: 14 }} /> },
  employee:     { label: "Employee",     color: "#2e7d32", icon: <PersonOutline sx={{ fontSize: 14 }} /> },
};

function timeAgo(d) {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
const avatarColor = (n = "") => { const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00"]; let s=0; for (let c of n) s+=c.charCodeAt(0); return C[s%C.length]; };
const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

// ── Role badge ────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_META[role] || { label: role, color: "#90a4ae", icon: <Person sx={{ fontSize: 14 }} /> };
  return (
    <Chip icon={m.icon} label={m.label} size="small"
      sx={{ bgcolor: m.color + "18", color: m.color, fontWeight: 700, fontSize: 10, height: 20, "& .MuiChip-icon": { color: m.color } }} />
  );
}

export default function AdminLogs() {
  const { currentUser } = useAuth();
  const [tab, setTab]         = useState(0); // 0=Activity, 1=Notifications, 2=Login History
  const [logs, setLogs]       = useState([]);
  const [notifs, setNotifs]   = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginPage, setLoginPage] = useState(0);
  const [loginRowsPerPage, setLoginRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [logsPage, setLogsPage] = useState(0);
  const [logsRowsPerPage, setLogsRowsPerPage] = useState(25);
  const [notifsPage, setNotifsPage] = useState(0);
  const [notifsRowsPerPage, setNotifsRowsPerPage] = useState(25);

  // Filters — shared
  const [search, setSearch]         = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  // Filter option lists
  const [userList, setUserList]     = useState([]);
  const [roleList, setRoleList]     = useState([]);
  const [moduleList, setModuleList] = useState([]);
  const [actionList, setActionList] = useState([]);
  const [notifUsers, setNotifUsers] = useState([]);
  const [notifTypes, setNotifTypes] = useState([]);

  const ADMIN_ROLES = ["admin", "super_admin", "team_leader"];
  if (!ADMIN_ROLES.includes(currentUser?.role)) {
    return (
      <DashboardLayout><DashboardNavbar />
        <Box sx={{ p: 4, textAlign: "center" }}><Alert severity="error">Access denied — Admin or Team Leader only.</Alert></Box>
      </DashboardLayout>
    );
  }

  const fetchActivity = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { limit: 500 };
      if (filterUser) params.user  = filterUser;
      if (filterRole) params.role  = filterRole;
      if (filterType) params.action = filterType;
      if (fromDate)   params.from  = fromDate;
      if (toDate)     params.to    = toDate;
      const res = await activityLogsAPI.getAll(params);
      setLogs(Array.isArray(res?.records) ? res.records : (Array.isArray(res) ? res : []));
      if (res.users)   setUserList(res.users);
      if (res.roles)   setRoleList(res.roles);
      if (res.modules) setModuleList(res.modules);
      if (res.actions) setActionList(res.actions);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filterUser, filterRole, filterType, fromDate, toDate]);

  const fetchLoginHistory = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { limit: 1000, action: "login" };
      if (filterUser) params.user = filterUser;
      if (filterRole) params.role = filterRole;
      if (fromDate)   params.from = fromDate;
      if (toDate)     params.to   = toDate;
      const res = await activityLogsAPI.getAll(params);
      const all = Array.isArray(res?.records) ? res.records : (Array.isArray(res) ? res : []);
      setLoginLogs(all.filter(l => l.action === "login"));
      if (res.users) setUserList(res.users);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filterUser, filterRole, fromDate, toDate]);

  const fetchNotifs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { limit: 300, all: "1" };
      if (filterUser) params.user  = filterUser;
      if (filterType) params.type  = filterType;
      if (fromDate)   params.from  = fromDate;
      if (toDate)     params.to    = toDate + "T23:59:59";
      const res = await notificationsAPI.getLogs(params);
      setNotifs(Array.isArray(res.data) ? res.data : []);
      if (res.users) setNotifUsers(res.users);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [filterUser, filterType, fromDate, toDate]);

  useEffect(() => {
    if (tab === 0) fetchActivity();
    else if (tab === 1) fetchNotifs();
    else fetchLoginHistory();
  }, [tab, fetchActivity, fetchNotifs, fetchLoginHistory]);

  useEffect(() => {
    setLogsPage(0);
  }, [search, filterUser, filterRole, filterType, fromDate, toDate]);

  useEffect(() => {
    setNotifsPage(0);
  }, [search, filterUser, filterType, fromDate, toDate]);

  const clearFilters = () => {
    setSearch(""); setFilterUser(""); setFilterRole(""); setFilterType(""); setFromDate(""); setToDate("");
  };

  const refresh = () => tab === 0 ? fetchActivity() : fetchNotifs();

  // Search filtering (client-side)
  const filteredLogs = search
    ? logs.filter(l =>
        [l.detail, l.user_name, l.action, l.module, l.entity_title].join(" ").toLowerCase().includes(search.toLowerCase()))
    : logs;
  const filteredNotifs = search
    ? notifs.filter(n => [n.message, n.user, n.type].join(" ").toLowerCase().includes(search.toLowerCase()))
    : notifs;

  // Stats
  const totalActivity = logs.length;
  const userCount     = new Set(logs.map(l => l.user_name)).size;
  const loginCount    = logs.filter(l => l.action === "login").length;
  const completeCount = logs.filter(l => l.action === "complete").length;

  // Login history helpers
  const filteredLoginLogs = loginLogs.filter(l => {
    if (!search) return true;
    return [l.user_name, l.user_role, l.ip, l.detail].join(" ").toLowerCase().includes(search.toLowerCase());
  });
  // Group login logs by user for the "last seen" summary
  const loginByUser = React.useMemo(() => {
    const map = {};
    for (const l of loginLogs) {
      if (!map[l.user_name]) map[l.user_name] = { user_name: l.user_name, user_role: l.user_role, logins: [] };
      map[l.user_name].logins.push(l);
    }
    return Object.values(map).sort((a, b) => new Date(b.logins[0]?.created_at) - new Date(a.logins[0]?.created_at));
  }, [loginLogs]);

  const exportCSV = () => {
    const data = tab === 0 ? filteredLogs : filteredNotifs;
    if (!data.length) return;
    const headers = tab === 0
      ? ["Date","User","Role","Action","Module","Entity","Detail"]
      : ["Date","User","Type","Message","Read"];
    const rows = tab === 0
      ? data.map(l => [new Date(l.created_at).toLocaleString(), l.user_name, l.user_role, l.action, l.module, l.entity_title, `"${(l.detail||"").replace(/"/g,'""')}"`])
      : data.map(n => [new Date(n.created_at).toLocaleString(), n.user, n.type, `"${(n.message||"").replace(/"/g,'""')}"`, n.read]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `logs-${tab===0?"activity":"notifications"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ── */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ bgcolor: "#1976d2", borderRadius: "12px", p: 1.2, display: "flex" }}>
              <History sx={{ color: "#fff", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1a2332">Activity Logs</Typography>
              <Typography variant="body2" color="text.secondary">Complete audit trail — all users, all roles</Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" size="small" startIcon={<Download />} onClick={exportCSV} sx={{ textTransform: "none" }}>Export CSV</Button>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={refresh} disabled={loading} sx={{ textTransform: "none" }}>Refresh</Button>
          </Box>
        </Box>

        {/* ── Stats ── */}
        <Grid container spacing={2} mb={2.5}>
          {[
            { label: "Total Events",  value: totalActivity,  color: "#1976d2" },
            { label: "Active Users",  value: userCount,       color: "#388e3c" },
            { label: "Logins Today",  value: loginCount,      color: "#f57c00" },
            { label: "Tasks Done",    value: completeCount,   color: "#7b1fa2" },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card sx={{ p: 2, borderLeft: `4px solid ${s.color}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", fontSize: 10 }}>{s.label}</Typography>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Tabs ── */}
        <Box sx={{ borderBottom: "2px solid #eef1f5", mb: 2.5 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); clearFilters(); }} sx={{ minHeight: 40 }}>
            <Tab label="🔍 Activity Log (All Users)" sx={{ textTransform: "none", fontWeight: 700, fontSize: 13, minHeight: 40 }} />
            <Tab label="🔔 Notifications Log" sx={{ textTransform: "none", fontWeight: 700, fontSize: 13, minHeight: 40 }} />
            <Tab label="🔐 Login History" sx={{ textTransform: "none", fontWeight: 700, fontSize: 13, minHeight: 40 }} />
          </Tabs>
        </Box>

        {/* ── Filters ── */}
        <Card sx={{ p: 2, mb: 2.5, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <FilterList fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={700}>Filters</Typography>
            <Box flex={1} />
            <Button size="small" startIcon={<Close fontSize="small" />} onClick={clearFilters} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Clear All</Button>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select value={filterUser} label="User" onChange={e => setFilterUser(e.target.value)}>
                  <MenuItem value=""><em>All Users</em></MenuItem>
                  {(tab === 0 ? userList : notifUsers).filter(u => u && u !== "all").map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {tab === 0 && (
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select value={filterRole} label="Role" onChange={e => setFilterRole(e.target.value)}>
                    <MenuItem value=""><em>All Roles</em></MenuItem>
                    {["super_admin","admin","team_leader","employee"].map(r => (
                      <MenuItem key={r} value={r}>
                        <Box display="flex" alignItems="center" gap={0.5}>{ROLE_META[r]?.icon} {ROLE_META[r]?.label || r}</Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>{tab === 0 ? "Action" : "Type"}</InputLabel>
                <Select value={filterType} label={tab === 0 ? "Action" : "Type"} onChange={e => setFilterType(e.target.value)}>
                  <MenuItem value=""><em>All</em></MenuItem>
                  {tab === 0
                    ? actionList.map(a => <MenuItem key={a} value={a}>{ACTION_META[a]?.label || a}</MenuItem>)
                    : Object.entries(NOTIF_META).filter(([k]) => k !== "default").map(([k,v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <TextField fullWidth size="small" label="From" type="date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <TextField fullWidth size="small" label="To" type="date" InputLabelProps={{ shrink: true }} value={toDate} onChange={e => setToDate(e.target.value)} />
            </Grid>
          </Grid>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Activity Log Table ── */}
        {tab === 0 && (
          <Card sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
            ) : filteredLogs.length === 0 ? (
              <Box textAlign="center" py={8}>
                <History sx={{ fontSize: 56, color: "text.secondary", mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No activity logs yet</Typography>
                <Typography variant="body2" color="text.secondary">Actions by all users will appear here automatically.</Typography>
              </Box>
            ) : (
              <ScrollableTable sx={{ overflowX: "auto" }}
                totalCount={filteredLogs.length}
                page={logsPage}
                rowsPerPage={logsRowsPerPage}
                onPageChange={setLogsPage}
                onRowsPerPageChange={(rpp) => { setLogsRowsPerPage(rpp); setLogsPage(0); }}>
                <Table size="small">
                  <TableHead style={{ display: "table-header-group" }}>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>ACTION</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 140 }}>USER</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>ROLE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>MODULE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 280 }}>DETAIL</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 130 }}>TIME</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.slice(logsPage * logsRowsPerPage, (logsPage + 1) * logsRowsPerPage).map(log => {
                      const cfg = ACTION_META[log.action] || ACTION_META.default;
                      return (
                        <TableRow key={log.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon sx={{ fontSize: 15, color: cfg.color }}>{cfg.icon}</Icon>
                              </Box>
                              <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 18 }} />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Avatar sx={{ width: 26, height: 26, fontSize: 10, bgcolor: avatarColor(log.user_name || "?"), flexShrink: 0 }}>
                                {getInitials(log.user_name || "?")}
                              </Avatar>
                              <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.8rem" }}>{log.user_name || "—"}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {log.user_role ? <RoleBadge role={log.user_role} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip label={log.module || "—"} size="small" variant="outlined" sx={{ fontSize: 10, height: 18, color: "text.secondary" }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "#37474f" }}>{log.detail || "—"}</Typography>
                            {log.entity_title && log.detail && !log.detail.includes(log.entity_title) && (
                              <Typography variant="caption" color="text.secondary">→ {log.entity_title}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" display="block">{timeAgo(log.created_at)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, opacity: 0.7 }}>
                              {log.created_at ? new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </Card>
        )}

        {/* ── Notifications Log Table ── */}
        {tab === 1 && (
          <Card sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
            ) : filteredNotifs.length === 0 ? (
              <Box textAlign="center" py={8}>
                <History sx={{ fontSize: 56, color: "text.secondary", mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No notifications found</Typography>
              </Box>
            ) : (
              <ScrollableTable
                totalCount={filteredNotifs.length}
                page={notifsPage}
                rowsPerPage={notifsRowsPerPage}
                onPageChange={setNotifsPage}
                onRowsPerPageChange={(rpp) => { setNotifsRowsPerPage(rpp); setNotifsPage(0); }}>
                <Table size="small">
                  <TableHead style={{ display: "table-header-group" }}>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>TYPE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 130 }}>USER</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 300 }}>MESSAGE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>ENTITY</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 130 }}>TIME</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredNotifs.slice(notifsPage * notifsRowsPerPage, (notifsPage + 1) * notifsRowsPerPage).map(n => {
                      const cfg = NOTIF_META[n.type] || NOTIF_META.default;
                      return (
                        <TableRow key={n.id} hover sx={{ bgcolor: n.read ? "inherit" : "rgba(25,118,210,0.03)" }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon sx={{ fontSize: 15, color: cfg.color }}>{cfg.icon}</Icon>
                              </Box>
                              <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, height: 18 }} />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.75}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: avatarColor(n.user || "?") }}>
                                {getInitials(n.user || "?")}
                              </Avatar>
                              <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.78rem" }}>
                                {n.user && n.user !== "all" ? n.user : <em style={{ color: "#90a4ae" }}>broadcast</em>}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{n.message || "—"}</Typography>
                            {n.title && n.title !== n.message && <Typography variant="caption" color="text.secondary">{n.title}</Typography>}
                          </TableCell>
                          <TableCell>
                            {n.entity_type ? <Chip label={n.entity_type} size="small" variant="outlined" sx={{ fontSize: 9, height: 16, color: "text.secondary" }} /> : "—"}
                          </TableCell>
                          <TableCell>
                            <Chip label={n.read ? "Read" : "Unread"} size="small"
                              sx={{ bgcolor: n.read ? "#e8f5e9" : "#fff3e0", color: n.read ? "#388e3c" : "#e65100", fontWeight: 700, fontSize: 10, height: 18 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{timeAgo(n.created_at)}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </Card>
        )}

        {/* ── Login History Tab ── */}
        {tab === 2 && (
          <Box>
            {/* User summary cards */}
            {loginByUser.length > 0 && (
              <Box display="flex" gap={1.5} flexWrap="wrap" mb={2.5}>
                {loginByUser.map(u => {
                  const lastLogin = u.logins[0];
                  const minsAgo   = lastLogin ? (Date.now() - new Date(lastLogin.created_at)) / 60000 : Infinity;
                  const isRecent  = minsAgo < 60;
                  return (
                    <Card key={u.user_name} sx={{ p: 1.5, borderRadius: "12px", minWidth: 180, flex: "1 1 180px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: isRecent ? "1.5px solid #a5d6a7" : "1.5px solid #e8edf2" }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ position: "relative" }}>
                          <Avatar sx={{ width: 34, height: 34, fontSize: 12, bgcolor: avatarColor(u.user_name) }}>
                            {getInitials(u.user_name)}
                          </Avatar>
                          {isRecent && (
                            <FiberManualRecord sx={{ position: "absolute", bottom: -1, right: -1, fontSize: 12, color: "#43a047", filter: "drop-shadow(0 0 2px #fff)" }} />
                          )}
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.2 }} noWrap>{u.user_name}</Typography>
                          <RoleBadge role={u.user_role} />
                        </Box>
                      </Box>
                      <Box mt={1}>
                        <Typography sx={{ fontSize: "0.68rem", color: "#90a4ae" }}>Last login</Typography>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: isRecent ? "#2e7d32" : "#546e7a" }}>
                          {timeAgo(lastLogin?.created_at)}
                        </Typography>
                        <Typography sx={{ fontSize: "0.65rem", color: "#bdbdbd" }}>
                          {u.logins.length} login{u.logins.length !== 1 ? "s" : ""} total
                        </Typography>
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            )}

            {/* Login detail table */}
            <Card sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              {loading ? (
                <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
              ) : filteredLoginLogs.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Login sx={{ fontSize: 56, color: "text.secondary", mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">No login records yet</Typography>
                  <Typography variant="body2" color="text.secondary">Every sign-in will be recorded here automatically.</Typography>
                </Box>
              ) : (
                <ScrollableTable
                  totalCount={filteredLoginLogs.length}
                  page={loginPage}
                  rowsPerPage={loginRowsPerPage}
                  onPageChange={setLoginPage}
                  onRowsPerPageChange={(rpp) => { setLoginRowsPerPage(rpp); setLoginPage(0); }}>
                  <Table size="small">
                    <TableHead style={{ display: "table-header-group" }}>
                      <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 160 }}>USER</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>ROLE</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary", minWidth: 160 }}>LOGIN TIME</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>IP ADDRESS</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: "text.secondary" }}>STATUS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLoginLogs
                        .slice(loginPage * loginRowsPerPage, (loginPage + 1) * loginRowsPerPage)
                        .map((log, idx) => {
                          const minsAgo = (Date.now() - new Date(log.created_at)) / 60000;
                          const isRecent = minsAgo < 60;
                          const rowNum = loginPage * loginRowsPerPage + idx + 1;
                          return (
                            <TableRow key={log.id} hover sx={{ bgcolor: isRecent ? "rgba(56,142,60,0.03)" : "inherit" }}>
                              <TableCell>
                                <Typography sx={{ fontSize: "0.75rem", color: "#bdbdbd", fontWeight: 600 }}>{rowNum}</Typography>
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box sx={{ position: "relative", flexShrink: 0 }}>
                                    <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: avatarColor(log.user_name || "?") }}>
                                      {getInitials(log.user_name || "?")}
                                    </Avatar>
                                    {isRecent && (
                                      <FiberManualRecord sx={{ position: "absolute", bottom: -1, right: -1, fontSize: 10, color: "#43a047" }} />
                                    )}
                                  </Box>
                                  <Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.2 }}>{log.user_name || "—"}</Typography>
                                    <Typography sx={{ fontSize: "0.68rem", color: "#90a4ae" }}>{log.detail?.replace(/ signed in$/, "") || ""}</Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {log.user_role ? <RoleBadge role={log.user_role} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#37474f" }}>
                                  {log.created_at ? new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                                </Typography>
                                <Typography sx={{ fontSize: "0.68rem", color: isRecent ? "#2e7d32" : "#90a4ae" }}>
                                  {timeAgo(log.created_at)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {log.ip ? (
                                  <Chip label={log.ip} size="small" variant="outlined"
                                    sx={{ fontSize: "0.68rem", height: 20, color: "#546e7a", borderColor: "#e0e0e0", fontFamily: "monospace" }} />
                                ) : (
                                  <Typography sx={{ fontSize: "0.75rem", color: "#bdbdbd" }}>—</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {isRecent ? (
                                  <Chip size="small" label="Recent" icon={<FiberManualRecord sx={{ fontSize: "8px !important", color: "#43a047 !important" }} />}
                                    sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                                ) : (
                                  <Chip size="small" label="Logged In"
                                    sx={{ bgcolor: "#f5f5f5", color: "#78909c", fontWeight: 600, fontSize: "0.65rem", height: 20 }} />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              )}
            </Card>
          </Box>
        )}

        {/* ── Row count ── */}
        <Box mt={1.5} display="flex" justifyContent="flex-end">
          <Typography variant="caption" color="text.secondary">
            Showing {tab === 0 ? filteredLogs.length : tab === 1 ? filteredNotifs.length : filteredLoginLogs.length} records
          </Typography>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
