/* eslint-disable */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Typography, Card, CardContent, Switch, Chip, Button,
  CircularProgress, Snackbar, Alert, Tooltip, Divider, Avatar,
} from "@mui/material";
import {
  Shield, PersonOutline, SupervisorAccount, Save, RestartAlt,
  CheckCircle, Cancel,
} from "@mui/icons-material";
import { rolePermissionsAPI } from "services/api";

// ── Full module catalogue ───────────────────────────────────────────────────
const MODULE_GROUPS = [
  {
    label: "Main",
    modules: [
      { key: "dashboard",      label: "Dashboard",        icon: "📊" },
    ],
  },
  {
    label: "CRM",
    modules: [
      { key: "crm-leads",      label: "Leads",            icon: "🎯" },
      { key: "crm-deals",      label: "Deals",            icon: "💰" },
      { key: "crm-contacts",   label: "Contacts",         icon: "👤" },
      { key: "crm-companies",  label: "Companies",        icon: "🏢" },
      { key: "hr-structure",   label: "HR Structure",     icon: "🏗️" },
      { key: "employees",      label: "Employees",        icon: "👔" },
      { key: "crm-activities", label: "Activities",       icon: "📋" },
      { key: "crm-analytics",  label: "Analytics",        icon: "📈" },
      { key: "crm-stream",     label: "Stream / Feed",    icon: "📡" },
    ],
  },
  {
    label: "Collaboration",
    modules: [
      { key: "tasks",          label: "Tasks",            icon: "✅" },
      { key: "mail",           label: "Mail",             icon: "📧" },
      { key: "messenger",      label: "Messenger",        icon: "💬" },
      { key: "workgroups",     label: "Workgroups",       icon: "👥" },
      { key: "workflows",      label: "Workflows",        icon: "🔄" },
      { key: "work-reports",   label: "Work Reports",     icon: "📑" },
      { key: "timeman",        label: "Time Management",  icon: "⏱️" },
    ],
  },
  {
    label: "Admin Tools",
    modules: [
      { key: "admin-logs",     label: "Activity Logs",    icon: "📜" },
      { key: "projects",       label: "Projects & Rules", icon: "📁" },
      { key: "automation",     label: "Task Automation",  icon: "⚡" },
      { key: "devops",         label: "Developer Tools",  icon: "🛠️" },
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

const ROLE_META = {
  team_leader: { label: "Team Leader", color: "#f57c00", bg: "#fff3e0", icon: <SupervisorAccount />, desc: "Can manage teams, view reports, assign tasks" },
  employee:    { label: "Employee",    color: "#1976d2", bg: "#e3f2fd", icon: <PersonOutline />,     desc: "Regular user — individual contributor" },
};

export default function RolePermissions() {
  const [perms, setPerms]     = useState({ team_leader: [], employee: [] });
  const [original, setOriginal] = useState({ team_leader: [], employee: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [snack, setSnack]     = useState(null);
  const [changed, setChanged] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rolePermissionsAPI.getAll();
      const data = { team_leader: res.data?.team_leader || [], employee: res.data?.employee || [] };
      setPerms(data);
      setOriginal(JSON.parse(JSON.stringify(data)));
    } catch (e) {
      setSnack({ msg: "Failed to load permissions", sev: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const toggle = (role, key) => {
    setPerms(prev => {
      const next = { ...prev };
      const list = [...(prev[role] || [])];
      const idx = list.indexOf(key);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(key);
      next[role] = list;
      setChanged(true);
      return next;
    });
  };

  const reset = () => { setPerms(JSON.parse(JSON.stringify(original))); setChanged(false); };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        rolePermissionsAPI.update("team_leader", perms.team_leader),
        rolePermissionsAPI.update("employee",    perms.employee),
      ]);
      setOriginal(JSON.parse(JSON.stringify(perms)));
      setChanged(false);
      setSnack({ msg: "✅ Permissions saved! Changes take effect on next login.", sev: "success" });
    } catch (e) {
      setSnack({ msg: "Failed to save permissions", sev: "error" });
    }
    setSaving(false);
  };

  const toggleAll = (role, enable) => {
    setPerms(prev => ({ ...prev, [role]: enable ? ALL_MODULES.map(m => m.key) : [] }));
    setChanged(true);
  };

  if (loading) return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>

        {/* ── Header ── */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ bgcolor: "#1976d2", borderRadius: 2, p: 1.2, display: "flex" }}>
              <Shield sx={{ color: "#fff", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1a2332">Role Access Permissions</Typography>
              <Typography variant="body2" color="text.secondary">
                Control which modules each role can see in their sidebar
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1.5} alignItems="center">
            {changed && (
              <Chip label="Unsaved changes" size="small" sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />
            )}
            <Button variant="outlined" startIcon={<RestartAlt />} onClick={reset} disabled={!changed || saving}
              sx={{ textTransform: "none", borderRadius: "10px" }}>
              Reset
            </Button>
            <Button variant="contained" startIcon={<Save />} onClick={save} disabled={!changed || saving}
              sx={{ textTransform: "none", borderRadius: "10px", bgcolor: "#1976d2", "&:hover": { bgcolor: "#1565c0" } }}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </Box>
        </Box>

        {/* ── Role header cards ── */}
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "340px 1fr 1fr" }} gap={2} mb={3}>
          <Box />
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <Card key={role} sx={{ border: `2px solid ${meta.color}30`, bgcolor: meta.bg, boxShadow: "none" }}>
              <CardContent sx={{ p: "14px 18px !important" }}>
                <Box display="flex" alignItems="center" gap={1.2} mb={0.5}>
                  <Avatar sx={{ bgcolor: meta.color, width: 36, height: 36 }}>{meta.icon}</Avatar>
                  <Box>
                    <Typography fontWeight={800} fontSize={15} color={meta.color}>{meta.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{meta.desc}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mt={1.5}>
                  <Chip label={`${perms[role]?.length || 0} / ${ALL_MODULES.length} enabled`}
                    size="small" sx={{ bgcolor: meta.color, color: "#fff", fontWeight: 700, fontSize: 11 }} />
                  <Button size="small" onClick={() => toggleAll(role, true)}
                    sx={{ fontSize: 11, textTransform: "none", py: 0, color: "#388e3c" }}>All On</Button>
                  <Button size="small" onClick={() => toggleAll(role, false)}
                    sx={{ fontSize: 11, textTransform: "none", py: 0, color: "#d32f2f" }}>All Off</Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ── Module groups ── */}
        {MODULE_GROUPS.map(group => (
          <Card key={group.label} sx={{ mb: 2, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderRadius: "14px", overflow: "hidden" }}>
            {/* Group header */}
            <Box sx={{ px: 2.5, py: 1.2, bgcolor: "#f8f9fb", borderBottom: "1px solid #eef1f5", display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={700} fontSize={12} color="text.secondary" textTransform="uppercase" letterSpacing={0.8}>
                {group.label}
              </Typography>
              <Chip label={group.modules.length} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#e8ecf0", color: "#546e7a" }} />
            </Box>

            {/* Module rows */}
            {group.modules.map((mod, idx) => (
              <Box key={mod.key}>
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "340px 1fr 1fr" }} alignItems="center"
                  sx={{ px: 2.5, py: 1.4, "&:hover": { bgcolor: "#fafbfc" }, transition: "background 0.15s" }}>

                  {/* Module name */}
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{mod.icon}</Typography>
                    <Box>
                      <Typography fontSize={13} fontWeight={600} color="#263238">{mod.label}</Typography>
                      <Typography fontSize={11} color="text.secondary" sx={{ opacity: 0.7 }}>/{mod.key}</Typography>
                    </Box>
                  </Box>

                  {/* Toggle per role */}
                  {["team_leader", "employee"].map(role => {
                    const on = (perms[role] || []).includes(mod.key);
                    const meta = ROLE_META[role];
                    return (
                      <Box key={role} display="flex" alignItems="center" gap={1.5} px={2}>
                        <Switch
                          checked={on}
                          onChange={() => toggle(role, mod.key)}
                          size="small"
                          sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": { color: meta.color },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: meta.color },
                          }}
                        />
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {on
                            ? <><CheckCircle sx={{ fontSize: 14, color: "#388e3c" }} /><Typography fontSize={12} color="#388e3c" fontWeight={600}>Access granted</Typography></>
                            : <><Cancel sx={{ fontSize: 14, color: "#bdbdbd" }} /><Typography fontSize={12} color="#bdbdbd">No access</Typography></>
                          }
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                {idx < group.modules.length - 1 && <Divider sx={{ mx: 2.5, borderColor: "#f0f4f8" }} />}
              </Box>
            ))}
          </Card>
        ))}

        {/* ── Admin note ── */}
        <Card sx={{ bgcolor: "#e8f5e9", border: "1px solid #a5d6a7", boxShadow: "none", borderRadius: "12px", mt: 1 }}>
          <CardContent sx={{ p: "14px 18px !important" }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Shield sx={{ color: "#388e3c", fontSize: 18 }} />
              <Typography variant="caption" color="#2e7d32" fontWeight={600}>
                Admin & Super Admin always have full access to all modules — these settings only apply to Team Leaders and Employees.
                Changes take effect the next time the user logs in or refreshes the app.
              </Typography>
            </Box>
          </CardContent>
        </Card>

      </Box>
      <Snackbar open={Boolean(snack)} autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev || "success"} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
