/* eslint-disable */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box, Grid, Typography, Paper, Chip, Avatar, Button, IconButton,
  LinearProgress, Divider, List, ListItem, ListItemAvatar, ListItemText,
  CircularProgress,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BusinessIcon from "@mui/icons-material/Business";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import ReceiptIcon from "@mui/icons-material/Receipt";
import InventoryIcon from "@mui/icons-material/Inventory";
import ContactsIcon from "@mui/icons-material/Contacts";
import { analyticsAPI, invoicesAPI, activitiesAPI } from "services/api";
import { useAuth } from "context/AuthContext";

const STAGE_COLORS = {
  "Fresh Leads": "#1976d2", "Assigned Leads": "#7b1fa2", "Connected / In Progress": "#f57c00",
  "No Answer": "#d32f2f", "Need to connect in future": "#388e3c",
  "New Opportunity": "#1976d2", "In Progress": "#f57c00", "Agreement": "#0288d1",
  "Won": "#388e3c", "Lost": "#d32f2f",
};

function StatCard({ icon, label, value, sub, color, trend, onClick }) {
  return (
    <Paper elevation={0} onClick={onClick}
      sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%", cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s", "&:hover": onClick ? { boxShadow: "0 4px 20px rgba(0,0,0,0.12)" } : {} }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} mt={0.5} color={color || "text.primary"} sx={{ lineHeight: 1 }}>
            {value}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>{sub}</Typography>}
        </Box>
        <Box sx={{ bgcolor: `${color || "#1976d2"}15`, borderRadius: 2.5, p: 1.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </Box>
      </Box>
      {trend !== undefined && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1.5 }}>
          {trend >= 0 ? <ArrowUpwardIcon sx={{ fontSize: 14, color: "#388e3c" }} /> : <ArrowDownwardIcon sx={{ fontSize: 14, color: "#d32f2f" }} />}
          <Typography variant="caption" color={trend >= 0 ? "success.main" : "error.main"} fontWeight={600}>
            {Math.abs(trend)}% vs last month
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function FunnelBar({ stage, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box mb={1.5}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{stage}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Typography variant="body2" fontWeight={700}>{count}</Typography>
          <Typography variant="caption" color="text.secondary">({pct}%)</Typography>
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 7, borderRadius: 4, bgcolor: "#f0f0f0", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 } }} />
    </Box>
  );
}

const activityIcon = { call: <PhoneIcon sx={{ fontSize: 16 }} />, email: <EmailIcon sx={{ fontSize: 16 }} />, meeting: <EventIcon sx={{ fontSize: 16 }} />, task: <AssignmentIcon sx={{ fontSize: 16 }} /> };
const activityColor = { call: "#1976d2", email: "#388e3c", meeting: "#7b1fa2", task: "#f57c00" };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [invoiceStats, setInvoiceStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview().catch(() => null),
      invoicesAPI.getStats().catch(() => null),
      activitiesAPI.getAll({ completed: "false" }).catch(() => []),
    ]).then(([ana, inv, acts]) => {
      setAnalytics(ana);
      setInvoiceStats(inv);
      setActivities((acts || []).slice(0, 6));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <DashboardLayout><DashboardNavbar />
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>Loading CRM data…</Typography>
        </Box>
      </Box>
    </DashboardLayout>
  );

  if (!analytics) return (
    <DashboardLayout><DashboardNavbar />
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center", border: "2px dashed #e0e0e0" }}>
          <Typography variant="h5" fontWeight={700} color="text.secondary" mb={1}>Backend Not Running</Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Start the CRM backend server to see live data.
          </Typography>
          <Box sx={{ bgcolor: "#1e1e1e", borderRadius: 2, p: 2, display: "inline-block", textAlign: "left" }}>
            <Typography variant="body2" fontFamily="monospace" color="#4fc3f7">
              $ node server/index.js
            </Typography>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );

  const { summary, leadsByStage, dealsByStage, recentLeads, recentDeals, funnel } = analytics;

  const quickActions = [
    { label: "Add Lead", icon: <PeopleIcon />, color: "#1976d2", path: "/crm/leads" },
    { label: "Add Deal", icon: <TrendingUpIcon />, color: "#f57c00", path: "/crm/deals" },
    { label: "New Invoice", icon: <ReceiptIcon />, color: "#388e3c", path: "/finance/invoices" },
    { label: "New Quote", icon: <AssignmentIcon />, color: "#7b1fa2", path: "/finance/quotes" },
    { label: "Add Contact", icon: <ContactsIcon />, color: "#0288d1", path: "/crm/contacts" },
    { label: "Products", icon: <InventoryIcon />, color: "#795548", path: "/finance/products" },
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="text.primary">CRM Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back, {currentUser?.name || "there"} — here&apos;s your business overview for today.
          </Typography>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<PeopleIcon sx={{ color: "#1976d2", fontSize: 22 }} />} label="Total Leads" value={summary.totalLeads}
              sub="Active pipeline" color="#1976d2" trend={12} onClick={() => navigate("/crm/leads")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<TrendingUpIcon sx={{ color: "#f57c00", fontSize: 22 }} />} label="Total Deals" value={summary.totalDeals}
              sub={`Pipeline: $${Number(summary.pipelineValue || 0).toLocaleString()}`} color="#f57c00" trend={8} onClick={() => navigate("/crm/deals")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<AttachMoneyIcon sx={{ color: "#388e3c", fontSize: 22 }} />} label="Revenue Won"
              value={`$${Number(summary.totalRevenue || 0).toLocaleString()}`}
              sub="Closed deals" color="#388e3c" trend={15} onClick={() => navigate("/crm/analytics")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<ReceiptIcon sx={{ color: "#7b1fa2", fontSize: 22 }} />} label="Outstanding"
              value={invoiceStats ? `$${Number(invoiceStats.outstanding || 0).toLocaleString()}` : "$—"}
              sub={invoiceStats ? `${invoiceStats.count} invoices total` : "Loading..."} color="#7b1fa2" trend={-3} onClick={() => navigate("/finance/invoices")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<ContactsIcon sx={{ color: "#0288d1", fontSize: 22 }} />} label="Contacts"
              value={summary.totalContacts} sub="In database" color="#0288d1" onClick={() => navigate("/crm/contacts")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<BusinessIcon sx={{ color: "#795548", fontSize: 22 }} />} label="Companies"
              value={summary.totalCompanies} sub="Active accounts" color="#795548" onClick={() => navigate("/crm/companies")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<CheckCircleIcon sx={{ color: "#388e3c", fontSize: 22 }} />} label="Invoices Paid"
              value={invoiceStats ? `$${Number(invoiceStats.paid || 0).toLocaleString()}` : "$—"}
              sub="This period" color="#388e3c" onClick={() => navigate("/finance/invoices")} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<AssignmentIcon sx={{ color: "#d32f2f", fontSize: 22 }} />} label="Pending Tasks"
              value={summary.pendingActivities} sub="Activities due" color="#d32f2f" onClick={() => navigate("/crm/activities")} />
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eee", mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">QUICK ACTIONS</Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {quickActions.map((a) => (
              <Button key={a.label} variant="outlined" startIcon={a.icon} size="small"
                onClick={() => navigate(a.path)}
                sx={{ borderColor: a.color, color: a.color, "&:hover": { bgcolor: `${a.color}10`, borderColor: a.color }, borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                {a.label}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Middle Row */}
        <Grid container spacing={2.5} mb={2.5}>
          {/* Sales Funnel */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Sales Funnel</Typography>
              {(funnel || []).map((f, i) => (
                <FunnelBar key={i} stage={f.stage} count={f.count} total={funnel[0]?.count || 1}
                  color={["#1976d2","#7b1fa2","#f57c00","#0288d1","#388e3c"][i % 5]} />
              ))}
            </Paper>
          </Grid>

          {/* Leads by Stage */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Leads by Stage</Typography>
                <Button size="small" onClick={() => navigate("/crm/leads")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>
              </Box>
              {(leadsByStage || []).map((s, i) => (
                <FunnelBar key={i} stage={s.stage} count={s.count}
                  total={leadsByStage.reduce((a, b) => a + b.count, 0)}
                  color={STAGE_COLORS[s.stage] || "#1976d2"} />
              ))}
            </Paper>
          </Grid>

          {/* Deals by Stage */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Deals by Stage</Typography>
                <Button size="small" onClick={() => navigate("/crm/deals")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>
              </Box>
              {(dealsByStage || []).map((s, i) => (
                <FunnelBar key={i} stage={s.stage} count={s.count}
                  total={dealsByStage.reduce((a, b) => a + b.count, 0)}
                  color={STAGE_COLORS[s.stage] || "#f57c00"} />
              ))}
            </Paper>
          </Grid>
        </Grid>

        {/* Bottom Row */}
        <Grid container spacing={2.5}>
          {/* Recent Leads */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Leads</Typography>
                <Button size="small" onClick={() => navigate("/crm/leads")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>
              </Box>
              {(recentLeads || []).slice(0, 6).map((lead) => (
                <Box key={lead.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderBottom: "1px solid #f5f5f5" }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: STAGE_COLORS[lead.stage] || "#1976d2", fontSize: 12 }}>
                    {(lead.name || lead.title || "?")[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{lead.title}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{lead.name || lead.company}</Typography>
                  </Box>
                  <Chip label={lead.stage} size="small"
                    sx={{ fontSize: 9, height: 18, bgcolor: `${STAGE_COLORS[lead.stage] || "#1976d2"}15`, color: STAGE_COLORS[lead.stage] || "#1976d2", maxWidth: 90 }} />
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Recent Deals */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>Recent Deals</Typography>
                <Button size="small" onClick={() => navigate("/crm/deals")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>
              </Box>
              {(recentDeals || []).slice(0, 6).map((deal) => (
                <Box key={deal.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderBottom: "1px solid #f5f5f5" }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: STAGE_COLORS[deal.stage] || "#f57c00", fontSize: 12 }}>
                    {(deal.contact_name || deal.title || "?")[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{deal.title}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{deal.company_name}</Typography>
                  </Box>
                  <Typography variant="body2" color="success.main" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                    ${Number(deal.amount || 0).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Upcoming Activities */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>Upcoming Activities</Typography>
                <Button size="small" onClick={() => navigate("/crm/activities")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>
              </Box>
              {activities.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No pending activities</Typography>
              )}
              {activities.map((act) => (
                <Box key={act.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1, borderBottom: "1px solid #f5f5f5" }}>
                  <Box sx={{ bgcolor: `${activityColor[act.type] || "#666"}15`, borderRadius: 1.5, p: 0.75, color: activityColor[act.type] || "#666", mt: 0.25 }}>
                    {activityIcon[act.type] || <AssignmentIcon sx={{ fontSize: 16 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{act.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {act.due_date} {act.due_time ? `· ${act.due_time}` : ""} · {act.assigned_to}
                    </Typography>
                  </Box>
                </Box>
              ))}
              <Button fullWidth variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mt: 1.5, textTransform: "none" }}
                onClick={() => navigate("/crm/activities")}>
                Schedule Activity
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
