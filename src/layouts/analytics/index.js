/* eslint-disable */
import { useState, useEffect } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { Box, Typography, Grid, Paper, Chip, CircularProgress, Divider } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { analyticsAPI } from "services/api";

function KpiCard({ icon, label, value, color, sub }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700} mt={0.5} color={color || "text.primary"}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color || "#1976d2"}20`,
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

function StagePipeline({ data, title, colorMap }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        {title}
      </Typography>
      {data.map((item, i) => {
        const color = (colorMap || {})[item.stage] || "#1976d2";
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <Box key={i} mb={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {item.stage}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {item.count}
                </Typography>
                {item.total > 0 && (
                  <Typography variant="body2" color="success.main">
                    ${Number(item.total).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#f0f0f0", borderRadius: 5, height: 6, overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${pct}%`,
                  bgcolor: color,
                  height: "100%",
                  borderRadius: 5,
                  transition: "width 0.5s",
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

function ConversionFunnel({ funnel }) {
  if (!funnel || funnel.length === 0) return null;
  const max = funnel[0]?.count || 1;
  const colors = ["#1976d2", "#7b1fa2", "#f57c00", "#0288d1", "#388e3c"];
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        Conversion Funnel
      </Typography>
      {funnel.map((stage, i) => {
        const pct = Math.round((stage.count / max) * 100);
        const conv = i === 0 ? 100 : Math.round((stage.count / funnel[i - 1]?.count || 1) * 100);
        return (
          <Box key={i} mb={2} sx={{ position: "relative" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {stage.stage}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={`${stage.count}`}
                  size="small"
                  sx={{ height: 18, fontSize: 10, bgcolor: `${colors[i]}20`, color: colors[i] }}
                />
                {i > 0 && (
                  <Chip label={`${conv}%`} size="small" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#f0f0f0", borderRadius: 5, height: 8, overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${pct}%`,
                  bgcolor: colors[i],
                  height: "100%",
                  borderRadius: 5,
                  transition: "width 0.5s",
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

function SourceChart({ data, title }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = [
    "#1976d2",
    "#388e3c",
    "#f57c00",
    "#7b1fa2",
    "#0288d1",
    "#d32f2f",
    "#795548",
    "#607d8b",
  ];
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", height: "100%" }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        {title}
      </Typography>
      {data.map((item, i) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        const color = colors[i % colors.length];
        return (
          <Box key={i} mb={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="body2">{item.source || "Unknown"}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {item.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pct}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#f0f0f0", borderRadius: 5, height: 5, overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${pct}%`,
                  bgcolor: color,
                  height: "100%",
                  borderRadius: 5,
                  transition: "width 0.5s",
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

function RecentTable({ items, type }) {
  if (!items || items.length === 0)
    return (
      <Typography color="text.secondary" variant="body2" textAlign="center" py={2}>
        No recent {type}
      </Typography>
    );
  return (
    <Box>
      {items.slice(0, 8).map((item, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            borderBottom: "1px solid #f5f5f5",
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {item.title || item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.stage} · {item.source || ""}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {item.amount > 0 ? `$${Number(item.amount).toLocaleString()}` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

const LEAD_STAGE_COLORS = {
  "Fresh Leads": "#1976d2",
  "Assigned Leads": "#7b1fa2",
  "Connected / In Progress": "#f57c00",
  "No Answer": "#d32f2f",
  "Need to connect in future": "#388e3c",
};
const DEAL_STAGE_COLORS = {
  "New Opportunity": "#1976d2",
  "In Progress": "#f57c00",
  "Need to connect in future": "#7b1fa2",
  Agreement: "#0288d1",
  Won: "#388e3c",
  Lost: "#d32f2f",
};

export default function CRMAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsAPI
      .getOverview()
      .then((d) => setData(d))
      .catch((e) =>
        setError("Failed to load analytics. Make sure the backend server is running on port 5000.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ p: 3 }}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
          <Typography color="text.secondary" variant="body2" mt={1}>
            Run: <code>node server/index.js</code> in the project directory to start the backend.
          </Typography>
        </Box>
      </DashboardLayout>
    );

  const {
    summary,
    leadsByStage,
    dealsByStage,
    leadsBySource,
    dealsBySource,
    recentLeads,
    recentDeals,
    funnel,
    monthlyLeads,
    monthlyDeals,
  } = data;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>
          CRM Analytics & Reports
        </Typography>

        {/* KPI Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<AssignmentIcon sx={{ color: "#1976d2" }} />}
              label="Total Leads"
              value={summary.totalLeads}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<TrendingUpIcon sx={{ color: "#f57c00" }} />}
              label="Total Deals"
              value={summary.totalDeals}
              color="#f57c00"
              sub={`Pipeline: $${Number(summary.pipelineValue || 0).toLocaleString()}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<CheckCircleIcon sx={{ color: "#388e3c" }} />}
              label="Won Revenue"
              value={`$${Number(summary.totalRevenue || 0).toLocaleString()}`}
              color="#388e3c"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<HourglassEmptyIcon sx={{ color: "#7b1fa2" }} />}
              label="Pending Activities"
              value={summary.pendingActivities}
              color="#7b1fa2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<PeopleIcon sx={{ color: "#0288d1" }} />}
              label="Contacts"
              value={summary.totalContacts}
              color="#0288d1"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<BusinessIcon sx={{ color: "#795548" }} />}
              label="Companies"
              value={summary.totalCompanies}
              color="#795548"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<AttachMoneyIcon sx={{ color: "#388e3c" }} />}
              label="Pipeline Value"
              value={`$${Number(summary.pipelineValue || 0).toLocaleString()}`}
              color="#388e3c"
              sub="Active deals"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              icon={<TrendingUpIcon sx={{ color: "#d32f2f" }} />}
              label="Won Deals"
              value={
                summary.totalRevenue > 0
                  ? `$${Number(summary.totalRevenue).toLocaleString()}`
                  : "$0"
              }
              color="#d32f2f"
              sub="Closed won"
            />
          </Grid>
        </Grid>

        {/* Charts Row 1 */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={4}>
            <ConversionFunnel funnel={funnel} />
          </Grid>
          <Grid item xs={12} md={4}>
            <StagePipeline
              data={leadsByStage}
              title="Leads by Stage"
              colorMap={LEAD_STAGE_COLORS}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StagePipeline
              data={dealsByStage}
              title="Deals by Stage"
              colorMap={DEAL_STAGE_COLORS}
            />
          </Grid>
        </Grid>

        {/* Charts Row 2 */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={6}>
            <SourceChart data={leadsBySource} title="Leads by Source" />
          </Grid>
          <Grid item xs={12} md={6}>
            <SourceChart data={dealsBySource} title="Deals by Source" />
          </Grid>
        </Grid>

        {/* Monthly trend */}
        {monthlyLeads && monthlyLeads.length > 0 && (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee", mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Monthly Leads Trend
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
                height: 100,
                overflowX: "auto",
              }}
            >
              {[...monthlyLeads].reverse().map((m, i) => {
                const maxCount = Math.max(...monthlyLeads.map((x) => x.count), 1);
                const h = Math.round((m.count / maxCount) * 80) + 10;
                return (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: 40,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      {m.count}
                    </Typography>
                    <Box
                      sx={{
                        width: 32,
                        height: h,
                        bgcolor: "#1976d2",
                        borderRadius: "4px 4px 0 0",
                        opacity: 0.8,
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 9, mt: 0.5 }}
                    >
                      {m.month}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        )}

        {/* Recent Activity */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee" }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                Recent Leads
              </Typography>
              <RecentTable items={recentLeads} type="leads" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eee" }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                Recent Deals
              </Typography>
              <RecentTable items={recentDeals} type="deals" />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
