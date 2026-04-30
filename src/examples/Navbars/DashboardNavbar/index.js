/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import NotificationItem from "examples/Items/NotificationItem";
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";
import {
  useMaterialUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";
import { useAuth } from "context/AuthContext";
import { useCall } from "context/CallContext";
import { timemanAPI } from "services/api";
import Tooltip from "@mui/material/Tooltip";
import { Videocam, Call, People } from "@mui/icons-material";

const ROLE_COLORS = {
  super_admin: "error",
  admin: "warning",
  team_leader: "info",
  employee: "success",
};

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator, darkMode } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [callMenuAnchor, setCallMenuAnchor] = useState(null);
  const [clockStatus, setClockStatus] = useState(null);
  const { connected, onlineUsers, startCall, callState } = useCall();
  const [clockLoading, setClockLoading] = useState(false);
  const route = useLocation().pathname.split("/").slice(1);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Live elapsed time ticker
  const [elapsed, setElapsed] = useState("");
  const timerRef = useRef(null);

  // Live current time clock
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  function calcElapsed(clockInTime) {
    if (!clockInTime) return "";
    const diff = Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
    if (diff < 0) return "0:00:00";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Load clock status
  const loadClockStatus = useCallback(async () => {
    try { const s = await timemanAPI.myStatus(); setClockStatus(s); } catch {}
  }, []);

  useEffect(() => {
    loadClockStatus();
    const t = setInterval(loadClockStatus, 60000);
    return () => clearInterval(t);
  }, [loadClockStatus]);

  // Start/stop live ticker based on clock status
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (clockStatus?.is_clocked_in && clockStatus?.clock_in_time) {
      setElapsed(calcElapsed(clockStatus.clock_in_time));
      timerRef.current = setInterval(() => {
        setElapsed(calcElapsed(clockStatus.clock_in_time));
      }, 1000);
    } else {
      setElapsed("");
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [clockStatus]);

  const handleQuickClock = async () => {
    setClockLoading(true);
    try {
      if (clockStatus?.is_clocked_in) {
        await timemanAPI.clockOut({});
      } else {
        await timemanAPI.clockIn({ user_name: currentUser?.name, department: currentUser?.department });
      }
      await loadClockStatus();
    } catch (e) { console.error(e); }
    finally { setClockLoading(false); }
  };

  useEffect(() => {
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }
    window.addEventListener("scroll", handleTransparentNavbar);
    handleTransparentNavbar();
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);
  const handleOpenUserMenu = (event) => setUserMenuAnchor(event.currentTarget);
  const handleCloseUserMenu = () => setUserMenuAnchor(null);

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate("/authentication/sign-in");
  };

  const iconsStyle = ({ palette: { dark, white, text }, functions: { rgba } }) => ({
    color: () => {
      let colorValue = light || darkMode ? white.main : dark.main;
      if (transparentNavbar && !light) {
        colorValue = darkMode ? rgba(text.main, 0.6) : text.main;
      }
      return colorValue;
    },
  });

  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
    >
      <NotificationItem icon={<Icon>email</Icon>} title="Check new messages" />
      <NotificationItem icon={<Icon>podcasts</Icon>} title="Manage Podcast sessions" />
      <NotificationItem icon={<Icon>shopping_cart</Icon>} title="Payment successfully completed" />
    </Menu>
  );

  // User dropdown menu
  const renderUserMenu = () => (
    <Menu
      anchorEl={userMenuAnchor}
      open={Boolean(userMenuAnchor)}
      onClose={handleCloseUserMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      sx={{ mt: 1 }}
      PaperProps={{
        sx: { minWidth: 220, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
      }}
    >
      {/* User info header */}
      <MDBox px={2} py={1.5} display="flex" alignItems="center" gap={1.5}>
        <Avatar
          sx={{
            width: 42,
            height: 42,
            bgcolor: `${ROLE_COLORS[currentUser?.role] || "info"}.main`,
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          {currentUser?.name?.charAt(0) || "?"}
        </Avatar>
        <MDBox>
          <MDTypography variant="button" fontWeight="bold" display="block">
            {currentUser?.name || "User"}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block">
            {currentUser?.email || ""}
          </MDTypography>
          <Chip
            label={(currentUser?.role || "").replace("_", " ")}
            size="small"
            color={ROLE_COLORS[currentUser?.role] || "info"}
            sx={{ mt: 0.3, height: 18, fontSize: "10px", textTransform: "capitalize" }}
          />
        </MDBox>
      </MDBox>

      <Divider sx={{ my: 0.5 }} />

      <MenuItem
        onClick={() => { handleCloseUserMenu(); navigate("/profile"); }}
        sx={{ gap: 1.5, py: 1 }}
      >
        <Icon fontSize="small" sx={{ color: "text.secondary" }}>person</Icon>
        <MDTypography variant="button">My Profile</MDTypography>
      </MenuItem>

      <MenuItem
        onClick={() => { handleCloseUserMenu(); navigate("/timeman"); }}
        sx={{ gap: 1.5, py: 1 }}
      >
        <Icon fontSize="small" sx={{ color: "text.secondary" }}>access_time</Icon>
        <MDTypography variant="button">Time Management</MDTypography>
      </MenuItem>

      {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && (
        <MenuItem
          onClick={() => { handleCloseUserMenu(); navigate("/admin/dashboard"); }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <Icon fontSize="small" sx={{ color: "text.secondary" }}>admin_panel_settings</Icon>
          <MDTypography variant="button">Admin Dashboard</MDTypography>
        </MenuItem>
      )}

      {currentUser?.role === "super_admin" && (
        <MenuItem
          onClick={() => { handleCloseUserMenu(); navigate("/super-admin"); }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <Icon fontSize="small" sx={{ color: "text.secondary" }}>security</Icon>
          <MDTypography variant="button">Super Admin Panel</MDTypography>
        </MenuItem>
      )}

      {currentUser?.role === "super_admin" && (
        <MenuItem
          onClick={() => { handleCloseUserMenu(); navigate("/control-panel"); }}
          sx={{ gap: 1.5, py: 1 }}
        >
          <Icon fontSize="small" sx={{ color: "text.secondary" }}>settings_applications</Icon>
          <MDTypography variant="button">Control Panel</MDTypography>
        </MenuItem>
      )}

      <Divider sx={{ my: 0.5 }} />

      <MenuItem
        onClick={handleLogout}
        sx={{ gap: 1.5, py: 1, color: "error.main" }}
      >
        <Icon fontSize="small" color="error">logout</Icon>
        <MDTypography variant="button" color="error" fontWeight="bold">
          Logout
        </MDTypography>
      </MenuItem>
    </Menu>
  );

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light, darkMode })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <MDBox
          color="inherit"
          mb={{ xs: 1, md: 0 }}
          sx={(theme) => navbarRow(theme, { isMini: true })}
        >
          <IconButton
            size="small"
            disableRipple
            color="inherit"
            sx={navbarMobileMenu}
            onClick={handleMiniSidenav}
          >
            <Icon sx={iconsStyle} fontSize="medium">
              {miniSidenav ? "menu_open" : "menu"}
            </Icon>
          </IconButton>
          {/* Breadcrumb */}
          <MDBox>
            {route.map((r, i) => (
              <MDTypography
                key={r}
                component="span"
                variant="caption"
                color="text"
                sx={{ textTransform: "capitalize", mx: 0.5 }}
              >
                {i > 0 && "/ "}
                {r.replace(/-/g, " ")}
              </MDTypography>
            ))}
          </MDBox>
        </MDBox>

        {isMini ? null : (
          <MDBox sx={(theme) => navbarRow(theme, { isMini })}>
            <MDBox color={light ? "white" : "inherit"} display="flex" alignItems="center" gap={0.5}>

              {/* ── WebSocket connection status ── */}
              <Tooltip title={connected ? `Signaling connected — ${onlineUsers.length} user(s) online` : "Signaling server disconnected — restart backend"}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 1, py: 0.4, borderRadius: "12px", bgcolor: connected ? "#e8f5e9" : "#ffebee", border: `1px solid ${connected ? "#a5d6a7" : "#ef9a9a"}`, mr: 0.5, cursor: "default" }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: connected ? "#4caf50" : "#f44336", animation: connected ? "none" : "blink 1s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.2 } } }} />
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: connected ? "#2e7d32" : "#c62828" }}>{connected ? "Online" : "Offline"}</Typography>
                </Box>
              </Tooltip>

              {/* ── Bitrix24-style Clock In / Out widget ── */}
              {clockStatus?.is_clocked_in ? (
                /* ── WORKING state: green pill + orange stop button ── */
                <Box
                  display="flex"
                  alignItems="stretch"
                  sx={{
                    borderRadius: "18px",
                    overflow: "hidden",
                    mr: 0.75,
                    boxShadow: "0 2px 8px rgba(33,160,56,0.30)",
                    opacity: clockLoading ? 0.75 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Green left part — time + label */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={0.8}
                    sx={{
                      bgcolor: "#21a038",
                      pl: 1.1,
                      pr: 0.9,
                      py: "5px",
                    }}
                  >
                    {/* Pulsing white dot */}
                    <Box sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: "#fff",
                      flexShrink: 0,
                      animation: "bx-pulse 1.6s ease-in-out infinite",
                      "@keyframes bx-pulse": {
                        "0%,100%": { opacity: 1, transform: "scale(1)" },
                        "50%": { opacity: 0.45, transform: "scale(0.8)" },
                      },
                    }} />

                    {/* Time + WORKING */}
                    <Box>
                      <Typography sx={{
                        color: "#fff",
                        fontSize: "0.76rem",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        lineHeight: 1.15,
                        letterSpacing: "0.6px",
                      }}>
                        {elapsed || "0:00:00"}
                      </Typography>
                      <Typography sx={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: "0.52rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        lineHeight: 1,
                      }}>
                        Working
                      </Typography>
                    </Box>
                  </Box>

                  {/* Divider line between green + orange */}
                  <Box sx={{ width: "1px", bgcolor: "rgba(255,255,255,0.25)", flexShrink: 0 }} />

                  {/* Orange right part — stop button */}
                  <Tooltip title="Finish working day" placement="bottom">
                    <Box
                      onClick={!clockLoading ? handleQuickClock : undefined}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        bgcolor: "#f97316",
                        px: 1,
                        cursor: clockLoading ? "default" : "pointer",
                        transition: "background 0.15s",
                        "&:hover": { bgcolor: "#ea6b10" },
                      }}
                    >
                      <Icon sx={{ fontSize: "15px !important", color: "#fff", display: "block" }}>
                        stop
                      </Icon>
                    </Box>
                  </Tooltip>
                </Box>
              ) : (
                /* ── NOT WORKING state: green Start button ── */
                <Tooltip title="Start working day" placement="bottom">
                  <Box
                    onClick={!clockLoading ? handleQuickClock : undefined}
                    display="flex"
                    alignItems="center"
                    gap={0.55}
                    sx={{
                      bgcolor: "#21a038",
                      borderRadius: "18px",
                      px: 1.4,
                      py: "5px",
                      cursor: clockLoading ? "default" : "pointer",
                      mr: 0.75,
                      opacity: clockLoading ? 0.75 : 1,
                      transition: "all 0.15s",
                      boxShadow: "0 2px 6px rgba(33,160,56,0.30)",
                      "&:hover": { bgcolor: "#1a8a30", boxShadow: "0 3px 10px rgba(33,160,56,0.4)" },
                    }}
                  >
                    <Icon sx={{ fontSize: "14px !important", color: "#fff" }}>play_arrow</Icon>
                    <Typography sx={{
                      color: "#fff",
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      lineHeight: 1,
                    }}>
                      Start
                    </Typography>
                  </Box>
                </Tooltip>
              )}
              {/* ── Online Users / Quick Call ── */}
              <Tooltip title="Call a team member">
                <IconButton size="small" onClick={(e) => setCallMenuAnchor(e.currentTarget)}
                  sx={{ ...navbarIconButton, position: "relative" }}>
                  <People sx={{ fontSize: 20, ...iconsStyle({ palette: { dark: { main: "#344767" }, white: { main: "#fff" }, text: { main: "#344767" } }, functions: { rgba: (c) => c } }) }} />
                  {onlineUsers.filter(u => u.userId !== String(currentUser?.id)).length > 0 && (
                    <Box sx={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", bgcolor: "#4caf50", border: "1.5px solid #fff" }} />
                  )}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={callMenuAnchor}
                open={Boolean(callMenuAnchor)}
                onClose={() => setCallMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{ mt: 1 }}
                PaperProps={{ sx: { minWidth: 260, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
              >
                <Box px={2} pt={1.5} pb={0.5}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.5px" }}>
                    Online Team Members ({onlineUsers.filter(u => u.userId !== String(currentUser?.id)).length})
                  </Typography>
                </Box>
                {onlineUsers.filter(u => u.userId !== String(currentUser?.id)).length === 0 && (
                  <Box px={2} py={1.5}>
                    <Typography variant="body2" color="text.secondary" fontSize="0.78rem">No other users online</Typography>
                  </Box>
                )}
                {onlineUsers.filter(u => u.userId !== String(currentUser?.id)).map(u => (
                  <Box key={u.userId} sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.75, gap: 1, "&:hover": { bgcolor: "#f5f7fa" } }}>
                    <Box sx={{ position: "relative" }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, bgcolor: "#1976d2" }}>{(u.userName||"?")[0].toUpperCase()}</Avatar>
                      <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", bgcolor: "#4caf50", border: "1.5px solid #fff" }} />
                    </Box>
                    <Typography sx={{ flex: 1, fontSize: "0.82rem", fontWeight: 600 }}>{u.userName}</Typography>
                    <Tooltip title="Video call"><IconButton size="small" onClick={() => { startCall(u, "video"); setCallMenuAnchor(null); }} disabled={callState !== "idle"} sx={{ color: "#1976d2", p: 0.5 }}><Videocam sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title="Audio call"><IconButton size="small" onClick={() => { startCall(u, "audio"); setCallMenuAnchor(null); }} disabled={callState !== "idle"} sx={{ color: "#388e3c", p: 0.5 }}><Call sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  </Box>
                ))}
              </Menu>

              {/* User Avatar + Logout Dropdown */}
              <IconButton
                size="small"
                disableRipple
                onClick={handleOpenUserMenu}
                sx={{
                  ...navbarIconButton,
                  ml: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  borderRadius: "8px",
                  px: 1,
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: 13,
                    bgcolor: `${ROLE_COLORS[currentUser?.role] || "info"}.main`,
                  }}
                >
                  {currentUser?.name?.charAt(0) || "?"}
                </Avatar>
                <MDBox sx={{ display: { xs: "none", md: "block" }, textAlign: "left" }}>
                  <MDTypography variant="caption" fontWeight="bold" display="block" lineHeight={1.2}>
                    {currentUser?.name?.split(" ")[0] || "User"}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" sx={{ fontSize: "10px", textTransform: "capitalize" }}>
                    {(currentUser?.role || "").replace("_", " ")}
                  </MDTypography>
                </MDBox>
                <Icon sx={{ fontSize: "16px !important", color: "text.secondary" }}>expand_more</Icon>
              </IconButton>
              {renderUserMenu()}
            </MDBox>
          </MDBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
