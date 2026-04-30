/* eslint-disable */
import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useFileAttachment, AttachmentPreviewBar, AttachmentChip } from "components/FileAttachment";
import {
  Box, Typography, Avatar, IconButton, TextField, Divider, Chip, Tooltip,
  Badge, List, ListItem, ListItemAvatar, ListItemText, Paper, Menu, MenuItem,
  Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, FormControl, InputLabel, CircularProgress, Snackbar, Alert,
  InputAdornment,
} from "@mui/material";
import {
  Send, Search, MoreHoriz, AttachFile, EmojiEmotions, Phone, Videocam,
  Circle, Done, DoneAll, Add, Close, Group, Person, NotificationsOff,
  PushPin, Delete, Edit, Reply, Star, GroupAdd, Lock, Tag,
} from "@mui/icons-material";
import { chatAPI, usersAPI, timemanAPI } from "services/api";
import { useAuth } from "context/AuthContext";
import { useCall } from "context/CallContext";

const getColor = (name) => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0;
  for (let c of name || "U") s += c.charCodeAt(0);
  return C[s % C.length];
};

const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

const UserAvatar = ({ name, size = 36, online }) => (
  <Badge
    overlap="circular"
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    badgeContent={
      online !== undefined ? (
        <Circle sx={{ fontSize: 10, color: online ? "#4caf50" : "#bdbdbd", bgcolor: "white", borderRadius: "50%" }} />
      ) : null
    }
  >
    <Avatar sx={{ width: size, height: size, bgcolor: getColor(name), fontSize: size * 0.35, fontWeight: 700 }}>
      {getInitials(name)}
    </Avatar>
  </Badge>
);

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── New Room Dialog ──────────────────────────────────────────────────────────
function NewRoomDialog({ open, onClose, onCreated, currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ type: "direct", name: "", description: "", members: [] });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) usersAPI.getAll().then(setUsers).catch(() => {});
  }, [open]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      let room;
      if (form.type === "direct") {
        // Use find-or-create so we never get duplicate DM rooms
        const otherId = form.members[0];
        const otherUser = users.find(u => u.id === otherId);
        if (!otherUser) { setCreating(false); return; }
        room = await chatAPI.findOrCreateDirect({
          userAId: String(currentUser.id),
          userBId: String(otherId),
          userAName: currentUser.name,
          userBName: otherUser.name,
        });
      } else {
        // Group / channel — always include creator in members
        const allMembers = [...new Set([String(currentUser.id), ...form.members.map(String)])];
        const participantNames = {};
        participantNames[String(currentUser.id)] = currentUser.name;
        form.members.forEach(mid => {
          const u = users.find(u => u.id === mid);
          if (u) participantNames[String(u.id)] = u.name;
        });
        room = await chatAPI.createRoom({
          type: form.type,
          name: form.name,
          description: form.description,
          members: allMembers,
          participant_names: participantNames,
        });
      }
      onCreated(room);
      onClose();
      setForm({ type: "direct", name: "", description: "", members: [] });
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const canCreate = form.type === "direct"
    ? form.members.length === 1
    : (form.name.trim() && form.members.length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        New Conversation
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Type</InputLabel>
          <Select value={form.type} label="Type" onChange={e => setForm(f => ({ ...f, type: e.target.value, members: [] }))}>
            <MenuItem value="direct"><Person fontSize="small" sx={{ mr: 1 }} />Direct Message</MenuItem>
            <MenuItem value="group"><Group fontSize="small" sx={{ mr: 1 }} />Group Chat</MenuItem>
            <MenuItem value="general"><Tag fontSize="small" sx={{ mr: 1 }} />Channel</MenuItem>
          </Select>
        </FormControl>
        {form.type !== "direct" && (
          <TextField fullWidth size="small" label="Name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
        )}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>{form.type === "direct" ? "Select user to message" : "Add Members"}</InputLabel>
          <Select
            multiple={form.type !== "direct"}
            value={form.type === "direct" ? (form.members[0] ?? "") : form.members}
            label={form.type === "direct" ? "Select user to message" : "Add Members"}
            onChange={e => setForm(f => ({ ...f, members: form.type === "direct" ? [e.target.value] : e.target.value }))}
            renderValue={(sel) => {
              const ids = Array.isArray(sel) ? sel : [sel];
              return ids.map(id => users.find(u => u.id === id)?.name || id).join(", ");
            }}>
            {users.filter(u => String(u.id) !== String(currentUser?.id)).map(u => (
              <MenuItem key={u.id} value={u.id}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 700, bgcolor: getColor(u.name) }}>{getInitials(u.name)}</Avatar>
                  <Box>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.2 }}>{u.name}</Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>{u.role}</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {form.type !== "direct" && (
          <TextField fullWidth size="small" label="Description (optional)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!canCreate || creating}>
          {creating ? "Creating…" : form.type === "direct" ? "Open Chat" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Message Dialog ──────────────────────────────────────────────────────
function EditMessageDialog({ open, msg, onClose, onSave }) {
  const [text, setText] = useState(msg?.text || "");
  useEffect(() => { setText(msg?.text || ""); }, [msg]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Message</DialogTitle>
      <DialogContent>
        <TextField fullWidth multiline rows={3} value={text} onChange={e => setText(e.target.value)} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(text)} disabled={!text.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Messenger() {
  const { currentUser } = useAuth();
  const { onlineUsers, startCall, callState } = useCall();
  const CURRENT_USER = currentUser?.name || "Me";

  // Is current user clocked in?
  const [myClockStatus, setMyClockStatus] = useState(false);
  useEffect(() => {
    const check = () => timemanAPI.myStatus()
      .then(d => setMyClockStatus(d?.is_clocked_in || false))
      .catch(() => {});
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [msgMenu, setMsgMenu] = useState({ anchor: null, msg: null });
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [editMsg, setEditMsg] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const fileAttach = useFileAttachment();
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const activeRoomRef = useRef(null);

  // Load users once (for name lookups) — must be before getRoomDisplayName
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => { usersAPI.getAll().then(setAllUsers).catch(() => {}); }, []);

  // Clock-in based online status — poll every 30s
  const [clockedInUsers, setClockedInUsers] = useState([]);
  useEffect(() => {
    const load = () => timemanAPI.getOnlineUsers().then(setClockedInUsers).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Given a room, compute display name from the current user's perspective
  // Must be defined before getOtherParticipant which depends on it
  const getRoomDisplayName = useCallback((room) => {
    if (!room) return "";
    if (room.type !== "direct") return room.name;
    const myId = String(currentUser?.id);
    const myName = currentUser?.name || "";

    // Strategy 1: participant_names map — find entry where key != myId AND value != myName
    const pn = room.participant_names || {};
    const otherEntry = Object.entries(pn).find(([id, name]) =>
      String(id) !== myId && name !== myName
    );
    if (otherEntry) return otherEntry[1];

    // Strategy 2: participant_names — any entry where key != myId (even if name might match)
    const otherEntryById = Object.entries(pn).find(([id]) => String(id) !== myId);
    if (otherEntryById && otherEntryById[1] !== myName) return otherEntryById[1];

    // Strategy 3: look up in members list via allUsers
    const members = Array.isArray(room.members) ? room.members : [];
    const otherId = members.map(String).find(id => id !== myId);
    if (otherId) {
      const found = allUsers.find(u => String(u.id) === otherId);
      if (found && found.name !== myName) return found.name;
      if (found) return found.name;
    }

    // Strategy 4: participant_names — any name that isn't mine
    const otherByName = Object.values(pn).find(name => name !== myName);
    if (otherByName) return otherByName;

    return room.name.replace(/^dm_\d+_\d+$/, "Direct Message");
  }, [currentUser?.id, currentUser?.name, allUsers]);

  // For direct chats, get the other person's name (always from current user's perspective)
  const getOtherParticipant = useCallback((room) => {
    if (!room || room.type !== "direct") return null;
    return getRoomDisplayName(room);
  }, [getRoomDisplayName]);

  // Clock-in based: is a given display name currently clocked in?
  const isOnline = useCallback((name) => {
    if (!name) return false;
    const norm = name.trim().toLowerCase();
    return clockedInUsers.some(u => (u.user_name || "").trim().toLowerCase() === norm);
  }, [clockedInUsers]);

  // For calling: find the WebRTC user object by name (still needed for startCall)
  const findOnlineUser = useCallback((name) =>
    onlineUsers.find(u => (u.userName || "").trim().toLowerCase() === (name || "").trim().toLowerCase()),
  [onlineUsers]);

  // Load rooms — filtered to current user only
  const fetchRooms = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await chatAPI.getRooms({ user: String(currentUser.id), userName: currentUser.name || "" });
      // If a room is currently open, keep its unread_count as 0 so the
      // polling refresh doesn't flip it back to "unread" before the server
      // has finished persisting the markRead calls.
      setRooms(data.map(r =>
        activeRoomRef.current && r.id === activeRoomRef.current.id
          ? { ...r, unread_count: 0 }
          : r
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchRooms();
    // Poll for new rooms every 5s so incoming DMs appear quickly
    pollRef.current = setInterval(fetchRooms, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchRooms]);

  // Load messages when room changes
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setMsgLoading(true);
    try {
      const data = await chatAPI.getMessages(roomId, { limit: 50 });
      const msgList = Array.isArray(data) ? data : (data?.data || []);
      setMessages(msgList);
      // Bulk-mark all messages as read every time we fetch (room is open)
      chatAPI.markRoomRead(roomId, CURRENT_USER).catch(() => {});
    } catch (e) {
      console.error(e);
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id);
      // Poll messages every 5s
      const t = setInterval(() => fetchMessages(activeRoom.id), 5000);
      return () => clearInterval(t);
    }
  }, [activeRoom?.id, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const selectRoom = async (room) => {
    setActiveRoom(room);
    activeRoomRef.current = room;
    // Clear unread count locally
    setRooms(rs => rs.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r));
    // Ensure current user is in this room's members (repairs old rooms)
    if (currentUser?.id) {
      const members = Array.isArray(room.members) ? room.members : [];
      if (!members.map(String).includes(String(currentUser.id))) {
        chatAPI.joinRoom(room.id, { userId: String(currentUser.id), userName: CURRENT_USER }).catch(() => {});
      }
    }
    // Bulk-mark all messages in this room as read on the server
    chatAPI.markRoomRead(room.id, CURRENT_USER).catch(() => {});
  };

  const sendMessage = async () => {
    const hasText = message.trim();
    const hasFiles = fileAttach.attachments.length > 0;
    if (!hasText && !hasFiles) return;
    if (!activeRoom) return;
    const text = message.trim();
    setMessage("");
    try {
      const payload = {
        sender_name: CURRENT_USER,
        text: text || (hasFiles ? `📎 ${fileAttach.attachments.length} file(s)` : ""),
        message_type: hasFiles ? "file" : "text",
        attachments: fileAttach.attachments,
      };
      if (hasFiles && fileAttach.attachments[0]) {
        payload.file_name = fileAttach.attachments[0].fileName;
        payload.file_url = fileAttach.attachments[0].url;
      }
      const newMsg = await chatAPI.sendMessage(activeRoom.id, payload);
      setMessages(ms => [...ms, { ...newMsg, attachments: fileAttach.attachments }]);
      fileAttach.clearAttachments();
      setRooms(rs => rs.map(r => r.id === activeRoom.id
        ? { ...r, last_message: text || "📎 File", last_message_time: new Date().toISOString() }
        : r));
      // Refresh rooms list so latest message shows and any pending room repairs are applied
      fetchRooms();
    } catch (e) {
      setMessage(text);
      setSnack({ open: true, message: "Failed to send message", severity: "error" });
    }
  };

  const handleDeleteMessage = async (msg) => {
    setMsgMenu({ anchor: null, msg: null });
    try {
      await chatAPI.deleteMessage(msg.id);
      setMessages(ms => ms.filter(m => m.id !== msg.id));
    } catch (e) {
      setSnack({ open: true, message: "Failed to delete message", severity: "error" });
    }
  };

  const handleEditSave = async (newText) => {
    try {
      const updated = await chatAPI.editMessage(editMsg.id, { text: newText });
      setMessages(ms => ms.map(m => m.id === editMsg.id ? { ...m, text: newText } : m));
    } catch (e) {
      setSnack({ open: true, message: "Failed to edit message", severity: "error" });
    }
    setEditMsg(null);
  };

  const handleDeleteRoom = async (room) => {
    setMenuAnchor(null);
    try {
      await chatAPI.deleteRoom(room.id);
      setRooms(rs => rs.filter(r => r.id !== room.id));
      if (activeRoom?.id === room.id) { setActiveRoom(null); activeRoomRef.current = null; setMessages([]); }
    } catch (e) {
      setSnack({ open: true, message: "Failed to delete chat", severity: "error" });
    }
  };

  const handleRoomCreated = (room) => {
    setRooms(rs => [room, ...rs]);
    setActiveRoom(room);
  };


  const filteredRooms = rooms.filter(r => {
    const nameMatch = (r.name || "").toLowerCase().includes(search.toLowerCase());
    if (tab === 0) return nameMatch;
    if (tab === 1) return nameMatch && r.type === "direct";
    if (tab === 2) return nameMatch && (r.type === "group" || r.type === "general");
    return nameMatch;
  });

  const getRoomIcon = (room) => {
    if (room.type === "group") return <Group fontSize="small" />;
    if (room.type === "general") return <Tag fontSize="small" />;
    return null;
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        <Box sx={{
          display: "flex", height: "calc(100vh - 180px)", minHeight: 500,
          bgcolor: "white", borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.1)", overflow: "hidden",
        }}>
          {/* ── Left sidebar ─── */}
          <Box sx={{ width: 300, borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column", bgcolor: "#f8f9fa" }}>
            {/* My Profile strip at top */}
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: "1px solid #ebebeb", bgcolor: "#fff", display: "flex", alignItems: "center", gap: 1.5 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={<Circle sx={{ fontSize: 11, color: myClockStatus ? "#4caf50" : "#bdbdbd", bgcolor: "white", borderRadius: "50%" }} />}
              >
                <Avatar sx={{ width: 38, height: 38, bgcolor: getColor(CURRENT_USER), fontSize: 14, fontWeight: 800 }}>
                  {getInitials(CURRENT_USER)}
                </Avatar>
              </Badge>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {CURRENT_USER}
                </Typography>
                <Typography sx={{ fontSize: "0.65rem", color: myClockStatus ? "#4caf50" : "#9e9e9e", fontWeight: 600 }}>
                  {myClockStatus ? "● Active now" : "○ Offline"}
                </Typography>
              </Box>
              <Tooltip title="New conversation">
                <IconButton size="small" onClick={() => setNewRoomOpen(true)} color="primary" sx={{ flexShrink: 0 }}>
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Header */}
            <Box sx={{ px: 1.5, pt: 1, pb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.6px" }}>Conversations</Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ px: 1 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}
                sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0, fontSize: "0.73rem", minWidth: 60 } }}>
                <Tab label="All" />
                <Tab label="Direct" />
                <Tab label="Groups" />
              </Tabs>
            </Box>

            {/* Search */}
            <Box sx={{ px: 1.5, py: 1 }}>
              <TextField fullWidth size="small" placeholder="Search conversations..." value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />,
                  endAdornment: search && (
                    <IconButton size="small" onClick={() => setSearch("")}><Close fontSize="small" /></IconButton>
                  ),
                }}
                sx={{ "& fieldset": { borderRadius: 4 } }}
              />
            </Box>

            {/* Room list */}
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredRooms.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                  <Typography variant="body2" color="text.secondary">No conversations yet</Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => setNewRoomOpen(true)} sx={{ mt: 1 }}>
                    Start a chat
                  </Button>
                </Box>
              ) : filteredRooms.map(room => {
                const displayName = getRoomDisplayName(room);
                const online = room.type === "direct" ? isOnline(displayName) : false;
                return (
                <Box key={room.id} onClick={() => selectRoom(room)}
                  sx={{
                    display: "flex", alignItems: "center", px: 1.5, py: 1, cursor: "pointer",
                    bgcolor: activeRoom?.id === room.id ? "white" : "transparent",
                    borderLeft: activeRoom?.id === room.id ? "3px solid #1976d2" : "3px solid transparent",
                    "&:hover": { bgcolor: activeRoom?.id === room.id ? "white" : "#f0f0f0" },
                    borderRadius: "0 6px 6px 0", mb: 0.25,
                  }}>
                  {room.type === "direct" ? (
                    <UserAvatar name={displayName} size={42} online={online} />
                  ) : (
                    <Avatar sx={{ width: 42, height: 42, bgcolor: room.type === "general" ? "#fb8c00" : "#1976d2", mr: 0, fontSize: "0.9rem" }}>
                      {room.type === "group" ? <Group sx={{ fontSize: 20 }} /> : <Tag sx={{ fontSize: 20 }} />}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0, ml: 1.25 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.83rem", fontWeight: room.unread_count > 0 ? 800 : 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140, color: "#1a2332" }}>
                        {displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.63rem", whiteSpace: "nowrap", ml: 0.5 }}>
                        {formatTime(room.last_message_time)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.15 }}>
                      <Typography sx={{ fontSize: "0.71rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
                        color: room.unread_count > 0 ? "#1a2332" : "text.secondary", fontWeight: room.unread_count > 0 ? 600 : 400 }}>
                        {room.last_message || room.description || "No messages yet"}
                      </Typography>
                      {room.unread_count > 0 && (
                        <Chip label={room.unread_count} size="small" color="primary"
                          sx={{ height: 17, fontSize: "0.58rem", minWidth: 17, ml: 0.5 }} />
                      )}
                    </Box>
                    {room.type === "direct" && online && (
                      <Typography sx={{ fontSize: "0.6rem", color: "#4caf50", fontWeight: 600, mt: 0.1 }}>● Online</Typography>
                    )}
                  </Box>
                </Box>
                );
              })}
            </Box>
          </Box>

          {/* ── Main chat area ─── */}
          {activeRoom ? (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Chat header */}
              <Box sx={{
                px: 2, py: 1.5, borderBottom: "1px solid #e0e0e0",
                display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "white",
              }}>
                {(() => {
                  const headerName = getRoomDisplayName(activeRoom);
                  const headerOnline = activeRoom.type === "direct" && isOnline(headerName);
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      {activeRoom.type === "direct" ? (
                        <UserAvatar name={headerName} size={38} online={headerOnline} />
                      ) : (
                        <Avatar sx={{ width: 38, height: 38, bgcolor: activeRoom.type === "general" ? "#fb8c00" : "#1976d2", fontSize: "0.85rem" }}>
                          {activeRoom.type === "group" ? <Group sx={{ fontSize: 18 }} /> : <Tag sx={{ fontSize: 18 }} />}
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">{headerName}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem",
                          color: headerOnline ? "#4caf50" : "text.secondary",
                          fontWeight: headerOnline ? 600 : 400 }}>
                          {activeRoom.type === "direct"
                            ? (headerOnline ? "● Online" : "● Offline")
                            : activeRoom.type === "general" ? "Channel"
                            : `${(activeRoom.members || []).length} members`}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  {activeRoom?.type === "direct" && (() => {
                    const otherName = getRoomDisplayName(activeRoom);
                    const onlineUser = findOnlineUser(otherName);
                    const canCall = !!onlineUser && callState === "idle";
                    return (
                      <>
                        <Tooltip title={canCall ? `Audio call ${otherName}` : "User offline"}>
                          <span>
                            <IconButton size="small" disabled={!canCall}
                              onClick={() => canCall && startCall(onlineUser, "audio")}
                              sx={{ color: canCall ? "#388e3c" : "text.disabled" }}>
                              <Phone fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={canCall ? `Video call ${otherName}` : "User offline"}>
                          <span>
                            <IconButton size="small" disabled={!canCall}
                              onClick={() => canCall && startCall(onlineUser, "video")}
                              sx={{ color: canCall ? "#1976d2" : "text.disabled" }}>
                              <Videocam fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {onlineUser && (
                          <Chip label="Online" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: "#e8f5e9", color: "#388e3c", fontWeight: 700, "& .MuiChip-label": { px: 0.75 } }} />
                        )}
                      </>
                    );
                  })()}
                  <Tooltip title="Search in chat">
                    <IconButton size="small"><Search fontSize="small" /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)}>
                    <MoreHoriz fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#f5f7fa" }}>
                {msgLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ textAlign: "center", pt: 6 }}>
                    <Typography color="text.secondary" variant="body2">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : messages.map((msg, i) => {
                  const isSelf = msg.sender_name === CURRENT_USER;
                  const prevMsg = messages[i - 1];
                  const showSenderLabel = i === 0 || prevMsg?.sender_name !== msg.sender_name;
                  return (
                    <Box key={msg.id}
                      sx={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", mb: 0.75, alignItems: "flex-end", gap: 1 }}
                      onContextMenu={e => { e.preventDefault(); setMsgMenu({ anchor: e.currentTarget, msg }); }}>
                      {!isSelf && (
                        <Avatar sx={{
                          width: 30, height: 30,
                          bgcolor: showSenderLabel ? getColor(msg.sender_name) : "transparent",
                          fontSize: "0.65rem", fontWeight: 700,
                          visibility: showSenderLabel ? "visible" : "hidden",
                        }}>
                          {showSenderLabel ? getInitials(msg.sender_name || "?") : ""}
                        </Avatar>
                      )}
                      <Box sx={{ maxWidth: "65%" }}>
                        {showSenderLabel && (
                          <Typography sx={{ fontSize: "0.64rem", fontWeight: 700, mb: 0.25,
                            color: isSelf ? "#1565c0" : "#546e7a",
                            textAlign: isSelf ? "right" : "left", px: 0.5 }}>
                            {isSelf ? "You" : msg.sender_name}
                          </Typography>
                        )}
                        <Box sx={{
                          bgcolor: isSelf ? "#1976d2" : "white",
                          color: isSelf ? "white" : "inherit",
                          borderRadius: isSelf ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          px: 1.5, py: 0.75, boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        }}>
                          {/* Render attachments stored on the message */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <Box sx={{ mb: msg.text ? 0.75 : 0, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {msg.attachments.map((att, idx) => (
                                <AttachmentChip key={idx} attachment={att} />
                              ))}
                            </Box>
                          )}
                          {/* Legacy single-file support */}
                          {!msg.attachments?.length && msg.file_name && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, opacity: 0.85 }}>
                              <AttachFile sx={{ fontSize: 14 }} />
                              <Typography variant="caption">{msg.file_name}</Typography>
                            </Box>
                          )}
                          {msg.text && <Typography variant="body2">{msg.text}</Typography>}
                          {msg.edited && <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.6rem" }}>(edited)</Typography>}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: isSelf ? "flex-end" : "flex-start", mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem" }}>
                            {formatTime(msg.created_at)}
                          </Typography>
                          {isSelf && (msg.read ? <DoneAll sx={{ fontSize: 12, color: "#2196f3" }} /> : <Done sx={{ fontSize: 12, color: "#9e9e9e" }} />)}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={bottomRef} />
              </Box>

              {/* Message input */}
              <Box sx={{ borderTop: "1px solid #e0e0e0", bgcolor: "white" }}>
                {/* Attachment preview bar */}
                {(fileAttach.attachments.length > 0 || fileAttach.uploading || fileAttach.error) && (
                  <Box sx={{ px: 2, pt: 1 }}>
                    <AttachmentPreviewBar
                      attachments={fileAttach.attachments}
                      uploading={fileAttach.uploading}
                      uploadProgress={fileAttach.uploadProgress}
                      error={fileAttach.error}
                      onRemove={fileAttach.removeAttachment}
                      onClear={fileAttach.clearAttachments}
                    />
                  </Box>
                )}
                <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "flex-end", gap: 1 }}>
                  {fileAttach.FileInput}
                  <Tooltip title="Attach file">
                    <IconButton size="small" sx={{ color: "text.secondary" }} onClick={fileAttach.openPicker} disabled={fileAttach.uploading}>
                      <AttachFile fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Emoji">
                    <IconButton size="small" sx={{ color: "text.secondary" }}>
                      <EmojiEmotions fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <TextField fullWidth multiline maxRows={4} size="small"
                    placeholder={`Message ${activeRoom.name}...`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    sx={{ "& fieldset": { borderRadius: 3 } }}
                  />
                  <IconButton color="primary" onClick={sendMessage}
                    disabled={!message.trim() && fileAttach.attachments.length === 0}
                    sx={{
                      bgcolor: (message.trim() || fileAttach.attachments.length > 0) ? "primary.main" : "transparent",
                      color: (message.trim() || fileAttach.attachments.length > 0) ? "white !important" : "inherit",
                      "&:hover": { bgcolor: "primary.dark" }
                    }}>
                    <Send fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: "#f0f4ff" }}>
                <Person sx={{ fontSize: 40, color: "#1976d2" }} />
              </Avatar>
              <Typography color="text.secondary">Select a conversation to start messaging</Typography>
              <Button variant="outlined" startIcon={<Add />} onClick={() => setNewRoomOpen(true)}>
                New Conversation
              </Button>
            </Box>
          )}

          {/* Message context menu */}
          <Menu anchorEl={msgMenu.anchor} open={!!msgMenu.anchor} onClose={() => setMsgMenu({ anchor: null, msg: null })}>
            <MenuItem onClick={() => { setMsgMenu({ anchor: null, msg: null }); }}>
              <Reply fontSize="small" sx={{ mr: 1 }} /> Reply
            </MenuItem>
            {msgMenu.msg?.sender_name === CURRENT_USER && (
              <MenuItem onClick={() => { setEditMsg(msgMenu.msg); setMsgMenu({ anchor: null, msg: null }); }}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
              </MenuItem>
            )}
            <MenuItem onClick={() => { setMsgMenu({ anchor: null, msg: null }); }}>
              <Star fontSize="small" sx={{ mr: 1 }} /> Star
            </MenuItem>
            {msgMenu.msg?.sender_name === CURRENT_USER && (
              <MenuItem sx={{ color: "error.main" }} onClick={() => handleDeleteMessage(msgMenu.msg)}>
                <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
              </MenuItem>
            )}
          </Menu>

          {/* Chat options menu */}
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <PushPin fontSize="small" sx={{ mr: 1 }} /> Pin Chat
            </MenuItem>
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <NotificationsOff fontSize="small" sx={{ mr: 1 }} /> Mute Notifications
            </MenuItem>
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <Person fontSize="small" sx={{ mr: 1 }} /> View Profile
            </MenuItem>
            <Divider />
            <MenuItem sx={{ color: "error.main" }} onClick={() => { handleDeleteRoom(activeRoom); }}>
              <Delete fontSize="small" sx={{ mr: 1 }} /> Delete Chat
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <NewRoomDialog open={newRoomOpen} onClose={() => setNewRoomOpen(false)} onCreated={handleRoomCreated} currentUser={currentUser} />
      <EditMessageDialog open={!!editMsg} msg={editMsg} onClose={() => setEditMsg(null)} onSave={handleEditSave} />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
