/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, LinearProgress, Chip, Tooltip, Snackbar, Alert, CircularProgress,
  InputAdornment, Autocomplete, Divider,
} from "@mui/material";
import {
  Add, Edit, Delete, NotificationsActive, Refresh, AttachMoney,
  Warning, CheckCircle, TrendingUp, Label, Sync, LinkOff, Link,
  CreditCard, Receipt, CheckCircleOutline, CancelOutlined,
} from "@mui/icons-material";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import ScrollableTable from "components/ScrollableTable";
import { clientLimitsAPI } from "services/api";
import { useAuth } from "context/AuthContext";

const TARGET_EMAIL = "team@outsourcedbookeeping.com";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt$ = (v) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const fmtMins = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
};

function UsageBar({ pct, isOver }) {
  const color = isOver ? "#d32f2f" : pct >= 80 ? "#f57c00" : "#388e3c";
  return (
    <Box sx={{ width: "100%", minWidth: 120 }}>
      <Box display="flex" justifyContent="space-between" mb={0.3}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color }}>
          {Math.min(pct, 100)}%{isOver && " OVER"}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 8, borderRadius: 4,
          bgcolor: "#f0f4f8",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  );
}

// ── Limit Form Dialog ──────────────────────────────────────────────────────
function LimitFormDialog({ open, onClose, initial, labelClients, taskClients, onSaved }) {
  const [form, setForm] = useState({
    client_name: "", monthly_limit: "", hourly_rate: "",
    credit_limit: "", last_billed_date: "", last_billed_amount: "", last_bill_cleared: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Merge label + task clients, label clients first
  const allOptions = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const lc of labelClients) {
      if (!seen.has(lc.name.toLowerCase())) { seen.add(lc.name.toLowerCase()); out.push({ label: lc.name, source: "label", color: lc.color }); }
    }
    for (const tc of taskClients) {
      if (!seen.has(tc.toLowerCase())) { seen.add(tc.toLowerCase()); out.push({ label: tc, source: "task" }); }
    }
    return out;
  }, [labelClients, taskClients]);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            client_name:        initial.client_name,
            monthly_limit:      String(initial.monthly_limit ?? ""),
            hourly_rate:        String(initial.hourly_rate || 0),
            credit_limit:       String(initial.credit_limit || ""),
            last_billed_date:   initial.last_billed_date || "",
            last_billed_amount: String(initial.last_billed_amount || ""),
            last_bill_cleared:  Boolean(initial.last_bill_cleared),
          }
        : { client_name: "", monthly_limit: "", hourly_rate: "", credit_limit: "", last_billed_date: "", last_billed_amount: "", last_bill_cleared: false }
      );
      setErr("");
    }
  }, [open, initial]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.client_name.trim()) { setErr("Client name is required"); return; }
    if (!form.monthly_limit || isNaN(form.monthly_limit) || Number(form.monthly_limit) < 0) {
      setErr("Enter a valid monthly limit amount"); return;
    }
    if (form.hourly_rate && (isNaN(form.hourly_rate) || Number(form.hourly_rate) < 0)) {
      setErr("Enter a valid hourly rate"); return;
    }
    setSaving(true);
    try {
      const payload = {
        client_name:        form.client_name.trim(),
        monthly_limit:      Number(form.monthly_limit),
        hourly_rate:        Number(form.hourly_rate || 0),
        credit_limit:       Number(form.credit_limit || 0),
        last_billed_date:   form.last_billed_date || null,
        last_billed_amount: Number(form.last_billed_amount || 0),
        last_bill_cleared:  Boolean(form.last_bill_cleared),
      };
      if (initial?.id) {
        await clientLimitsAPI.update(initial.id, payload);
      } else {
        await clientLimitsAPI.create(payload);
      }
      // Note: initial with no id = discovered client being tracked for first time = create path
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {initial ? "Edit Client Limit" : "Set Client Payment Limit"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {/* Client name with grouped options */}
        <Autocomplete
          freeSolo
          openOnFocus
          groupBy={(o) => o.source === "label" ? `📧 From ${TARGET_EMAIL} Labels` : "📋 From Tasks"}
          options={allOptions}
          getOptionLabel={(o) => typeof o === "string" ? o : o.label}
          value={form.client_name}
          onInputChange={(_, v) => set("client_name", v)}
          onChange={(_, v) => set("client_name", typeof v === "string" ? v : (v?.label || ""))}
          disabled={Boolean(initial?.id)}
          renderOption={(props, o) => (
            <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {o.source === "label" && (
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: o.color || "#1976d2", flexShrink: 0 }} />
              )}
              <Typography sx={{ fontSize: "0.85rem" }}>{o.label}</Typography>
              {o.source === "label" && (
                <Chip label="label" size="small" sx={{ ml: "auto", height: 16, fontSize: "0.6rem", bgcolor: "#e3f2fd", color: "#1565c0" }} />
              )}
            </Box>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Client Name" size="small" fullWidth sx={{ mb: 2 }}
              placeholder="Type or select a client…" />
          )}
        />

        <TextField
          fullWidth size="small" label="Monthly Limit ($)" type="number"
          value={form.monthly_limit} onChange={(e) => set("monthly_limit", e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          sx={{ mb: 2 }}
          placeholder="e.g. 5000"
          helperText="Maximum billing allowed per calendar month (set 0 to track without a cap)"
        />

        <TextField
          fullWidth size="small" label="Hourly Rate ($/hr)" type="number"
          value={form.hourly_rate} onChange={(e) => set("hourly_rate", e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          placeholder="e.g. 150"
          helperText="Used to calculate cost from logged task hours for this client"
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 1 }}><Typography sx={{ fontSize: "0.72rem", color: "#90a4ae", fontWeight: 700, px: 1 }}>BILLING INFO</Typography></Divider>

        <TextField
          fullWidth size="small" label="Credit Limit ($)" type="number"
          value={form.credit_limit} onChange={(e) => set("credit_limit", e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          placeholder="e.g. 10000 (leave 0 for no credit limit)"
          helperText="Alert when unbilled amount exceeds this credit ceiling"
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth size="small" label="Last Bill Date" type="date"
            value={form.last_billed_date}
            onChange={(e) => set("last_billed_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Date last invoice was sent"
          />
          <TextField
            fullWidth size="small" label="Last Bill Amount ($)" type="number"
            value={form.last_billed_amount} onChange={(e) => set("last_billed_amount", e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            helperText="Amount of last invoice"
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={form.last_bill_cleared}
              onChange={(e) => set("last_bill_cleared", e.target.checked)}
              color="success" size="small"
            />
          }
          label={
            <Typography sx={{ fontSize: "0.83rem", color: form.last_bill_cleared ? "#2e7d32" : "#e65100" }}>
              {form.last_bill_cleared ? "✅ Last bill payment cleared" : "⏳ Last bill payment pending"}
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ textTransform: "none", borderRadius: "8px", bgcolor: "#1976d2" }}>
          {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : (initial ? "Save Changes" : "Set Limit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Sync Dialog ────────────────────────────────────────────────────────────
function SyncDialog({ open, onClose, labelClients, existingNames, onSynced }) {
  const [hourlyRate, setHourlyRate]   = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [syncing, setSyncing]         = useState(false);
  const [err, setErr]                 = useState("");

  const newClients = labelClients.filter(
    (lc) => !existingNames.has(lc.name.toLowerCase())
  );

  useEffect(() => {
    if (open) { setErr(""); setHourlyRate(""); setMonthlyLimit(""); }
  }, [open]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await clientLimitsAPI.syncFromLabels({
        hourly_rate:   Number(hourlyRate || 0),
        monthly_limit: Number(monthlyLimit || 0),
      });
      onSynced(result.message || `Imported ${(result.clients||[]).length} client(s)`);
      onClose();
    } catch (e) { setErr(e.message); }
    setSyncing(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Sync sx={{ color: "#1976d2" }} />
          Sync Clients from Mail Labels
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Importing labels from <strong>{TARGET_EMAIL}</strong> as client records.
          {newClients.length > 0
            ? ` ${newClients.length} new client(s) will be added.`
            : " All label clients are already in the system."}
        </Typography>

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {newClients.length > 0 && (
          <Box sx={{ mb: 2, maxHeight: 160, overflowY: "auto", border: "1px solid #e8edf2", borderRadius: "8px", p: 1.5 }}>
            {newClients.map((lc) => (
              <Box key={lc.name} display="flex" alignItems="center" gap={1} py={0.4}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: lc.color || "#1976d2", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>{lc.name}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {newClients.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Set default values for all imported clients (you can edit each individually later):
            </Typography>
            <Box display="flex" gap={2}>
              <TextField
                size="small" label="Default Monthly Limit ($)" type="number" fullWidth
                value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                placeholder="0 = no cap"
              />
              <TextField
                size="small" label="Default Hourly Rate ($/hr)" type="number" fullWidth
                value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                placeholder="e.g. 150"
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={handleSync} disabled={syncing || newClients.length === 0}
          sx={{ textTransform: "none", borderRadius: "8px", bgcolor: "#1976d2" }}>
          {syncing
            ? <CircularProgress size={16} sx={{ color: "#fff" }} />
            : newClients.length === 0 ? "Nothing to Import" : `Import ${newClients.length} Client(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PaymentLimits() {
  const { currentUser } = useAuth();
  const [limits, setLimits]             = useState([]);
  const [taskClients, setTaskClients]   = useState([]);
  const [labelData, setLabelData]       = useState(null); // { account, labels, clients }
  const [loading, setLoading]           = useState(true);
  const [checking, setChecking]         = useState(false);
  const [formOpen, setFormOpen]         = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [syncOpen, setSyncOpen]         = useState(false);
  const [snack, setSnack]               = useState(null);

  const notify = (msg, sev = "success") => setSnack({ msg, sev });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, c, ld] = await Promise.all([
        clientLimitsAPI.getAll(),
        clientLimitsAPI.getClients(),
        clientLimitsAPI.getLabelClients().catch(() => null),
      ]);
      setLimits(Array.isArray(l) ? l : []);
      setTaskClients(Array.isArray(c) ? c : []);
      if (ld) setLabelData(ld);
    } catch (e) { notify(e.message, "error"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove limit for "${name}"?`)) return;
    try {
      await clientLimitsAPI.delete(id);
      notify(`Limit for "${name}" removed`);
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  const handleCheckLimits = async () => {
    setChecking(true);
    try {
      const results = await clientLimitsAPI.checkLimits();
      const over = Array.isArray(results) ? results.filter((r) => r.is_over) : [];
      if (over.length === 0) {
        notify("✅ All clients are within their monthly limits", "success");
      } else {
        notify(`⚠️ ${over.length} client(s) exceeded their limit — notifications sent`, "warning");
      }
      load();
    } catch (e) { notify(e.message, "error"); }
    setChecking(false);
  };

  const labelClients  = labelData?.clients || [];
  const mailConnected = Boolean(labelData?.account);
  const existingNames = new Set(limits.map((l) => l.client_name.toLowerCase()));

  // Build full client name list for dropdown: merge taskClients + names from all loaded limits (incl. discovered)
  const allTaskClientNames = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    // From already-loaded limits (tracked + discovered) — always available
    for (const l of limits) {
      const key = l.client_name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(l.client_name); }
    }
    // Also include any from the /clients endpoint
    for (const name of taskClients) {
      const key = name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(name); }
    }
    return out.sort();
  }, [limits, taskClients]);

  // Enrich limit rows with label color if available
  const enrichedLimits = limits.map((l) => {
    const matchLabel = labelClients.find(
      (lc) => lc.name.toLowerCase() === l.client_name.toLowerCase()
    );
    return { ...l, _labelColor: matchLabel?.color || null, _fromLabel: Boolean(matchLabel) };
  });

  const month      = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const trackedLimits   = limits.filter((l) => l._tracked !== false);
  const discoveredClients = limits.filter((l) => l._discovered === true);
  const overCount  = trackedLimits.filter((l) => l.is_over).length;
  const warnCount  = trackedLimits.filter((l) => !l.is_over && l.usage_pct >= 80).length;
  const totalBilled = trackedLimits.reduce((s, l) => s + (l.current_cost || 0), 0);
  const newLabelCount = labelClients.filter((lc) => !existingNames.has(lc.name.toLowerCase())).length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ── */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Client Payment Limits</Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor monthly billing per client · {month}
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={load}
              sx={{ textTransform: "none" }}>
              Refresh
            </Button>
            <Button
              variant="outlined" size="small"
              startIcon={checking ? <CircularProgress size={14} /> : <NotificationsActive />}
              onClick={handleCheckLimits} disabled={checking}
              sx={{ textTransform: "none", borderColor: "#f57c00", color: "#f57c00", "&:hover": { bgcolor: "#fff3e0" } }}>
              {checking ? "Checking…" : "Check & Notify"}
            </Button>
            <Button variant="contained" size="small" startIcon={<Add />}
              onClick={() => { setEditItem(null); setFormOpen(true); }}
              sx={{ textTransform: "none", bgcolor: "#1976d2" }}>
              Add Client Limit
            </Button>
          </Box>
        </Box>

        {/* ── Mail source banner ── */}
        <Card sx={{ mb: 2.5, borderRadius: "12px", border: mailConnected ? "1px solid #a5d6a7" : "1px solid #ffe082", bgcolor: mailConnected ? "#f1f8e9" : "#fffde7", boxShadow: "none", p: 2 }}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {mailConnected
                ? <Link sx={{ color: "#388e3c", fontSize: 20 }} />
                : <LinkOff sx={{ color: "#f57c00", fontSize: 20 }} />}
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: mailConnected ? "#2e7d32" : "#e65100" }}>
                {TARGET_EMAIL}
              </Typography>
            </Box>
            {mailConnected ? (
              <>
                <Typography sx={{ fontSize: "0.82rem", color: "#388e3c" }}>
                  Connected · {labelClients.length} label{labelClients.length !== 1 ? "s" : ""} (clients) found
                </Typography>
                <Box flex={1} />
                {newLabelCount > 0 && (
                  <Chip
                    label={`${newLabelCount} new client${newLabelCount > 1 ? "s" : ""} in labels`}
                    size="small"
                    sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, fontSize: "0.7rem" }}
                  />
                )}
                <Button variant="contained" size="small" startIcon={<Sync />}
                  onClick={() => setSyncOpen(true)}
                  sx={{ textTransform: "none", borderRadius: "8px", bgcolor: "#388e3c", "&:hover": { bgcolor: "#2e7d32" }, fontSize: "0.75rem" }}>
                  Sync All Clients from Labels
                </Button>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: "0.82rem", color: "#e65100" }}>
                  Not connected yet — connect this account in the{" "}
                  <Box component="span" sx={{ fontWeight: 700 }}>Mail module</Box>{" "}
                  to auto-populate clients from your email labels
                </Typography>
              </>
            )}
          </Box>

          {/* Label client pills */}
          {mailConnected && labelClients.length > 0 && (
            <Box display="flex" gap={0.75} flexWrap="wrap" mt={1.25}>
              {labelClients.map((lc) => (
                <Chip
                  key={lc.name}
                  icon={<Label sx={{ fontSize: "12px !important", color: `${lc.color} !important` }} />}
                  label={lc.name}
                  size="small"
                  sx={{
                    bgcolor: existingNames.has(lc.name.toLowerCase()) ? "#f1f8e9" : "#e3f2fd",
                    color:   existingNames.has(lc.name.toLowerCase()) ? "#2e7d32" : "#1565c0",
                    fontWeight: 600, fontSize: "0.7rem", height: 22,
                    border: `1.5px solid ${existingNames.has(lc.name.toLowerCase()) ? "#a5d6a7" : "#90caf9"}`,
                  }}
                />
              ))}
            </Box>
          )}
        </Card>

        {/* ── Summary cards ── */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          {[
            { label: "Clients Tracked", value: trackedLimits.length, icon: <TrendingUp />,   color: "#1976d2", bg: "#e3f2fd" },
            { label: "Over Limit",      value: overCount,             icon: <Warning />,      color: "#d32f2f", bg: "#ffebee" },
            { label: "Near (80%+)",     value: warnCount,             icon: <Warning />,      color: "#f57c00", bg: "#fff3e0" },
            { label: `Billed (${new Date().toLocaleString("en-US",{month:"short"})})`, value: fmt$(totalBilled), icon: <AttachMoney />, color: "#388e3c", bg: "#e8f5e9" },
          ].map((s) => (
            <Card key={s.label} sx={{ flex: "1 1 180px", minWidth: 160, p: 2, borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ p: 1, borderRadius: "10px", bgcolor: s.bg, color: s.color, display: "flex" }}>{s.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: "0.7rem", color: "#90a4ae", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: "1.3rem", fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>

        {/* ── Table ── */}
        <Card sx={{ borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {loading && <LinearProgress />}

          {!loading && limits.length === 0 && (
            <Box textAlign="center" py={8}>
              <AttachMoney sx={{ fontSize: 56, color: "#e0e0e0", mb: 1 }} />
              <Typography variant="h6" color="text.secondary" fontWeight="medium">No clients found</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {mailConnected && labelClients.length > 0
                  ? `${labelClients.length} client(s) found in mail labels — sync them to get started`
                  : "No tasks with client names found yet. Add a limit manually or assign tasks to clients first."}
              </Typography>
              <Box display="flex" gap={1} justifyContent="center">
                {mailConnected && labelClients.length > 0 && (
                  <Button variant="contained" startIcon={<Sync />} onClick={() => setSyncOpen(true)}
                    sx={{ textTransform: "none", borderRadius: "8px", bgcolor: "#388e3c" }}>
                    Sync from Labels
                  </Button>
                )}
                <Button variant="outlined" startIcon={<Add />} onClick={() => { setEditItem(null); setFormOpen(true); }}
                  sx={{ textTransform: "none", borderRadius: "8px" }}>
                  Add Manually
                </Button>
              </Box>
            </Box>
          )}

          {!loading && limits.length > 0 && (
            <ScrollableTable maxHeight="70vh">
            <Table size="small" sx={{ minWidth: 1400 }}>
              <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  {[
                    "Client", "Monthly Limit", "Hourly Rate",
                    `Billed (${month})`, "Hours Logged", "Usage",
                    "Unbilled Amount", "New Hrs (Since Last Bill)",
                    "Last Bill Cleared", "Credit Limit", "Credit Limit",
                    "Status", "Actions"
                  ].map((h, i) => (
                    <TableCell key={`${h}-${i}`} sx={{ fontWeight: 700, fontSize: 11, color: "#90a4ae", textTransform: "uppercase", py: 1.5, whiteSpace: "nowrap" }}>
                      {h === "Credit Limit" && i === 10 ? "Credit Exceeded" : h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Tracked clients (have limits set) — sorted by over/usage */}
                {enrichedLimits
                  .filter((l) => l._tracked !== false)
                  .sort((a, b) => (b.is_over ? 1 : 0) - (a.is_over ? 1 : 0) || b.usage_pct - a.usage_pct)
                  .map((l) => (
                    <TableRow key={l.id} hover sx={{
                      bgcolor: l.is_over ? "#fff8f8" : l.usage_pct >= 80 ? "#fffde7" : "inherit",
                      "&:hover": { bgcolor: l.is_over ? "#ffebee" : l.usage_pct >= 80 ? "#fff9c4" : "#f5f7fa" },
                    }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.75}>
                          {l._fromLabel && (
                            <Tooltip title={`From ${TARGET_EMAIL} labels`}>
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: l._labelColor || "#1976d2", flexShrink: 0 }} />
                            </Tooltip>
                          )}
                          <Typography sx={{ fontWeight: 700, color: "#1a2332", fontSize: "0.85rem" }}>{l.client_name}</Typography>
                          {l._fromLabel && (
                            <Chip label="label" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#e3f2fd", color: "#1565c0", ml: 0.25 }} />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 600, color: l.monthly_limit > 0 ? "#1976d2" : "#90a4ae" }}>
                        {l.monthly_limit > 0 ? fmt$(l.monthly_limit) : <Typography sx={{ fontSize: "0.8rem", color: "#bdbdbd" }}>No cap</Typography>}
                      </TableCell>

                      <TableCell>
                        {l.hourly_rate > 0
                          ? <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>${Number(l.hourly_rate).toFixed(2)}/hr</Typography>
                          : <Typography sx={{ fontSize: "0.82rem", color: "#bdbdbd" }}>—</Typography>}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 700, color: l.is_over ? "#d32f2f" : l.usage_pct >= 80 ? "#f57c00" : "#263238" }}>
                        {fmt$(l.current_cost || 0)}
                        {l.is_over && (
                          <Typography component="span" sx={{ ml: 0.5, fontSize: "0.7rem", color: "#d32f2f", fontWeight: 600 }}>
                            (+{fmt$((l.current_cost || 0) - l.monthly_limit)} over)
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>
                          {fmtMins(l.current_minutes || 0)}
                          <Typography component="span" sx={{ fontSize: "0.7rem", color: "#90a4ae", ml: 0.5 }}>
                            ({l.task_count || 0} task{l.task_count !== 1 ? "s" : ""})
                          </Typography>
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 160 }}>
                        {l.monthly_limit > 0
                          ? <UsageBar pct={l.usage_pct || 0} isOver={l.is_over} />
                          : <Typography sx={{ fontSize: "0.75rem", color: "#bdbdbd" }}>tracking only</Typography>}
                      </TableCell>

                      {/* ── Unbilled Amount ── */}
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: (l.unbilled_amount || 0) > 0 ? "#1565c0" : "#546e7a" }}>
                            {fmt$(l.unbilled_amount || 0)}
                          </Typography>
                          <Typography sx={{ fontSize: "0.67rem", color: "#90a4ae" }}>
                            {l.last_billed_date ? `since ${l.last_billed_date}` : "this month (no bill date)"}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* ── New Hours Since Last Bill ── */}
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontSize: "0.82rem", color: "#546e7a", fontWeight: 600 }}>
                            {fmtMins(l.last_billed_date ? (l.unbilled_minutes || 0) : (l.current_minutes || 0))}
                          </Typography>
                          <Typography sx={{ fontSize: "0.67rem", color: "#90a4ae" }}>
                            {l.last_billed_date ? `since ${l.last_billed_date}` : "this month"}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* ── Payment Cleared ── */}
                      <TableCell>
                        <Box>
                          {l.last_bill_cleared ? (
                            <Chip size="small" label="Cleared" icon={<CheckCircleOutline sx={{ fontSize: "12px !important" }} />}
                              sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                          ) : (
                            <Chip size="small" label="Pending" icon={<CancelOutlined sx={{ fontSize: "12px !important" }} />}
                              sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                          )}
                          {l.last_billed_amount > 0 && (
                            <Typography sx={{ fontSize: "0.67rem", color: "#90a4ae", mt: 0.3 }}>
                              {fmt$(l.last_billed_amount)}
                              {l.last_billed_date ? ` · ${l.last_billed_date}` : ""}
                            </Typography>
                          )}
                          {!l.last_billed_amount && l.last_billed_date && (
                            <Typography sx={{ fontSize: "0.67rem", color: "#90a4ae", mt: 0.3 }}>
                              {l.last_billed_date}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* ── Credit Limit ── */}
                      <TableCell>
                        {l.credit_limit > 0 ? (
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#6a1b9a" }}>
                              {fmt$(l.credit_limit)}
                            </Typography>
                            <Typography sx={{ fontSize: "0.67rem", color: "#90a4ae" }}>
                              {fmt$(l.unbilled_amount || 0)} used
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd", fontStyle: "italic" }}>No limit set</Typography>
                        )}
                      </TableCell>

                      {/* ── Credit Limit Exceeded ── */}
                      <TableCell>
                        {l.credit_limit > 0 ? (
                          l.credit_limit_exceeded ? (
                            <Box>
                              <Chip size="small" label="EXCEEDED" icon={<CreditCard sx={{ fontSize: "12px !important" }} />}
                                sx={{ bgcolor: "#fce4ec", color: "#880e4f", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                              <Typography sx={{ fontSize: "0.67rem", color: "#c62828", mt: 0.3 }}>
                                +{fmt$((l.unbilled_amount || 0) - l.credit_limit)} over
                              </Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Chip size="small" label="Within Limit" icon={<CheckCircle sx={{ fontSize: "12px !important" }} />}
                                sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                              <Typography sx={{ fontSize: "0.67rem", color: "#66bb6a", mt: 0.3 }}>
                                {fmt$(l.credit_limit - (l.unbilled_amount || 0))} remaining
                              </Typography>
                            </Box>
                          )
                        ) : (
                          <Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd", fontStyle: "italic" }}>—</Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {l.is_over ? (
                          <Chip size="small" label="OVER LIMIT" icon={<Warning sx={{ fontSize: "12px !important" }} />}
                            sx={{ bgcolor: "#ffebee", color: "#c62828", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                        ) : l.usage_pct >= 80 && l.monthly_limit > 0 ? (
                          <Chip size="small" label="NEAR LIMIT"
                            sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                        ) : l.monthly_limit === 0 ? (
                          <Chip size="small" label="TRACKING" icon={<TrendingUp sx={{ fontSize: "12px !important" }} />}
                            sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                        ) : (
                          <Chip size="small" label="OK" icon={<CheckCircle sx={{ fontSize: "12px !important" }} />}
                            sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                        )}
                      </TableCell>

                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Edit limit">
                            <IconButton size="small" onClick={() => { setEditItem(l); setFormOpen(true); }}>
                              <Edit sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove limit">
                            <IconButton size="small" color="error" onClick={() => handleDelete(l.id, l.client_name)}>
                              <Delete sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Discovered clients (from tasks, no limit set yet) */}
                {enrichedLimits.filter((l) => l._discovered).length > 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ bgcolor: "#f8f9fb", borderTop: "2px solid #e8edf2", py: 1, px: 2 }}>
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Discovered from Tasks — no limit set yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {enrichedLimits
                  .filter((l) => l._discovered)
                  .map((l) => {
                    const matchLabel = labelClients.find((lc) => lc.name.toLowerCase() === l.client_name.toLowerCase());
                    return (
                      <TableRow key={`disc-${l.client_name}`} hover sx={{ bgcolor: "#fafbfc", opacity: 0.9 }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.75}>
                            {matchLabel && (
                              <Tooltip title={`From ${TARGET_EMAIL} labels`}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: matchLabel.color || "#1976d2", flexShrink: 0 }} />
                              </Tooltip>
                            )}
                            <Typography sx={{ fontWeight: 600, color: "#546e7a", fontSize: "0.85rem" }}>{l.client_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd", fontStyle: "italic" }}>Not set</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>—</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.82rem", color: "#546e7a" }}>
                            {fmtMins(l.current_minutes || 0)}
                            <Typography component="span" sx={{ fontSize: "0.7rem", color: "#90a4ae", ml: 0.5 }}>
                              ({l.task_count || 0} task{l.task_count !== 1 ? "s" : ""})
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.75rem", color: "#bdbdbd" }}>no limit</Typography>
                        </TableCell>
                        {/* empty cells for the 5 new billing columns */}
                        <TableCell><Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography></TableCell>
                        <TableCell><Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography></TableCell>
                        <TableCell><Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography></TableCell>
                        <TableCell><Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography></TableCell>
                        <TableCell><Typography sx={{ fontSize: "0.78rem", color: "#bdbdbd" }}>—</Typography></TableCell>
                        <TableCell>
                          <Chip size="small" label="UNTRACKED"
                            sx={{ bgcolor: "#f5f5f5", color: "#9e9e9e", fontWeight: 700, fontSize: "0.65rem", height: 22 }} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Set a limit for this client">
                            <Button size="small" variant="outlined" startIcon={<Add sx={{ fontSize: "12px !important" }} />}
                              onClick={() => {
                                setEditItem({ ...l, id: null, monthly_limit: 0, hourly_rate: 0 });
                                setFormOpen(true);
                              }}
                              sx={{ textTransform: "none", fontSize: "0.7rem", py: 0.3, px: 1, borderRadius: "6px", borderColor: "#90caf9", color: "#1976d2" }}>
                              Set Limit
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            </ScrollableTable>
          )}
        </Card>

        {/* ── Footer note ── */}
        {limits.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "#f8f9fb", borderRadius: "10px", border: "1px solid #e8edf2" }}>
            <Typography sx={{ fontSize: "0.78rem", color: "#78909c" }}>
              <strong>How cost is calculated:</strong> Hours logged on tasks this month for each client × the hourly rate.
              Clients with a <em>colored dot</em> come from <strong>{TARGET_EMAIL}</strong> labels.
              Click <strong>Check & Notify</strong> to trigger notifications to admin and team leaders whenever a limit is breached.
            </Typography>
          </Box>
        )}

      </Box>

      {/* ── Dialogs ── */}
      <LimitFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initial={editItem}
        labelClients={labelClients}
        taskClients={allTaskClientNames}
        onSaved={() => { notify(editItem ? "Limit updated" : "Limit set ✓"); load(); }}
      />

      <SyncDialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        labelClients={labelClients}
        existingNames={existingNames}
        onSynced={(msg) => { notify(msg); load(); }}
      />

      <Snackbar open={Boolean(snack)} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
      