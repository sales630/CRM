/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Card, Typography, Button, IconButton, TextField, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Chip, Tooltip, InputAdornment, Divider,
  Snackbar, Alert, CircularProgress, LinearProgress, Switch, Tab, Tabs,
  Table, TableBody, TableRow, TableCell, Badge,
} from "@mui/material";
import {
  Add, Edit, Delete, Search, Close, Person, Business, Phone, Email,
  LocationOn, Work, Star, PersonAdd, Refresh, MoreVert, AccountTree,
  CalendarToday, Badge as BadgeIcon, Groups, OpenInNew, CameraAlt,
  CheckCircle, Cancel, AccessTime, ArrowBack,
} from "@mui/icons-material";
import { hrAPI } from "services/api";
import { useCall } from "context/CallContext";
import { Videocam, Call as CallIcon } from "@mui/icons-material";

// ── Design tokens ──────────────────────────────────────────────────────────
const TEAL    = "#17c1e8";
const TEAL_LT = "#e0f7fa";
const TL_CLR  = "#7b1fa2";
const TL_LT   = "#f3e5f5";

const STATUS_META = {
  active:     { label: "Active",      color: "#388e3c", bg: "#e8f5e9",  icon: <CheckCircle sx={{ fontSize: 12 }} /> },
  inactive:   { label: "Inactive",    color: "#757575", bg: "#f5f5f5",  icon: <Cancel sx={{ fontSize: 12 }} /> },
  on_leave:   { label: "On Leave",    color: "#f57c00", bg: "#fff3e0",  icon: <AccessTime sx={{ fontSize: 12 }} /> },
  terminated: { label: "Terminated",  color: "#d32f2f", bg: "#ffebee",  icon: <Cancel sx={{ fontSize: 12 }} /> },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (n = "") => n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const avatarColor = (name = "") => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0; for (const c of name) s += c.charCodeAt(0); return C[s % C.length];
};
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

// ── Image compression via canvas ───────────────────────────────────────────
function compressImage(file, maxDim = 200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function EmpAvatar({ emp, size = 40 }) {
  if (emp?.avatar) return <Avatar src={emp.avatar} sx={{ width: size, height: size }} />;
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: avatarColor(emp?.name || ""), fontSize: size * 0.36, fontWeight: 700 }}>
      {getInitials(emp?.name)}
    </Avatar>
  );
}

// ── Full Profile Dialog ────────────────────────────────────────────────────
export function EmployeeProfileDialog({ empId, open, onClose, employees, departments, onEdit, onDelete }) {
  const [localAvatar, setLocalAvatar] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const { onlineUsers, startCall, callState } = useCall();

  const emp = employees.find(e => e.id === empId) || null;
  if (!emp) return null;

  // Match HR employee to online auth user by name
  const matchedOnlineUser = onlineUsers.find(u => (u.userName || "").trim().toLowerCase() === (emp.name || "").trim().toLowerCase());
  const isOnline = !!matchedOnlineUser;
  const handleVideoCall = () => { if (matchedOnlineUser && callState === "idle") startCall(matchedOnlineUser, "video"); };
  const handleAudioCall = () => { if (matchedOnlineUser && callState === "idle") startCall(matchedOnlineUser, "audio"); };

  const dept = departments.find(d => d.id === emp.department_id);
  const manager = employees.find(e => e.id === emp.manager_id);
  const reports = employees.filter(e => e.manager_id === emp.id);
  const sm = STATUS_META[emp.status] || STATUS_META.active;
  const displayAvatar = localAvatar || emp.avatar;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    setUploadingPhoto(true);
    try {
      const base64 = await compressImage(file, 200, 0.85);
      setLocalAvatar(base64);
      await hrAPI.updateEmployee(emp.id, { avatar: base64 });
    } catch (err) {
      console.error("Photo upload failed", err);
      alert("Failed to save photo. Please try again.");
      setLocalAvatar(null);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const infoRow = (icon, label, value) => value ? (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 0.85, borderBottom: "1px solid #f5f7fa" }}>
      <Box sx={{ color: "#90a4ae", mt: 0.1, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: "0.63rem", color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: "#263238", fontWeight: 500, mt: 0.2 }}>{value}</Typography>
      </Box>
    </Box>
  ) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>

      {/* Top banner */}
      <Box sx={{ height: 100, background: "linear-gradient(135deg, #1976d2 0%, #17c1e8 100%)", position: "relative" }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 10, right: 10, color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" }, p: 0.75 }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 0, pb: 3, px: 3 }}>
        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={4}>
            {/* Avatar with inline photo upload */}
            <Box sx={{ mt: -5, display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
              <input type="file" accept="image/*" ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoChange} />
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  emp.is_team_leader && (
                    <Box sx={{ width: 22, height: 22, bgcolor: TL_CLR, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                      <Star sx={{ fontSize: 12, color: "#fff" }} />
                    </Box>
                  )
                }
              >
                <Box sx={{ position: "relative", cursor: "pointer" }} onClick={() => photoInputRef.current?.click()}>
                  <Avatar
                    src={displayAvatar}
                    sx={{ width: 96, height: 96, fontSize: 36, fontWeight: 700, bgcolor: avatarColor(emp.name), border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
                  >
                    {uploadingPhoto ? <CircularProgress size={32} sx={{ color: "#fff" }} /> : getInitials(emp.name)}
                  </Avatar>
                  {/* Camera overlay */}
                  <Box sx={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    bgcolor: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", opacity: 0,
                    transition: "opacity 0.18s", border: "4px solid #fff",
                    "&:hover": { opacity: 1 },
                  }}>
                    <CameraAlt sx={{ fontSize: 22, color: "#fff" }} />
                    <Typography sx={{ fontSize: "0.55rem", color: "#fff", fontWeight: 700, mt: 0.3 }}>CHANGE</Typography>
                  </Box>
                </Box>
              </Badge>
              <Typography variant="h5" fontWeight={800} mt={1.5} textAlign="center">{emp.name}</Typography>
              <Typography sx={{ color: "#78909c", fontSize: "0.85rem", textAlign: "center", mb: 1 }}>{emp.position || "—"}</Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "center" }}>
                <Chip
                  icon={sm.icon}
                  label={sm.label}
                  size="small"
                  sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                />
                {emp.is_team_leader && (
                  <Chip icon={<Star sx={{ fontSize: 11, color: TL_CLR }} />} label="Team Leader" size="small"
                    sx={{ bgcolor: TL_LT, color: TL_CLR, fontWeight: 700, fontSize: "0.7rem", height: 22 }} />
                )}
              </Box>
            </Box>

            {/* Quick actions */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {/* Video / Audio Call buttons */}
              <Box display="flex" gap={0.75}>
                <Tooltip title={!isOnline ? `${emp.name} is not online` : callState !== "idle" ? "Already in a call" : `Video call ${emp.name}`}>
                  <span style={{ flex: 1 }}>
                    <Button fullWidth variant="contained" startIcon={<Videocam sx={{ fontSize: 15 }} />}
                      onClick={handleVideoCall}
                      disabled={!isOnline || callState !== "idle"}
                      sx={{ textTransform: "none", bgcolor: isOnline ? "#1976d2" : "#b0bec5", "&:hover": { bgcolor: "#1565c0" }, borderRadius: "10px", position: "relative" }}>
                      Video
                      {isOnline && <Box sx={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", bgcolor: "#4caf50", border: "1px solid #fff" }} />}
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={!isOnline ? `${emp.name} is not online` : callState !== "idle" ? "Already in a call" : `Audio call ${emp.name}`}>
                  <span style={{ flex: 1 }}>
                    <Button fullWidth variant="contained" startIcon={<CallIcon sx={{ fontSize: 15 }} />}
                      onClick={handleAudioCall}
                      disabled={!isOnline || callState !== "idle"}
                      sx={{ textTransform: "none", bgcolor: isOnline ? "#388e3c" : "#b0bec5", "&:hover": { bgcolor: "#2e7d32" }, borderRadius: "10px" }}>
                      Audio
                    </Button>
                  </span>
                </Tooltip>
              </Box>

              <Button fullWidth variant="contained" startIcon={<Edit sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); onEdit(emp); }}
                sx={{ textTransform: "none", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" }, borderRadius: "10px" }}>
                Edit Profile
              </Button>
              {emp.email && (
                <Button fullWidth variant="outlined" startIcon={<Email sx={{ fontSize: 15 }} />}
                  href={`mailto:${emp.email}`}
                  sx={{ textTransform: "none", borderColor: "#cfd8dc", color: "#546e7a", borderRadius: "10px" }}>
                  Send Email
                </Button>
              )}
              {emp.phone && (
                <Button fullWidth variant="outlined" startIcon={<Phone sx={{ fontSize: 15 }} />}
                  href={`tel:${emp.phone}`}
                  sx={{ textTransform: "none", borderColor: "#cfd8dc", color: "#546e7a", borderRadius: "10px" }}>
                  Call
                </Button>
              )}
              <Button fullWidth color="error" variant="outlined" startIcon={<Delete sx={{ fontSize: 15 }} />}
                onClick={() => { onClose(); onDelete(emp.id); }}
                sx={{ textTransform: "none", borderRadius: "10px" }}>
                Delete Employee
              </Button>
            </Box>

            {/* Reports To */}
            {manager && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f8f9fa", borderRadius: "10px", border: "1px solid #edf0f4" }}>
                <Typography sx={{ fontSize: "0.63rem", color: "#9e9e9e", textTransform: "uppercase", mb: 0.75 }}>Reports To</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <EmpAvatar emp={manager} size={32} />
                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700 }}>{manager.name}</Typography>
                    <Typography sx={{ fontSize: "0.63rem", color: "#78909c" }}>{manager.position || "—"}</Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Direct Reports */}
            {reports.length > 0 && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: TL_LT, borderRadius: "10px", border: `1px solid ${TL_CLR}20` }}>
                <Typography sx={{ fontSize: "0.63rem", color: TL_CLR, textTransform: "uppercase", fontWeight: 700, mb: 0.75 }}>
                  Direct Reports ({reports.length})
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                  {reports.slice(0, 5).map(r => (
                    <Box key={r.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <EmpAvatar emp={r} size={24} />
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }} noWrap>{r.name}</Typography>
                    </Box>
                  ))}
                  {reports.length > 5 && (
                    <Typography sx={{ fontSize: "0.65rem", color: TL_CLR }}>+{reports.length - 5} more</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={8}>
            <Box sx={{ pt: 1 }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#607d8b", textTransform: "uppercase", letterSpacing: "0.5px", mb: 1.5 }}>
                Contact Information
              </Typography>
              {infoRow(<Email sx={{ fontSize: 16 }} />, "Email Address", emp.email)}
              {infoRow(<Phone sx={{ fontSize: 16 }} />, "Mobile Phone", emp.phone)}
              {infoRow(<Phone sx={{ fontSize: 16 }} />, "Work Phone", emp.work_phone)}
              {infoRow(<LocationOn sx={{ fontSize: 16 }} />, "Location / Office", emp.location)}

              <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#607d8b", textTransform: "uppercase", letterSpacing: "0.5px", mt: 2.5, mb: 1.5 }}>
                Employment Details
              </Typography>
              {infoRow(<Business sx={{ fontSize: 16 }} />, "Department", dept?.name)}
              {infoRow(<Work sx={{ fontSize: 16 }} />, "Position / Job Title", emp.position)}
              {infoRow(<CalendarToday sx={{ fontSize: 16 }} />, "Hire Date", fmtDate(emp.hire_date))}
              {infoRow(<BadgeIcon sx={{ fontSize: 16 }} />, "Employee ID", emp.id?.slice(0, 8).toUpperCase())}

              {emp.bio && (
                <>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#607d8b", textTransform: "uppercase", letterSpacing: "0.5px", mt: 2.5, mb: 1 }}>
                    About
                  </Typography>
                  <Box sx={{ bgcolor: "#f8f9fa", borderRadius: "10px", p: 1.5, border: "1px solid #edf0f4" }}>
                    <Typography sx={{ fontSize: "0.82rem", color: "#546e7a", lineHeight: 1.7 }}>{emp.bio}</Typography>
                  </Box>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee Edit Dialog ───────────────────────────────────────────────────
function EmployeeDialog({ open, onClose, initial, departments, employees, defaultDeptId, defaultIsTeamLeader, onSave }) {
  const blank = { name: "", position: "", department_id: defaultDeptId || "", manager_id: "", email: "", phone: "", work_phone: "", location: "", status: "active", hire_date: "", bio: "", avatar: "", is_team_leader: defaultIsTeamLeader || false };
  const [form, setForm] = useState(blank);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file (JPG, PNG, etc.)"); return; }
    setUploadingPhoto(true);
    try {
      const base64 = await compressImage(file, 200, 0.85);
      set("avatar", base64);
    } catch { alert("Could not read image. Try a different file."); }
    finally { setUploadingPhoto(false); e.target.value = ""; }
  };

  useEffect(() => {
    if (open) setForm(initial
      ? { ...blank, ...initial, department_id: initial.department_id || "", manager_id: initial.manager_id || "", is_team_leader: !!initial.is_team_leader }
      : { ...blank, department_id: defaultDeptId || "", is_team_leader: defaultIsTeamLeader || false }
    );
  }, [open, initial, defaultDeptId, defaultIsTeamLeader]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: form.is_team_leader ? TL_LT : TEAL_LT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {form.is_team_leader ? <Star sx={{ color: TL_CLR, fontSize: 18 }} /> : <Person sx={{ color: TEAL, fontSize: 18 }} />}
          </Box>
          <Typography fontWeight={700} fontSize="1rem">{initial ? "Edit Employee" : (form.is_team_leader ? "Add Team Leader" : "Add Employee")}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Avatar / Photo upload */}
          <Grid item xs={12}>
            <input type="file" accept="image/*" ref={photoInputRef} style={{ display: "none" }} onChange={handlePickPhoto} />
            <Box display="flex" alignItems="center" gap={2} sx={{ bgcolor: "#f8f9fa", p: 2, borderRadius: "12px", border: "1px solid #e8edf2" }}>
              {/* Clickable avatar */}
              <Box sx={{ position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={() => photoInputRef.current?.click()}>
                <Avatar src={form.avatar} sx={{ width: 64, height: 64, bgcolor: avatarColor(form.name), fontSize: 24, fontWeight: 700 }}>
                  {uploadingPhoto ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : getInitials(form.name)}
                </Avatar>
                <Box sx={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  bgcolor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center",
                  justifyContent: "center", opacity: 0, transition: "opacity 0.15s",
                  "&:hover": { opacity: 1 },
                }}>
                  <CameraAlt sx={{ fontSize: 18, color: "#fff" }} />
                </Box>
              </Box>

              <Box flex={1}>
                <Typography variant="body2" fontWeight={700} mb={0.5} color="text.primary">
                  Profile Photo
                </Typography>
                <Box display="flex" gap={1} mb={0.75}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={uploadingPhoto ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CameraAlt sx={{ fontSize: 14 }} />}
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    sx={{ textTransform: "none", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" }, borderRadius: "8px", fontSize: "0.75rem", py: 0.4 }}
                  >
                    {uploadingPhoto ? "Processing…" : "Upload Photo"}
                  </Button>
                  {form.avatar && (
                    <Button size="small" color="error" variant="outlined"
                      onClick={() => set("avatar", "")}
                      sx={{ textTransform: "none", borderRadius: "8px", fontSize: "0.75rem", py: 0.4 }}>
                      Remove
                    </Button>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                  JPG, PNG, GIF — auto-compressed to 200×200px · Or paste a URL below
                </Typography>
                <TextField
                  size="small" fullWidth placeholder="https://… (optional)" value={form.avatar.startsWith("data:") ? "" : form.avatar}
                  onChange={e => set("avatar", e.target.value)}
                  sx={{ mt: 0.75 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><CameraAlt sx={{ fontSize: 14, color: "#90a4ae" }} /></InputAdornment> }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Role toggle */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: form.is_team_leader ? TL_LT : "#f8f9fa", px: 2, py: 1.2, borderRadius: "12px", border: `1px solid ${form.is_team_leader ? TL_CLR + "40" : "#e0e0e0"}`, transition: "all 0.2s" }}>
              <Star sx={{ color: form.is_team_leader ? TL_CLR : "#b0bec5", fontSize: 22 }} />
              <Box flex={1}>
                <Typography fontWeight={700} color={form.is_team_leader ? TL_CLR : "text.secondary"} fontSize="0.85rem">
                  {form.is_team_leader ? "Team Leader" : "Regular Employee"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {form.is_team_leader ? "Will be set as department head" : "Reports to team leader"}
                </Typography>
              </Box>
              <Switch checked={form.is_team_leader} onChange={e => set("is_team_leader", e.target.checked)}
                sx={{ "& .Mui-checked + .MuiSwitch-track": { bgcolor: TL_CLR + " !important" } }} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Position / Job Title" value={form.position} onChange={e => set("position", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small"><InputLabel>Department *</InputLabel>
              <Select value={form.department_id} label="Department *" onChange={e => { set("department_id", e.target.value); set("manager_id", ""); }}>
                <MenuItem value="">— Select —</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {!form.is_team_leader && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small"><InputLabel>Reports To</InputLabel>
                <Select value={form.manager_id} label="Reports To" onChange={e => set("manager_id", e.target.value)}>
                  <MenuItem value="">— None —</MenuItem>
                  {employees.filter(e => e.id !== initial?.id && e.is_team_leader).map(e => (
                    <MenuItem key={e.id} value={e.id}><Box display="flex" alignItems="center" gap={1}><EmpAvatar emp={e} size={20} />{e.name}</Box></MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Email Address" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Mobile Phone" value={form.phone} onChange={e => set("phone", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Work Phone" value={form.work_phone} onChange={e => set("work_phone", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Location / Office" value={form.location} onChange={e => set("location", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Hire Date" type="date" InputLabelProps={{ shrink: true }} value={form.hire_date} onChange={e => set("hire_date", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small"><InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Bio / About" multiline rows={3} value={form.bio} onChange={e => set("bio", e.target.value)} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name.trim() || !form.department_id}
          sx={{ textTransform: "none", bgcolor: form.is_team_leader ? TL_CLR : TEAL, "&:hover": { bgcolor: form.is_team_leader ? "#6a1b9a" : "#00acc1" }, borderRadius: "8px", px: 3 }}>
          {initial ? "Save Changes" : (form.is_team_leader ? "Add Team Leader" : "Add Employee")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Employee Profile Card ──────────────────────────────────────────────────
function ProfileCard({ emp, deptName, managerName, onViewProfile, onEdit, onDelete }) {
  const sm = STATUS_META[emp.status] || STATUS_META.active;
  return (
    <Card sx={{
      borderRadius: "14px", overflow: "hidden", height: "100%",
      border: "1.5px solid #edf0f4",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      transition: "all 0.2s",
      "&:hover": { boxShadow: "0 8px 28px rgba(23,193,232,0.15)", borderColor: TEAL, transform: "translateY(-2px)" },
    }}>
      {/* Colored top banner */}
      <Box sx={{ height: 56, background: `linear-gradient(135deg, ${avatarColor(emp.name)}cc, ${avatarColor(emp.name)}80)`, position: "relative" }}>
        {emp.is_team_leader && (
          <Box sx={{ position: "absolute", top: 8, right: 8, bgcolor: TL_CLR, borderRadius: "6px", px: 0.8, py: 0.3, display: "flex", alignItems: "center", gap: 0.4 }}>
            <Star sx={{ fontSize: 10, color: "#fff" }} />
            <Typography sx={{ fontSize: "0.6rem", color: "#fff", fontWeight: 700 }}>Team Leader</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        {/* Avatar overlapping banner */}
        <Box sx={{ mt: -3.5, mb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Avatar src={emp.avatar}
            sx={{ width: 56, height: 56, fontSize: 22, fontWeight: 700, bgcolor: avatarColor(emp.name), border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            {getInitials(emp.name)}
          </Avatar>
          <Chip label={sm.label} size="small"
            sx={{ height: 20, fontSize: "0.65rem", bgcolor: sm.bg, color: sm.color, fontWeight: 700 }} />
        </Box>

        {/* Name & position */}
        <Typography fontWeight={800} fontSize="0.92rem" noWrap mb={0.25}>{emp.name}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "#78909c", mb: 1.2 }} noWrap>{emp.position || "No position set"}</Typography>

        {/* Info rows */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
          {deptName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Business sx={{ fontSize: 13, color: "#b0bec5" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#607d8b" }} noWrap>{deptName}</Typography>
            </Box>
          )}
          {emp.email && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Email sx={{ fontSize: 13, color: "#b0bec5" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#607d8b" }} noWrap>{emp.email}</Typography>
            </Box>
          )}
          {emp.phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Phone sx={{ fontSize: 13, color: "#b0bec5" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#607d8b" }}>{emp.phone}</Typography>
            </Box>
          )}
          {emp.location && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <LocationOn sx={{ fontSize: 13, color: "#b0bec5" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#607d8b" }} noWrap>{emp.location}</Typography>
            </Box>
          )}
          {managerName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccountTree sx={{ fontSize: 13, color: "#b0bec5" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#607d8b" }} noWrap>→ {managerName}</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Action buttons */}
        <Box sx={{ display: "flex", gap: 0.75 }}>
          <Button fullWidth size="small" variant="contained"
            onClick={() => onViewProfile(emp.id)}
            sx={{ textTransform: "none", fontSize: "0.7rem", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" }, borderRadius: "8px", py: 0.6 }}>
            View Profile
          </Button>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(emp)}
              sx={{ border: "1.5px solid #e0e0e0", borderRadius: "8px", color: "#607d8b", "&:hover": { bgcolor: TEAL_LT, borderColor: TEAL, color: TEAL } }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(emp.id)}
              sx={{ border: "1.5px solid #e0e0e0", borderRadius: "8px", color: "#607d8b", "&:hover": { bgcolor: "#ffebee", borderColor: "#ef9a9a", color: "#e53935" } }}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
}

// ── Main Employees Page ────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [deptFilter, setDeptFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tlFilter, setTlFilter]       = useState("all");  // all / tl / employee
  const [viewMode, setViewMode]       = useState("grid"); // grid / list

  const [profileId, setProfileId]     = useState(null);
  const [empDialog, setEmpDialog]     = useState({ open: false, initial: null, deptId: null, isTL: false });
  const [snack, setSnack]             = useState(null);

  const notify = (msg, sev = "success") => setSnack({ msg, sev });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [e, d] = await Promise.all([hrAPI.getEmployees(), hrAPI.getDepartments()]);
      setEmployees(Array.isArray(e) ? e : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch { notify("Cannot connect to backend. Restart the server.", "error"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (form) => {
    try {
      const payload = { ...form, department_id: form.department_id || null, manager_id: form.manager_id || null };
      if (empDialog.initial) await hrAPI.updateEmployee(empDialog.initial.id, payload);
      else await hrAPI.createEmployee(payload);
      notify(empDialog.initial ? "Employee updated ✅" : (form.is_team_leader ? "Team Leader added ✅" : "Employee added ✅"));
      setEmpDialog({ open: false, initial: null, deptId: null, isTL: false });
      loadAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this employee from the system?")) return;
    try { await hrAPI.deleteEmployee(id); notify("Employee removed", "info"); loadAll(); }
    catch (e) { notify(e.message, "error"); }
  };

  const filtered = employees.filter(e => {
    if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (tlFilter === "tl" && !e.is_team_leader) return false;
    if (tlFilter === "employee" && e.is_team_leader) return false;
    if (search) {
      const s = search.toLowerCase();
      return (e.name || "").toLowerCase().includes(s) ||
        (e.position || "").toLowerCase().includes(s) ||
        (e.email || "").toLowerCase().includes(s) ||
        (e.location || "").toLowerCase().includes(s);
    }
    return true;
  });

  const tlCount  = employees.filter(e => e.is_team_leader).length;
  const empCount = employees.filter(e => !e.is_team_leader).length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ── */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Employee Directory</Typography>
            <Typography variant="body2" color="text.secondary">
              {employees.length} total · {tlCount} team leaders · {empCount} employees
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadAll} sx={{ textTransform: "none" }}>Refresh</Button>
            <Button variant="outlined" size="small" startIcon={<Star sx={{ fontSize: 14 }} />}
              onClick={() => setEmpDialog({ open: true, initial: null, deptId: null, isTL: true })}
              sx={{ textTransform: "none", borderColor: TL_CLR, color: TL_CLR, "&:hover": { bgcolor: TL_LT } }}>
              Add Team Leader
            </Button>
            <Button variant="contained" size="small" startIcon={<PersonAdd sx={{ fontSize: 14 }} />}
              onClick={() => setEmpDialog({ open: true, initial: null, deptId: null, isTL: false })}
              sx={{ textTransform: "none", bgcolor: TEAL, "&:hover": { bgcolor: "#00acc1" } }}>
              Add Employee
            </Button>
          </Box>
        </Box>

        {/* ── Stats cards ── */}
        <Grid container spacing={1.5} mb={3}>
          {[
            { label: "Total Employees", value: employees.length,                             color: "#1976d2" },
            { label: "Active",          value: employees.filter(e => e.status === "active").length, color: "#388e3c" },
            { label: "Team Leaders",    value: tlCount,                                      color: TL_CLR },
            { label: "Departments",     value: departments.length,                           color: TEAL },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card sx={{ borderLeft: `4px solid ${s.color}`, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderRadius: "12px" }}>
                <Box sx={{ p: "12px 16px" }}>
                  <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, fontSize: 10, color: "text.secondary" }}>{s.label}</Typography>
                  <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Filters ── */}
        <Card sx={{ mb: 2.5, borderRadius: "12px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
          <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField size="small" placeholder="Search by name, position, email, location…" value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 300 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "#90a4ae" }} /></InputAdornment>,
                endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><Close sx={{ fontSize: 14 }} /></IconButton></InputAdornment> : null
              }} />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Department</InputLabel>
              <Select value={deptFilter} label="Department" onChange={e => setDeptFilter(e.target.value)}>
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Statuses</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Role</InputLabel>
              <Select value={tlFilter} label="Role" onChange={e => setTlFilter(e.target.value)}>
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="tl">Team Leaders</MenuItem>
                <MenuItem value="employee">Employees</MenuItem>
              </Select>
            </FormControl>
            <Box flex={1} />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {filtered.length} of {employees.length}
            </Typography>
          </Box>
        </Card>

        {/* ── Employee Grid ── */}
        {loading ? (
          <LinearProgress sx={{ borderRadius: 1, "& .MuiLinearProgress-bar": { bgcolor: TEAL } }} />
        ) : filtered.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Groups sx={{ fontSize: 72, color: "#e0e0e0", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={1}>
              {employees.length === 0 ? "No employees yet" : "No employees match your filters"}
            </Typography>
            {employees.length === 0 && (
              <Box display="flex" gap={1.5} justifyContent="center" mt={2}>
                <Button variant="contained" startIcon={<PersonAdd />}
                  onClick={() => setEmpDialog({ open: true, initial: null, deptId: null, isTL: false })}
                  sx={{ textTransform: "none", bgcolor: TEAL }}>Add Employee</Button>
              </Box>
            )}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(emp => {
              const dept = departments.find(d => d.id === emp.department_id);
              const manager = employees.find(m => m.id === emp.manager_id);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
                  <ProfileCard
                    emp={emp}
                    deptName={dept?.name}
                    managerName={manager?.name}
                    onViewProfile={id => setProfileId(id)}
                    onEdit={e => setEmpDialog({ open: true, initial: e, deptId: null, isTL: false })}
                    onDelete={handleDelete}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* ── Profile Dialog ── */}
      <EmployeeProfileDialog
        empId={profileId}
        open={Boolean(profileId)}
        onClose={() => setProfileId(null)}
        employees={employees}
        departments={departments}
        onEdit={emp => { setProfileId(null); setEmpDialog({ open: true, initial: emp, deptId: null, isTL: false }); }}
        onDelete={id => { setProfileId(null); handleDelete(id); }}
      />

      {/* ── Add/Edit Dialog ── */}
      <EmployeeDialog
        open={empDialog.open}
        onClose={() => setEmpDialog({ open: false, initial: null, deptId: null, isTL: false })}
        initial={empDialog.initial}
        departments={departments}
        employees={employees}
        defaultDeptId={empDialog.deptId}
        defaultIsTeamLeader={empDialog.isTL}
        onSave={handleSave}
      />

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)} sx={{ borderRadius: "10px" }}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
