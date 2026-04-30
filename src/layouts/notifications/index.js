/* eslint-disable */
import { useState, useEffect, useCallback } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAuth } from "context/AuthContext";
import { notificationsAPI } from "services/api";

const TYPE_CONFIG = {
  chat_message:    { icon: "chat",              color: "info",      label: "Message"      },
  task_assigned:   { icon: "task_alt",          color: "success",   label: "Task"         },
  task_created:    { icon: "add_task",          color: "success",   label: "Task Created" },
  task_due:        { icon: "schedule",          color: "warning",   label: "Due Soon"     },
  task_completed:  { icon: "check_circle",      color: "success",   label: "Completed"    },
  email_task:      { icon: "mark_email_read",   color: "info",      label: "Email Task"   },
  lead:            { icon: "person_add",        color: "primary",   label: "Lead"         },
  deal:            { icon: "handshake",         color: "success",   label: "Deal"         },
  invoice:         { icon: "receipt",           color: "warning",   label: "Invoice"      },
  call:            { icon: "call",              color: "error",     label: "Call"         },
  mention:         { icon: "alternate_email",   color: "primary",   label: "Mention"      },
  reminder:        { icon: "alarm",             color: "warning",   label: "Reminder"     },
  system:          { icon: "info",              color: "secondary", label: "System"       },
  automation:      { icon: "bolt",              color: "warning",   label: "Automation"   },
  default:         { icon: "notifications",     color: "info",      label: "Notice"       },
};

// ── Decode raw JSON messages into human-readable strings (client-side safety net)
function decodeMessage(raw) {
  if (!raw || typeof raw !== "string") return raw || "Notification";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return raw;

  let parsed;
  try { parsed = JSON.parse(trimmed); } catch { return raw; }

  // Heartbeat: { userId, userName, ts }
  if (parsed.userId && parsed.userName) return `${parsed.userName} is online`;

  // WebRTC call signal
  if (parsed.signalType) {
    const name = parsed.fromName || "Someone";
    const map = {
      "call-offer":    `📞 Incoming call from ${name}`,
      "call-answer":   `📞 ${name} answered the call`,
      "call-reject":   `📞 ${name} declined the call`,
      "call-rejected": `📞 ${name} declined the call`,
      "call-ended":    `📞 Call ended — ${name}`,
      "call-end":      `📞 Call ended — ${name}`,
      "call-busy":     `📞 ${name} is busy right now`,
    };
    return map[parsed.signalType] || `📞 Call event from ${name}`;
  }

  // User presence broadcasts
  if (parsed.type === "user-joined") return `👤 ${parsed.userName || "User"} came online`;
  if (parsed.type === "user-left")   return `👤 ${parsed.userName || "User"} went offline`;

  // Generic: try common text fields
  return parsed.message || parsed.text || parsed.title || parsed.body
    || Object.entries(parsed)
         .filter(([k]) => !["id","ts","payload","from","userId"].includes(k))
         .map(([k,v]) => `${k}: ${v}`)
         .join(" · ");
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationRow({ notif, onMarkRead, onDelete }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
  // Always decode message — server does it too but this is the safety net
  const displayMessage = decodeMessage(notif.message) || notif.title || "Notification";

  return (
    <MDBox
      display="flex"
      alignItems="flex-start"
      gap={2}
      py={1.5}
      px={2}
      sx={{
        borderRadius: 2,
        bgcolor: notif.read ? "transparent" : "rgba(25,118,210,0.05)",
        borderLeft: notif.read ? "3px solid transparent" : "3px solid #1976d2",
        transition: "all 0.2s",
        "&:hover": { bgcolor: notif.read ? "rgba(0,0,0,0.02)" : "rgba(25,118,210,0.07)" },
      }}
    >
      {/* Icon */}
      <MDBox
        display="flex" alignItems="center" justifyContent="center"
        width={40} height={40} borderRadius="10px"
        bgColor={cfg.color} variant="gradient" sx={{ flexShrink: 0, mt: 0.25 }}
      >
        <Icon sx={{ color: "white", fontSize: 20 }}>{cfg.icon}</Icon>
      </MDBox>

      {/* Content */}
      <MDBox flex={1} minWidth={0}>
        <MDBox display="flex" alignItems="center" gap={0.75} mb={0.4} flexWrap="wrap">
          <Chip
            label={cfg.label}
            size="small"
            color={cfg.color}
            sx={{ height: 18, fontSize: "10px", fontWeight: 700 }}
          />
          {!notif.read && (
            <Chip
              label="NEW"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 18, fontSize: "10px", fontWeight: 700 }}
            />
          )}
          {notif.entity_type && notif.entity_type !== "presence" && (
            <Chip
              label={notif.entity_type}
              size="small"
              variant="outlined"
              sx={{ height: 16, fontSize: "9px", color: "text.secondary", borderColor: "#e0e0e0" }}
            />
          )}
        </MDBox>

        {/* Title if separate */}
        {notif.title && notif.title !== notif.message && (
          <MDTypography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.2, color: "text.primary" }}>
            {notif.title}
          </MDTypography>
        )}

        {/* Decoded message */}
        <MDTypography
          variant="button"
          fontWeight={notif.read ? "regular" : "medium"}
          display="block"
          sx={{ lineHeight: 1.4, color: notif.read ? "text.secondary" : "text.primary", wordBreak: "break-word" }}
        >
          {displayMessage}
        </MDTypography>

        <MDTypography variant="caption" color="text" sx={{ mt: 0.3, display: "block", fontSize: "11px" }}>
          {timeAgo(notif.created_at)}
        </MDTypography>
      </MDBox>

      {/* Actions */}
      <MDBox display="flex" gap={0.5} sx={{ flexShrink: 0, mt: 0.25 }}>
        {!notif.read && (
          <Tooltip title="Mark as read">
            <IconButton size="small" onClick={() => onMarkRead(notif.id)} sx={{ "&:hover": { bgcolor: "#e3f2fd" } }}>
              <Icon fontSize="small" sx={{ color: "#1976d2" }}>done</Icon>
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete(notif.id)} sx={{ "&:hover": { bgcolor: "#ffebee" } }}>
            <Icon fontSize="small" sx={{ color: "#ef5350" }}>delete_outline</Icon>
          </IconButton>
        </Tooltip>
      </MDBox>
    </MDBox>
  );
}

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread | read

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(ns => ns.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "read")   return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} lg={9}>
            {/* Header card */}
            <Card sx={{ mb: 3, p: 3 }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <MDBox>
                  <MDTypography variant="h5" fontWeight="bold">
                    Notifications
                  </MDTypography>
                  <MDTypography variant="body2" color="text">
                    Hello, {currentUser?.name} — you have{" "}
                    <strong style={{ color: unreadCount > 0 ? "#1976d2" : "inherit" }}>
                      {unreadCount} unread
                    </strong>{" "}
                    notification{unreadCount !== 1 ? "s" : ""}
                  </MDTypography>
                </MDBox>
                <MDBox display="flex" gap={1}>
                  {unreadCount > 0 && (
                    <MDButton variant="outlined" color="info" size="small" onClick={handleMarkAllRead}>
                      <Icon sx={{ mr: 0.5 }}>done_all</Icon> Mark all read
                    </MDButton>
                  )}
                  <MDButton variant="text" color="secondary" size="small" onClick={fetchNotifs}>
                    <Icon sx={{ mr: 0.5 }}>refresh</Icon> Refresh
                  </MDButton>
                </MDBox>
              </MDBox>

              {/* Filter tabs */}
              <MDBox display="flex" gap={1} mt={2}>
                {["all", "unread", "read"].map(f => (
                  <MDButton
                    key={f}
                    variant={filter === f ? "gradient" : "outlined"}
                    color={filter === f ? "info" : "secondary"}
                    size="small"
                    onClick={() => setFilter(f)}
                    sx={{ textTransform: "capitalize", minWidth: 80 }}
                  >
                    {f === "all" ? `All (${notifications.length})` :
                     f === "unread" ? `Unread (${unreadCount})` :
                     `Read (${notifications.length - unreadCount})`}
                  </MDButton>
                ))}
              </MDBox>
            </Card>

            {/* Notifications list */}
            <Card>
              {loading ? (
                <MDBox display="flex" justifyContent="center" p={5}>
                  <CircularProgress />
                </MDBox>
              ) : filtered.length === 0 ? (
                <MDBox textAlign="center" py={6}>
                  <Icon sx={{ fontSize: 56, color: "text.secondary", mb: 1 }}>notifications_none</Icon>
                  <MDTypography variant="h6" color="text">
                    {filter === "unread" ? "All caught up!" : "No notifications"}
                  </MDTypography>
                  <MDTypography variant="body2" color="text">
                    {filter === "unread" ? "No unread notifications." : "Nothing to show here yet."}
                  </MDTypography>
                </MDBox>
              ) : (
                <MDBox>
                  {filtered.map((notif, i) => (
                    <MDBox key={notif.id}>
                      <NotificationRow
                        notif={notif}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                      />
                      {i < filtered.length - 1 && <Divider sx={{ my: 0, mx: 2 }} />}
                    </MDBox>
                  ))}
                </MDBox>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
