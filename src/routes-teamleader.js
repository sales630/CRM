/* eslint-disable */
/**
 * TEAM LEADER ROUTES — focused on operations and people management.
 * Used when currentUser.role === "team_leader".
 */
import TeamDashboard from "layouts/team-dashboard";
import Notifications from "layouts/notifications";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import Tasks from "layouts/tasks";
import WorkReports from "layouts/work-reports";
import MailPage from "layouts/mail";
import Messenger from "layouts/messenger";
import TimeManagement from "layouts/timeman";
import Workgroups from "layouts/workgroups";
import StreamFeed from "layouts/stream";
import Icon from "@mui/material/Icon";

const teamLeaderRoutes = [
  // ── Main ──────────────────────────────────────────────────────────────────
  {
    type: "collapse",
    name: "Team Dashboard",
    key: "team-dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/team/dashboard",
    component: <TeamDashboard />,
  },

  { type: "divider", key: "divider-1" },

  // ── My Work ───────────────────────────────────────────────────────────────
  { type: "title", title: "My Work", key: "mywork-title" },
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
    name: "Tasks",
    key: "tasks",
    icon: <Icon fontSize="small">task_alt</Icon>,
    route: "/tasks",
    component: <Tasks />,
  },
  {
    type: "collapse",
    name: "Mail",
    key: "mail",
    icon: <Icon fontSize="small">mail</Icon>,
    route: "/mail",
    component: <MailPage />,
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

  { type: "divider", key: "divider-2" },

  // ── Team ──────────────────────────────────────────────────────────────────
  { type: "title", title: "Team", key: "team-title" },
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

  { type: "divider", key: "divider-3" },

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

export default teamLeaderRoutes;
