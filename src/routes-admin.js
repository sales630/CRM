/* eslint-disable */
/**
 * ADMIN ROUTES — full access to every section.
 * Used when currentUser.role === "admin" or "super_admin".
 */
import Dashboard from "layouts/dashboard";
import Notifications from "layouts/notifications";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import CRMLeads from "layouts/crm";
import CRMDeals from "layouts/deals";
import CRMContacts from "layouts/contacts";
import CRMCompanies from "layouts/companies";
import CRMAnalytics from "layouts/analytics";
import StreamFeed from "layouts/stream";
import Tasks from "layouts/tasks";
import WorkReports from "layouts/work-reports";
import Workflows from "layouts/workflows";
import Workgroups from "layouts/workgroups";
import MailPage from "layouts/mail";
import Messenger from "layouts/messenger";
import UsersPage from "layouts/users";
import AdminDashboard from "layouts/admin-dashboard";
import SuperAdminPanel from "layouts/super-admin";
import TimeManagement from "layouts/timeman";
import ControlPanel from "layouts/control-panel";
import Projects from "layouts/projects";
import HRStructure from "layouts/hr-structure";
import EmployeesPage from "layouts/employees";
import DevOps from "layouts/devops";
import Automation from "layouts/automation";
import AdminLogs from "layouts/admin-logs";
import RolePermissions from "layouts/role-permissions";
import PaymentLimits from "layouts/payment-limits";
import Icon from "@mui/material/Icon";

const adminRoutes = [
  // ── Main ──────────────────────────────────────────────────────────────────
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },

  // ── CRM Section ───────────────────────────────────────────────────────────
  { type: "title", title: "CRM", key: "crm-title" },
  {
    type: "collapse",
    name: "Leads",
    key: "crm-leads",
    icon: <Icon fontSize="small">people</Icon>,
    route: "/crm/leads",
    component: <CRMLeads />,
  },
  {
    type: "collapse",
    name: "Deals",
    key: "crm-deals",
    icon: <Icon fontSize="small">monetization_on</Icon>,
    route: "/crm/deals",
    component: <CRMDeals />,
  },
  {
    type: "collapse",
    name: "Contacts",
    key: "crm-contacts",
    icon: <Icon fontSize="small">contacts</Icon>,
    route: "/crm/contacts",
    component: <CRMContacts />,
  },
  {
    type: "collapse",
    name: "Companies",
    key: "crm-companies",
    icon: <Icon fontSize="small">business</Icon>,
    route: "/crm/companies",
    component: <CRMCompanies />,
  },
  {
    type: "collapse",
    name: "HR Structure",
    key: "hr-structure",
    icon: <Icon fontSize="small">corporate_fare</Icon>,
    route: "/crm/hr-structure",
    component: <HRStructure />,
  },
  {
    type: "collapse",
    name: "Employees",
    key: "employees",
    icon: <Icon fontSize="small">badge</Icon>,
    route: "/employees",
    component: <EmployeesPage />,
  },
  {
    type: "collapse",
    name: "Analytics",
    key: "crm-analytics",
    icon: <Icon fontSize="small">bar_chart</Icon>,
    route: "/crm/analytics",
    component: <CRMAnalytics />,
  },
  {
    type: "collapse",
    name: "Stream",
    key: "crm-stream",
    icon: <Icon fontSize="small">dynamic_feed</Icon>,
    route: "/crm/stream",
    component: <StreamFeed />,
  },

  { type: "divider", key: "divider-1" },

  // ── Collaboration ─────────────────────────────────────────────────────────
  { type: "title", title: "Collaboration", key: "collab-title" },
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
    name: "Tasks",
    key: "tasks",
    icon: <Icon fontSize="small">task_alt</Icon>,
    route: "/tasks",
    component: <Tasks />,
  },
  {
    type: "collapse",
    name: "Workgroups",
    key: "workgroups",
    icon: <Icon fontSize="small">group_work</Icon>,
    route: "/workgroups",
    component: <Workgroups />,
  },
  {
    type: "collapse",
    name: "Workflows",
    key: "workflows",
    icon: <Icon fontSize="small">account_tree</Icon>,
    route: "/workflows",
    component: <Workflows />,
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
    name: "Time Management",
    key: "timeman",
    icon: <Icon fontSize="small">access_time</Icon>,
    route: "/timeman",
    component: <TimeManagement />,
  },
  {
    type: "collapse",
    name: "Mail",
    key: "mail",
    icon: <Icon fontSize="small">mail</Icon>,
    route: "/mail",
    component: <MailPage />,
  },

  { type: "divider", key: "divider-2" },

  // ── Admin Section ─────────────────────────────────────────────────────────
  { type: "title", title: "Admin Panel", key: "admin-title" },
  {
    type: "collapse",
    name: "Admin Dashboard",
    key: "admin-dashboard",
    icon: <Icon fontSize="small">admin_panel_settings</Icon>,
    route: "/admin/dashboard",
    component: <AdminDashboard />,
  },
  {
    type: "collapse",
    name: "Users & Roles",
    key: "users-roles",
    icon: <Icon fontSize="small">manage_accounts</Icon>,
    route: "/admin/users",
    component: <UsersPage />,
  },
  {
    type: "collapse",
    name: "Super Admin",
    key: "super-admin",
    icon: <Icon fontSize="small">security</Icon>,
    route: "/super-admin",
    component: <SuperAdminPanel />,
  },
  {
    type: "collapse",
    name: "Control Panel",
    key: "control-panel",
    icon: <Icon fontSize="small">settings_applications</Icon>,
    route: "/control-panel",
    component: <ControlPanel />,
  },
  {
    type: "collapse",
    name: "Projects & Rules",
    key: "projects",
    icon: <Icon fontSize="small">folder_special</Icon>,
    route: "/projects",
    component: <Projects />,
  },
  {
    type: "collapse",
    name: "Activity Logs",
    key: "admin-logs",
    icon: <Icon fontSize="small">history</Icon>,
    route: "/admin/logs",
    component: <AdminLogs />,
  },
  {
    type: "collapse",
    name: "Payment Limits",
    key: "payment-limits",
    icon: <Icon fontSize="small">account_balance_wallet</Icon>,
    route: "/admin/payment-limits",
    component: <PaymentLimits />,
  },
  {
    type: "collapse",
    name: "Role Permissions",
    key: "role-permissions",
    icon: <Icon fontSize="small">lock_person</Icon>,
    route: "/admin/role-permissions",
    component: <RolePermissions />,
  },
  {
    type: "collapse",
    name: "Task Automation",
    key: "automation",
    icon: <Icon fontSize="small">bolt</Icon>,
    route: "/automation",
    component: <Automation />,
  },
  {
    type: "collapse",
    name: "Developer Resources",
    key: "devops",
    icon: <Icon fontSize="small">developer_mode</Icon>,
    route: "/devops",
    component: <DevOps />,
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

  // ── Auth (hidden from sidebar) ─────────────────────────────────────────────
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

export default adminRoutes;
