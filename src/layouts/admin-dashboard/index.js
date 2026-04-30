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
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAuth } from "context/AuthContext";
import { usersAPI, reportsAPI, tasksAPI, leadsAPI, dealsAPI } from "services/api";
import { useNavigate } from "react-router-dom";
import ScrollableTable from "components/ScrollableTable";

const ROLE_COLORS = { admin: "error", team_leader: "warning", employee: "info", super_admin: "secondary" };

function StatCard({ icon, title, value, subtitle, color = "info", trend }) {
  return (
    <Card sx={{ p: 3, height: "100%", position: "relative", overflow: "hidden" }}>
      <MDBox display="flex" alignItems="flex-start" justifyContent="space-between">
        <MDBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          width={56}
          height={56}
          borderRadius="12px"
          bgColor={color}
          variant="gradient"
          shadow="md"
          sx={{ flexShrink: 0 }}
        >
          <Icon sx={{ color: "white", fontSize: 28 }}>{icon}</Icon>
        </MDBox>
        {trend !== undefined && (
          <MDBox display="flex" alignItems="center" gap={0.5}>
            <Icon sx={{ color: trend >= 0 ? "#4caf50" : "#f44336", fontSize: 16 }}>
              {trend >= 0 ? "trending_up" : "trending_down"}
            </Icon>
            <MDTypography variant="caption" color={trend >= 0 ? "success" : "error"} fontWeight="bold">
              {Math.abs(trend)}%
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
      <MDBox mt={2}>
        <MDTypography variant="h4" fontWeight="bold">{value}</MDTypography>
        <MDTypography variant="button" fontWeight="bold" color="text">{title}</MDTypography>
        {subtitle && <MDTypography variant="caption" color="text" display="block">{subtitle}</MDTypography>}
      </MDBox>
    </Card>
  );
}

function UserRow({ user, onNavigate }) {
  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={() => onNavigate("/admin/users")}>
      <TableCell>
        <MDBox display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: `${ROLE_COLORS[user.role] || "info"}.main`, fontSize: 14 }}>
            {user.name?.charAt(0) || "?"}
          </Avatar>
          <MDBox>
            <MDTypography variant="button" fontWeight="medium">{user.name}</MDTypography>
            <MDTypography variant="caption" color="text" display="block">{user.email}</MDTypography>
          </MDBox>
        </MDBox>
      </TableCell>
      <TableCell>
        <Chip label={user.role?.replace("_", " ")} size="small" color={ROLE_COLORS[user.role] || "default"} />
      </TableCell>
      <TableCell>
        <MDTypography variant="caption" color="text">{user.department || "—"}</MDTypography>
      </TableCell>
      <TableCell>
        <Chip
          label={user.status || "active"}
          size="small"
          color={user.status === "active" ? "success" : "default"}
          variant="outlined"
        />
      </TableCell>
    </TableRow>
  );
}

export default function AdminDashboard() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [workReport, setWorkReport] = useState(null);
  const [crmReport, setCrmReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, workData, crmData] = await Promise.all([
        usersAPI.getAll(),
        reportsAPI.getWorkSummary(),
        reportsAPI.getCRMOverview(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setWorkReport(workData);
      setCrmReport(crmData);
    } catch (err) {
      console.error("Admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={4} textAlign="center">
          <Icon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}>lock</Icon>
          <MDTypography variant="h5" color="text">Access Denied</MDTypography>
          <MDTypography variant="body2" color="text">You need admin privileges to access this page.</MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  const activeUsers = users.filter(u => u.status !== "inactive").length;
  const adminUsers = users.filter(u => u.role === "admin" || u.role === "super_admin").length;
  const employeeUsers = users.filter(u => u.role === "employee").length;

  const roleBreakdown = ["admin", "team_leader", "employee", "super_admin"].map(role => ({
    role,
    count: users.filter(u => u.role === role).length,
  })).filter(r => r.count > 0);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        {/* Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="bold">Admin Dashboard</MDTypography>
            <MDTypography variant="body2" color="text">
              Welcome back, {currentUser?.name}. Here&apos;s your team overview.
            </MDTypography>
          </MDBox>
          <MDBox display="flex" gap={1}>
            <MDButton variant="outlined" color="info" size="small" onClick={() => navigate("/admin/users")}>
              <Icon sx={{ mr: 0.5 }}>manage_accounts</Icon> Manage Users
            </MDButton>
            <MDButton variant="gradient" color="info" size="small" onClick={() => navigate("/work-reports")}>
              <Icon sx={{ mr: 0.5 }}>assessment</Icon> Reports
            </MDButton>
          </MDBox>
        </MDBox>

        {loading ? (
          <MDBox display="flex" justifyContent="center" p={6}><CircularProgress /></MDBox>
        ) : (
          <>
            {/* KPI Stats Row */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard icon="group" title="Total Users" value={users.length} subtitle={`${activeUsers} active`} color="info" />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon="task_alt"
                  title="Tasks Completed"
                  value={workReport?.totals?.tasks_completed || 0}
                  subtitle={`${workReport?.totals?.tasks_total || 0} total tasks`}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon="monetization_on"
                  title="Deals Won"
                  value={crmReport?.deals?.won || 0}
                  subtitle={`$${(crmReport?.deals?.revenue || 0).toLocaleString()} revenue`}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  icon="receipt_long"
                  title="Outstanding Invoices"
                  value={`$${(crmReport?.invoices?.outstanding || 0).toLocaleString()}`}
                  subtitle={`${crmReport?.invoices?.overdue_count || 0} overdue`}
                  color="error"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Team Performance */}
              <Grid item xs={12} lg={8}>
                <Card>
                  <MDBox p={3} pb={0} display="flex" justifyContent="space-between" alignItems="center">
                    <MDTypography variant="h6" fontWeight="bold">Team Performance</MDTypography>
                    <MDButton size="small" variant="text" color="info" onClick={() => navigate("/work-reports")}>
                      View Full Report
                    </MDButton>
                  </MDBox>
                  <MDBox p={0}>
                    <ScrollableTable>
                      <Table>
                      <TableHead style={{ display: "table-header-group" }}>
                        <TableRow>
                          {["Employee", "Tasks Done", "In Progress", "Hours", "Completion"].map(h => (
                            <TableCell key={h}>
                              <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: "uppercase" }}>
                                {h}
                              </MDTypography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(workReport?.users || []).slice(0, 6).map((u, i) => (
                          <TableRow key={i} hover>
                            <TableCell>
                              <MDBox display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{u.name?.charAt(0)}</Avatar>
                                <MDTypography variant="caption" fontWeight="medium">{u.name}</MDTypography>
                              </MDBox>
                            </TableCell>
                            <TableCell>
                              <Chip label={u.tasks_completed} size="small" color="success" />
                            </TableCell>
                            <TableCell>
                              <Chip label={u.tasks_in_progress} size="small" color="warning" />
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption">{u.hours_logged}h</MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDBox display="flex" alignItems="center" gap={1} sx={{ minWidth: 100 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={u.completion_rate}
                                  color={u.completion_rate >= 80 ? "success" : u.completion_rate >= 50 ? "warning" : "error"}
                                  sx={{ flex: 1, height: 6, borderRadius: 3 }}
                                />
                                <MDTypography variant="caption">{u.completion_rate}%</MDTypography>
                              </MDBox>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!workReport?.users || workReport.users.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <MDTypography variant="caption" color="text">No performance data available</MDTypography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      </Table>
                    </ScrollableTable>
                  </MDBox>
                </Card>
              </Grid>

              {/* Right Column */}
              <Grid item xs={12} lg={4}>
                {/* User Roles Breakdown */}
                <Card sx={{ mb: 3 }}>
                  <MDBox p={3} pb={1}>
                    <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <MDTypography variant="h6" fontWeight="bold">User Roles</MDTypography>
                      <MDButton size="small" variant="text" color="info" onClick={() => navigate("/admin/users")}>
                        Manage
                      </MDButton>
                    </MDBox>
                    {roleBreakdown.map(({ role, count }) => (
                      <MDBox key={role} display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                        <MDBox display="flex" alignItems="center" gap={1}>
                          <Icon sx={{ fontSize: 18, color: "text.secondary" }}>
                            {role === "admin" ? "admin_panel_settings" : role === "team_leader" ? "supervisor_account" : role === "super_admin" ? "security" : "person"}
                          </Icon>
                          <MDTypography variant="button" sx={{ textTransform: "capitalize" }}>
                            {role.replace("_", " ")}
                          </MDTypography>
                        </MDBox>
                        <MDBox display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={users.length > 0 ? (count / users.length) * 100 : 0}
                            color={ROLE_COLORS[role] || "info"}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <MDTypography variant="button" fontWeight="bold">{count}</MDTypography>
                        </MDBox>
                      </MDBox>
                    ))}
                  </MDBox>
                </Card>

                {/* CRM Quick Stats */}
                <Card>
                  <MDBox p={3}>
                    <MDTypography variant="h6" fontWeight="bold" mb={2}>CRM Summary</MDTypography>
                    {[
                      { label: "Total Leads", value: crmReport?.leads?.total || 0, icon: "person_add", color: "#1976d2" },
                      { label: "Active Deals", value: crmReport?.deals?.total || 0, icon: "handshake", color: "#ed6c02" },
                      { label: "Contacts", value: crmReport?.contacts?.total || 0, icon: "contacts", color: "#2e7d32" },
                      { label: "Companies", value: crmReport?.companies?.total || 0, icon: "business", color: "#9c27b0" },
                    ].map(({ label, value, icon, color }) => (
                      <MDBox key={label} display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                        <MDBox display="flex" alignItems="center" gap={1}>
                          <Icon sx={{ fontSize: 18, color }}>{icon}</Icon>
                          <MDTypography variant="button">{label}</MDTypography>
                        </MDBox>
                        <MDTypography variant="button" fontWeight="bold">{value}</MDTypography>
                      </MDBox>
                    ))}
                  </MDBox>
                </Card>
              </Grid>

              {/* Recent Users Table */}
              <Grid item xs={12}>
                <Card>
                  <MDBox p={3} pb={0} display="flex" justifyContent="space-between" alignItems="center">
                    <MDTypography variant="h6" fontWeight="bold">Team Members</MDTypography>
                    <MDButton size="small" variant="gradient" color="info" onClick={() => navigate("/admin/users")}>
                      <Icon sx={{ mr: 0.5 }}>add</Icon> Add User
                    </MDButton>
                  </MDBox>
                  <MDBox p={0}>
                    <ScrollableTable>
                      <Table>
                      <TableHead style={{ display: "table-header-group" }}>
                        <TableRow>
                          {["User", "Role", "Department", "Status"].map(h => (
                            <TableCell key={h}>
                              <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: "uppercase" }}>
                                {h}
                              </MDTypography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.slice(0, 8).map((u) => (
                          <UserRow key={u.id} user={u} onNavigate={navigate} />
                        ))}
                      </TableBody>
                      </Table>
                    </ScrollableTable>
                  </MDBox>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
