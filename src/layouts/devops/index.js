/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Button, Tabs, Tab, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Tooltip,
  Snackbar, Alert, CircularProgress, Divider, InputAdornment,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress,
} from "@mui/material";
import Icon from "@mui/material/Icon";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { devopsAPI } from "services/api";

const API_BASE = "http://localhost:5000/api";

// ── Colour helpers ────────────────────────────────────────────────────────
const statusColor = (s) => ({ active: "success", inactive: "default", paused: "warning" }[s] || "default");
const logColor   = (s) => ({ success: "success", error: "error" }[s] || "warning");
const typeColor  = (t) => ({ inbound: "primary", outbound: "secondary" }[t] || "default");

// ── Use Cases data ────────────────────────────────────────────────────────
const USE_CASES = [
  {
    icon: "upload_file",
    color: "#4CAF50",
    title: "Import and Export Data",
    desc: "Import customer data, employees or tasks from an external source, or export data from your CRM in CSV / JSON format.",
    action: "Coming Soon",
  },
  {
    icon: "sync_alt",
    color: "#2196F3",
    title: "Third-party System Integration",
    desc: "Collect leads from a website form, synchronize customer contact information with a warehousing or accounting system.",
    action: "Create Webhook",
    tab: 1,
  },
  {
    icon: "trending_up",
    color: "#FF9800",
    title: "Automate Sales",
    desc: "Automate lead and deal progress along the sales funnel and validate CRM data using webhooks and automation rules.",
    action: "View Webhooks",
    tab: 1,
  },
  {
    icon: "task_alt",
    color: "#9C27B0",
    title: "Automate Task Management",
    desc: "Auto-create tasks and assign them to employees; receive webhook triggers to start workflows automatically.",
    action: "View Webhooks",
    tab: 1,
  },
  {
    icon: "widgets",
    color: "#F44336",
    title: "Add a Widget",
    desc: "Customize your CRM to show relevant information right in the client details form using custom integration widgets.",
    action: "Coming Soon",
  },
  {
    icon: "smart_toy",
    color: "#00BCD4",
    title: "Add a Chatbot",
    desc: "Create chatbots to send notifications and reports directly to employee messengers via webhook triggers.",
    action: "Coming Soon",
  },
  {
    icon: "webhook",
    color: "#607D8B",
    title: "Webhooks & API",
    desc: "Create inbound or outbound webhooks to connect any external system. Map form fields directly to CRM leads and contacts.",
    action: "Create Webhook",
    tab: 1,
  },
];

// ── CRM field options per entity ──────────────────────────────────────────
const ENTITY_FIELDS = {
  lead:    ["name","email","phone","company","title","source","notes","amount","priority"],
  contact: ["name","email","phone","company","position","notes"],
  task:    ["title","description","priority","deadline","assigned_to"],
};

// ── WebhookDialog ──────────────────────────────────────────────────────────
function WebhookDialog({ open, onClose, initial, onSave }) {
  const empty = { name:"", type:"inbound", entity:"lead", description:"", status:"active", outbound_url:"", redirect_url:"", field_mapping:{} };
  const [form, setForm] = useState(empty);
  const [mappingKey, setMappingKey] = useState("");
  const [mappingVal, setMappingVal] = useState("");

  useEffect(() => {
    setForm(initial ? { ...empty, ...initial } : empty);
    setMappingKey(""); setMappingVal("");
  }, [initial, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addMapping = () => {
    if (!mappingKey.trim() || !mappingVal.trim()) return;
    setForm(f => ({ ...f, field_mapping: { ...f.field_mapping, [mappingKey.trim()]: mappingVal.trim() } }));
    setMappingKey(""); setMappingVal("");
  };
  const removeMapping = (k) => setForm(f => { const m = { ...f.field_mapping }; delete m[k]; return { ...f, field_mapping: m }; });

  const entityFields = ENTITY_FIELDS[form.entity] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? "Edit Webhook" : "Create Webhook"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Webhook Name *" value={form.name} onChange={e => set("name", e.target.value)} size="small" />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={e => set("type", e.target.value)}>
                <MenuItem value="inbound">Inbound (Receive)</MenuItem>
                <MenuItem value="outbound">Outbound (Send)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => set("status", e.target.value)}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {form.type === "inbound" && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Create Entity</InputLabel>
                <Select value={form.entity} label="Create Entity" onChange={e => set("entity", e.target.value)}>
                  <MenuItem value="lead">CRM Lead</MenuItem>
                  <MenuItem value="contact">Contact</MenuItem>
                  <MenuItem value="task">Task</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {form.type === "outbound" && (
            <Grid item xs={12}>
              <TextField fullWidth label="Target URL" value={form.outbound_url} onChange={e => set("outbound_url", e.target.value)} size="small"
                placeholder="https://your-server.com/endpoint" />
            </Grid>
          )}

          {form.type === "inbound" && (
            <Grid item xs={12}>
              <TextField fullWidth label="Redirect URL (optional)" value={form.redirect_url || ""} onChange={e => set("redirect_url", e.target.value)} size="small"
                placeholder="https://yourwebsite.com/thank-you"
                helperText="After form submission, redirect the user to this URL (e.g. a thank-you page)" />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField fullWidth label="Description" value={form.description} onChange={e => set("description", e.target.value)}
              size="small" multiline rows={2} />
          </Grid>

          {/* Field Mapping (inbound only) */}
          {form.type === "inbound" && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Field Mapping</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Map incoming form field names → CRM {form.entity} fields. Leave empty to use direct field names.
              </Typography>
              <Box display="flex" gap={1} mb={1} alignItems="center">
                <TextField size="small" label="Form field name" value={mappingKey} onChange={e => setMappingKey(e.target.value)}
                  placeholder="e.g. your_name" sx={{ flex: 1 }} />
                <Icon sx={{ color: "text.secondary" }}>arrow_forward</Icon>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>CRM Field</InputLabel>
                  <Select value={mappingVal} label="CRM Field" onChange={e => setMappingVal(e.target.value)}>
                    {entityFields.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" onClick={addMapping} startIcon={<Icon>add</Icon>}>Add</Button>
              </Box>
              <Box>
                {Object.entries(form.field_mapping).map(([k, v]) => (
                  <Chip key={k} label={`${k} → ${v}`} size="small" sx={{ mr: 0.5, mb: 0.5 }}
                    onDelete={() => removeMapping(k)} />
                ))}
                {Object.keys(form.field_mapping).length === 0 && (
                  <Typography variant="caption" color="text.secondary">No mappings. Form fields matching CRM fields ({entityFields.join(", ")}) will be used directly.</Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name}>
          {initial ? "Save Changes" : "Create Webhook"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── WebhookDetailDialog ────────────────────────────────────────────────────
function WebhookDetailDialog({ open, onClose, webhook, onRegenerate }) {
  const [copied, setCopied]         = useState(null);
  const [detailTab, setDetailTab]   = useState(0);
  const [testData, setTestData]     = useState({});
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    if (!webhook || !open) return;
    // Reset on open
    setDetailTab(0);
    setTestResult(null);
    // Pre-fill test data from field mapping or defaults
    const mapping = webhook.field_mapping || {};
    const defaults = { name: "Test Contact", email: "test@example.com", phone: "+1-555-0100", company: "Test Company", notes: "Test message from webhook panel" };
    const prefilled = {};
    if (Object.keys(mapping).length > 0) {
      Object.keys(mapping).forEach(k => { prefilled[k] = defaults[mapping[k]] || ""; });
    } else {
      Object.assign(prefilled, defaults);
    }
    setTestData(prefilled);
    // Load recent logs for this webhook
    devopsAPI.getLogs({ webhook_id: webhook.id, limit: 10 }).then(data => {
      if (Array.isArray(data)) setRecentLogs(data);
    }).catch(() => {});
  }, [webhook, open]);

  if (!webhook) return null;

  const webhookUrl  = `${API_BASE}/devops/receive/${webhook.token}`;
  const mapping     = webhook.field_mapping || {};
  const mappingKeys = Object.keys(mapping);

  // ── HTML form snippet ──────────────────────────────────────────────────
  const formFields = mappingKeys.length > 0
    ? mappingKeys
    : ["name", "email", "phone", "company", "notes"];

  const inputType = (k) => {
    if (k === "email") return "email";
    if (k === "phone" || k === "telephone" || k === "mobile") return "tel";
    if (k === "notes" || k === "message" || k === "comment" || k === "description") return "textarea";
    return "text";
  };
  const placeholder = (k) => {
    const crmF = mapping[k] || k;
    const map = { name:"Your Full Name", email:"Email Address", phone:"Phone Number", company:"Company Name", notes:"Your message here...", message:"Your message here...", title:"Title", source:"How did you hear about us?" };
    return map[crmF] || map[k] || k.replace(/_/g, " ");
  };

  const htmlForm = `<form method="POST" action="${webhookUrl}">\n${formFields.map(k => {
    const t = inputType(k);
    if (t === "textarea") return `  <textarea name="${k}" placeholder="${placeholder(k)}"></textarea>`;
    return `  <input type="${t}" name="${k}" placeholder="${placeholder(k)}"${k==="name"||k==="email" ? " required" : ""} />`;
  }).join("\n")}\n${webhook.redirect_url ? `  <input type="hidden" name="redirect_url" value="${webhook.redirect_url}" />\n` : ""}  <button type="submit">Submit</button>\n</form>`;

  const curlFields = mappingKeys.length > 0
    ? mappingKeys.map(k => `-F "${k}=${testData[k] || "value"}"`).join(" \\\n  ")
    : `-F "name=John Doe" \\\n  -F "email=john@example.com" \\\n  -F "phone=+1-555-0100"`;
  const curlExample = `curl -X POST "${webhookUrl}" \\\n  ${curlFields}`;

  const jsBody = mappingKeys.length > 0
    ? mappingKeys.map(k => `    "${k}": "${testData[k] || "value"}"`).join(",\n")
    : '    "name": "John Doe",\n    "email": "john@example.com",\n    "phone": "+1-555-0100"';
  const jsExample = `fetch("${webhookUrl}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n${jsBody}\n  })\n});`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLiveTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await devopsAPI.testWebhook(webhook.id, testData);
      setTestResult({ success: true, data: result });
      // Refresh logs
      devopsAPI.getLogs({ webhook_id: webhook.id, limit: 10 }).then(data => {
        if (Array.isArray(data)) setRecentLogs(data);
      }).catch(() => {});
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const CRM_LINK = { lead: "/crm/leads", contact: "/crm/contacts", task: "/tasks" };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: "90vh" } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ bgcolor: "#1565C020", color: "#1565C0", borderRadius: 1.5, p: 0.8, display: "flex" }}>
            <Icon>webhook</Icon>
          </Box>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={700}>{webhook.name}</Typography>
            <Box display="flex" gap={0.5} mt={0.3} flexWrap="wrap">
              <Chip size="small" label={webhook.type} color={typeColor(webhook.type)} />
              <Chip size="small" label={webhook.entity} variant="outlined" />
              <Chip size="small" label={webhook.status} color={statusColor(webhook.status)} />
              <Chip size="small" label={`${webhook.trigger_count || 0} triggers`} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 1.5 }}>
          <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ minHeight: 36 }}>
            <Tab label="Webhook URL" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="HTML Form" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="cURL / JS" sx={{ minHeight: 36, py: 0 }} />
            <Tab label="Test Now" sx={{ minHeight: 36, py: 0 }} />
            <Tab label={`Recent (${recentLogs.length})`} sx={{ minHeight: 36, py: 0 }} />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>

        {/* ── Tab 0: Webhook URL ── */}
        {detailTab === 0 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Webhook Endpoint URL</Typography>
            <Box display="flex" alignItems="center" gap={1} p={1.5} bgcolor="#f0f4ff" borderRadius={1} sx={{ fontFamily: "monospace", fontSize: "0.82rem", wordBreak: "break-all", border: "1px solid #c5cae9" }}>
              <Box flex={1}>{webhookUrl}</Box>
              <Tooltip title={copied === "url" ? "Copied!" : "Copy URL"}>
                <IconButton size="small" onClick={() => copy(webhookUrl, "url")}>
                  <Icon fontSize="small">{copied === "url" ? "check" : "content_copy"}</Icon>
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Use this URL as the <code>action</code> of your HTML form, or call it via JavaScript <code>fetch()</code> / AJAX.
            </Typography>

            {mappingKeys.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Field Mapping</Typography>
                <ScrollableTable component={Paper} elevation={0} sx={{ border: "1px solid #eee" }}>
                  <Table size="small">
                    <TableHead style={{ display: "table-header-group" }}>
                      <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                        <TableCell><b>Your Form Field Name</b></TableCell>
                        <TableCell><b>→ CRM Field ({webhook.entity})</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mappingKeys.map(k => (
                        <TableRow key={k}>
                          <TableCell sx={{ fontFamily: "monospace", color: "#d32f2f" }}>{k}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", color: "#1565C0" }}>{mapping[k]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTable>
              </Box>
            )}

            {webhook.redirect_url && (
              <Box mt={2} p={1.5} bgcolor="#f3e5f5" borderRadius={1}>
                <Typography variant="caption"><b>Redirect After Submit:</b> {webhook.redirect_url}</Typography>
              </Box>
            )}

            <Box mt={2} p={1.5} bgcolor="#fff8e1" borderRadius={1} sx={{ border: "1px solid #ffe082" }}>
              <Typography variant="caption" color="warning.dark">
                ⚠️ Keep your webhook token secret. Anyone with this URL can create {webhook.entity}s in your CRM.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── Tab 1: HTML Form ── */}
        {detailTab === 1 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Ready-to-Use HTML Form</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              Copy and paste this form into any webpage. It will automatically send leads to your CRM when submitted.
            </Typography>
            <Box position="relative">
              <Box component="pre" p={2} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1}
                sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {htmlForm}
              </Box>
              <Tooltip title={copied === "html" ? "Copied!" : "Copy HTML"}>
                <IconButton size="small" onClick={() => copy(htmlForm, "html")}
                  sx={{ position: "absolute", top: 8, right: 8, color: "#fff", bgcolor: "#ffffff20", "&:hover": { bgcolor: "#ffffff40" } }}>
                  <Icon fontSize="small">{copied === "html" ? "check" : "content_copy"}</Icon>
                </IconButton>
              </Tooltip>
            </Box>
            <Box mt={2} p={1.5} bgcolor="#e8f5e9" borderRadius={1}>
              <Typography variant="caption" color="success.dark">
                💡 <b>WordPress users:</b> You can use this form directly in a Custom HTML block, or add it to your theme's template files.
                For WPForms / Gravity Forms, use the webhook URL as the confirmation redirect or use their built-in webhook integration.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── Tab 2: cURL / JS ── */}
        {detailTab === 2 && (
          <Box>
            <Accordion elevation={0} sx={{ border: "1px solid #eee", mb: 1 }} defaultExpanded>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                <Typography variant="subtitle2" fontWeight={700}>cURL Example</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box position="relative">
                  <Box component="pre" p={2} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1}
                    sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {curlExample}
                  </Box>
                  <Tooltip title={copied === "curl" ? "Copied!" : "Copy"}>
                    <IconButton size="small" onClick={() => copy(curlExample, "curl")} sx={{ position: "absolute", top: 8, right: 8, color: "#fff" }}>
                      <Icon fontSize="small">{copied === "curl" ? "check" : "content_copy"}</Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionDetails>
            </Accordion>
            <Accordion elevation={0} sx={{ border: "1px solid #eee" }}>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                <Typography variant="subtitle2" fontWeight={700}>JavaScript / Fetch</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box position="relative">
                  <Box component="pre" p={2} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1}
                    sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {jsExample}
                  </Box>
                  <Tooltip title={copied === "js" ? "Copied!" : "Copy"}>
                    <IconButton size="small" onClick={() => copy(jsExample, "js")} sx={{ position: "absolute", top: 8, right: 8, color: "#fff" }}>
                      <Icon fontSize="small">{copied === "js" ? "check" : "content_copy"}</Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* ── Tab 3: Test Now ── */}
        {detailTab === 3 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Send a Test Submission</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Fill in the fields below and click "Run Test" to create a real {webhook.entity} in your CRM and verify the webhook is working.
            </Typography>
            <Grid container spacing={1.5}>
              {Object.keys(testData).map(k => (
                <Grid item xs={12} sm={6} key={k}>
                  {(k === "notes" || k === "message" || k === "comment") ? (
                    <TextField fullWidth size="small" label={k} value={testData[k] || ""}
                      onChange={e => setTestData(p => ({ ...p, [k]: e.target.value }))}
                      multiline rows={2} />
                  ) : (
                    <TextField fullWidth size="small" label={k} value={testData[k] || ""}
                      onChange={e => setTestData(p => ({ ...p, [k]: e.target.value }))} />
                  )}
                </Grid>
              ))}
            </Grid>

            <Box mt={2} display="flex" gap={1} alignItems="center">
              <Button variant="contained" color="success" onClick={handleLiveTest} disabled={testLoading}
                startIcon={testLoading ? <CircularProgress size={16} color="inherit" /> : <Icon>send</Icon>}>
                {testLoading ? "Sending…" : "Run Test"}
              </Button>
              <Typography variant="caption" color="text.secondary">Creates a real {webhook.entity} — check your CRM to verify</Typography>
            </Box>

            {testResult && (
              <Box mt={2} p={2} borderRadius={1}
                sx={{ bgcolor: testResult.success ? "#e8f5e9" : "#ffebee", border: `1px solid ${testResult.success ? "#a5d6a7" : "#ef9a9a"}` }}>
                {testResult.success ? (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Icon sx={{ color: "success.main" }}>check_circle</Icon>
                      <Typography variant="subtitle2" fontWeight={700} color="success.dark">Test Successful!</Typography>
                    </Box>
                    <Typography variant="body2" color="success.dark">
                      A {testResult.data?.entity_type || webhook.entity} was created in your CRM.
                    </Typography>
                    {testResult.data?.entity_id && (
                      <Box mt={1}>
                        <Button size="small" variant="outlined" color="success"
                          href={CRM_LINK[webhook.entity] || "/crm/leads"} target="_blank"
                          startIcon={<Icon>open_in_new</Icon>}>
                          View in CRM
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Icon sx={{ color: "error.main" }}>error</Icon>
                    <Typography variant="body2" color="error.dark"><b>Error:</b> {testResult.error || "Unknown error"}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 4: Recent Logs ── */}
        {detailTab === 4 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>Recent Submissions</Typography>
              <Button size="small" startIcon={<Icon>refresh</Icon>} onClick={() => {
                devopsAPI.getLogs({ webhook_id: webhook.id, limit: 10 }).then(data => { if (Array.isArray(data)) setRecentLogs(data); }).catch(() => {});
              }}>Refresh</Button>
            </Box>
            {recentLogs.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Icon sx={{ fontSize: 48, color: "text.disabled" }}>inbox</Icon>
                <Typography variant="body2" color="text.secondary" mt={1}>No submissions yet for this webhook</Typography>
                <Typography variant="caption" color="text.disabled">Use the "Test Now" tab to send a test submission</Typography>
              </Box>
            ) : (
              <ScrollableTable component={Paper} elevation={0} sx={{ border: "1px solid #eee" }}>
                <Table size="small">
                  <TableHead style={{ display: "table-header-group" }}>
                    <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                      <TableCell><b>Status</b></TableCell>
                      <TableCell><b>Method</b></TableCell>
                      <TableCell><b>Entity Created</b></TableCell>
                      <TableCell><b>View in CRM</b></TableCell>
                      <TableCell><b>Time</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentLogs.map(l => (
                      <TableRow key={l.id} hover>
                        <TableCell>
                          <Chip size="small" label={l.result?.test ? "TEST" : l.status}
                            color={l.result?.test ? "default" : logColor(l.status)}
                            variant={l.result?.test ? "outlined" : "filled"} />
                        </TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace" }}>{l.method}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {l.result?.entity_type || "—"} {l.result?.entity_id ? `#${l.result.entity_id.slice(0,8)}` : ""}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {l.result?.entity_id && l.result?.entity_type && (
                            <Button size="small" variant="text" color="primary"
                              href={CRM_LINK[l.result.entity_type] || "/crm/leads"} target="_blank"
                              startIcon={<Icon sx={{ fontSize: "14px !important" }}>open_in_new</Icon>}
                              sx={{ fontSize: "0.7rem", py: 0, minWidth: 0 }}>
                              View
                            </Button>
                          )}
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{new Date(l.created_at).toLocaleString()}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollableTable>
            )}
          </Box>
        )}

      </DialogContent>
      <DialogActions>
        <Button color="warning" onClick={onRegenerate} startIcon={<Icon>refresh</Icon>} size="small">Regenerate Token</Button>
        <Box flex={1} />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DevOpsPage() {
  const [tab, setTab] = useState(0);
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState(null);
  const [whDialog, setWhDialog] = useState({ open: false, initial: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, webhook: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [whPage, setWhPage] = useState(0);
  const [whRpp, setWhRpp] = useState(25);
  const [logsPage, setLogsPage] = useState(0);
  const [logsRpp, setLogsRpp] = useState(25);

  const showSnack = (msg, sev = "success") => setSnack({ msg, sev });

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await devopsAPI.getWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (e) { console.error("loadWebhooks", e); }
    finally { setLoading(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const data = await devopsAPI.getLogs({ limit: 100 });
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) { console.error("loadLogs", e); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await devopsAPI.getStats();
      if (data) setStats(data);
    } catch (e) { console.error("loadStats", e); }
  }, []);

  useEffect(() => { setWhPage(0); }, [searchQ]);

  useEffect(() => {
    loadWebhooks();
    loadLogs();
    loadStats();
  }, []);

  const handleSaveWebhook = async (form) => {
    try {
      let webhook;
      if (whDialog.initial) {
        webhook = await devopsAPI.updateWebhook(whDialog.initial.id, form);
        showSnack("Webhook updated");
      } else {
        webhook = await devopsAPI.createWebhook(form);
        showSnack("Webhook created! Copy the URL from the details panel.");
      }
      setWhDialog({ open: false, initial: null });
      loadWebhooks();
      // Show detail dialog immediately so user can copy the URL
      if (webhook) {
        setDetailDialog({ open: true, webhook });
      }
    } catch (e) { showSnack(e.message, "error"); }
  };

  const handleDelete = async (id) => {
    try {
      await devopsAPI.deleteWebhook(id);
      showSnack("Webhook deleted");
      loadWebhooks();
    } catch (e) { showSnack(e.message, "error"); }
    setDeleteConfirm(null);
  };

  const handleToggleStatus = async (w) => {
    const newStatus = w.status === "active" ? "inactive" : "active";
    try {
      await devopsAPI.updateWebhook(w.id, { status: newStatus });
      showSnack(`Webhook ${newStatus}`);
      loadWebhooks();
    } catch (e) { showSnack(e.message, "error"); }
  };

  const handleRegenerate = async (webhook) => {
    if (!window.confirm("Regenerate token? The old URL will stop working immediately.")) return;
    try {
      const updated = await devopsAPI.regenerateToken(webhook.id);
      showSnack("Token regenerated");
      setDetailDialog({ open: true, webhook: updated });
      loadWebhooks();
    } catch (e) { showSnack(e.message, "error"); }
  };

  const handleTest = async (id) => {
    try {
      await devopsAPI.testWebhook(id);
      showSnack("Test submitted — check CRM Leads for the new entry");
      loadLogs();
      loadStats();
    } catch (e) { showSnack(e.message, "error"); }
  };

  const filteredWebhooks = webhooks.filter(w =>
    !searchQ || w.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    w.type?.toLowerCase().includes(searchQ.toLowerCase()) ||
    w.entity?.toLowerCase().includes(searchQ.toLowerCase())
  );

  // ── Tab: Common Use Cases ────────────────────────────────────────────────
  const renderUseCases = () => (
    <Grid container spacing={3} mt={0}>
      {USE_CASES.map((uc, i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Card sx={{ height: "100%", display: "flex", flexDirection: "column", border: "1px solid #eee", borderRadius: 2, "&:hover": { boxShadow: 4 }, transition: "box-shadow 0.2s" }}>
            <CardContent sx={{ flex: 1 }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box sx={{ bgcolor: uc.color + "20", color: uc.color, borderRadius: 2, p: 1, display: "flex" }}>
                  <Icon sx={{ fontSize: 28 }}>{uc.icon}</Icon>
                </Box>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>{uc.title}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" lineHeight={1.6}>{uc.desc}</Typography>
            </CardContent>
            <Box px={2} pb={2}>
              <Button
                variant={uc.tab !== undefined ? "contained" : "outlined"}
                size="small"
                fullWidth
                disabled={uc.tab === undefined}
                onClick={() => uc.tab !== undefined && setTab(uc.tab)}
                endIcon={uc.tab !== undefined ? <Icon>arrow_forward</Icon> : null}
                sx={{ borderRadius: 2 }}
              >
                {uc.action}
              </Button>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ── Tab: Integrations (Webhooks) ─────────────────────────────────────────
  const renderIntegrations = () => (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" gap={1} alignItems="center" flex={1}>
          <TextField size="small" placeholder="Search webhooks…" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Icon fontSize="small">search</Icon></InputAdornment> }}
            sx={{ minWidth: 240 }} />
          <Chip label={`${webhooks.filter(w => w.status === "active").length} active`} color="success" size="small" />
          <Chip label={`${webhooks.length} total`} size="small" />
        </Box>
        <Button variant="contained" startIcon={<Icon>add</Icon>} onClick={() => setWhDialog({ open: true, initial: null })} sx={{ borderRadius: 2 }}>
          New Webhook
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {filteredWebhooks.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Icon sx={{ fontSize: 64, color: "text.disabled" }}>webhook</Icon>
          <Typography variant="h6" color="text.secondary" mt={1}>No webhooks yet</Typography>
          <Typography variant="body2" color="text.disabled" mb={2}>Create an inbound webhook to receive leads from your forms automatically</Typography>
          <Button variant="contained" startIcon={<Icon>add</Icon>} onClick={() => setWhDialog({ open: true, initial: null })}>
            Create First Webhook
          </Button>
        </Box>
      ) : (
        <ScrollableTable component={Paper} elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}
          totalCount={filteredWebhooks.length}
          page={whPage}
          rowsPerPage={whRpp}
          onPageChange={(e, newPage) => setWhPage(newPage)}
          onRowsPerPageChange={(e) => { setWhRpp(parseInt(e.target.value, 10)); setWhPage(0); }}
        >
          <Table size="small">
            <TableHead style={{ display: "table-header-group" }}>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell><b>Name</b></TableCell>
                <TableCell><b>Type</b></TableCell>
                <TableCell><b>Entity</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell><b>Triggers</b></TableCell>
                <TableCell><b>Last Triggered</b></TableCell>
                <TableCell align="right"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWebhooks.slice(whPage * whRpp, (whPage + 1) * whRpp).map(w => (
                <TableRow key={w.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{w.name}</Typography>
                    {w.description && <Typography variant="caption" color="text.secondary">{w.description}</Typography>}
                  </TableCell>
                  <TableCell><Chip size="small" label={w.type} color={typeColor(w.type)} /></TableCell>
                  <TableCell><Chip size="small" label={w.entity || "lead"} variant="outlined" /></TableCell>
                  <TableCell><Chip size="small" label={w.status} color={statusColor(w.status)} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{w.trigger_count || 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {w.last_triggered ? new Date(w.last_triggered).toLocaleString() : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={0.5}>
                      <Tooltip title="View URL & Details">
                        <IconButton size="small" onClick={() => setDetailDialog({ open: true, webhook: w })} color="primary">
                          <Icon fontSize="small">link</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Test Webhook">
                        <IconButton size="small" onClick={() => handleTest(w.id)} color="info">
                          <Icon fontSize="small">play_arrow</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={w.status === "active" ? "Deactivate" : "Activate"}>
                        <IconButton size="small" onClick={() => handleToggleStatus(w)} color={w.status === "active" ? "warning" : "success"}>
                          <Icon fontSize="small">{w.status === "active" ? "pause" : "play_circle"}</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setWhDialog({ open: true, initial: w })}>
                          <Icon fontSize="small">edit</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(w.id)}>
                          <Icon fontSize="small">delete</Icon>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTable>
      )}

      {/* Quick Guide */}
      <Card sx={{ mt: 3, border: "1px solid #e3f2fd", bgcolor: "#f8fbff" }} elevation={0}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            <Icon sx={{ verticalAlign: "middle", mr: 0.5 }}>info</Icon>
            How Inbound Webhooks Work
          </Typography>
          <Grid container spacing={2}>
            {[
              { step: "1", text: "Create an inbound webhook and choose which CRM entity to create (Lead, Contact, or Task)" },
              { step: "2", text: "Configure field mapping to map your HTML form field names to CRM fields" },
              { step: "3", text: 'Copy the generated webhook URL and paste it as your form\'s action URL or use it in JavaScript fetch()' },
              { step: "4", text: "When your form is submitted, a new Lead (or Contact/Task) is automatically created in the CRM" },
            ].map(s => (
              <Grid item xs={12} sm={6} md={3} key={s.step}>
                <Box display="flex" gap={1.5} alignItems="flex-start">
                  <Box sx={{ bgcolor: "primary.main", color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                    {s.step}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{s.text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  // ── Tab: Statistics ──────────────────────────────────────────────────────
  const renderStatistics = () => {
    if (!stats) return <Box textAlign="center" py={6}><CircularProgress /></Box>;
    const byDayEntries = Object.entries(stats.by_day || {});
    const maxVal = Math.max(...byDayEntries.map(([, v]) => v), 1);

    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          {[
            { label: "Total Webhooks", value: stats.total_webhooks, icon: "webhook", color: "#2196F3" },
            { label: "Active Webhooks", value: stats.active_webhooks, icon: "check_circle", color: "#4CAF50" },
            { label: "Total Triggers", value: stats.total_triggers, icon: "bolt", color: "#FF9800" },
            { label: "Today", value: stats.triggers_today, icon: "today", color: "#9C27B0" },
            { label: "This Week", value: stats.triggers_week, icon: "date_range", color: "#00BCD4" },
            { label: "This Month", value: stats.triggers_month, icon: "calendar_month", color: "#F44336" },
          ].map(s => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <Card sx={{ textAlign: "center", p: 2, border: "1px solid #eee" }} elevation={0}>
                <Icon sx={{ color: s.color, fontSize: 32 }}>{s.icon}</Icon>
                <Typography variant="h4" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Bar chart (CSS-based) */}
        <Card sx={{ p: 2, border: "1px solid #eee", mb: 3 }} elevation={0}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Webhook Triggers — Last 30 Days</Typography>
          <Box display="flex" alignItems="flex-end" gap={0.5} height={120} overflow="hidden">
            {byDayEntries.map(([day, count]) => (
              <Tooltip key={day} title={`${day}: ${count} triggers`}>
                <Box display="flex" flexDirection="column" alignItems="center" flex={1} height="100%" justifyContent="flex-end">
                  <Box sx={{ bgcolor: count > 0 ? "primary.main" : "#e0e0e0", borderRadius: "2px 2px 0 0", width: "100%", height: `${(count / maxVal) * 100}%`, minHeight: count > 0 ? 4 : 2, transition: "height 0.3s", cursor: "pointer" }} />
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box display="flex" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">{byDayEntries[0]?.[0]}</Typography>
            <Typography variant="caption" color="text.secondary">{byDayEntries[byDayEntries.length - 1]?.[0]}</Typography>
          </Box>
        </Card>

        {/* Success vs Error */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6}>
            <Card sx={{ p: 2, border: "1px solid #eee" }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Success vs Errors</Typography>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color="success.main">{stats.success_count}</Typography>
                  <Typography variant="caption" color="text.secondary">Successful</Typography>
                  {stats.total_triggers > 0 && <LinearProgress variant="determinate" value={(stats.success_count / stats.total_triggers) * 100} color="success" sx={{ mt: 0.5, borderRadius: 1 }} />}
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={700} color="error.main">{stats.error_count}</Typography>
                  <Typography variant="caption" color="text.secondary">Errors</Typography>
                  {stats.total_triggers > 0 && <LinearProgress variant="determinate" value={(stats.error_count / stats.total_triggers) * 100} color="error" sx={{ mt: 0.5, borderRadius: 1 }} />}
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card sx={{ p: 2, border: "1px solid #eee" }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Triggers by Entity</Typography>
              {Object.entries(stats.by_entity || {}).length === 0
                ? <Typography variant="body2" color="text.secondary">No data yet</Typography>
                : Object.entries(stats.by_entity).map(([entity, count]) => (
                  <Box key={entity} display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Chip size="small" label={entity} variant="outlined" />
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                ))
              }
            </Card>
          </Grid>
        </Grid>

        {/* Recent Log */}
        <Card sx={{ border: "1px solid #eee" }} elevation={0}>
          <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>Recent Activity Log</Typography>
            <Button size="small" startIcon={<Icon>refresh</Icon>} onClick={() => { loadLogs(); loadStats(); }}>Refresh</Button>
          </Box>
          <ScrollableTable
            totalCount={logs.length}
            page={logsPage}
            rowsPerPage={logsRpp}
            onPageChange={(e, newPage) => setLogsPage(newPage)}
            onRowsPerPageChange={(e) => { setLogsRpp(parseInt(e.target.value, 10)); setLogsPage(0); }}
          >
            <Table size="small">
              <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell><b>Webhook</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
                  <TableCell><b>Method</b></TableCell>
                  <TableCell><b>Entity Created</b></TableCell>
                  <TableCell><b>Time</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.slice(logsPage * logsRpp, (logsPage + 1) * logsRpp).map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell><Typography variant="body2">{l.webhook_name}</Typography></TableCell>
                    <TableCell><Chip size="small" label={l.status} color={logColor(l.status)} /></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: "monospace" }}>{l.method}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{l.result?.entity_type || "—"} {l.result?.entity_id ? `#${l.result.entity_id.slice(0,8)}` : ""}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{new Date(l.created_at).toLocaleString()}</Typography></TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" color="text.secondary" py={2}>No activity yet</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollableTable>
        </Card>
      </Box>
    );
  };

  // ── Tab: Documentation ───────────────────────────────────────────────────
  const renderDocs = () => {
    const baseUrl = "http://localhost:5000/api";
    const endpoints = [
      { method: "POST", path: "/devops/receive/:token", auth: false, desc: "Inbound webhook receiver — creates a Lead/Contact/Task from form data. Replace :token with your webhook token.", body: '{ "name": "John", "email": "j@example.com", "phone": "+1-555-0100" }', response: '{ "success": true, "data": { "entity_type": "lead", "entity_id": "uuid" } }' },
      { method: "GET",  path: "/devops/webhooks", auth: true, desc: "List all configured webhooks (requires auth token).", body: null, response: '{ "success": true, "data": [...webhooks] }' },
      { method: "POST", path: "/devops/webhooks", auth: true, desc: "Create a new webhook.", body: '{ "name": "My Form", "type": "inbound", "entity": "lead", "field_mapping": { "your_name": "name", "your_email": "email" } }', response: '{ "success": true, "data": { "id": "...", "token": "...", ... } }' },
      { method: "PUT",  path: "/devops/webhooks/:id", auth: true, desc: "Update an existing webhook.", body: '{ "status": "inactive" }', response: '{ "success": true, "data": { ...updated } }' },
      { method: "DELETE", path: "/devops/webhooks/:id", auth: true, desc: "Delete a webhook and all its logs.", body: null, response: '{ "success": true, "data": { "deleted": true } }' },
      { method: "POST", path: "/devops/webhooks/:id/regenerate", auth: true, desc: "Generate a new token for the webhook (old URL stops working).", body: null, response: '{ "success": true, "data": { ...webhook_with_new_token } }' },
      { method: "GET",  path: "/devops/logs", auth: true, desc: "Get webhook activity logs. Optional query: ?webhook_id=&limit=50", body: null, response: '{ "success": true, "data": [...logs] }' },
      { method: "GET",  path: "/devops/stats", auth: true, desc: "Get aggregate statistics (total triggers, by-day breakdown, success/error counts).", body: null, response: '{ "success": true, "data": { "total_webhooks": 3, ... } }' },
    ];
    const methodColor = { GET: "#4CAF50", POST: "#2196F3", PUT: "#FF9800", DELETE: "#F44336" };

    return (
      <Box>
        <Card sx={{ p: 2.5, border: "1px solid #e3f2fd", bgcolor: "#f8fbff", mb: 3 }} elevation={0}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Base URL</Typography>
          <Box component="code" sx={{ bgcolor: "#1e1e1e", color: "#d4d4d4", px: 2, py: 0.5, borderRadius: 1, fontFamily: "monospace", fontSize: "0.9rem" }}>
            {baseUrl}
          </Box>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Protected endpoints require an Authorization header: <code>Authorization: Bearer &lt;token&gt;</code>.
            Obtain a token via <code>POST /api/auth/login</code>.
          </Typography>
        </Card>

        {endpoints.map((ep, i) => (
          <Accordion key={i} elevation={0} sx={{ border: "1px solid #eee", mb: 1, borderRadius: "8px !important", "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
              <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <Chip size="small" label={ep.method} sx={{ bgcolor: methodColor[ep.method], color: "#fff", fontWeight: 700, fontFamily: "monospace" }} />
                <Typography sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{ep.path}</Typography>
                {!ep.auth && <Chip size="small" label="Public" color="success" />}
                {ep.auth && <Chip size="small" label="Auth Required" color="warning" />}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" mb={1.5}>{ep.desc}</Typography>
              {ep.body && (
                <Box mb={1.5}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Request Body (JSON)</Typography>
                  <Box component="pre" p={1.5} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1} sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto" }}>
                    {ep.body}
                  </Box>
                </Box>
              )}
              <Box>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>Response</Typography>
                <Box component="pre" p={1.5} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1} sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto" }}>
                  {ep.response}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* HTML Form Example */}
        <Card sx={{ mt: 3, border: "1px solid #eee" }} elevation={0}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>HTML Form Integration Example</Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Paste your inbound webhook URL as the form action to automatically create CRM leads when the form is submitted.
            </Typography>
            <Box component="pre" p={2} bgcolor="#1e1e1e" color="#d4d4d4" borderRadius={1} sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto" }}>
{`<form method="POST" action="http://localhost:5000/api/devops/receive/YOUR_TOKEN_HERE">
  <input type="text"  name="name"    placeholder="Your Name"  required />
  <input type="email" name="email"   placeholder="Email"      required />
  <input type="tel"   name="phone"   placeholder="Phone"               />
  <input type="text"  name="company" placeholder="Company"             />
  <textarea           name="notes"   placeholder="Message"></textarea>
  <button type="submit">Send</button>
</form>`}
            </Box>
            <Box mt={1.5} p={1.5} bgcolor="#f3e5f5" borderRadius={1}>
              <Typography variant="caption" color="secondary.dark">
                💡 <b>Tip:</b> Use field mapping in your webhook settings if your form field names differ from CRM field names. For example, map "your_name" → "name", "your_email" → "email".
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box p={3}>
        {/* Page Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box sx={{ bgcolor: "#1565C020", color: "#1565C0", borderRadius: 2, p: 1.5, display: "flex" }}>
            <Icon sx={{ fontSize: 32 }}>developer_mode</Icon>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Developer Resources</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage webhooks, API integrations, and connect external forms to your CRM
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab icon={<Icon>apps</Icon>} iconPosition="start" label="Common Use Cases" />
            <Tab icon={<Icon>webhook</Icon>} iconPosition="start" label={`Integrations${webhooks.length > 0 ? ` (${webhooks.length})` : ""}`} />
            <Tab icon={<Icon>bar_chart</Icon>} iconPosition="start" label="Statistics" />
            <Tab icon={<Icon>menu_book</Icon>} iconPosition="start" label="Documentation" />
          </Tabs>
        </Box>

        {tab === 0 && renderUseCases()}
        {tab === 1 && renderIntegrations()}
        {tab === 2 && renderStatistics()}
        {tab === 3 && renderDocs()}
      </Box>

      {/* Dialogs */}
      <WebhookDialog
        open={whDialog.open}
        onClose={() => setWhDialog({ open: false, initial: null })}
        initial={whDialog.initial}
        onSave={handleSaveWebhook}
      />
      <WebhookDetailDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, webhook: null })}
        webhook={detailDialog.webhook}
        onRegenerate={() => handleRegenerate(detailDialog.webhook)}
      />

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle>Delete Webhook?</DialogTitle>
        <DialogContent><Typography>This will permanently delete the webhook and all its logs. This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
