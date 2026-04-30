/* eslint-disable */
import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import "./Global.css";

// ── Role-based route sets ──────────────────────────────────────────────────
import adminRoutes       from "routes-admin";
import teamLeaderRoutes  from "routes-teamleader";
import employeeRoutes    from "routes-employee";
import { rolePermissionsAPI } from "services/api";

import { useMaterialUIController, setMiniSidenav, setOpenConfigurator } from "context";
import { AuthProvider, useAuth } from "context/AuthContext";
import { CallProvider } from "context/CallContext";
import CallWindow from "components/CallWindow";
import IncomingCallDialog from "components/IncomingCallDialog";

import brandWhite from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

// ── Auth pages ─────────────────────────────────────────────────────────────
const AUTH_PATHS = ["/authentication/sign-in", "/authentication/sign-up"];

// ── Home page per role ─────────────────────────────────────────────────────
function getHomeForRole(role) {
  if (role === "super_admin") return "/admin/dashboard";
  if (role === "admin")       return "/admin/dashboard";
  if (role === "team_leader") return "/team/dashboard";
  return "/dashboard"; // employee + default
}

// ── Route set per role ─────────────────────────────────────────────────────
function getRoutesForRole(role) {
  if (role === "super_admin" || role === "admin") return adminRoutes;
  if (role === "team_leader")                      return teamLeaderRoutes;
  return employeeRoutes;
}

// ── Sidebar brand name per role ────────────────────────────────────────────
function getBrandName(role) {
  if (role === "super_admin" || role === "admin") return "Back Office CRM";
  if (role === "team_leader")                      return "Team Portal";
  return "My Workspace";
}

// ── Protected route wrapper ────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/authentication/sign-in" state={{ from: location }} replace />;
  }
  return children;
}

// ── Auth pages — redirect away if already logged in ────────────────────────
function AuthRoute({ children }) {
  const { isAuthenticated, loading, currentUser } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to={getHomeForRole(currentUser?.role)} replace />;
  }
  return children;
}

function AppInner() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav, direction, layout, openConfigurator,
    sidenavColor, transparentSidenav, whiteSidenav, darkMode,
  } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();
  const { isAuthenticated, currentUser } = useAuth();
  const [rolePerms, setRolePerms] = useState(null);

  // ── Fetch role permissions when authenticated ─────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    rolePermissionsAPI.getAll()
      .then(res => setRolePerms(res.data || null))
      .catch(() => setRolePerms(null));
  }, [isAuthenticated]);

  // ── Pick the right routes for the current user's role ─────────────────────
  const activeRoutes = useMemo(() => {
    const role = currentUser?.role;
    const base = getRoutesForRole(role);
    // Admin / super_admin always get everything
    if (role === "admin" || role === "super_admin") return base;
    // For team_leader / employee, filter by stored permissions
    if (rolePerms && (role === "team_leader" || role === "employee")) {
      const allowed = new Set(rolePerms[role] || []);
      // Always keep auth/hidden routes, account pages (notifications, profile), and non-collapse items
      return base.filter(r =>
        r.type !== "collapse" ||
        ["notifications","profile"].includes(r.key) ||
        allowed.has(r.key)
      );
    }
    return base;
  }, [currentUser?.role, rolePerms]);

  useMemo(() => {
    const cacheRtl = createCache({ key: "rtl", stylisPlugins: [rtlPlugin] });
    setRtlCache(cacheRtl);
  }, []);

  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  useEffect(() => { document.body.setAttribute("dir", direction); }, [direction]);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  // ── Build <Route> elements from a route array ─────────────────────────────
  const buildRoutes = (routeList) =>
    routeList
      .filter(route => route.route)
      .map((route) => {
        const isAuthPage = AUTH_PATHS.includes(route.route);
        return (
          <Route
            exact
            path={route.route}
            element={
              isAuthPage
                ? <AuthRoute>{route.component}</AuthRoute>
                : <ProtectedRoute>{route.component}</ProtectedRoute>
            }
            key={route.key}
          />
        );
      });

  const configsButton = (
    <MDBox
      display="flex" justifyContent="center" alignItems="center"
      width="3.25rem" height="3.25rem" bgColor="white" shadow="sm"
      borderRadius="50%" position="fixed" right="2rem" bottom="2rem"
      zIndex={99} color="dark" sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="small" color="inherit">settings</Icon>
    </MDBox>
  );

  const isAuthPage = AUTH_PATHS.includes(pathname);
  const showSidenav = layout === "dashboard" && isAuthenticated && !isAuthPage;
  const homeRoute   = getHomeForRole(currentUser?.role);
  const brandName   = getBrandName(currentUser?.role);

  const content = (
    <>
      <CssBaseline />
      {showSidenav && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={(transparentSidenav && !darkMode) || whiteSidenav ? brandDark : brandWhite}
            brandName={brandName}
            routes={activeRoutes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Routes>
        {buildRoutes(activeRoutes)}
        {/* Catch-all: send to role home or sign-in */}
        <Route
          path="*"
          element={
            isAuthenticated
              ? <Navigate to={homeRoute} replace />
              : <Navigate to="/authentication/sign-in" replace />
          }
        />
      </Routes>
    </>
  );

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        {content}
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      {content}
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <AppInner />
        <CallWindow />
        <IncomingCallDialog />
      </CallProvider>
    </AuthProvider>
  );
}
