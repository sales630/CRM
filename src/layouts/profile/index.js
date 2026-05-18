/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAuth } from "context/AuthContext";
import { uploadFile, FILE_BASE_URL, usersAPI, authAPI, tasksAPI, mailAccountsAPI } from "services/api";
import backgroundImage from "assets/images/bg-profile.jpeg";

const ROLE_COLORS = {
  super_admin: "error",
  admin: "warning",
  team_leader: "info",
  employee: "success",
};

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_leader: "Team Leader",
  employee: "Employee",
};

function InfoRow({ icon, label, value }) {
  return (
    <MDBox display="flex" alignItems="flex-start" gap={1.5} mb={2}>
      <Icon sx={{ fontSize: 20, color: "text.secondary", mt: 0.2 }}>{icon}</Icon>
      <MDBox>
        <MDTypography variant="caption" color="text" fontWeight="bold" sx={{ textTransform: "uppercase", fontSize: "10px" }}>
          {label}
        </MDTypography>
        <MDTypography variant="button" display="block" fontWeight="regular">
          {value || "—"}
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

function ChangePasswordDialog({ open, onClose }) {
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) { setForm({ current: "", newPass: "", confirm: "" }); setError(""); setSuccess(false); }
  }, [open]);

  const handleSave = async () => {
    if (!form.current || !form.newPass || !form.confirm) { setError("All fields are required."); return; }
    if (form.newPass.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (form.newPass !== form.confirm) { setError("New passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      await authAPI.changePassword(form.current, form.newPass);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>Password changed successfully!</Alert>
        ) : (
          <MDBox display="flex" flexDirection="column" gap={2} mt={1}>
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            <TextField
              label="Current Password"
              type={showCurrent ? "text" : "password"}
              fullWidth size="small"
              value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowCurrent(s => !s)}>
                      <Icon fontSize="small">{showCurrent ? "visibility_off" : "visibility"}</Icon>
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="New Password"
              type={showNew ? "text" : "password"}
              fullWidth size="small"
              value={form.newPass}
              onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
              helperText="Minimum 6 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNew(s => !s)}>
                      <Icon fontSize="small">{showNew ? "visibility_off" : "visibility"}</Icon>
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth size="small"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            />
          </MDBox>
        )}
      </DialogContent>
      {!success && (
        <DialogActions>
          <MDButton variant="text" color="secondary" onClick={onClose}>Cancel</MDButton>
          <MDButton variant="gradient" color="info" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : "Update Password"}
          </MDButton>
        </DialogActions>
      )}
    </Dialog>
  );
}

function EditProfileDialog({ open, onClose, user, onSaved }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && user) setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      avatar: user.avatar || "",
    });
  }, [open, user]);

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5 MB or smaller"); return; }
    setUploading(true); setError("");
    try {
      const data = await uploadFile(file);
      const url = data?.url || data?.data?.url;
      if (url) setForm(f => ({ ...f, avatar: url }));
      else throw new Error("Upload returned no URL");
    } catch (err) { setError(err.message || "Avatar upload failed"); }
    finally { setUploading(false); }
  };

  const avatarSrc = form.avatar
    ? (form.avatar.startsWith("http") ? form.avatar : `${FILE_BASE_URL}${form.avatar}`)
    : "";

  const handleSave = async () => {
    if (!form.name || !form.email) { setError("Name and email are required."); return; }
    setLoading(true); setError("");
    try {
      await usersAPI.update(user.id, form);
      onSaved(form);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

          {/* Profile picture upload */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar src={avatarSrc} sx={{ width: 72, height: 72, fontSize: 28, bgcolor: "primary.main" }}>
                {(form.name || "?")[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
                <MDButton variant="outlined" color="info" size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading} sx={{ mr: 1 }}>
                  {uploading ? <CircularProgress size={14} sx={{ mr: 0.5 }} color="inherit" /> : <Icon sx={{ mr: 0.5, fontSize: 16 }}>photo_camera</Icon>}
                  {uploading ? "Uploading…" : (form.avatar ? "Change Photo" : "Upload Photo")}
                </MDButton>
                {form.avatar && (
                  <MDButton variant="text" color="error" size="small" onClick={() => setForm(f => ({ ...f, avatar: "" }))}>
                    Remove
                  </MDButton>
                )}
                <div style={{ fontSize: 11, color: "#90a4ae", marginTop: 4 }}>JPG, PNG or GIF — max 5 MB</div>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Full Name" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email" type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Phone" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Department" value={form.department || ""} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} size="small" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="secondary" onClick={onClose}>Cancel</MDButton>
        <MDButton variant="gradient" color="info" onClick={handleSave} disabled={loading || uploading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Save Changes"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

const TASK_INBOX = "team@outsourcedbookeeping.com";

export default function Profile() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, in_progress: 0, pending: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwDialog, setPwDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [taskEmailToken, setTaskEmailToken] = useState(currentUser?.task_email_token || "");
  const [mainInboxEmail, setMainInboxEmail] = useState(""); // the connected auto-task inbox address
  const [emailCopied, setEmailCopied] = useState(false);

  // Fetch main inbox account to build the correct personal task email address
  useEffect(() => {
    mailAccountsAPI.getAccounts()
      .then(accounts => {
        const main = Array.isArray(accounts) && accounts.find(a => a.is_main_inbox);
        setMainInboxEmail(main ? main.email : "");
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await tasksAPI.getAll({ assigned_to: currentUser?.name });
      if (Array.isArray(tasks)) {
        const completed  = tasks.filter(t => t.status === "completed").length;
        const in_progress = tasks.filter(t => t.status === "in_progress").length;
        setTaskStats({ total: tasks.length, completed, in_progress, pending: tasks.length - completed - in_progress });
        setRecentTasks(tasks.slice(0, 5));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [currentUser?.name]);

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser, fetchData]);

  // Sync token when currentUser updates; auto-request one if missing
  useEffect(() => {
    const token = currentUser?.task_email_token || "";
    setTaskEmailToken(token);
    // If user has no token yet (edge case: old account before auto-gen), request one silently
    if (!token && currentUser?.id) {
      usersAPI.generateTaskEmailToken(currentUser.id)
        .then(result => {
          const newToken = result?.task_email_token || "";
          if (newToken) {
            setTaskEmailToken(newToken);
            updateCurrentUser({ task_email_token: newToken });
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.task_email_token, currentUser?.id]);

  const handleProfileSaved = (updates) => {
    updateCurrentUser(updates);
    setSnack({ open: true, msg: "Profile updated successfully!", severity: "success" });
  };

  // Build personalTaskEmail from the connected auto-task inbox
  // e.g. amitchaudharyhp22@gmail.com + token → amitchaudharyhp22+TOKEN@gmail.com
  const personalTaskEmail = (() => {
    if (!taskEmailToken) return "";
    if (!mainInboxEmail || !mainInboxEmail.includes("@")) return "";
    const [local, domain] = mainInboxEmail.split("@");
    return `${local}+${taskEmailToken}@${domain}`;
  })();

  const handleCopyEmail = () => {
    if (!personalTaskEmail) return;
    navigator.clipboard.writeText(personalTaskEmail).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const statusColor = { completed: "success", in_progress: "warning", pending: "default" };
  const priorityColor = { high: "error", medium: "warning", low: "info" };

  if (!currentUser) return null;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />

      {/* Cover image */}
      <MDBox
        display="flex" alignItems="center" position="relative"
        minHeight="14rem" borderRadius="xl" mb={-8}
        sx={{
          backgroundImage: `linear-gradient(rgba(25,118,210,0.7), rgba(25,118,210,0.5)), url(${backgroundImage})`,
          backgroundSize: "cover", backgroundPosition: "50%", overflow: "hidden",
        }}
      >
        <MDBox position="absolute" bottom={16} left={24}>
          <MDTypography variant="h4" fontWeight="bold" color="white">{currentUser.name}</MDTypography>
          <MDTypography variant="button" color="white" opacity={0.85}>
            {ROLE_LABELS[currentUser.role] || currentUser.role} · {currentUser.department || "Back Office Accountants"}
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Main card */}
      <Card sx={{ mx: 3, mt: 0, mb: 3, py: 3, px: 3, position: "relative" }}>
        {/* Avatar row */}
        <MDBox display="flex" alignItems="flex-end" gap={2} mb={3} mt={-8}>
          <Avatar
            src={currentUser.avatar ? (currentUser.avatar.startsWith("http") ? currentUser.avatar : `${FILE_BASE_URL}${currentUser.avatar}`) : undefined}
            sx={{
              width: 80, height: 80, fontSize: 32, fontWeight: "bold", border: "3px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              bgcolor: `${ROLE_COLORS[currentUser.role] || "info"}.main`,
            }}
          >
            {currentUser.name?.charAt(0) || "?"}
          </Avatar>
          <MDBox flex={1}>
            <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <MDTypography variant="h5" fontWeight="bold">{currentUser.name}</MDTypography>
              <Chip
                label={ROLE_LABELS[currentUser.role] || currentUser.role}
                color={ROLE_COLORS[currentUser.role] || "info"}
                size="small"
                sx={{ textTransform: "capitalize" }}
              />
              <Chip label="Active" color="success" size="small" variant="outlined" />
            </MDBox>
          </MDBox>
          <MDBox display="flex" gap={1} flexWrap="wrap">
            <MDButton variant="outlined" color="info" size="small" onClick={() => setEditDialog(true)}>
              <Icon sx={{ mr: 0.5 }}>edit</Icon> Edit Profile
            </MDButton>
            <MDButton variant="gradient" color="error" size="small" onClick={() => setPwDialog(true)}>
              <Icon sx={{ mr: 0.5 }}>lock</Icon> Change Password
            </MDButton>
          </MDBox>
        </MDBox>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Left — profile info */}
          <Grid item xs={12} md={4}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>Profile Information</MDTypography>
            <InfoRow icon="person"      label="Full Name"   value={currentUser.name} />
            <InfoRow icon="email"       label="Email"       value={currentUser.email} />
            <InfoRow icon="phone"       label="Phone"       value={currentUser.phone || "Not set"} />
            <InfoRow icon="business"    label="Department"  value={currentUser.department || "Not set"} />
            <InfoRow icon="badge"       label="Role"        value={ROLE_LABELS[currentUser.role] || currentUser.role} />
            <InfoRow icon="verified_user" label="Account Status" value={currentUser.status || "Active"} />
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Middle — task stats */}
          <Grid item xs={12} md={3}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>My Task Stats</MDTypography>
            {loading ? (
              <MDBox display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></MDBox>
            ) : (
              <>
                {[
                  { label: "Total Tasks",   value: taskStats.total,       color: "#1976d2", icon: "assignment" },
                  { label: "Completed",     value: taskStats.completed,   color: "#2e7d32", icon: "task_alt"   },
                  { label: "In Progress",   value: taskStats.in_progress, color: "#ed6c02", icon: "pending"    },
                  { label: "Pending",       value: taskStats.pending,     color: "#9e9e9e", icon: "hourglass_empty" },
                ].map(({ label, value, color, icon }) => (
                  <MDBox key={label} display="flex" alignItems="center" gap={1.5} mb={2}
                    sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(0,0,0,0.03)" }}>
                    <Icon sx={{ fontSize: 24, color }}>{icon}</Icon>
                    <MDBox>
                      <MDTypography variant="h5" fontWeight="bold" lineHeight={1}>{value}</MDTypography>
                      <MDTypography variant="caption" color="text">{label}</MDTypography>
                    </MDBox>
                  </MDBox>
                ))}
                {taskStats.total > 0 && (
                  <MDBox mt={1}>
                    <MDTypography variant="caption" color="text">Completion Rate</MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1} mt={0.5}>
                      <MDBox flex={1} sx={{ height: 8, borderRadius: 4, bgcolor: "#e0e0e0", overflow: "hidden" }}>
                        <MDBox sx={{
                          height: "100%", borderRadius: 4, bgcolor: "#2e7d32",
                          width: `${Math.round((taskStats.completed / taskStats.total) * 100)}%`,
                          transition: "width 0.5s"
                        }} />
                      </MDBox>
                      <MDTypography variant="caption" fontWeight="bold">
                        {Math.round((taskStats.completed / taskStats.total) * 100)}%
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                )}
              </>
            )}
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Right — recent tasks */}
          <Grid item xs={12} md={4}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>Recent Tasks</MDTypography>
            {loading ? (
              <MDBox display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></MDBox>
            ) : recentTasks.length === 0 ? (
              <MDBox textAlign="center" py={3}>
                <Icon sx={{ fontSize: 40, color: "text.secondary" }}>assignment</Icon>
                <MDTypography variant="body2" color="text" mt={1}>No tasks assigned yet</MDTypography>
              </MDBox>
            ) : (
              recentTasks.map((task, i) => (
                <MDBox key={task.id} mb={1.5} p={1.5} sx={{ borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <MDTypography variant="caption" fontWeight="bold" sx={{ flex: 1 }}>
                      {task.title}
                    </MDTypography>
                    <Chip label={task.status?.replace("_", " ")} size="small"
                      color={statusColor[task.status] || "default"} sx={{ height: 16, fontSize: "9px", flexShrink: 0 }} />
                  </MDBox>
                  <MDBox display="flex" gap={0.5} mt={0.5}>
                    {task.priority && (
                      <Chip label={task.priority} size="small" color={priorityColor[task.priority] || "default"}
                        variant="outlined" sx={{ height: 14, fontSize: "9px" }} />
                    )}
                    {task.due_date && (
                      <MDTypography variant="caption" color="text" sx={{ fontSize: "10px" }}>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </MDTypography>
                    )}
                  </MDBox>
                </MDBox>
              ))
            )}
          </Grid>
        </Grid>
      </Card>

      {/* Personal Task Email Card */}
      <Card sx={{ mx: 3, mb: 3, py: 3, px: 3 }}>
        <MDBox display="flex" alignItems="center" gap={1.5} mb={2}>
          <MDBox sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon sx={{ color: "white", fontSize: 22 }}>alternate_email</Icon>
          </MDBox>
          <MDBox>
            <MDTypography variant="h6" fontWeight="bold" lineHeight={1.2}>Personal Task Email</MDTypography>
            <MDTypography variant="caption" color="text">
              Share this email address — any email sent to it will create a task in your task list automatically
            </MDTypography>
          </MDBox>
        </MDBox>
        <Divider sx={{ mb: 2 }} />

        {/* Your unique task email — always shown, auto-generated on account creation */}
        <MDBox mb={2}>
          <MDTypography variant="caption" color="text" fontWeight="bold"
            sx={{ textTransform: "uppercase", fontSize: "10px", mb: 0.5, display: "block" }}>
            Your Unique Task Email Address
          </MDTypography>
          {taskEmailToken && personalTaskEmail ? (
            <>
              <MDBox
                display="flex" alignItems="center" gap={1}
                sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(25,118,210,0.06)", border: "1px solid rgba(25,118,210,0.2)" }}
              >
                <Icon sx={{ color: "#1976d2", fontSize: 20, flexShrink: 0 }}>email</Icon>
                <MDTypography
                  variant="body2"
                  sx={{ flex: 1, fontFamily: "monospace", fontWeight: "bold", fontSize: "14px", color: "#1976d2", wordBreak: "break-all" }}
                >
                  {personalTaskEmail}
                </MDTypography>
                <IconButton size="small" onClick={handleCopyEmail} title="Copy email address"
                  sx={{ color: emailCopied ? "#2e7d32" : "#1976d2", flexShrink: 0 }}>
                  <Icon fontSize="small">{emailCopied ? "check_circle" : "content_copy"}</Icon>
                </IconButton>
              </MDBox>
              {emailCopied && (
                <MDTypography variant="caption" color="success" sx={{ mt: 0.5, display: "block" }}>
                  ✓ Copied to clipboard!
                </MDTypography>
              )}
            </>
          ) : (
            <MDBox sx={{ p: 1.5, borderRadius: 2, bgcolor: "#fff8e1", border: "1px solid #ffe082" }}>
              <MDTypography variant="caption" sx={{ color: "#f57c00" }}>
                ⚠️ Go to <strong>Mail → Connect Mailbox</strong> and enable <strong>Auto-Task</strong> on your inbox — your personal email address will appear here automatically.
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* How it works */}
        <MDBox mb={2.5} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
            How to use this in Microsoft / any automation:
          </MDTypography>
          {[
            { icon: "content_copy", text: "Copy the email address above" },
            { icon: "settings",     text: "In Microsoft Power Automate / Zapier / any tool — create a rule: when email is sent to this address → trigger" },
            { icon: "task_alt",     text: "A task is automatically created in your task list" },
            { icon: "lock",         text: "This ID is permanent — it will never change" },
          ].map(({ icon, text }, i) => (
            <MDBox key={i} display="flex" alignItems="flex-start" gap={1} mb={0.75}>
              <Icon sx={{ fontSize: 16, color: "#1976d2", mt: 0.2, flexShrink: 0 }}>{icon}</Icon>
              <MDTypography variant="caption" color="text">{text}</MDTypography>
            </MDBox>
          ))}
        </MDBox>

        <MDBox display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <MDButton variant="gradient" color="info" size="small" onClick={handleCopyEmail} disabled={!personalTaskEmail}>
            <Icon sx={{ mr: 0.5, fontSize: 16 }}>content_copy</Icon>
            Copy My Task Email
          </MDButton>
          <MDBox display="flex" alignItems="center" gap={0.5}
            sx={{ px: 1.5, py: 0.75, borderRadius: 2, bgcolor: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.2)" }}>
            <Icon sx={{ fontSize: 14, color: "#2e7d32" }}>lock</Icon>
            <MDTypography variant="caption" color="success" fontWeight="bold" sx={{ fontSize: "11px" }}>
              Permanent ID — never changes
            </MDTypography>
          </MDBox>
        </MDBox>
      </Card>

      {/* Dialogs */}
      <ChangePasswordDialog open={pwDialog} onClose={() => setPwDialog(false)} />
      <EditProfileDialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        user={currentUser}
        onSaved={handleProfileSaved}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>

      <Footer />
    </DashboardLayout>
  );
}
