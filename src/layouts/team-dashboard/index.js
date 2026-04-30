/* eslint-disable */
import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAuth } from "context/AuthContext";
import { tasksAPI, usersAPI, notificationsAPI } from "services/api";
import { useNavigate } from "react-router-dom";
import ScrollableTable from "components/ScrollableTable";

const PRIORITY_COLORS = { high: "error", medium: "warning", low: "success", urgent: "error" };
const STATUS_COLORS = { pending: "warning", in_progress: "info", completed: "success", cancelled: "default" };

function StatCard({ icon, title, value, subtitle, color = "info", onClick }) {
  return (
    <Card
      sx={{ p: 3, height: "100%", cursor: onClick ? "pointer" : "default", "&:hover": onClick ? { boxShadow: 6 } : {} }}
      onClick={onClick}
    >
      <MDBox display="flex" alignItems="flex-start" justifyContent="space-between">
        <MDBox
          display="flex" alignItems="center" justifyContent="center"
          width={52} height={52} borderRadius="12px" bgColor={color} variant="gradient" shadow="md"
        >
          <Icon sx={{ color: "white", fontSize: 26 }}>{icon}</Icon>
        </MDBox>
      </MDBox>
      <MDBox mt={2}>
        <MDTypography variant="h4" fontWeight="bold">{value}</MDTypography>
        <MDTypography variant="button" fontWeight="bold" color="text">{title}</MDTypography>
        {subtitle && <MDTypography variant="caption" color="text" display="block" mt={0.5}>{subtitle}</MDTypography>}
      </MDBox>
    </Card>
  );
}

function SectionHeader({ icon, title, action, onAction }) {
  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
      <MDBox display="flex" alignItems="center" gap={1}>
        <Icon color="info">{icon}</Icon>
        <MDTypography variant="h6" fontWeight="bold">{title}</MDTypography>
      </MDBox>
      {action && (
        <MDButton variant="text" color="info" size="small" onClick={onAction}>
          {action} →
        </MDButton>
      )}
    </MDBox>
  );
}

export default function TeamDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([
      tasksAPI.getAll().catch(() => []),
      usersAPI.getAll().catch(() => []),
      notificationsAPI.getAll().catch(() => []),
    ]).then(([tasksRes, usersRes, notifRes]) => {
      const allTasks = Array.isArray(tasksRes?.data) ? tasksRes.data : Array.isArray(tasksRes) ? tasksRes : [];
      const allUsers = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes) ? usersRes : [];
      const allNotifs = Array.isArray(notifRes?.data) ? notifRes.data : Array.isArray(notifRes) ? notifRes : [];

      setTasks(allTasks);
      // Show employees (not admin/super_admin)
      setTeamMembers(allUsers.filter(u => ["employee", "team_leader"].includes(u.role) && u.status !== "inactive"));
      setNotifications(allNotifs.slice(0, 6));
      setLoading(false);
    });
  }, []);

  // ── Task stats ─────────────────────────────────────────────────────────────
  const myTasks = tasks.filter(t =>
    t.assigned_to === currentUser?.name || t.assigned_by === currentUser?.name
  );
  const pendingTasks    = myTasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const completedTasks  = myTasks.filter(t => t.status === "completed");
  const overdueTasks    = myTasks.filter(t => {
    if (!t.due_date || t.status === "completed") return false;
    return new Date(t.due_date) < new Date();
  });

  // All tasks my team is involved in
  const teamNames = teamMembers.map(u => u.name);
  const teamTasks = tasks.filter(t =>
    teamNames.includes(t.assigned_to) || teamNames.includes(t.assigned_by)
  );
  const teamPending   = teamTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const teamCompleted = teamTasks.filter(t => t.status === "completed").length;
  const teamTotal     = teamTasks.length;
  const completionRate = teamTotal > 0 ? Math.round((teamCompleted / teamTotal) * 100) : 0;

  // Recent tasks (last 8)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  // Upcoming due tasks (next 5)
  const upcomingTasks = tasks
    .filter(t => t.due_date && t.status !== "completed")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress color="info" />
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>

        {/* ── Welcome banner ───────────────────────────────────────────────── */}
        <Card sx={{ mb: 3, background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)", color: "white" }}>
          <MDBox p={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <MDBox>
              <MDTypography variant="h4" fontWeight="bold" sx={{ color: "white" }}>
                {greeting()}, {currentUser?.name?.split(" ")[0]} 👋
              </MDTypography>
              <MDTypography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
                Team Leader · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" gap={2} flexWrap="wrap">
              <MDButton variant="contained" sx={{ bgcolor: "white", color: "#1a73e8", "&:hover": { bgcolor: "#f5f5f5" } }}
                onClick={() => navigate("/tasks")}>
                <Icon sx={{ mr: 1 }}>task_alt</Icon> My Tasks
              </MDButton>
              <MDButton variant="outlined" sx={{ borderColor: "white", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
                onClick={() => navigate("/work-reports")}>
                <Icon sx={{ mr: 1 }}>summarize</Icon> Reports
              </MDButton>
            </MDBox>
          </MDBox>
        </Card>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon="task_alt" title="My Open Tasks" value={pendingTasks.length}
              subtitle={`${completedTasks.length} completed`} color="info"
              onClick={() => navigate("/tasks")} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon="warning" title="Overdue Tasks" value={overdueTasks.length}
              subtitle="Need attention" color={overdueTasks.length > 0 ? "error" : "success"}
              onClick={() => navigate("/tasks")} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon="groups" title="Team Members" value={teamMembers.length}
              subtitle={`${teamPending} active tasks`} color="warning"
              onClick={() => navigate("/work-reports")} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon="trending_up" title="Team Completion" value={`${completionRate}%`}
              subtitle={`${teamCompleted} of ${teamTotal} tasks done`} color="success"
              onClick={() => navigate("/work-reports")} />
          </Grid>
        </Grid>

        {/* ── Team progress bar ────────────────────────────────────────────── */}
        <Card sx={{ mb: 3, p: 3 }}>
          <SectionHeader icon="groups" title="Team Task Progress" action="View Reports" onAction={() => navigate("/work-reports")} />
          <MDBox display="flex" alignItems="center" gap={2} mb={1}>
            <LinearProgress
              variant="determinate"
              value={completionRate}
              sx={{ flex: 1, height: 10, borderRadius: 5,
                "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg, #1a73e8, #4caf50)" }
              }}
            />
            <MDTypography variant="button" fontWeight="bold" color="info" sx={{ minWidth: 40 }}>
              {completionRate}%
            </MDTypography>
          </MDBox>
          <MDBox display="flex" gap={3} mt={1} flexWrap="wrap">
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox width={10} height={10} borderRadius="50%" bgColor="warning" variant="gradient" />
              <MDTypography variant="caption" color="text">In Progress: {teamPending}</MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox width={10} height={10} borderRadius="50%" bgColor="success" variant="gradient" />
              <MDTypography variant="caption" color="text">Completed: {teamCompleted}</MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox width={10} height={10} borderRadius="50%" bgColor="secondary" variant="gradient" />
              <MDTypography variant="caption" color="text">Total: {teamTotal}</MDTypography>
            </MDBox>
          </MDBox>
        </Card>

        <Grid container spacing={3}>
          {/* ── Recent Tasks ─────────────────────────────────────────────── */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ p: 3 }}>
              <SectionHeader icon="format_list_bulleted" title="Recent Tasks" action="All Tasks" onAction={() => navigate("/tasks")} />
              {recentTasks.length === 0 ? (
                <MDBox textAlign="center" py={4}>
                  <Icon sx={{ fontSize: 40, color: "text.secondary" }}>task_alt</Icon>
                  <MDTypography variant="body2" color="text" mt={1}>No tasks yet</MDTypography>
                </MDBox>
              ) : (
                <ScrollableTable>
                <Table size="small">
                  <TableHead style={{ display: "table-header-group" }}>
                    <TableRow>
                      <TableCell><MDTypography variant="caption" fontWeight="bold" color="text">TASK</MDTypography></TableCell>
                      <TableCell><MDTypography variant="caption" fontWeight="bold" color="text">ASSIGNED TO</MDTypography></TableCell>
                      <TableCell><MDTypography variant="caption" fontWeight="bold" color="text">STATUS</MDTypography></TableCell>
                      <TableCell><MDTypography variant="caption" fontWeight="bold" color="text">PRIORITY</MDTypography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTasks.map(task => (
                      <TableRow key={task.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate("/tasks")}>
                        <TableCell>
                          <MDBox maxWidth={200}>
                            <MDTypography variant="caption" fontWeight="medium" sx={{
                              display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                              {task.task_number ? `[${task.task_number}] ` : ""}{task.title}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell>
                          <MDBox display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: "#1a73e8" }}>
                              {(task.assigned_to || "?").charAt(0)}
                            </Avatar>
                            <MDTypography variant="caption" color="text">
                              {(task.assigned_to || "Unassigned").split(" ")[0]}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell>
                          <Chip label={task.status || "pending"} size="small"
                            color={STATUS_COLORS[task.status] || "default"} />
                        </TableCell>
                        <TableCell>
                          <Chip label={task.priority || "medium"} size="small"
                            color={PRIORITY_COLORS[task.priority] || "default"} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </ScrollableTable>
              )}
            </Card>
          </Grid>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <Grid item xs={12} lg={5}>
            {/* Upcoming Due */}
            <Card sx={{ p: 3, mb: 3 }}>
              <SectionHeader icon="event" title="Due Soon" action="View All" onAction={() => navigate("/tasks")} />
              {upcomingTasks.length === 0 ? (
                <MDBox textAlign="center" py={2}>
                  <MDTypography variant="body2" color="text">No upcoming deadlines 🎉</MDTypography>
                </MDBox>
              ) : (
                <MDBox>
                  {upcomingTasks.map((task, i) => {
                    const dueDate = new Date(task.due_date);
                    const today = new Date();
                    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysLeft < 0;
                    return (
                      <MDBox key={task.id}>
                        {i > 0 && <Divider sx={{ my: 1 }} />}
                        <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                          <MDBox flex={1} minWidth={0}>
                            <MDTypography variant="caption" fontWeight="medium" sx={{
                              display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                              {task.title}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">{task.assigned_to || "Unassigned"}</MDTypography>
                          </MDBox>
                          <Chip
                            label={isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                            size="small"
                            color={isOverdue ? "error" : daysLeft <= 2 ? "warning" : "info"}
                          />
                        </MDBox>
                      </MDBox>
                    );
                  })}
                </MDBox>
              )}
            </Card>

            {/* Quick Links */}
            <Card sx={{ p: 3 }}>
              <SectionHeader icon="apps" title="Quick Links" />
              <Grid container spacing={1.5}>
                {[
                  { icon: "mail", label: "Mail", path: "/mail", color: "#1a73e8" },
                  { icon: "chat", label: "Messages", path: "/messenger", color: "#0097a7" },
                  { icon: "access_time", label: "Time Log", path: "/timeman", color: "#e65100" },
                  { icon: "summarize", label: "Reports", path: "/work-reports", color: "#2e7d32" },
                ].map(({ icon, label, path, color }) => (
                  <Grid item xs={4} key={path}>
                    <MDBox
                      display="flex" flexDirection="column" alignItems="center" gap={0.5}
                      p={1.5} borderRadius="lg" sx={{
                        cursor: "pointer", border: "1px solid rgba(0,0,0,0.08)",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.04)", transform: "translateY(-2px)", transition: "all 0.2s" }
                      }}
                      onClick={() => navigate(path)}
                    >
                      <Icon sx={{ color, fontSize: 28 }}>{icon}</Icon>
                      <MDTypography variant="caption" fontWeight="medium" textAlign="center">{label}</MDTypography>
                    </MDBox>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        </Grid>

        {/* ── Team Members ────────────────────────────────────────────────────── */}
        {teamMembers.length > 0 && (
          <Card sx={{ mt: 3, p: 3 }}>
            <SectionHeader icon="badge" title="Team Members" action="Work Reports" onAction={() => navigate("/work-reports")} />
            <Grid container spacing={2}>
              {teamMembers.slice(0, 8).map(member => {
                const memberTasks = tasks.filter(t => t.assigned_to === member.name);
                const done = memberTasks.filter(t => t.status === "completed").length;
                const active = memberTasks.filter(t => t.status === "in_progress" || t.status === "pending").length;
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
                    <MDBox
                      p={2} borderRadius="lg" sx={{
                        border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer",
                        "&:hover": { boxShadow: 3, bgcolor: "rgba(0,0,0,0.02)" }
                      }}
                      onClick={() => navigate("/work-reports")}
                    >
                      <MDBox display="flex" alignItems="center" gap={1.5} mb={1}>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: "#1a73e8", fontSize: 14 }}>
                          {member.name?.charAt(0) || "?"}
                        </Avatar>
                        <MDBox flex={1} minWidth={0}>
                          <MDTypography variant="caption" fontWeight="bold" sx={{
                            display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                          }}>
                            {member.name}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" sx={{ fontSize: "0.65rem" }}>
                            {member.department || member.role?.replace("_", " ") || "—"}
                          </MDTypography>
                        </MDBox>
                      </MDBox>
                      <MDBox display="flex" gap={1}>
                        <Chip label={`${active} active`} size="small" color="info" variant="outlined"
                          sx={{ fontSize: "0.6rem", height: 20 }} />
                        <Chip label={`${done} done`} size="small" color="success" variant="outlined"
                          sx={{ fontSize: "0.6rem", height: 20 }} />
                      </MDBox>
                    </MDBox>
                  </Grid>
                );
              })}
            </Grid>
          </Card>
        )}

      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
