/* eslint-disable */
import { useState, useEffect, useCallback } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAuth } from "context/AuthContext";
import { usersAPI, reportsAPI, leadsAPI, dealsAPI, invoicesAPI, tasksAPI } from "services/api";
import { useNavigate } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_OPTIONS = ["employee", "team_leader", "admin", "super_admin"];
const ROLE_COLORS  = { admin: "error", team_leader: "warning", employee: "info", super_admin: "secondary" };

const DEPARTMENTS = [
  "Accounting", "Bookkeeping", "Tax", "Payroll", "Audit",
  "IT", "Sales", "Marketing", "HR", "Operations", "Finance",
  "Customer Support", "Management", "Legal", "Other",
];

const ROLE_META = {
  employee: {
    label: "Employee",
    icon: "person",
    color: "#1976d2",
    bg: "#e3f2fd",
    gradient: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
    desc: "Regular staff member with access to assigned modules",
    permissions: ["View CRM", "Manage Tasks", "View Reports", "Chat"],
  },
  team_leader: {
    label: "Team Leader",
    icon: "supervisor_account",
    color: "#f57c00",
    bg: "#fff3e0",
    gradient: "linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)",
    desc: "Leads a team, can assign tasks and view team reports",
    permissions: ["All Employee Permissions", "Assign Tasks", "View Team Reports", "Manage Team"],
  },
  admin: {
    label: "Admin",
    icon: "admin_panel_settings",
    color: "#c62828",
    bg: "#ffebee",
    gradient: "linear-gradient(135deg, #c62828 0%, #ef5350 100%)",
    desc: "System administrator with full CRM and user management access",
    permissions: ["All Team Leader Permissions", "User Management", "System Settings", "All Reports"],
  },
};

const EMPTY_FORM = {
  name: "", email: "", password: "Welcome@123",
  role: "employee", department: "", phone: "",
  reporting_to: "", status: "active", notes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const avatarBg = (name = "") => {
  const C = ["#1976d2","#388e3c","#f57c00","#7b1fa2","#c62828","#00838f","#ad1457","#558b2f"];
  let s = 0; for (let c of name) s += c.charCodeAt(0);
  return C[s % C.length];
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, title, value, subtitle, color = "info" }) {
  return (
    <Card sx={{ p: 3 }}>
      <MDBox display="flex" alignItems="center" gap={2}>
        <MDBox display="flex" alignItems="center" justifyContent="center"
          width={52} height={52} borderRadius="12px"
          bgColor={color} variant="gradient" shadow="md" sx={{ flexShrink: 0 }}>
          <Icon sx={{ color: "white", fontSize: 26 }}>{icon}</Icon>
        </MDBox>
        <MDBox>
          <MDTypography variant="h4" fontWeight="bold">{value}</MDTypography>
          <MDTypography variant="button" fontWeight="bold" color="text">{title}</MDTypography>
          {subtitle && <MDTypography variant="caption" color="text" display="block">{subtitle}</MDTypography>}
        </MDBox>
      </MDBox>
    </Card>
  );
}

// ── Create / Edit User Dialog ─────────────────────────────────────────────────
function UserFormDialog({ open, onClose, onSave, initial, allUsers = [], defaultRole = "employee" }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, role: defaultRole });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY_FORM, ...initial, password: "" } : { ...EMPTY_FORM, role: defaultRole });
  }, [open, initial, defaultRole]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const isValid = form.name.trim() && form.email.trim() && (isEdit || form.password.trim());

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {}
    setSaving(false);
  };

  const meta = ROLE_META[form.role] || ROLE_META.employee;

  // Managers are team_leaders or admins
  const managers = allUsers.filter(u => ["team_leader","admin","super_admin"].includes(u.role));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
      {/* Coloured header */}
      <Box sx={{ background: meta.gradient, px: 3, py: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon sx={{ color: "#fff", fontSize: 26 }}>{meta.icon}</Icon>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>
            {isEdit ? `Edit ${meta.label}` : `Create New ${meta.label}`}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>{meta.desc}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}><Icon>close</Icon></IconButton>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2.5}>
          {/* Basic info */}
          <Grid item xs={12}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.6px", mb: 1.5 }}>
              Basic Information
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Full Name *" value={form.name} onChange={set("name")} size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ fontSize: 18, color: "#90a4ae" }}>person</Icon></InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email Address *" type="email" value={form.email} onChange={set("email")} size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ fontSize: 18, color: "#90a4ae" }}>email</Icon></InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Phone Number" value={form.phone} onChange={set("phone")} size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ fontSize: 18, color: "#90a4ae" }}>phone</Icon></InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Department" value={form.department} onChange={set("department")} size="small">
              <MenuItem value=""><em>Select department</em></MenuItem>
              {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Role & Reporting */}
          <Grid item xs={12}>
            <Divider />
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.6px", mt: 1.5, mb: 1.5 }}>
              Role & Hierarchy
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Role *" value={form.role} onChange={set("role")} size="small">
              {Object.entries(ROLE_META).map(([key, m]) => (
                <MenuItem key={key} value={key}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: m.color }} />
                    {m.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Reports To" value={form.reporting_to} onChange={set("reporting_to")} size="small">
              <MenuItem value=""><em>None / Top Level</em></MenuItem>
              {managers.filter(u => !initial?.id || u.id !== initial.id).map(u => (
                <MenuItem key={u.id} value={u.name}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: avatarBg(u.name) }}>{getInitials(u.name)}</Avatar>
                    {u.name} ({u.role?.replace("_"," ")})
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Status" value={form.status} onChange={set("status")} size="small">
              <MenuItem value="active"><Box display="flex" alignItems="center" gap={1}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#4caf50" }} />Active</Box></MenuItem>
              <MenuItem value="inactive"><Box display="flex" alignItems="center" gap={1}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#9e9e9e" }} />Inactive</Box></MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Notes / Job Title" value={form.notes || ""} onChange={set("notes")} size="small"
              placeholder="e.g. Senior Accountant, Tax Specialist..." />
          </Grid>

          {/* Password */}
          <Grid item xs={12}>
            <Divider />
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.6px", mt: 1.5, mb: 1.5 }}>
              {isEdit ? "Change Password (leave blank to keep current)" : "Login Password"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={isEdit ? "New Password (optional)" : "Password *"}
              type={showPass ? "text" : "password"}
              value={form.password} onChange={set("password")} size="small"
              helperText={!isEdit ? "User can change this after first login" : ""}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Icon sx={{ fontSize: 18, color: "#90a4ae" }}>lock</Icon></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(s => !s)}>
                      <Icon sx={{ fontSize: 18 }}>{showPass ? "visibility_off" : "visibility"}</Icon>
                    </IconButton>
                  </InputAdornment>
                ),
              }} />
          </Grid>

          {/* Permissions preview */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: meta.bg, borderRadius: "10px", p: 1.5, mt: 0.5 }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: meta.color, mb: 0.75 }}>
                <Icon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }}>verified_user</Icon>
                {meta.label} Permissions
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {meta.permissions.map(p => (
                  <Chip key={p} label={p} size="small" sx={{ bgcolor: meta.color + "22", color: meta.color, fontSize: "0.65rem", fontWeight: 600, height: 20 }} />
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <MDButton variant="text" color="secondary" onClick={onClose}>Cancel</MDButton>
        <MDButton variant="gradient" onClick={handleSave} disabled={saving || !isValid}
          sx={{ background: meta.gradient, "&:hover": { opacity: 0.9 }, minWidth: 140 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : isEdit ? "Save Changes" : `Create ${meta.label}`}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

// ── Confirm Delete Dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = "Delete", confirmColor = "error" }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" PaperProps={{ sx: { borderRadius: "12px" } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon color="error">warning</Icon> {title}
      </DialogTitle>
      <DialogContent><MDTypography variant="body2">{body}</MDTypography></DialogContent>
      <DialogActions>
        <MDButton variant="text" color="secondary" onClick={onClose}>Cancel</MDButton>
        <MDButton variant="gradient" color={confirmColor} onClick={onConfirm}>{confirmLabel}</MDButton>
      </DialogActions>
    </Dialog>
  );
}

// ── Role Card (quick create button) ──────────────────────────────────────────
function RoleCard({ role, count, onCreate, users }) {
  const meta = ROLE_META[role];
  return (
    <Card sx={{ border: `2px solid ${meta.color}22`, overflow: "hidden", transition: "all 0.2s", "&:hover": { boxShadow: `0 8px 24px ${meta.color}33`, transform: "translateY(-2px)" } }}>
      {/* Top stripe */}
      <Box sx={{ height: 4, background: meta.gradient }} />
      <Box sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", background: meta.gradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${meta.color}44` }}>
            <Icon sx={{ color: "#fff", fontSize: 24 }}>{meta.icon}</Icon>
          </Box>
          <Box sx={{ bgcolor: meta.bg, borderRadius: "10px", px: 1.5, py: 0.5, textAlign: "right" }}>
            <Typography sx={{ fontSize: "1.6rem", fontWeight: 900, color: meta.color, lineHeight: 1 }}>{count}</Typography>
            <Typography sx={{ fontSize: "0.6rem", color: meta.color, fontWeight: 600, textTransform: "uppercase" }}>Active</Typography>
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: "#1a2332", mb: 0.5 }}>{meta.label}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "#78909c", mb: 2, lineHeight: 1.4 }}>{meta.desc}</Typography>

        {/* Mini permissions list */}
        <Box mb={2}>
          {meta.permissions.map(p => (
            <Box key={p} display="flex" alignItems="center" gap={0.75} mb={0.5}>
              <Icon sx={{ fontSize: 12, color: meta.color }}>check_circle</Icon>
              <Typography sx={{ fontSize: "0.7rem", color: "#546e7a" }}>{p}</Typography>
            </Box>
          ))}
        </Box>

        <MDButton fullWidth variant="gradient" size="small" onClick={onCreate}
          sx={{ background: meta.gradient, "&:hover": { opacity: 0.9 }, fontWeight: 700, textTransform: "none", borderRadius: "8px" }}>
          <Icon sx={{ mr: 0.5, fontSize: 16 }}>add</Icon>
          Create {meta.label}
        </MDButton>
      </Box>
    </Card>
  );
}

// ── User Row Card ─────────────────────────────────────────────────────────────
function UserRowCard({ user, onEdit, onDelete, onToggle, isSelf }) {
  const meta = ROLE_META[user.role] || ROLE_META.employee;
  return (
    <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: "1px solid #f0f4f8",
      "&:hover": { bgcolor: "#fafbfc" }, transition: "background 0.15s" }}>
      <Avatar sx={{ width: 38, height: 38, fontSize: 14, fontWeight: 800, bgcolor: avatarBg(user.name), mr: 1.5, flexShrink: 0 }}>
        {getInitials(user.name)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a2332" }}>{user.name}</Typography>
          {isSelf && <Chip label="You" size="small" sx={{ height: 16, fontSize: "0.58rem", bgcolor: "#e8f5e9", color: "#388e3c" }} />}
        </Box>
        <Typography sx={{ fontSize: "0.7rem", color: "#78909c" }}>{user.email}</Typography>
        {(user.department || user.notes) && (
          <Typography sx={{ fontSize: "0.68rem", color: "#90a4ae" }}>{[user.department, user.notes].filter(Boolean).join(" · ")}</Typography>
        )}
        {user.reporting_to && (
          <Typography sx={{ fontSize: "0.65rem", color: "#90a4ae" }}>
            <Icon sx={{ fontSize: 11, verticalAlign: "middle", mr: 0.25 }}>account_tree</Icon>
            Reports to: {user.reporting_to}
          </Typography>
        )}
      </Box>
      <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
        <Chip label={meta.label} size="small"
          sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
        <Chip label={user.status || "active"} size="small"
          sx={{ bgcolor: user.status === "inactive" ? "#f5f5f5" : "#e8f5e9",
            color: user.status === "inactive" ? "#9e9e9e" : "#388e3c", fontSize: "0.63rem", height: 18 }} />
        <Tooltip title={isSelf ? "Cannot change own status" : user.status === "active" ? "Deactivate" : "Activate"}>
          <span>
            <Switch checked={user.status !== "inactive"} onChange={() => onToggle(user)}
              size="small" color="success" disabled={isSelf} />
          </span>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(user)} sx={{ color: "#546e7a" }}>
            <Icon fontSize="small">edit</Icon>
          </IconButton>
        </Tooltip>
        <Tooltip title={isSelf ? "Cannot delete yourself" : "Delete user"}>
          <span>
            <IconButton size="small" color="error" disabled={isSelf} onClick={() => onDelete(user)}>
              <Icon fontSize="small">delete</Icon>
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ── Main SuperAdminPanel ──────────────────────────────────────────────────────
export default function SuperAdminPanel() {
  const { currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("team");
  const [users, setUsers] = useState([]);
  const [crmData, setCrmData] = useState(null);
  const [workData, setWorkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formDialog, setFormDialog] = useState({ open: false, user: null, defaultRole: "employee" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const showSnack = (msg, severity = "success") => setSnack({ open: true, msg, severity });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, crm, work] = await Promise.all([
        usersAPI.getAll(),
        reportsAPI.getCRMOverview(),
        reportsAPI.getWorkSummary(),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setCrmData(crm);
      setWorkData(work);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={4} textAlign="center">
          <Icon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}>security</Icon>
          <MDTypography variant="h5">Super Admin Access Required</MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>This panel is restricted to Super Admin accounts only.</MDTypography>
          <MDButton variant="gradient" color="info" sx={{ mt: 2 }} onClick={() => navigate("/admin/dashboard")}>
            Go to Admin Dashboard
          </MDButton>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  const handleSaveUser = async (form) => {
    try {
      if (form.id) {
        const { password, ...updates } = form;
        const payload = password?.trim() ? { ...updates, password } : updates;
        await usersAPI.update(form.id, payload);
        showSnack(`✅ ${form.name} updated successfully`);
      } else {
        await usersAPI.create(form);
        showSnack(`✅ ${form.name} (${ROLE_META[form.role]?.label || form.role}) created successfully`);
      }
      await fetchAll();
    } catch (err) { showSnack(err.message || "Save failed", "error"); throw err; }
  };

  const handleDeleteUser = async () => {
    try {
      await usersAPI.delete(deleteDialog.user.id);
      showSnack(`${deleteDialog.user.name} deleted`);
      setDeleteDialog({ open: false, user: null });
      await fetchAll();
    } catch (err) { showSnack(err.message, "error"); }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await usersAPI.update(user.id, { status: newStatus });
      showSnack(`${user.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
      await fetchAll();
    } catch (err) { showSnack(err.message, "error"); }
  };

  const openCreate = (role) => setFormDialog({ open: true, user: null, defaultRole: role });
  const openEdit   = (user) => setFormDialog({ open: true, user, defaultRole: user.role });

  const filteredUsers = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    employee:    users.filter(u => u.role === "employee").length,
    team_leader: users.filter(u => u.role === "team_leader").length,
    admin:       users.filter(u => u.role === "admin").length,
    super_admin: users.filter(u => u.role === "super_admin").length,
    total:       users.length,
    active:      users.filter(u => u.status !== "inactive").length,
  };

  const TABS = [
    { id: "team",     label: "Team Management", icon: "groups" },
    { id: "overview", label: "System Overview",  icon: "dashboard" },
    { id: "system",   label: "System Info",      icon: "settings" },
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>

        {/* ── Header ── */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Chip label="SUPER ADMIN" color="error" size="small" icon={<Icon>security</Icon>} />
              <Chip label={`${counts.total} Users`} size="small" variant="outlined" />
            </Box>
            <MDTypography variant="h4" fontWeight="bold">System Control Panel</MDTypography>
            <MDTypography variant="body2" color="text">Welcome back, {currentUser?.name} — Full system access</MDTypography>
          </MDBox>
          <MDBox display="flex" gap={1}>
            <MDButton variant="outlined" color="error" size="small" onClick={() => navigate("/admin/dashboard")}>
              <Icon sx={{ mr: 0.5 }}>admin_panel_settings</Icon> Admin Dashboard
            </MDButton>
          </MDBox>
        </MDBox>

        {/* ── Tab Bar ── */}
        <Box sx={{ display: "flex", gap: 1, mb: 3, borderBottom: "2px solid #f0f4f8", pb: 0 }}>
          {TABS.map(t => (
            <Box key={t.id} onClick={() => setTab(t.id)}
              sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                px: 2.5, py: 1.25, cursor: "pointer", borderRadius: "8px 8px 0 0",
                fontWeight: 700, fontSize: "0.82rem",
                color: tab === t.id ? "#1976d2" : "#78909c",
                bgcolor: tab === t.id ? "#fff" : "transparent",
                borderBottom: tab === t.id ? "2px solid #1976d2" : "2px solid transparent",
                transition: "all 0.15s",
                "&:hover": { color: "#1976d2", bgcolor: "#fff" },
                mb: "-2px",
              }}>
              <Icon sx={{ fontSize: 18 }}>{t.icon}</Icon>
              {t.label}
            </Box>
          ))}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
        ) : (
          <>
            {/* ════════════════ TEAM MANAGEMENT TAB ════════════════ */}
            {tab === "team" && (
              <Box>
                {/* Summary stats */}
                <Grid container spacing={2} mb={3}>
                  {[
                    { label: "Total Team", value: counts.total, sub: `${counts.active} active`, icon: "groups", color: "info" },
                    { label: "Employees", value: counts.employee, sub: "Regular staff", icon: "person", color: "primary" },
                    { label: "Team Leaders", value: counts.team_leader, sub: "Department heads", icon: "supervisor_account", color: "warning" },
                    { label: "Admins", value: counts.admin + counts.super_admin, sub: "System admins", icon: "admin_panel_settings", color: "error" },
                  ].map(s => (
                    <Grid item xs={6} lg={3} key={s.label}>
                      <StatCard icon={s.icon} title={s.label} value={s.value} subtitle={s.sub} color={s.color} />
                    </Grid>
                  ))}
                </Grid>

                {/* ── Quick Create Cards ── */}
                <Box mb={3}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Icon sx={{ color: "#1976d2" }}>add_circle</Icon>
                    <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: "#1a2332" }}>Quick Create</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#90a4ae" }}>— Click a card to create that type of user</Typography>
                  </Box>
                  <Grid container spacing={2.5}>
                    {["employee", "team_leader", "admin"].map(role => (
                      <Grid item xs={12} md={4} key={role}>
                        <RoleCard
                          role={role}
                          count={counts[role]}
                          users={users}
                          onCreate={() => openCreate(role)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* ── Team Roster ── */}
                <Card sx={{ overflow: "hidden" }}>
                  {/* Toolbar */}
                  <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Icon sx={{ color: "#1976d2" }}>people</Icon>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>Team Roster</Typography>
                      <Chip label={filteredUsers.length} size="small" sx={{ height: 18, fontSize: "0.6rem" }} />
                    </Box>
                    <TextField size="small" placeholder="Search by name, email, department..."
                      value={search} onChange={e => setSearch(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ fontSize: 16 }}>search</Icon></InputAdornment>,
                        endAdornment: search && <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><Icon sx={{ fontSize: 14 }}>close</Icon></IconButton></InputAdornment> }}
                      sx={{ width: 260, "& fieldset": { borderRadius: "8px" } }} />
                    <TextField select size="small" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} sx={{ width: 150, "& fieldset": { borderRadius: "8px" } }}>
                      <MenuItem value="all">All Roles</MenuItem>
                      {Object.entries(ROLE_META).map(([k, m]) => (
                        <MenuItem key={k} value={k}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: m.color }} />{m.label}
                          </Box>
                        </MenuItem>
                      ))}
                      <MenuItem value="super_admin">Super Admin</MenuItem>
                    </TextField>
                    <MDButton variant="gradient" color="info" size="small" onClick={() => openCreate("employee")}
                      sx={{ textTransform: "none", borderRadius: "8px" }}>
                      <Icon sx={{ mr: 0.5, fontSize: 16 }}>add</Icon> New User
                    </MDButton>
                  </Box>

                  {/* Group by role */}
                  {roleFilter !== "all" ? (
                    // Flat list when filtered
                    filteredUsers.length === 0 ? (
                      <Box textAlign="center" py={5}>
                        <Icon sx={{ fontSize: 48, color: "#e0e0e0" }}>people_outline</Icon>
                        <Typography sx={{ color: "#90a4ae", mt: 1 }}>No users found</Typography>
                      </Box>
                    ) : filteredUsers.map(u => (
                      <UserRowCard key={u.id} user={u} isSelf={u.id === currentUser?.id}
                        onEdit={openEdit} onDelete={(u) => setDeleteDialog({ open: true, user: u })} onToggle={handleToggleStatus} />
                    ))
                  ) : (
                    // Grouped by role
                    ["admin", "super_admin", "team_leader", "employee"].map(role => {
                      const roleUsers = filteredUsers.filter(u => u.role === role);
                      if (!roleUsers.length) return null;
                      const meta = ROLE_META[role] || { label: role, color: "#546e7a", bg: "#f5f5f5", icon: "person" };
                      return (
                        <Box key={role}>
                          {/* Role group header */}
                          <Box sx={{ px: 2.5, py: 1, bgcolor: meta.bg, borderBottom: "1px solid " + meta.color + "22", display: "flex", alignItems: "center", gap: 1 }}>
                            <Icon sx={{ fontSize: 16, color: meta.color }}>{meta.icon}</Icon>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {role === "super_admin" ? "Super Admin" : meta.label}
                            </Typography>
                            <Chip label={roleUsers.length} size="small"
                              sx={{ height: 16, fontSize: "0.58rem", bgcolor: meta.color + "22", color: meta.color, fontWeight: 700 }} />
                            {role !== "super_admin" && (
                              <Box sx={{ ml: "auto" }}>
                                <Tooltip title={`Add new ${meta.label}`}>
                                  <IconButton size="small" onClick={() => openCreate(role)} sx={{ color: meta.color }}>
                                    <Icon sx={{ fontSize: 16 }}>add_circle_outline</Icon>
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                          {roleUsers.map(u => (
                            <UserRowCard key={u.id} user={u} isSelf={u.id === currentUser?.id}
                              onEdit={openEdit} onDelete={(u) => setDeleteDialog({ open: true, user: u })} onToggle={handleToggleStatus} />
                          ))}
                        </Box>
                      );
                    })
                  )}
                </Card>
              </Box>
            )}

            {/* ════════════════ OVERVIEW TAB ════════════════ */}
            {tab === "overview" && (
              <>
                <Grid container spacing={3} mb={3}>
                  <Grid item xs={12} sm={6} lg={3}>
                    <StatCard icon="group" title="Total Users" value={users.length} subtitle={`${counts.active} active`} color="info" />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <StatCard icon="person_add" title="Total Leads" value={crmData?.leads?.total || 0} subtitle={`${crmData?.leads?.converted || 0} converted`} color="success" />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <StatCard icon="monetization_on" title="Deal Revenue" value={`$${(crmData?.deals?.revenue || 0).toLocaleString()}`} subtitle={`${crmData?.deals?.won || 0} won deals`} color="warning" />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <StatCard icon="receipt_long" title="Total Invoiced" value={`$${(crmData?.invoices?.total_invoiced || 0).toLocaleString()}`} subtitle={`$${(crmData?.invoices?.paid_amount || 0).toLocaleString()} paid`} color="error" />
                  </Grid>
                </Grid>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={3}>
                        <MDTypography variant="h6" fontWeight="bold" mb={2}>CRM Module Status</MDTypography>
                        {[
                          { module: "Leads",    count: crmData?.leads?.total,           icon: "person_add" },
                          { module: "Deals",    count: crmData?.deals?.total,            icon: "handshake" },
                          { module: "Contacts", count: crmData?.contacts?.total,         icon: "contacts" },
                          { module: "Companies",count: crmData?.companies?.total,        icon: "business" },
                          { module: "Tasks",    count: workData?.totals?.tasks_total,    icon: "task_alt" },
                          { module: "Invoices", count: crmData?.invoices?.total,         icon: "receipt" },
                        ].map(({ module, count, icon }) => (
                          <MDBox key={module} display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                            <MDBox display="flex" alignItems="center" gap={1.5}>
                              <Icon sx={{ fontSize: 20, color: "text.secondary" }}>{icon}</Icon>
                              <MDTypography variant="button">{module}</MDTypography>
                            </MDBox>
                            <MDBox display="flex" alignItems="center" gap={1}>
                              <MDTypography variant="button" fontWeight="bold">{count ?? 0}</MDTypography>
                              <Chip label="Active" size="small" color="success" variant="outlined" />
                            </MDBox>
                          </MDBox>
                        ))}
                      </MDBox>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <MDBox p={3}>
                        <MDTypography variant="h6" fontWeight="bold" mb={2}>Team Breakdown by Role</MDTypography>
                        {Object.entries(ROLE_META).map(([role, meta]) => {
                          const count = users.filter(u => u.role === role).length;
                          if (!count) return null;
                          return (
                            <MDBox key={role} mb={2}>
                              <MDBox display="flex" justifyContent="space-between" mb={0.5} alignItems="center">
                                <Box display="flex" alignItems="center" gap={0.75}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: meta.color }} />
                                  <MDTypography variant="caption" sx={{ textTransform: "capitalize" }}>{meta.label}</MDTypography>
                                </Box>
                                <MDTypography variant="caption" fontWeight="bold">{count}</MDTypography>
                              </MDBox>
                              <LinearProgress variant="determinate" value={(count / users.length) * 100}
                                sx={{ height: 7, borderRadius: 4, bgcolor: meta.color + "22", "& .MuiLinearProgress-bar": { bgcolor: meta.color } }} />
                            </MDBox>
                          );
                        })}
                        <Divider sx={{ my: 1.5 }} />
                        <MDBox display="flex" justifyContent="space-between">
                          <MDTypography variant="caption">Task Completion Rate</MDTypography>
                          <MDTypography variant="caption" fontWeight="bold">{workData?.totals?.completion_rate || 0}%</MDTypography>
                        </MDBox>
                        <LinearProgress variant="determinate" value={workData?.totals?.completion_rate || 0} color="success" sx={{ height: 7, borderRadius: 4, mt: 0.5 }} />
                      </MDBox>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}

            {/* ════════════════ SYSTEM INFO TAB ════════════════ */}
            {tab === "system" && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <MDBox p={3}>
                      <MDTypography variant="h6" fontWeight="bold" mb={2}>System Configuration</MDTypography>
                      {[
                        { key: "App Name",       value: "Back Office CRM" },
                        { key: "Version",        value: "2.0.0" },
                        { key: "Environment",    value: "Production" },
                        { key: "API Base URL",   value: (process.env.REACT_APP_API_URL || "http://localhost:5000") + "/api" },
                        { key: "Authentication", value: "JWT (HS256, 7-day expiry)" },
                        { key: "Database",       value: "JSON File (crm-data.json)" },
                        { key: "Total Collections", value: "18" },
                      ].map(({ key, value }) => (
                        <MDBox key={key} display="flex" justifyContent="space-between" mb={1.5}
                          sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}>
                          <MDTypography variant="caption" fontWeight="bold" color="text">{key}</MDTypography>
                          <MDTypography variant="caption">{value}</MDTypography>
                        </MDBox>
                      ))}
                    </MDBox>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <MDBox p={3}>
                      <MDTypography variant="h6" fontWeight="bold" mb={2}>Quick Actions</MDTypography>
                      {[
                        { label: "Manage Team",       icon: "groups",              action: () => setTab("team"),             color: "info" },
                        { label: "View Work Reports",  icon: "assessment",          action: () => navigate("/work-reports"), color: "success" },
                        { label: "CRM Leads",          icon: "person_add",          action: () => navigate("/crm/leads"),    color: "warning" },
                        { label: "View All Deals",     icon: "handshake",           action: () => navigate("/crm/deals"),    color: "primary" },
                        { label: "Invoices",           icon: "receipt",             action: () => navigate("/invoices"),     color: "secondary" },
                        { label: "Task Management",    icon: "task_alt",            action: () => navigate("/tasks"),        color: "error" },
                      ].map(({ label, icon, action, color }) => (
                        <MDButton key={label} fullWidth variant="outlined" color={color} size="small"
                          sx={{ mb: 1, justifyContent: "flex-start", textTransform: "none" }} onClick={action}>
                          <Icon sx={{ mr: 1 }}>{icon}</Icon>{label}
                        </MDButton>
                      ))}
                    </MDBox>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}
      </MDBox>

      {/* ── Dialogs ── */}
      <UserFormDialog
        open={formDialog.open}
        initial={formDialog.user}
        defaultRole={formDialog.defaultRole}
        allUsers={users}
        onClose={() => setFormDialog({ open: false, user: null, defaultRole: "employee" })}
        onSave={handleSaveUser}
      />
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        onConfirm={handleDeleteUser}
        title="Delete User Account"
        body={`Are you sure you want to permanently delete "${deleteDialog.user?.name}"? All their data will be removed and this cannot be undone.`}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ borderRadius: "10px" }}>
          {snack.msg}
        </Alert>
      </Snackbar>

      <Footer />
    </DashboardLayout>
  );
}
