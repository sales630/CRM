/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import { useFileAttachment, AttachmentPreviewBar } from "components/FileAttachment";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import {
  Box, Card, CardContent, Typography, Button, Chip, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Divider, List, ListItem, ListItemText, Checkbox, Tooltip, Select,
  MenuItem, FormControl, InputLabel, Tabs, Tab, CircularProgress,
  Alert, Snackbar, LinearProgress, InputAdornment, Switch,
} from "@mui/material";
import {
  Add, Close, Send, Delete, Star, StarBorder, Reply, Forward, AttachFile,
  Inbox, Drafts, Send as SendIcon, DeleteOutline, Search, MoreHoriz,
  Refresh, Settings, ExpandMore, ExpandLess, ChevronLeft, Create, Folder, Mail as MailIcon,
  CheckCircle, Error as ErrorIcon, Visibility, VisibilityOff, Sync, AccountCircle,
  Link as LinkIcon, LinkOff, Assignment, PersonPin, Rule, AlternateEmail,
  Language, Subject, DragIndicator, FlashOn, Edit as EditIcon, MarkEmailUnread,
  Label as LabelIcon, LabelOutlined, FolderSpecial, AutoAwesome, Bolt,
} from "@mui/icons-material";
import { mailAccountsAPI, mailRulesAPI, mailLabelsAPI, projectsAPI, tasksAPI, usersAPI } from "services/api";
import { useAuth } from "context/AuthContext";

const PROVIDER_META = {
  gmail:     { label: "Gmail",      color: "#ea4335", icon: "G",   hint: "Use an App Password — myaccount.google.com → Security → App Passwords" },
  outlook:   { label: "Outlook",    color: "#0078d4", icon: "O",   hint: "Use your Outlook password or App Password if 2FA is enabled" },
  icloud:    { label: "iCloud",     color: "#3d3d3d", icon: "i",   hint: "Use an App-Specific Password from appleid.apple.com" },
  office365: { label: "Office 365", color: "#d83b01", icon: "365", hint: "Use your Microsoft 365 password or App Password" },
  custom:    { label: "Custom",     color: "#607d8b", icon: "✉",  hint: "Enter your IMAP/SMTP server settings manually" },
};

const getColor = (name) => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0; for (let c of name || "U") s += c.charCodeAt(0);
  return C[s % C.length];
};

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 1000;
  if (diff < 86400) return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800) return dt.toLocaleDateString("en-US", { weekday: "short" });
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Connect Dialog ─────────────────────────────────────────────────────────
function ConnectDialog({ open, onClose, onConnected }) {
  const [step, setStep] = useState(1); // 1=pick provider, 2=enter credentials
  const [provider, setProvider] = useState(null);
  const [email, setEmail] = useState("team@outsourcedbookeeping.com");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetAndClose = () => {
    setStep(1); setProvider(null); setEmail("team@outsourcedbookeeping.com"); setPassword("");
    setShowPass(false); setAdvanced(false); setError(""); onClose();
  };

  const handleProviderSelect = (p) => {
    setProvider(p);
    setStep(2);
    setError("");
  };

  const handleConnect = async () => {
    if (!email.trim() || !password.trim()) return setError("Email and password are required");
    setLoading(true); setError("");
    try {
      const payload = { email: email.trim(), password, provider };
      if (advanced) { payload.imap_host = imapHost; payload.imap_port = imapPort; payload.smtp_host = smtpHost; payload.smtp_port = smtpPort; }
      const account = await mailAccountsAPI.connect(payload);
      onConnected(account);
      resetAndClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center" gap={1}>
          <MailIcon color="primary" />
          {step === 1 ? "Connect Your Mailbox" : `Connect ${PROVIDER_META[provider]?.label}`}
        </Box>
        <IconButton size="small" onClick={resetAndClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Choose your email provider to connect your mailbox and read/send real emails.
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(PROVIDER_META).map(([key, p]) => (
                <Grid item xs={6} key={key}>
                  <Card
                    onClick={() => handleProviderSelect(key)}
                    sx={{ p: 2, textAlign: "center", cursor: "pointer", border: "2px solid transparent",
                      "&:hover": { border: `2px solid ${p.color}`, boxShadow: 4 }, transition: "all 0.2s" }}
                  >
                    <Avatar sx={{ width: 48, height: 48, bgcolor: p.color, mx: "auto", mb: 1,
                      fontSize: key === "office365" ? "0.75rem" : "1.3rem" }}>
                      {p.icon}
                    </Avatar>
                    <Typography variant="body2" fontWeight="bold">{p.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* Provider hint */}
            <Alert severity="info" icon={<AccountCircle />} sx={{ py: 0.5 }}>
              <strong>{PROVIDER_META[provider]?.label}:</strong> {PROVIDER_META[provider]?.hint}
            </Alert>

            <TextField
              fullWidth label="Email Address" size="small"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@gmail.com" type="email"
              onBlur={() => {
                if (provider === "custom" && email.includes("@")) {
                  const d = email.split("@")[1];
                  setImapHost(`imap.${d}`); setSmtpHost(`smtp.${d}`);
                }
              }}
            />
            <TextField
              fullWidth label={provider === "gmail" ? "App Password" : "Password"} size="small"
              value={password} onChange={e => setPassword(e.target.value)}
              type={showPass ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {provider === "gmail" && (
              <Alert severity="warning" sx={{ py: 0.5, fontSize: "0.78rem" }}>
                Gmail requires an <strong>App Password</strong>, not your Google account password.<br />
                Go to: <strong>myaccount.google.com → Security → 2-Step Verification → App Passwords</strong>
              </Alert>
            )}

            {(provider === "custom" || advanced) && (
              <Box>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">Server Settings</Typography></Divider>
                <Grid container spacing={1.5}>
                  <Grid item xs={8}><TextField fullWidth size="small" label="IMAP Host" value={imapHost} onChange={e => setImapHost(e.target.value)} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="IMAP Port" value={imapPort} onChange={e => setImapPort(e.target.value)} type="number" /></Grid>
                  <Grid item xs={8}><TextField fullWidth size="small" label="SMTP Host" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="SMTP Port" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} type="number" /></Grid>
                </Grid>
              </Box>
            )}

            {provider !== "custom" && (
              <Button size="small" onClick={() => setAdvanced(v => !v)} sx={{ alignSelf: "flex-start", textTransform: "none", fontSize: "0.75rem" }}>
                {advanced ? "Hide" : "Show"} advanced server settings
              </Button>
            )}

            {error && <Alert severity="error" sx={{ fontSize: "0.78rem" }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === 2 && <Button onClick={() => setStep(1)} disabled={loading}>Back</Button>}
        <Box flex={1} />
        <Button variant="outlined" onClick={resetAndClose} disabled={loading}>Cancel</Button>
        {step === 2 && (
          <Button variant="contained" onClick={handleConnect} disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}>
            {loading ? "Connecting..." : "Connect"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Compose Dialog ─────────────────────────────────────────────────────────
function ComposeModal({ open, onClose, onSend, replyTo }) {
  const [to, setTo] = useState(replyTo?.email || "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState(replyTo ? `\n\n---\nOn ${replyTo.time}, ${replyTo.from} wrote:\n${(replyTo.body||"").substring(0,150)}...` : "");
  const [minimized, setMinimized] = useState(false);
  const fileAttach = useFileAttachment();

  const handleSend = () => {
    onSend({ to, subject, body, attachments: fileAttach.attachments });
    fileAttach.clearAttachments();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      sx={{ "& .MuiDialog-paper": { position: "fixed", bottom: 0, right: 24, m: 0, borderRadius: "8px 8px 0 0", maxHeight: "80vh" } }}>
      <Box sx={{ bgcolor: "#404040", color: "white", px: 2, py: 1, display: "flex", alignItems: "center",
        justifyContent: "space-between", borderRadius: "8px 8px 0 0", cursor: "pointer" }}
        onClick={() => setMinimized(!minimized)}>
        <Typography variant="subtitle2" fontWeight="bold">New Message</Typography>
        <Box display="flex" gap={0.5}>
          <IconButton size="small" sx={{ color: "white", p: 0.25 }} onClick={e => { e.stopPropagation(); setMinimized(!minimized); }}>
            <ExpandMore sx={{ transform: minimized ? "rotate(180deg)" : "none" }} />
          </IconButton>
          <IconButton size="small" sx={{ color: "white", p: 0.25 }} onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimized && (
        <>
          <DialogContent sx={{ p: 0 }}>
            {fileAttach.FileInput}
            <Box sx={{ borderBottom: "1px solid #e0e0e0", px: 1 }}>
              <TextField fullWidth variant="standard" placeholder="To" value={to} onChange={e => setTo(e.target.value)}
                sx={{ "& input": { py: 1 } }} InputProps={{ disableUnderline: true }} />
            </Box>
            <Box sx={{ borderBottom: "1px solid #e0e0e0", px: 1 }}>
              <TextField fullWidth variant="standard" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)}
                sx={{ "& input": { py: 1 } }} InputProps={{ disableUnderline: true }} />
            </Box>
            <TextField fullWidth multiline minRows={8} variant="standard" placeholder="Compose email..." value={body}
              onChange={e => setBody(e.target.value)} sx={{ px: 1.5, "& textarea": { py: 1 } }} InputProps={{ disableUnderline: true }} />
            {(fileAttach.attachments.length > 0 || fileAttach.uploading || fileAttach.error) && (
              <Box sx={{ px: 1.5, pb: 1 }}>
                <AttachmentPreviewBar attachments={fileAttach.attachments} uploading={fileAttach.uploading}
                  uploadProgress={fileAttach.uploadProgress} error={fileAttach.error}
                  onRemove={fileAttach.removeAttachment} onClear={fileAttach.clearAttachments} />
              </Box>
            )}
          </DialogContent>
          <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e0e0e0" }}>
            <Box display="flex" gap={1} alignItems="center">
              <Button variant="contained" size="small" startIcon={<Send fontSize="small" />} onClick={handleSend}>Send</Button>
              <Tooltip title="Attach file">
                <IconButton size="small" onClick={fileAttach.openPicker} disabled={fileAttach.uploading}><AttachFile fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
            <IconButton size="small" onClick={onClose}><Delete fontSize="small" /></IconButton>
          </Box>
        </>
      )}
    </Dialog>
  );
}

// ── Email View ─────────────────────────────────────────────────────────────
function EmailView({ email, onClose, onReply, onDelete, onStar, matchedProject, onCreateTask, taskCreated, currentUser }) {
  if (!email) return null;
  const canCreateTask = ["admin","super_admin","team_leader"].includes(currentUser?.role);
  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "white" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
        <IconButton size="small" onClick={onClose}><ChevronLeft /></IconButton>
        <Tooltip title="Delete"><IconButton size="small" onClick={() => onDelete(email)}><Delete fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Reply"><IconButton size="small" onClick={() => onReply(email)}><Reply fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Forward"><IconButton size="small"><Forward fontSize="small" /></IconButton></Tooltip>
        <Tooltip title={email.starred ? "Unstar" : "Star"}>
          <IconButton size="small" onClick={() => onStar(email)}>{email.starred ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}</IconButton>
        </Tooltip>
        <Box flex={1} />
        {canCreateTask && taskCreated && (
          <Chip size="small" icon={<CheckCircle sx={{ fontSize: "13px !important" }} />}
            label={`Auto-task → ${taskCreated.assignee}`}
            sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: "bold", fontSize: "0.72rem", height: 24 }} />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{email.account_email}</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>{email.subject}</Typography>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: getColor(email.from), width: 40, height: 40 }}>{email.from.charAt(0)}</Avatar>
            <Box>
              <Typography variant="body2" fontWeight="bold">{email.from}</Typography>
              <Typography variant="caption" color="text.secondary">&lt;{email.email}&gt;</Typography>
              {matchedProject && (
                <Chip size="small" icon={<Folder sx={{ fontSize: "11px !important" }} />} label={`Project: ${matchedProject.name}`}
                  sx={{ mt: 0.5, height: 20, fontSize: "0.68rem", bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: "bold", display: "flex" }} />
              )}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">{email.time}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {email.bodyLoading ? (
          <Box display="flex" alignItems="center" gap={1} py={6} justifyContent="center">
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">Loading email content…</Typography>
          </Box>
        ) : email.body && /<[a-z][\s\S]*>/i.test(email.body) ? (
          <Box
            sx={{ "& img": { maxWidth: "100%" }, lineHeight: 1.8, fontSize: "0.875rem", "& a": { color: "#1976d2" } }}
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        ) : email.body ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
            {email.body}
          </Typography>
        ) : !email.bodyLoading ? (
          <Box py={3} textAlign="center">
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              {email.attachments?.length > 0
                ? `This email contains ${email.attachments.length} attachment(s) but no text body.`
                : "This email has no text content."}
            </Typography>
          </Box>
        ) : null}

        {/* Attachments */}
        {email.attachments?.length > 0 && (
          <Box mt={3} pt={2} sx={{ borderTop: "1px solid #f0f0f0" }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
              📎 ATTACHMENTS ({email.attachments.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {email.attachments.map((att, i) => {
                const ext = (att.filename || "").split(".").pop().toUpperCase();
                const kb = att.size ? Math.round(att.size / 1024) : 0;
                const iconColor = ext === "PDF" ? "#d32f2f" : ext === "XLSX" || ext === "XLS" ? "#388e3c" : ext === "DOCX" || ext === "DOC" ? "#1976d2" : "#607d8b";
                return (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, pr: 1.5, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", maxWidth: 220 }}>
                    <Box sx={{ width: 32, height: 32, bgcolor: iconColor + "18", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Typography variant="caption" fontWeight="bold" color={iconColor} fontSize={9}>{ext || "FILE"}</Typography>
                    </Box>
                    <Box overflow="hidden">
                      <Typography variant="caption" fontWeight="medium" display="block" noWrap title={att.filename}>{att.filename}</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={10}>{kb > 0 ? `${kb} KB` : "—"}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
      <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" startIcon={<Reply />} size="small" onClick={() => onReply(email)} sx={{ mr: 1 }}>Reply</Button>
        <Button variant="outlined" startIcon={<Forward />} size="small" sx={{ mr: 1 }}>Forward</Button>
        {canCreateTask && taskCreated && (
          <Chip size="small" icon={<PersonPin sx={{ fontSize: "13px !important" }} />}
            label={`Auto-task assigned to: ${taskCreated.assignee}`}
            sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: "bold", height: 24, fontSize: "0.72rem" }} />
        )}
      </Box>
    </Box>
  );
}

// ── Assignment Rules Dialog ────────────────────────────────────────────────
const CONDITION_TYPES = [
  { value: "from_email",      label: "Sender Email (exact)",  icon: <AlternateEmail fontSize="small" /> },
  { value: "domain",          label: "Sender Domain",          icon: <Language fontSize="small" /> },
  { value: "subject_keyword", label: "Subject Contains",       icon: <Subject fontSize="small" /> },
  { value: "default",         label: "Default (catch-all)",    icon: <FlashOn fontSize="small" /> },
];

function AssignmentRulesDialog({ open, onClose }) {
  const [rules, setRules]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [editId, setEditId]         = useState(null);  // null = new rule form
  const [showForm, setShowForm]     = useState(false);
  const [snack, setSnack]           = useState(null);
  const [form, setForm]             = useState({ condition_type: "from_email", condition_value: "", assign_to: "", description: "", active: true });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([mailRulesAPI.getAll(), usersAPI.getAll()])
      .then(([r, u]) => {
        setRules(Array.isArray(r) ? r : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const resetForm = () => {
    setForm({ condition_type: "from_email", condition_value: "", assign_to: "", description: "", active: true });
    setEditId(null);
    setShowForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setForm({ condition_type: rule.condition_type, condition_value: rule.condition_value, assign_to: rule.assign_to, description: rule.description || "", active: rule.active !== false });
    setEditId(rule.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (form.condition_type !== "default" && !form.condition_value.trim()) return setSnack({ msg: "Condition value is required", sev: "warning" });
    if (!form.assign_to) return setSnack({ msg: "Please select a person to assign to", sev: "warning" });
    setSaving(true);
    try {
      if (editId) {
        const updated = await mailRulesAPI.update(editId, form);
        setRules(prev => prev.map(r => r.id === editId ? updated : r));
        setSnack({ msg: "Rule updated", sev: "success" });
      } else {
        const created = await mailRulesAPI.create(form);
        setRules(prev => [...prev, created]);
        setSnack({ msg: "Rule created", sev: "success" });
      }
      resetForm();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await mailRulesAPI.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setSnack({ msg: "Rule deleted", sev: "info" });
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const handleToggle = async (rule) => {
    try {
      const updated = await mailRulesAPI.update(rule.id, { active: !rule.active });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: updated.active } : r));
    } catch {}
  };

  const condLabel = (type) => CONDITION_TYPES.find(c => c.value === type)?.label || type;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Rule color="primary" />
        <Box flex={1}>
          <Typography variant="h6" fontWeight="bold">Email Assignment Rules</Typography>
          <Typography variant="caption" color="text.secondary">
            Rules are checked in priority order. First match wins. Used for auto-inbox and manual task creation.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2 }}>
        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress size={32} /></Box>
        ) : (
          <>
            {/* Rules list */}
            {rules.length === 0 && !showForm ? (
              <Box textAlign="center" py={4}>
                <Rule sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                <Typography color="text.secondary" mb={1}>No assignment rules yet.</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Create rules to automatically assign incoming emails to team members.
                </Typography>
              </Box>
            ) : (
              <Box mb={2}>
                {rules.map((rule, idx) => (
                  <Box key={rule.id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, mb: 0.5,
                    border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: rule.active ? "#fafafa" : "#f5f5f5",
                    opacity: rule.active ? 1 : 0.6 }}>
                    <DragIndicator sx={{ color: "#bbb", cursor: "grab", fontSize: 18 }} />
                    <Chip label={idx + 1} size="small" sx={{ width: 28, height: 22, fontSize: "0.7rem", bgcolor: "#e3f2fd", color: "#1565c0" }} />
                    <Box sx={{ minWidth: 160 }}>
                      <Typography variant="caption" color="text.secondary">{condLabel(rule.condition_type)}</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ wordBreak: "break-all" }}>
                        {rule.condition_type === "default" ? "★ Catch-all" : rule.condition_value}
                      </Typography>
                    </Box>
                    <Box sx={{ color: "#aaa", mx: 0.5, fontSize: 18 }}>→</Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">Assign to</Typography>
                      <Typography variant="body2" fontWeight="bold">{rule.assign_to}</Typography>
                      {rule.description && <Typography variant="caption" color="text.secondary">{rule.description}</Typography>}
                    </Box>
                    <Chip label={rule.active ? "Active" : "Off"} size="small"
                      color={rule.active ? "success" : "default"}
                      onClick={() => handleToggle(rule)} sx={{ cursor: "pointer", fontSize: "0.68rem" }} />
                    <IconButton size="small" onClick={() => openEdit(rule)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(rule.id)}><Delete fontSize="small" sx={{ color: "#e57373" }} /></IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* Rule form */}
            {showForm && (
              <Box sx={{ p: 2, border: "2px solid #1976d2", borderRadius: 2, bgcolor: "#f5faff", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary">
                  {editId ? "Edit Rule" : "New Rule"}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Condition Type</InputLabel>
                      <Select label="Condition Type" value={form.condition_type} onChange={e => setForm(f => ({ ...f, condition_type: e.target.value }))}>
                        {CONDITION_TYPES.map(c => (
                          <MenuItem key={c.value} value={c.value}>
                            <Box display="flex" alignItems="center" gap={1}>{c.icon}{c.label}</Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label={form.condition_type === "default" ? "Value (leave blank)" : "Condition Value"}
                      placeholder={
                        form.condition_type === "from_email"      ? "e.g. client@company.com" :
                        form.condition_type === "domain"          ? "e.g. company.com" :
                        form.condition_type === "subject_keyword" ? "e.g. tax return" : "Catch-all — no value needed"
                      }
                      value={form.condition_value}
                      disabled={form.condition_type === "default"}
                      onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Assign To</InputLabel>
                      <Select label="Assign To" value={form.assign_to} onChange={e => setForm(f => ({ ...f, assign_to: e.target.value }))}>
                        {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name} ({u.role || ""})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField fullWidth size="small" label="Description (optional)" placeholder="e.g. Tax clients go to Sunil"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip label={form.active ? "Active" : "Inactive"} size="small" color={form.active ? "success" : "default"}
                      onClick={() => setForm(f => ({ ...f, active: !f.active }))} sx={{ cursor: "pointer" }} />
                    <Typography variant="caption" color="text.secondary">click to toggle</Typography>
                  </Grid>
                </Grid>
                <Box display="flex" gap={1} mt={2}>
                  <MDButton variant="gradient" color="info" size="small" onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                    {editId ? "Update Rule" : "Add Rule"}
                  </MDButton>
                  <MDButton variant="outlined" color="secondary" size="small" onClick={resetForm}>Cancel</MDButton>
                </Box>
              </Box>
            )}

            <MDButton variant="gradient" color="success" size="small" startIcon={<Add />} onClick={openNew} disabled={showForm}>
              Add Rule
            </MDButton>
          </>
        )}
      </DialogContent>

      <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Dialog>
  );
}

// ── Label Manager Dialog ────────────────────────────────────────────────────
const LABEL_COLORS = ["#1976d2","#e53935","#43a047","#f4511e","#8e24aa","#fb8c00","#00897b","#3949ab","#6d4c41","#00acc1"];

function LabelManagerDialog({ open, onClose, accounts = [], activeAccount }) {
  const [labels, setLabels]     = useState([]);
  const [users, setUsers]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [expandedIds, setExpandedIds] = useState({});
  const blankForm = { name: "", parent_id: "", imap_folder: "", auto_task: true, assign_to: "", color: "#1976d2", description: "" };
  const [form, setForm]         = useState({ ...blankForm });

  const selectedAccountId = activeAccount?.id || (accounts[0]?.id);

  const load = async () => {
    if (!selectedAccountId) return;
    try {
      const [lbls, usrs] = await Promise.all([
        mailLabelsAPI.getForAccount(selectedAccountId),
        usersAPI.getAll(),
      ]);
      setLabels(Array.isArray(lbls) ? lbls : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
    } catch (e) {
      setSnack({ msg: `Load failed: ${e.message}`, sev: "error" });
    }
  };

  useEffect(() => { if (open) load(); }, [open, selectedAccountId]);

  const resetForm = () => { setForm({ ...blankForm }); setShowForm(false); setEditId(null); };

  const openNew = (parentId = "") => {
    setForm({ ...blankForm, parent_id: parentId });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (lbl) => {
    setForm({
      name:        lbl.name || "",
      parent_id:   lbl.parent_id || "",
      imap_folder: lbl.imap_folder || "",
      auto_task:   lbl.auto_task !== false,
      assign_to:   lbl.assign_to || "",
      color:       lbl.color || "#1976d2",
      description: lbl.description || "",
    });
    setEditId(lbl.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setSnack({ msg: "Label name is required", sev: "warning" });
    setSaving(true);
    try {
      const payload = { ...form, account_id: selectedAccountId, parent_id: form.parent_id || null, assign_to: form.assign_to || null };
      if (editId) {
        await mailLabelsAPI.update(editId, payload);
        setSnack({ msg: "Label updated!", sev: "success" });
      } else {
        await mailLabelsAPI.create(payload);
        setSnack({ msg: "Label created!", sev: "success" });
      }
      resetForm();
      await load();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this label? Sub-labels will also be deleted.")) return;
    try {
      await mailLabelsAPI.delete(id);
      setSnack({ msg: "Label deleted", sev: "info" });
      await load();
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const handleToggleAutoTask = async (lbl) => {
    try {
      await mailLabelsAPI.update(lbl.id, { auto_task: !lbl.auto_task });
      setLabels(prev => prev.map(l => l.id === lbl.id ? { ...l, auto_task: !l.auto_task } : l));
    } catch {}
  };

  // Build tree: top-level and children
  const topLevel   = labels.filter(l => !l.parent_id);
  const childrenOf = (pid) => labels.filter(l => l.parent_id === pid);

  const LabelRow = ({ lbl, depth = 0 }) => {
    const kids = childrenOf(lbl.id);
    const isExpanded = expandedIds[lbl.id];
    return (
      <>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, mb: 0.5,
          border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa",
          ml: depth * 3 }}>
          {kids.length > 0 ? (
            <IconButton size="small" onClick={() => setExpandedIds(e => ({ ...e, [lbl.id]: !e[lbl.id] }))}>
              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          ) : <Box sx={{ width: 28 }} />}
          <LabelIcon sx={{ color: lbl.color || "#1976d2", fontSize: 18 }} />
          <Box flex={1}>
            <Typography variant="body2" fontWeight="bold">{lbl.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
              📁 {lbl.imap_folder || lbl.name}
              {lbl.assign_to && <span style={{ marginLeft: 8 }}>→ {lbl.assign_to}</span>}
            </Typography>
          </Box>
          <Tooltip title={lbl.auto_task ? "Auto-task ON: emails create tasks" : "Auto-task OFF"}>
            <Chip
              icon={<Bolt sx={{ fontSize: "12px !important" }} />}
              label={lbl.auto_task ? "Auto" : "Off"}
              size="small"
              color={lbl.auto_task ? "warning" : "default"}
              onClick={() => handleToggleAutoTask(lbl)}
              sx={{ cursor: "pointer", fontSize: "0.68rem" }}
            />
          </Tooltip>
          <Tooltip title="Add sub-label">
            <IconButton size="small" onClick={() => openNew(lbl.id)}><Add fontSize="small" sx={{ color: "#43a047" }} /></IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => openEdit(lbl)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => handleDelete(lbl.id)}><Delete fontSize="small" sx={{ color: "#e57373" }} /></IconButton>
        </Box>
        {isExpanded && kids.map(k => <LabelRow key={k.id} lbl={k} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LabelIcon color="primary" />
          <Typography fontWeight="bold">Label Manager</Typography>
          {activeAccount && (
            <Chip label={activeAccount.email} size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontSize: "0.72rem" }} />
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.82rem" }}>
          <strong>How labels work:</strong> Create labels and map them to IMAP folder paths (e.g. <code>Tax</code> or <code>Tax/Returns</code>).
          Enable <strong>Auto-task</strong> to automatically create a task when an email arrives in that folder.
          The background poller checks every 5 minutes.
        </Alert>

        {labels.length === 0 && !showForm ? (
          <Box textAlign="center" py={4}>
            <LabelIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography color="text.secondary" mb={1}>No labels yet.</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Create labels to auto-route emails from specific folders into tasks.
            </Typography>
          </Box>
        ) : (
          <Box mb={2}>
            {topLevel.map(lbl => <LabelRow key={lbl.id} lbl={lbl} />)}
          </Box>
        )}

        {/* Label form */}
        {showForm && (
          <Box sx={{ p: 2, border: "2px solid #1976d2", borderRadius: 2, bgcolor: "#f5faff", mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary">
              {editId ? "Edit Label" : (form.parent_id ? "New Sub-Label" : "New Label")}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Label Name *" placeholder="e.g. Tax Returns"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="IMAP Folder Path"
                  placeholder={form.parent_id ? "e.g. Tax/Returns" : "e.g. Tax"}
                  helperText="Exact folder name in your email account"
                  value={form.imap_folder} onChange={e => setForm(f => ({ ...f, imap_folder: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Parent Label (optional)</InputLabel>
                  <Select label="Parent Label (optional)" value={form.parent_id}
                    onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                    <MenuItem value=""><em>None (top level)</em></MenuItem>
                    {labels.filter(l => !l.parent_id && l.id !== editId).map(l => (
                      <MenuItem key={l.id} value={l.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LabelIcon sx={{ color: l.color, fontSize: 14 }} />
                          {l.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assign To (override)</InputLabel>
                  <Select label="Assign To (override)" value={form.assign_to}
                    onChange={e => setForm(f => ({ ...f, assign_to: e.target.value }))}>
                    <MenuItem value=""><em>Use assignment rules</em></MenuItem>
                    {users.map(u => <MenuItem key={u.id || u.name} value={u.name}>{u.name} ({u.role || ""})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Description (optional)"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Color</Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                    {LABEL_COLORS.map(c => (
                      <Box key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: c, cursor: "pointer",
                          border: form.color === c ? "2px solid #333" : "2px solid transparent" }} />
                    ))}
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1} ml={1}>
                  <Chip label={form.auto_task ? "Auto-task ON" : "Auto-task OFF"} size="small"
                    icon={<Bolt sx={{ fontSize: "12px !important" }} />}
                    color={form.auto_task ? "warning" : "default"}
                    onClick={() => setForm(f => ({ ...f, auto_task: !f.auto_task }))} sx={{ cursor: "pointer" }} />
                  <Typography variant="caption" color="text.secondary">click to toggle</Typography>
                </Box>
              </Grid>
            </Grid>
            <Box display="flex" gap={1} mt={2}>
              <MDButton variant="gradient" color="info" size="small" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                {editId ? "Update Label" : "Create Label"}
              </MDButton>
              <MDButton variant="outlined" color="secondary" size="small" onClick={resetForm}>Cancel</MDButton>
            </Box>
          </Box>
        )}

        <MDButton variant="gradient" color="success" size="small" startIcon={<Add />} onClick={() => openNew()} disabled={showForm}>
          Add Label
        </MDButton>
      </DialogContent>

      <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Dialog>
  );
}

// ── Main Mail Page ─────────────────────────────────────────────────────────
export default function Mail() {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [folder, setFolder] = useState("INBOX");
  const [category, setCategory] = useState("primary"); // gmail category filter
  const [folders, setFolders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [openEmail, setOpenEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [search, setSearch] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [snack, setSnack] = useState(null);
  const [emailProjects, setEmailProjects] = useState({});
  const [emailTasks, setEmailTasks] = useState({}); // emailId → { assignee, reason }
  const [rulesOpen, setRulesOpen]   = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [mailLabels, setMailLabels] = useState([]);
  const matchedRef = useRef(new Set());

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await mailAccountsAPI.getAccounts();
      setAccounts(data);
      if (data.length > 0 && !activeAccount) {
        setActiveAccount(data[0]);
      }
    } catch {}
  };

  // Load labels when active account changes
  useEffect(() => {
    if (activeAccount) loadLabels();
  }, [activeAccount]);

  const loadLabels = async () => {
    if (!activeAccount) return;
    try {
      const data = await mailLabelsAPI.getForAccount(activeAccount.id);
      setMailLabels(Array.isArray(data) ? data : []);
    } catch {}
  };

  // Fetch emails when active account, folder, or category changes
  useEffect(() => {
    if (activeAccount) {
      fetchEmails();
      loadFolders();
    }
  }, [activeAccount, folder, category]);

  const fetchEmails = async () => {
    if (!activeAccount) return;
    setSyncing(true); setError("");
    try {
      // Pass category only for INBOX folder (Gmail tabs only apply to inbox)
      const params = { folder, limit: 50 };
      if (folder === "INBOX" && category !== "all") params.category = category;
      const data = await mailAccountsAPI.fetchEmails(activeAccount.id, params);
      setEmails(data);
      matchedRef.current.clear();
      setEmailProjects({});
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const loadFolders = async () => {
    if (!activeAccount) return;
    try {
      const data = await mailAccountsAPI.getFolders(activeAccount.id);
      setFolders(data);
    } catch {}
  };

  // Match emails to projects
  useEffect(() => {
    const matchAll = async () => {
      for (const email of emails.filter(e => !matchedRef.current.has(e.id))) {
        matchedRef.current.add(email.id);
        try {
          const result = await projectsAPI.matchRule({ from_email: email.email });
          if (result?.matched && result.project) {
            setEmailProjects(prev => ({ ...prev, [email.id]: result.project }));
          }
        } catch {}
      }
    };
    if (emails.length > 0) matchAll();
  }, [emails]);

  const handleConnected = (account) => {
    setSnack({ msg: `✅ ${account.email} connected successfully!`, sev: "success" });
    loadAccounts();
  };

  const handleDisconnect = async (account) => {
    try {
      await mailAccountsAPI.disconnect(account.id);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
      if (activeAccount?.id === account.id) {
        setActiveAccount(null);
        setEmails([]);
      }
      setSnack({ msg: "Mailbox disconnected", sev: "info" });
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const handleSetMainInbox = async (account) => {
    const newVal = !account.is_main_inbox;
    try {
      const updated = await mailAccountsAPI.update(account.id, { is_main_inbox: newVal });
      // Update all accounts — only one can be main
      setAccounts(prev => prev.map(a =>
        a.id === account.id ? { ...a, is_main_inbox: newVal } : { ...a, is_main_inbox: false }
      ));
      setSnack({ msg: newVal ? `✅ ${account.email} set as main inbox — auto-task creation enabled` : "Main inbox disabled", sev: "success" });
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const [polling, setPolling] = useState(false);
  const handlePollNow = async () => {
    setPolling(true);
    try {
      await mailAccountsAPI.pollNow();
      setSnack({ msg: "✅ Inbox checked — new tasks created from any unread emails", sev: "success" });
    } catch (e) {
      setSnack({ msg: `Poll failed: ${e.message}`, sev: "error" });
    } finally {
      setPolling(false);
    }
  };

  const handleStar = async (email) => {
    const nowStarred = !email.starred;
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, starred: nowStarred } : e));
    try {
      await mailAccountsAPI.flagEmail(activeAccount.id, {
        uid: email.uid, folder, flag: "\\Flagged", action: nowStarred ? "add" : "remove",
      });
    } catch {}
  };

  // ── Auto-create task silently when email is opened ────────────────────────
  const autoCreateTask = async (email) => {
    try {
      const result = await mailAccountsAPI.createTaskFromEmail({
        from: email.from,
        email: email.email,
        subject: email.subject,
        body: email.body || "",
        received_at: email.date,
      });
      if (result?.task) {
        const taskInfo = { assignee: result.assignee, reason: result.reason, project: result.project };
        setEmailTasks(prev => ({ ...prev, [email.id]: taskInfo }));
        const groupLabel = result.project ? ` [${result.project.name}]` : "";
        setSnack({ msg: `📋 Task auto-created${groupLabel} → assigned to ${result.assignee}`, sev: "success" });
      }
    } catch {
      // silent fail — don't block the email open flow
    }
  };

  const handleRead = async (email) => {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
    setOpenEmail({ ...email, read: true, bodyLoading: true });
    if (!email.read) {
      try { mailAccountsAPI.flagEmail(activeAccount.id, { uid: email.uid, folder, flag: "\\Seen", action: "add" }); } catch {}
    }

    // Fetch body + attachments on demand
    try {
      const bodyData = await mailAccountsAPI.fetchBody(activeAccount.id, email.uid, folder);
      const body = bodyData.html || bodyData.text || "";
      const attachments = bodyData.attachments || [];
      setOpenEmail(prev => prev ? { ...prev, body, attachments, bodyLoading: false } : null);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, body, attachments } : e));
    } catch {
      setOpenEmail(prev => prev ? { ...prev, body: "(could not load body)", attachments: [], bodyLoading: false } : null);
    }
  };

  const handleDelete = (email) => {
    setEmails(prev => prev.filter(e => e.id !== email.id));
    setOpenEmail(null);
  };

  const handleSend = async ({ to, subject, body, attachments }) => {
    if (!activeAccount) return setSnack({ msg: "No mailbox connected", sev: "error" });
    try {
      await mailAccountsAPI.sendEmail(activeAccount.id, { to, subject, body, attachments });
      setSnack({ msg: "Email sent successfully!", sev: "success" });
    } catch (e) {
      setSnack({ msg: e.message, sev: "error" });
    }
  };

  const handleCreateTask = async (email) => {
    if (!email) return;
    try {
      const result = await mailAccountsAPI.createTaskFromEmail({
        from: email.from,
        email: email.email,
        subject: email.subject,
        body: email.body || "",
        received_at: email.date,
      });
      if (result?.task) {
        const taskInfo = { assignee: result.assignee, reason: result.reason, project: result.project };
        setEmailTasks(prev => ({ ...prev, [email.id]: taskInfo }));
        const groupLabel = result.project ? ` [${result.project.name}]` : "";
        setSnack({ msg: `✅ Task created${groupLabel} → assigned to ${result.assignee}`, sev: "success" });
      } else {
        setSnack({ msg: result?.error || "Failed to create task", sev: "error" });
      }
    } catch (e) {
      setSnack({ msg: `Error creating task: ${e.message}`, sev: "error" });
    }
  };

  // Re-create task if already exists (manual override button in EmailView)
  const handleForceCreateTask = async (email) => {
    if (!email) return;
    // Remove existing so handleCreateTask can re-run
    setEmailTasks(prev => { const n = { ...prev }; delete n[email.id]; return n; });
    await handleCreateTask(email);
  };

  const visibleEmails = emails.filter(e => {
    if (search && !e.subject?.toLowerCase().includes(search.toLowerCase()) && !e.from?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unread = emails.filter(e => !e.read).length;

  // Standard folder list (will be replaced with real folders once loaded)
  const FOLDER_LIST = [
    { key: "INBOX", label: "Inbox", icon: <Inbox fontSize="small" /> },
    { key: "[Gmail]/Sent Mail", label: "Sent", icon: <SendIcon fontSize="small" /> },
    { key: "[Gmail]/Drafts", label: "Drafts", icon: <Drafts fontSize="small" /> },
    { key: "[Gmail]/Trash", label: "Trash", icon: <DeleteOutline fontSize="small" /> },
    { key: "[Gmail]/Starred", label: "Starred", icon: <Star fontSize="small" /> },
  ];

  // ── No accounts connected ──
  if (accounts.length === 0) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ mt: 2, mb: 4 }}>
          <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <CardContent>
              <Box sx={{ textAlign: "center", py: 6 }}>
                <MailIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" mb={1}>Mailbox Integration</Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>
                  Connect your email account to read and send emails directly from your dashboard.
                </Typography>
                <Grid container spacing={2} justifyContent="center" sx={{ maxWidth: 700, mx: "auto", mb: 4 }}>
                  {["gmail","outlook","icloud","office365"].map(key => {
                    const p = PROVIDER_META[key];
                    return (
                      <Grid item xs={6} sm={3} key={key}>
                        <Card sx={{ p: 2, textAlign: "center", cursor: "pointer", "&:hover": { boxShadow: 4 }, transition: "box-shadow 0.2s" }}
                          onClick={() => setConnectOpen(true)}>
                          <Avatar sx={{ width: 48, height: 48, bgcolor: p.color, mx: "auto", mb: 1, fontSize: key === "office365" ? "0.8rem" : "1.2rem" }}>{p.icon}</Avatar>
                          <Typography variant="body2" fontWeight="medium">{p.label}</Typography>
                          <Button size="small" variant="outlined" sx={{ mt: 1, fontSize: "0.7rem" }} onClick={() => setConnectOpen(true)}>Connect</Button>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                <MDButton variant="gradient" color="info" size="large" onClick={() => setConnectOpen(true)} startIcon={<LinkIcon />}>
                  Connect Mailbox
                </MDButton>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} onConnected={handleConnected} />
        <AssignmentRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
        <LabelManagerDialog open={labelsOpen} onClose={() => { setLabelsOpen(false); loadLabels(); }}
          accounts={accounts} activeAccount={activeAccount} />
        <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
        </Snackbar>
      </DashboardLayout>
    );
  }

  // ── Full mail UI ──
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Account switcher bar */}
        <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
          {accounts.map(a => (
            <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Chip
                avatar={<Avatar sx={{ bgcolor: getColor(a.email) }}>{a.email.charAt(0).toUpperCase()}</Avatar>}
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {a.email}
                    {a.is_main_inbox && (
                      <Chip label="Main Inbox" size="small"
                        icon={<MarkEmailUnread sx={{ fontSize: "10px !important" }} />}
                        sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#e8f5e9", color: "#2e7d32", ml: 0.5,
                          "& .MuiChip-icon": { color: "#2e7d32" } }} />
                    )}
                  </Box>
                }
                onClick={() => { setActiveAccount(a); setEmails([]); setOpenEmail(null); }}
                onDelete={() => handleDisconnect(a)}
                deleteIcon={<Tooltip title="Disconnect"><LinkOff fontSize="small" /></Tooltip>}
                variant={activeAccount?.id === a.id ? "filled" : "outlined"}
                sx={{ bgcolor: activeAccount?.id === a.id ? "#e3f2fd" : "transparent", fontWeight: "bold", border: "1px solid #90caf9" }}
              />
              <Tooltip title={a.is_main_inbox ? "Disable auto-task inbox" : "Set as main inbox (auto-create tasks)"}>
                <IconButton size="small" onClick={() => handleSetMainInbox(a)}
                  sx={{ bgcolor: a.is_main_inbox ? "#e8f5e9" : "#f5f5f5", border: `1px solid ${a.is_main_inbox ? "#81c784" : "#ddd"}` }}>
                  <MarkEmailUnread fontSize="small" sx={{ color: a.is_main_inbox ? "#388e3c" : "#aaa", fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Tooltip title="Add another mailbox">
            <IconButton size="small" onClick={() => setConnectOpen(true)} sx={{ bgcolor: "#f5f5f5", border: "1px dashed #bbb" }}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Email Assignment Rules">
            <IconButton size="small" onClick={() => setRulesOpen(true)}
              sx={{ bgcolor: "#f3e5f5", border: "1px solid #ce93d8" }}>
              <Rule fontSize="small" sx={{ color: "#7b1fa2" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Label Manager (auto-task by folder)">
            <IconButton size="small" onClick={() => setLabelsOpen(true)}
              sx={{ bgcolor: "#fff8e1", border: "1px solid #ffcc80" }}>
              <LabelIcon fontSize="small" sx={{ color: "#e65100" }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minHeight: 600 }}>
          {syncing && <LinearProgress />}
          <Box sx={{ display: "flex", height: 600 }}>
            {/* Sidebar */}
            <Box sx={{ width: 210, borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 1.5 }}>
                <Button fullWidth variant="contained" startIcon={<Create />} size="small"
                  onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
                  Compose
                </Button>
              </Box>

              <List dense sx={{ py: 0 }}>
                {FOLDER_LIST.map(f => (
                  <ListItem key={f.key} button selected={folder === f.key} onClick={() => { setFolder(f.key); setOpenEmail(null); if (f.key !== "INBOX") setCategory("all"); }}
                    sx={{ borderRadius: 1, mx: 0.5, "&.Mui-selected": { bgcolor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" }, "& .MuiListItemText-primary": { color: "white" } } }}>
                    <Box sx={{ mr: 1, color: folder === f.key ? "white" : "text.secondary" }}>{f.icon}</Box>
                    <ListItemText primary={f.label} primaryTypographyProps={{ fontSize: "0.85rem" }} />
                    {f.key === "INBOX" && unread > 0 && (
                      <Chip label={unread} size="small" color="error" sx={{ height: 18, fontSize: "0.65rem" }} />
                    )}
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 1 }} />
              <Box sx={{ px: 2, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">ACCOUNT</Typography>
              </Box>
              <Box sx={{ px: 2, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all", fontSize: "0.72rem" }}>
                  {activeAccount?.email}
                </Typography>
                {activeAccount?.last_sync && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.65rem", mt: 0.3 }}>
                    Last synced: {fmtDate(activeAccount.last_sync)}
                  </Typography>
                )}
                {/* Auto-Task toggle — always visible when an account is open */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}
                  sx={{ bgcolor: activeAccount?.is_main_inbox ? "#e8f5e9" : "#f5f5f5",
                    border: `1px solid ${activeAccount?.is_main_inbox ? "#81c784" : "#ddd"}`,
                    borderRadius: 1, px: 1, py: 0.4 }}>
                  <Typography variant="caption" fontWeight={700}
                    sx={{ fontSize: "0.65rem", color: activeAccount?.is_main_inbox ? "#2e7d32" : "#666" }}>
                    {activeAccount?.is_main_inbox ? "🟢 Auto-Task ON" : "⚫ Auto-Task OFF"}
                  </Typography>
                  <Switch
                    size="small"
                    checked={!!activeAccount?.is_main_inbox}
                    onChange={() => handleSetMainInbox(activeAccount)}
                    color="success"
                  />
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  disabled={polling}
                  onClick={handlePollNow}
                  sx={{ mt: 0.8, fontSize: "0.7rem", py: 0.5,
                    bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" },
                    "&.Mui-disabled": { bgcolor: "#90caf9", color: "#fff" } }}
                >
                  {polling ? "⏳ Checking inbox…" : "⚡ Check Inbox Now"}
                </Button>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ px: 1.5, pb: 0.5 }}>
                <Button fullWidth variant="outlined" startIcon={<Rule />} size="small"
                  onClick={() => setRulesOpen(true)}
                  sx={{ fontSize: "0.75rem", color: "#7b1fa2", borderColor: "#ce93d8", "&:hover": { borderColor: "#7b1fa2", bgcolor: "#f3e5f5" } }}>
                  Assignment Rules
                </Button>
              </Box>

              {/* Labels section */}
              {mailLabels.length > 0 && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ px: 2, py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">LABELS</Typography>
                  </Box>
                  <Box sx={{ px: 1, pb: 0.5, overflowY: "auto", maxHeight: 150 }}>
                    {mailLabels.filter(l => !l.parent_id).map(lbl => (
                      <Box key={lbl.id}>
                        <ListItem button dense
                          selected={folder === lbl.imap_folder}
                          onClick={() => { setFolder(lbl.imap_folder || lbl.name); setOpenEmail(null); }}
                          sx={{ borderRadius: 1, py: 0.3,
                            "&.Mui-selected": { bgcolor: "#fff8e1", "& .label-name": { color: lbl.color || "#e65100" } } }}>
                          <LabelIcon sx={{ fontSize: 14, color: lbl.color || "#e65100", mr: 0.75 }} />
                          <ListItemText
                            primary={lbl.name}
                            primaryTypographyProps={{ fontSize: "0.8rem", className: "label-name" }}
                          />
                          {lbl.auto_task && (
                            <Tooltip title="Auto-task enabled">
                              <Bolt sx={{ fontSize: 12, color: "#fb8c00" }} />
                            </Tooltip>
                          )}
                        </ListItem>
                        {mailLabels.filter(c => c.parent_id === lbl.id).map(sub => (
                          <ListItem key={sub.id} button dense
                            selected={folder === sub.imap_folder}
                            onClick={() => { setFolder(sub.imap_folder || sub.name); setOpenEmail(null); }}
                            sx={{ borderRadius: 1, py: 0.3, pl: 3,
                              "&.Mui-selected": { bgcolor: "#fff8e1" } }}>
                            <LabelOutlined sx={{ fontSize: 12, color: sub.color || "#e65100", mr: 0.75 }} />
                            <ListItemText
                              primary={sub.name}
                              primaryTypographyProps={{ fontSize: "0.75rem", color: "text.secondary" }}
                            />
                            {sub.auto_task && <Bolt sx={{ fontSize: 10, color: "#fb8c00" }} />}
                          </ListItem>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Box sx={{ px: 1.5, pb: 1, mt: mailLabels.length > 0 ? 0.5 : 0 }}>
                <Button fullWidth variant="outlined" startIcon={<LabelIcon />} size="small"
                  onClick={() => setLabelsOpen(true)}
                  sx={{ fontSize: "0.75rem", color: "#e65100", borderColor: "#ffcc80", "&:hover": { borderColor: "#e65100", bgcolor: "#fff8e1" } }}>
                  Manage Labels
                </Button>
              </Box>
            </Box>

            {/* Email list / Email view */}
            {openEmail ? (
              <EmailView
                email={openEmail}
                onClose={() => setOpenEmail(null)}
                onReply={e => { setReplyTo(e); setComposeOpen(true); }}
                onDelete={handleDelete}
                onStar={handleStar}
                matchedProject={emailProjects[openEmail?.id] || null}
                onCreateTask={handleForceCreateTask}
                taskCreated={emailTasks[openEmail?.id] || null}
                currentUser={currentUser}
              />
            ) : (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Toolbar */}
                <Box sx={{ px: 2, py: 1, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
                  <Checkbox size="small"
                    checked={selected.length === visibleEmails.length && visibleEmails.length > 0}
                    onChange={() => setSelected(selected.length === visibleEmails.length ? [] : visibleEmails.map(e => e.id))} />
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchEmails} disabled={syncing}>
                      <Refresh fontSize="small" sx={{ animation: syncing ? "spin 1s linear infinite" : "none",
                        "@keyframes spin": { "100%": { transform: "rotate(360deg)" } } }} />
                    </IconButton>
                  </Tooltip>
                  {selected.length > 0 && (
                    <Tooltip title="Delete selected">
                      <IconButton size="small" onClick={() => { selected.forEach(id => handleDelete({ id })); setSelected([]); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Box flex={1} />
                  <TextField size="small" placeholder="Search mail..." value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} /> }}
                    sx={{ width: 220 }} />
                </Box>

                {/* Error */}
                {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError("")}>{error}</Alert>}

                {/* Gmail Category Tabs — only shown for INBOX */}
                {folder === "INBOX" && (
                  <Box sx={{ borderBottom: "1px solid #e0e0e0", px: 1 }}>
                    <Tabs
                      value={category}
                      onChange={(_, v) => { setCategory(v); setOpenEmail(null); setEmails([]); }}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ minHeight: 38, "& .MuiTab-root": { minHeight: 38, textTransform: "none", fontSize: "0.82rem", py: 0, px: 1.5 } }}
                    >
                      <Tab value="primary"    label="Primary" />
                      <Tab value="all"        label="All Mail" />
                      <Tab value="updates"    label="Updates" />
                      <Tab value="promotions" label="Promotions" />
                      <Tab value="social"     label="Social" />
                    </Tabs>
                  </Box>
                )}

                {/* Email list */}
                <Box sx={{ flex: 1, overflowY: "auto" }}>
                  {syncing && emails.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <CircularProgress size={32} />
                      <Typography color="text.secondary" mt={2}>Loading emails from {activeAccount?.email}...</Typography>
                    </Box>
                  ) : visibleEmails.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <MailIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                      <Typography color="text.secondary">No messages found</Typography>
                    </Box>
                  ) : visibleEmails.map(email => (
                    <Box key={email.id} onClick={() => handleRead(email)}
                      sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, cursor: "pointer",
                        borderBottom: "1px solid #f5f5f5",
                        bgcolor: email.read ? "white" : "#e8f4fd",
                        "&:hover": { bgcolor: email.read ? "#f9f9f9" : "#d4ecf7" } }}>
                      <Checkbox size="small" checked={selected.includes(email.id)}
                        onClick={e => { e.stopPropagation(); setSelected(selected.includes(email.id) ? selected.filter(s => s !== email.id) : [...selected, email.id]); }}
                        sx={{ mr: 0.5 }} />
                      <IconButton size="small" onClick={e => { e.stopPropagation(); handleStar(email); }} sx={{ mr: 0.5 }}>
                        {email.starred ? <Star fontSize="small" color="warning" /> : <StarBorder fontSize="small" sx={{ color: "#ccc" }} />}
                      </IconButton>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: getColor(email.from), fontSize: "0.8rem", mr: 1.5 }}>
                        {email.from.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={email.read ? "normal" : "bold"} sx={{ minWidth: 140 }}>
                            {email.from}
                          </Typography>
                          <Typography variant="body2" fontWeight={email.read ? "normal" : "bold"}
                            sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {email.subject}
                          </Typography>
                          {emailProjects[email.id] && (
                            <Chip label={emailProjects[email.id].name} size="small"
                              icon={<Folder sx={{ fontSize: "10px !important" }} />}
                              sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#e3f2fd", color: "#1565c0",
                                flexShrink: 0, "& .MuiChip-icon": { color: "#1565c0", ml: "4px" } }} />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(email.body || "").replace(/<[^>]*>/g, " ").substring(0, 80)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0, fontSize: "0.7rem" }}>
                        {email.time}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} onConnected={handleConnected} />
      {composeOpen && (
        <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onSend={handleSend} replyTo={replyTo} />
      )}
      <AssignmentRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <LabelManagerDialog open={labelsOpen} onClose={() => { setLabelsOpen(false); loadLabels(); }}
        accounts={accounts} activeAccount={activeAccount} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "info"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
