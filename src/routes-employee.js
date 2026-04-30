/* eslint-disable */
/**
 * EMPLOYEE ROUTES — minimal focused view for individual contributors.
 * Used when currentUser.role === "employee".
 */
import Dashboard from "layouts/dashboard";
import Notifications from "layouts/notifications";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import Tasks from "layouts/tasks";
import Messenger from "layouts/messenger";
import TimeManagement from "layouts/timeman";
import StreamFeed from "layouts/stream";
import WorkReports from "layouts/work-reports";
import Workgroups from "layouts/workgroups";
import Icon from "@mui/material/Icon";

const employeeRoutes = [
  // ── Main ──────────────────────────────────────────────────────────────────
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },

  { type: "divider", key: "divider-1" },

  // ── My Workspace ──────────────────────────────────────────────────────────
  { type: "title", title: "My Workspace", key: "workspace-title" },
  {
    type: "collapse",
    name: "Stream",
    key: "crm-stream",
    icon: <Icon fontSize="small">dynamic_feed</Icon>,
    route: "/crm/stream",
    component: <StreamFeed />,
  },
  {
    type: "collapse",
    name: "My Tasks",
    key: "tasks",
    icon: <Icon fontSize="small">task_alt</Icon>,
    route: "/tasks",
    component: <Tasks />,
  },
  {
    type: "collapse",
    name: "Messenger",
    key: "messenger",
    icon: <Icon fontSize="small">chat</Icon>,
    route: "/messenger",
    component: <Messenger />,
  },
  {
    type: "collapse",
    name: "Time Management",
    key: "timeman",
    icon: <Icon fontSize="small">access_time</Icon>,
    route: "/timeman",
    component: <TimeManagement />,
  },
  {
    type: "collapse",
    name: "Work Reports",
    key: "work-reports",
    icon: <Icon fontSize="small">summarize</Icon>,
    route: "/work-reports",
    component: <WorkReports />,
  },
  {
    type: "collapse",
    name: "Workgroups",
    key: "workgroups",
    icon: <Icon fontSize="small">group_work</Icon>,
    route: "/workgroups",
    component: <Workgroups />,
  },

  { type: "divider", key: "divider-2" },

  // ── Account ───────────────────────────────────────────────────────────────
  { type: "title", title: "Account", key: "account-title" },
  {
    type: "collapse",
    name: "Notifications",
    key: "notifications",
    icon: <Icon fontSize="small">notifications</Icon>,
    route: "/notifications",
    component: <Notifications />,
  },
  {
    type: "collapse",
    name: "Profile",
    key: "profile",
    icon: <Icon fontSize="small">person</Icon>,
    route: "/profile",
    component: <Profile />,
  },

  // ── Auth (hidden) ──────────────────────────────────────────────────────────
  {
    type: "hidden",
    key: "sign-in",
    route: "/authentication/sign-in",
    component: <SignIn />,
  },
  {
    type: "hidden",
    key: "sign-up",
    route: "/authentication/sign-up",
    component: <SignUp />,
  },
];

export default employeeRoutes;
