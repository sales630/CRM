/* eslint-disable */
import { useState, useRef, useEffect, useCallback } from "react";
import { notificationsAPI, streamAPI, timemanAPI, tasksAPI, usersAPI } from "services/api";
import { useAuth } from "context/AuthContext";
import { useFileAttachment, AttachButton, AttachmentPreviewBar, AttachmentChip } from "components/FileAttachment";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
import MDInput from "components/MDInput";

import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Avatar,
  AvatarGroup,
  IconButton,
  Divider,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  Menu,
  MenuItem,
  LinearProgress,
  Badge,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  Autocomplete,
  CircularProgress,
} from "@mui/material";

import {
  ThumbUp,
  Comment,
  Share,
  MoreHoriz,
  Send,
  AttachFile,
  EmojiEmotions,
  Image,
  Event,
  Poll,
  Article,
  Visibility,
  NotificationsOff,
  Bookmark,
  Flag,
  Delete,
  Edit,
  PersonAdd,
  PersonRemove,
  CheckCircle,
  RadioButtonUnchecked,
  Add,
  Close,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Link,
  CakeOutlined,
  TrendingUp,
  AccessTime,
  WorkOutline,
  PeopleOutline,
  StarBorder,
  Notifications,
  Circle,
  ExpandMore,
  ExpandLess,
  InsertDriveFile,
  VideoCall,
  AssignmentTurnedIn,
  HourglassEmpty,
  GroupWork,
  FormatAlignLeft,
  EmojiObjects,
} from "@mui/icons-material";

// ─── Helper Data ─────────────────────────────────────────────────────────────

const COLORS = [
  "#e53935",
  "#8e24aa",
  "#1e88e5",
  "#00897b",
  "#f4511e",
  "#fb8c00",
  "#3949ab",
  "#00acc1",
  "#43a047",
  "#6d4c41",
];

const getColor = (name) => {
  let sum = 0;
  for (let c of name || "U") sum += c.charCodeAt(0);
  return COLORS[sum % COLORS.length];
};

const UserAvatar = ({ name, size = 36, src }) =>
  src ? (
    <Avatar src={src} sx={{ width: size, height: size }} />
  ) : (
    <Avatar sx={{ width: size, height: size, bgcolor: getColor(name), fontSize: size * 0.4 }}>
      {(name || "U").charAt(0).toUpperCase()}
    </Avatar>
  );

const timeAgo = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// All these are now loaded dynamically — see useEffect in StreamFeed component

// ─── Work Report Modal ────────────────────────────────────────────────────────

function WorkReportModal({ open, onClose, onSubmit, currentUser }) {
  const [tab, setTab] = useState(0);
  const [reportText, setReportText] = useState("");
  const [planText, setPlanText] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    if (!open) return;
    // Load supervisors
    usersAPI.getAll()
      .then(u => {
        const allUsers = Array.isArray(u) ? u : [];
        const leaders = allUsers.filter(x => ["team_leader","admin","super_admin"].includes(x.role));
        setSupervisors(leaders.length > 0 ? leaders : allUsers);
        if (leaders.length > 0 && !supervisor) setSupervisor(leaders[0].name);
      }).catch(() => {});

    // Load current user's real tasks from the DB
    if (currentUser?.name) {
      setLoadingTasks(true);
      tasksAPI.getAll({ assigned_to: currentUser.name })
        .then(data => {
          const realTasks = Array.isArray(data) ? data : [];
          // Show active/pending tasks. Pre-mark completed ones as done
          const mapped = realTasks
            .filter(t => t.status !== "cancelled")
            .map(t => ({
              id: t.id,
              text: t.title,
              done: t.status === "completed",
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
            }));
          setTasks(mapped.length > 0 ? mapped : [{ text: "", done: false }]);
        })
        .catch(() => setTasks([{ text: "", done: false }]))
        .finally(() => setLoadingTasks(false));
    } else {
      setTasks([{ text: "", done: false }]);
    }
  }, [open, currentUser?.name]);

  const addTask = () => setTasks([...tasks, { text: "", done: false }]);
  const removeTask = (i) => setTasks(tasks.filter((_, idx) => idx !== i));
  const updateTask = (i, val) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, text: val } : t)));
  const toggleTask = (i) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)));

  const handleSubmit = (type) => {
    onSubmit({
      reportText,
      planText,
      supervisor,
      tasks: tasks.filter((t) => t.text && t.text.trim()),
      submitType: type,
    });
    setReportText("");
    setPlanText("");
    setTasks([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkOutline fontSize="small" color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Work Report
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                bgcolor: "#f5f5f5",
                borderRadius: 1,
              }}
            >
              <UserAvatar name={currentUser?.name || "Me"} size={32} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  From
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {currentUser?.name || "Me"} — {currentUser?.role || currentUser?.department || "Employee"}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Send To (Supervisor)</InputLabel>
              <Select
                value={supervisor}
                label="Send To (Supervisor)"
                onChange={(e) => setSupervisor(e.target.value)}
              >
                {supervisors.map((s) => (
                  <MenuItem key={s.id} value={s.name}>
                    {s.name} ({s.role || s.department || ""})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Report" />
          <Tab label="Plan" />
        </Tabs>

        {/* Formatting toolbar */}
        <Box sx={{ display: "flex", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
          {[
            FormatBold,
            FormatItalic,
            FormatUnderlined,
            FormatListBulleted,
            FormatListNumbered,
            Link,
          ].map((Icon, i) => (
            <IconButton
              key={i}
              size="small"
              sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 0.5 }}
            >
              <Icon fontSize="small" />
            </IconButton>
          ))}
        </Box>

        {tab === 0 && (
          <TextField
            fullWidth
            multiline
            rows={5}
            placeholder="Describe what you accomplished today..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            variant="outlined"
          />
        )}
        {tab === 1 && (
          <TextField
            fullWidth
            multiline
            rows={5}
            placeholder="Describe what you plan to do next..."
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            variant="outlined"
          />
        )}

        {/* Tasks Section */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">Tasks</Typography>
              {loadingTasks && <CircularProgress size={14} />}
              {!loadingTasks && tasks.filter(t => t.id).length > 0 && (
                <Chip label={`${tasks.filter(t => t.id).length} from system`} size="small" color="primary" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
              )}
            </Box>
            <Button size="small" startIcon={<Add />} onClick={addTask}>
              Add Task
            </Button>
          </Box>
          {loadingTasks ? (
            <Box sx={{ py: 2, textAlign: "center" }}>
              <CircularProgress size={20} />
              <Typography variant="caption" color="text.secondary" display="block">Loading your tasks...</Typography>
            </Box>
          ) : tasks.map((task, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, p: 0.75, bgcolor: task.done ? "#f1f8e9" : task.id ? "#f5f5f5" : "#fff", borderRadius: 1, border: "1px solid", borderColor: task.done ? "#c8e6c9" : "#e0e0e0" }}>
              <IconButton size="small" onClick={() => toggleTask(i)}>
                {task.done ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : (
                  <RadioButtonUnchecked fontSize="small" />
                )}
              </IconButton>
              <Box sx={{ flex: 1 }}>
                {task.id ? (
                  // Real task from DB — show title + metadata
                  <Box>
                    <Typography variant="body2" sx={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "text.secondary" : "text.primary" }}>
                      {task.text}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.3 }}>
                      {task.priority && (
                        <Chip label={task.priority} size="small" sx={{ height: 16, fontSize: "0.6rem",
                          bgcolor: task.priority === "high" || task.priority === "critical" ? "#ffebee" : task.priority === "medium" ? "#fff3e0" : "#f5f5f5",
                          color: task.priority === "high" || task.priority === "critical" ? "#c62828" : task.priority === "medium" ? "#e65100" : "#555" }} />
                      )}
                      {task.due_date && (
                        <Typography variant="caption" color={new Date(task.due_date) < new Date() && !task.done ? "error.main" : "text.secondary"} sx={{ fontSize: "0.65rem" }}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </Typography>
                      )}
                      {task.status && !task.done && (
                        <Chip label={task.status.replace("_", " ")} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                      )}
                    </Box>
                  </Box>
                ) : (
                  // Manually added task — editable text field
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Task description..."
                    value={task.text}
                    onChange={(e) => updateTask(i, e.target.value)}
                    sx={{ "& fieldset": { border: "none" } }}
                  />
                )}
              </Box>
              <IconButton size="small" onClick={() => removeTask(i)}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>

        {/* File Upload */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            border: "1px dashed #ccc",
            borderRadius: 1,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <AttachFile fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Attach files (drag & drop or click)
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={() => handleSubmit("postpone")}>
          Postpone
        </Button>
        <Button variant="outlined" size="small" onClick={() => handleSubmit("save")}>
          Save Draft
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => handleSubmit("send")}
          startIcon={<Send />}
        >
          Send to Supervisor
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Create Post Composer ─────────────────────────────────────────────────────

function PostComposer({ onPost, onWorkReport, currentUser }) {
  const [tab, setTab] = useState(0);
  const [text, setText] = useState("");
  const [eventData, setEventData] = useState({ title: "", date: "", time: "", location: "" });
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [expanded, setExpanded] = useState(false);
  const fileAttach = useFileAttachment();

  const tabs = [
    { label: "Message", icon: <Article fontSize="small" /> },
    { label: "Event", icon: <Event fontSize="small" /> },
    { label: "Poll", icon: <Poll fontSize="small" /> },
    { label: "File", icon: <AttachFile fontSize="small" /> },
  ];

  const handlePost = () => {
    if (tab === 0 && !text.trim() && fileAttach.attachments.length === 0) return;
    const attachments = fileAttach.attachments;
    if (tab === 1) {
      onPost({ type: "event", content: eventData.title, eventDate: eventData.date, eventTime: eventData.time, location: eventData.location, attendees: [], attachments });
    } else if (tab === 2) {
      const opts = pollOptions.filter((o) => o.trim());
      if (opts.length < 2) return;
      onPost({ type: "poll", content: text, pollOptions: opts.map((o) => ({ text: o, votes: 0, voters: [] })), votedOption: null, totalVotes: 0, attachments });
    } else if (tab === 3) {
      if (attachments.length === 0) return;
      onPost({ type: "post", content: text || `Shared ${attachments.length} file(s)`, attachments });
    } else {
      onPost({ type: "post", content: text, attachments });
    }
    setText("");
    setEventData({ title: "", date: "", time: "", location: "" });
    setPollOptions(["", ""]);
    fileAttach.clearAttachments();
    setExpanded(false);
  };

  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setExpanded(true);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40, mb: 1.5 }}
          TabIndicatorProps={{ style: { height: 3 } }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ minHeight: 40, py: 0.5, fontSize: "0.8rem", fontWeight: 600 }}
            />
          ))}
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <UserAvatar name={currentUser?.name || "Me"} size={38} />
          <Box sx={{ flex: 1 }}>
            {tab === 0 && (
              <TextField
                fullWidth
                multiline
                minRows={expanded ? 3 : 1}
                placeholder="Write something to your colleagues..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (!expanded) setExpanded(true);
                }}
                onFocus={() => setExpanded(true)}
                variant="outlined"
                size="small"
                sx={{ "& fieldset": { borderRadius: 2 } }}
              />
            )}
            {tab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Event Title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={eventData.date}
                    onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Time"
                    value={eventData.time}
                    placeholder="e.g. 10:00 AM – 11:00 AM"
                    onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  label="Location / Link"
                  value={eventData.location}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                />
              </Box>
            )}
            {tab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Ask a question..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {pollOptions.map((opt, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) =>
                        setPollOptions(
                          pollOptions.map((o, idx) => (idx === i ? e.target.value : o))
                        )
                      }
                    />
                    {i >= 2 && (
                      <IconButton
                        size="small"
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
                {pollOptions.length < 5 && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Add Option
                  </Button>
                )}
              </Box>
            )}
            {tab === 3 && (
              <Box>
                {fileAttach.FileInput}
                <Box
                  onClick={fileAttach.openPicker}
                  sx={{
                    p: 3,
                    border: "2px dashed",
                    borderColor: fileAttach.uploading ? "primary.main" : "#e0e0e0",
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "primary.main", bgcolor: "rgba(25,118,210,0.04)" },
                  }}
                >
                  <AttachFile sx={{ color: fileAttach.uploading ? "primary.main" : "text.secondary", mb: 0.5, fontSize: 36 }} />
                  <Typography variant="body2" color="text.secondary">
                    {fileAttach.uploading ? "Uploading..." : "Click to select files"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Images, PDFs, Word, Excel, ZIP — Max 10MB each
                  </Typography>
                </Box>
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
            {tab === 4 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {[
                  {
                    label: "Work Report",
                    icon: <WorkOutline fontSize="small" />,
                    action: onWorkReport,
                  },
                  { label: "Video Call", icon: <VideoCall fontSize="small" /> },
                  { label: "Task", icon: <AssignmentTurnedIn fontSize="small" /> },
                  { label: "Appreciation", icon: <EmojiObjects fontSize="small" /> },
                ].map((item, i) => (
                  <Button
                    key={i}
                    variant="outlined"
                    size="small"
                    startIcon={item.icon}
                    onClick={item.action}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {expanded && tab !== 4 && (
          <Box>
            {/* Show attachment preview bar for non-file tabs */}
            {tab !== 3 && (
              <>
                {fileAttach.FileInput}
                <AttachmentPreviewBar
                  attachments={fileAttach.attachments}
                  uploading={fileAttach.uploading}
                  uploadProgress={fileAttach.uploadProgress}
                  error={fileAttach.error}
                  onRemove={fileAttach.removeAttachment}
                  onClear={fileAttach.clearAttachments}
                />
              </>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Attach image">
                  <IconButton size="small" sx={{ color: "text.secondary" }} onClick={fileAttach.openPicker} disabled={fileAttach.uploading}>
                    <Image fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Add emoji">
                  <IconButton size="small" sx={{ color: "text.secondary" }}>
                    <EmojiEmotions fontSize="small" />
                  </IconButton>
                </Tooltip>
                <AttachButton onOpen={fileAttach.openPicker} uploading={fileAttach.uploading} tooltip="Attach file" />
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" onClick={() => { setExpanded(false); setText(""); fileAttach.clearAttachments(); }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handlePost}
                  disabled={(tab === 0 && !text.trim() && fileAttach.attachments.length === 0) || fileAttach.uploading}
                >
                  Post
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
      <CardContent sx={{ pt: 0.5, pb: "8px !important" }} />
    </Card>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────

function CommentItem({ comment, onLike }) {
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
      <UserAvatar name={comment.author} size={30} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ bgcolor: "#f5f5f5", borderRadius: 2, px: 1.5, py: 1 }}>
          <Typography variant="caption" fontWeight="bold">
            {comment.author}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            {comment.text}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, mt: 0.25, pl: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }}
            onClick={() => onLike(comment.id)}
          >
            {comment.likes > 0 ? `👍 ${comment.likes}` : "Like"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reply
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {timeAgo(comment.time)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Poll Display ─────────────────────────────────────────────────────────────

function PollDisplay({ post, onVote }) {
  const totalVotes = post.pollOptions.reduce((sum, o) => sum + o.votes, 0);
  return (
    <Box sx={{ mt: 1.5 }}>
      {post.pollOptions.map((option, i) => {
        const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
        const isVoted = post.votedOption === i;
        return (
          <Box
            key={i}
            onClick={() =>
              !post.votedOption && post.votedOption !== 0 ? onVote(post.id, i) : null
            }
            sx={{
              mb: 1,
              border: `2px solid ${isVoted ? "#1976d2" : "#e0e0e0"}`,
              borderRadius: 2,
              overflow: "hidden",
              cursor: post.votedOption === null ? "pointer" : "default",
              "&:hover": post.votedOption === null ? { borderColor: "#90caf9" } : {},
            }}
          >
            <Box sx={{ position: "relative", px: 1.5, py: 1 }}>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${pct}%`,
                  bgcolor: isVoted ? "rgba(25,118,210,0.1)" : "rgba(0,0,0,0.04)",
                  transition: "width 0.4s ease",
                }}
              />
              <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" fontWeight={isVoted ? "bold" : "normal"}>
                  {option.text}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pct}%
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
      <Typography variant="caption" color="text.secondary">
        {totalVotes} votes total
      </Typography>
    </Box>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ post }) {
  return (
    <Box
      sx={{ mt: 1.5, p: 2, bgcolor: "#e3f2fd", borderRadius: 2, borderLeft: "4px solid #1976d2" }}
    >
      <Typography variant="subtitle2" fontWeight="bold" color="primary">
        {post.content}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Event fontSize="small" color="primary" />
          <Typography variant="body2">{post.eventDate}</Typography>
        </Box>
        {post.eventTime && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTime fontSize="small" color="primary" />
            <Typography variant="body2">{post.eventTime}</Typography>
          </Box>
        )}
        {post.location && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <GroupWork fontSize="small" color="primary" />
            <Typography variant="body2">{post.location}</Typography>
          </Box>
        )}
      </Box>
      {Array.isArray(post.attendees) && post.attendees.length > 0 && (
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <AvatarGroup
            max={5}
            sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.6rem" } }}
          >
            {post.attendees.map((a) => (
              <Tooltip key={a} title={a}>
                <Avatar sx={{ bgcolor: getColor(a), width: 24, height: 24, fontSize: "0.6rem" }}>
                  {a.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Typography variant="caption" color="text.secondary">
            {post.attendees.length} attendees
          </Typography>
          <Button size="small" variant="outlined" sx={{ ml: "auto", py: 0.25, fontSize: "0.7rem" }}>
            RSVP
          </Button>
        </Box>
      )}
      {post.image && (
        <Box sx={{ mt: 1.5, borderRadius: 1.5, overflow: "hidden" }}>
          <Box
            component="img"
            src={post.image}
            alt="event image"
            sx={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block", borderRadius: 1.5, cursor: "pointer" }}
            onClick={() => window.open(post.image, "_blank")}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Work Report Card ─────────────────────────────────────────────────────────

function WorkReportCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box
      sx={{ mt: 1.5, p: 2, bgcolor: "#f3e5f5", borderRadius: 2, borderLeft: "4px solid #7b1fa2" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkOutline fontSize="small" sx={{ color: "#7b1fa2" }} />
          <Typography variant="subtitle2" fontWeight="bold" color="#7b1fa2">
            Work Report
          </Typography>
          <Chip
            label={post.reportPeriod}
            size="small"
            sx={{ bgcolor: "#e1bee7", fontSize: "0.65rem" }}
          />
        </Box>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          color: "text.secondary",
          display: "-webkit-box",
          WebkitLineClamp: expanded ? "none" : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {post.content}
      </Typography>
      <Collapse in={expanded}>
        {post.tasks && post.tasks.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">
              TASKS
            </Typography>
            {post.tasks.map((task, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
                {task.done ? (
                  <CheckCircle fontSize="small" color="success" />
                ) : (
                  <RadioButtonUnchecked fontSize="small" sx={{ color: "text.secondary" }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    textDecoration: task.done ? "line-through" : "none",
                    color: task.done ? "text.secondary" : "text.primary",
                  }}
                >
                  {task.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

// ─── Feed Post Card ───────────────────────────────────────────────────────────

function FeedPost({
  post,
  onLike,
  onComment,
  onCommentLike,
  onVote,
  onFollow,
  onBookmark,
  onDelete,
  currentUser,
}) {
  // Normalize snake_case / camelCase field names from backend
  const normalizedPost = {
    ...post,
    pollOptions: post.poll_options || post.pollOptions || [],
    votedOption: post.voted_option !== undefined ? post.voted_option : (post.votedOption !== undefined ? post.votedOption : null),
    comments:    Array.isArray(post.comments) ? post.comments : [],
    liked:       post.liked || (Array.isArray(post.liked_by) && currentUser && post.liked_by.includes(String(currentUser.id))),
    reportPeriod: post.report_period || post.reportPeriod || null,
    eventDate:   post.event_date || post.eventDate || null,
    eventTime:   post.event_time || post.eventTime || null,
  };
  const [showComments, setShowComments] = useState((normalizedPost.comments || []).length > 0);
  const [commentText, setCommentText] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <Card
      sx={{
        mb: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
        transition: "box-shadow 0.2s",
      }}
    >
      <CardContent sx={{ pb: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <UserAvatar name={post.author} size={42} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {post.author}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {post.role} · {timeAgo(post.time)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Chip
              size="small"
              label={post.following ? "Following" : "Follow"}
              onClick={() => onFollow(post.id)}
              icon={
                post.following ? (
                  <PersonRemove sx={{ fontSize: "14px !important" }} />
                ) : (
                  <PersonAdd sx={{ fontSize: "14px !important" }} />
                )
              }
              variant={post.following ? "filled" : "outlined"}
              sx={{ fontSize: "0.7rem", height: 24 }}
            />
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreHoriz fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        {(normalizedPost.type === "post" || !normalizedPost.type) && (
          <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 1 }}>
            {normalizedPost.content}
          </Typography>
        )}
        {normalizedPost.type === "work_report" && <WorkReportCard post={normalizedPost} />}
        {normalizedPost.type === "event" && <EventCard post={normalizedPost} />}
        {normalizedPost.type === "poll" && (
          <>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
              {normalizedPost.content}
            </Typography>
            <PollDisplay post={normalizedPost} onVote={onVote} />
          </>
        )}

        {/* Post image — skip for events since EventCard renders it internally */}
        {normalizedPost.image && normalizedPost.type !== "event" && (
          <Box sx={{ mt: 1.5, borderRadius: 2, overflow: "hidden", maxHeight: 400 }}>
            <Box
              component="img"
              src={normalizedPost.image}
              alt="post image"
              sx={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block", borderRadius: 2, cursor: "pointer" }}
              onClick={() => window.open(normalizedPost.image, "_blank")}
            />
          </Box>
        )}

        {/* Stats row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mt: 1.5,
            pt: 1,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          {normalizedPost.likes > 0 && (
            <Typography variant="caption" color="text.secondary">
              👍 {normalizedPost.likes}
            </Typography>
          )}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            {normalizedPost.comments.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                onClick={() => setShowComments(!showComments)}
              >
                {normalizedPost.comments.length} comment{normalizedPost.comments.length !== 1 ? "s" : ""}
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Visibility sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {normalizedPost.views}
              </Typography>
            </Box>
            {normalizedPost.bookmarked && <Bookmark sx={{ fontSize: 14, color: "warning.main" }} />}
          </Box>
        </Box>
      </CardContent>

      {/* Action Buttons */}
      <CardActions sx={{ px: 2, pt: 0.5, pb: 0.5, gap: 0.5 }}>
        <Button
          size="small"
          startIcon={<ThumbUp sx={{ fontSize: "16px !important" }} />}
          onClick={() => onLike(post.id)}
          sx={{
            color: normalizedPost.liked ? "primary.main" : "text.secondary",
            fontWeight: normalizedPost.liked ? "bold" : "normal",
            textTransform: "none",
            fontSize: "0.8rem",
          }}
        >
          Like{normalizedPost.liked ? "d" : ""}
        </Button>
        <Button
          size="small"
          startIcon={<Comment sx={{ fontSize: "16px !important" }} />}
          onClick={() => setShowComments(!showComments)}
          sx={{ color: "text.secondary", textTransform: "none", fontSize: "0.8rem" }}
        >
          Comment
        </Button>
        <Button
          size="small"
          startIcon={<Share sx={{ fontSize: "16px !important" }} />}
          sx={{ color: "text.secondary", textTransform: "none", fontSize: "0.8rem" }}
        >
          Share
        </Button>
      </CardActions>

      {/* Comments */}
      <Collapse in={showComments}>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          {normalizedPost.comments.map((c) => (
            <CommentItem key={c.id} comment={c} onLike={(cid) => onCommentLike(post.id, cid)} />
          ))}
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <UserAvatar name={currentUser?.name || "Me"} size={30} />
            <TextField
              size="small"
              fullWidth
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
              sx={{ "& fieldset": { borderRadius: 4 } }}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={handleComment} disabled={!commentText.trim()}>
                    <Send fontSize="small" />
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Box>
      </Collapse>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            onBookmark(post.id);
            setMenuAnchor(null);
          }}
        >
          <Bookmark fontSize="small" sx={{ mr: 1 }} />{" "}
          {post.bookmarked ? "Remove Bookmark" : "Bookmark"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
          }}
        >
          <Flag fontSize="small" sx={{ mr: 1 }} /> Report
        </MenuItem>
        <MenuItem
          onClick={() => {
            onFollow(post.id);
            setMenuAnchor(null);
          }}
        >
          <NotificationsOff fontSize="small" sx={{ mr: 1 }} />{" "}
          {post.following ? "Unfollow" : "Follow"}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onDelete(post.id);
            setMenuAnchor(null);
          }}
          sx={{ color: "error.main" }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}

// ─── Right Panel Widgets ──────────────────────────────────────────────────────

function OnlineUsersWidget({ users }) {
  const [showAll, setShowAll] = useState(false);
  const clockedIn = users.filter((u) => u.status === "clocked_in");
  const clockedOut = users.filter((u) => u.status === "clocked_out");
  const display = showAll ? users : users.slice(0, 8);

  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Online Users
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {users.length} total
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          <Chip
            icon={<Circle sx={{ fontSize: "10px !important", color: "#4caf50 !important" }} />}
            label={`Clocked In: ${clockedIn.length}`}
            size="small"
            sx={{ fontSize: "0.7rem", bgcolor: "#e8f5e9" }}
          />
          <Chip
            icon={<Circle sx={{ fontSize: "10px !important", color: "#9e9e9e !important" }} />}
            label={`Clocked Out: ${clockedOut.length}`}
            size="small"
            sx={{ fontSize: "0.7rem", bgcolor: "#f5f5f5" }}
          />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {display.map((u) => (
            <Tooltip
              key={u.name}
              title={`${u.name} (${u.status === "clocked_in" ? "Clocked In" : "Clocked Out"})`}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: u.status === "clocked_in" ? "#4caf50" : "#9e9e9e",
                      border: "1px solid white",
                    }}
                  />
                }
              >
                <UserAvatar name={u.name} size={32} />
              </Badge>
            </Tooltip>
          ))}
        </Box>
        {users.length > 8 && (
          <Button
            size="small"
            onClick={() => setShowAll(!showAll)}
            sx={{ mt: 1, p: 0, textTransform: "none", fontSize: "0.75rem" }}
          >
            {showAll ? "Show less" : `+${users.length - 8} more`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyPulseWidget() {
  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Company Pulse
          </Typography>
          <Tooltip title="Overall company activity score">
            <TrendingUp fontSize="small" color="success" />
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold" color="success.main">
            154
          </Typography>
          <Typography variant="body2" color="text.secondary">
            pts
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={9}
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: "#e0e0e0",
              "& .MuiLinearProgress-bar": { bgcolor: "#4caf50", borderRadius: 4 },
            }}
          />
          <Typography variant="caption" color="success.main" fontWeight="bold">
            +9%
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          vs last week — Keep it up! 🚀
        </Typography>
      </CardContent>
    </Card>
  );
}

function MyTasksWidget({ tasks }) {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("pending");

  // Map real task statuses to widget buckets
  const counts = {
    pending:     tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed:   tasks.filter((t) => t.status === "completed").length,
    overdue:     tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed").length,
  };

  const filtered = tasks.filter((t) => t.status === filter || (filter === "overdue" && t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed"));
  const priorityColor = { high: "error", medium: "warning", low: "success" };

  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            My Tasks
          </Typography>
          <IconButton
            size="small"
            sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1.5 }}>
          {[
            {
              key: "pending",
              label: "Pending",
              icon: <HourglassEmpty sx={{ fontSize: 16 }} />,
              color: "#1976d2",
            },
            {
              key: "in_progress",
              label: "In Progress",
              icon: <PeopleOutline sx={{ fontSize: 16 }} />,
              color: "#7b1fa2",
            },
            {
              key: "completed",
              label: "Done",
              icon: <AssignmentTurnedIn sx={{ fontSize: 16 }} />,
              color: "#2e7d32",
            },
            {
              key: "overdue",
              label: "Overdue",
              icon: <StarBorder sx={{ fontSize: 16 }} />,
              color: "#d32f2f",
            },
          ].map((item) => (
            <Box
              key={item.key}
              onClick={() => setFilter(item.key)}
              sx={{
                p: 1,
                borderRadius: 1.5,
                cursor: "pointer",
                textAlign: "center",
                bgcolor: filter === item.key ? `${item.color}15` : "#f5f5f5",
                border: `1px solid ${filter === item.key ? item.color : "transparent"}`,
                "&:hover": { bgcolor: `${item.color}10` },
              }}
            >
              <Box sx={{ color: item.color, display: "flex", justifyContent: "center", mb: 0.25 }}>
                {item.icon}
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: item.color, lineHeight: 1 }}>
                {counts[item.key]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ mb: 1 }} />
        {filtered.map((task) => (
          <Box key={task.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
            <RadioButtonUnchecked sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography
              variant="caption"
              sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {task.title}
            </Typography>
            <Chip
              label={task.priority}
              size="small"
              color={priorityColor[task.priority]}
              sx={{ fontSize: "0.6rem", height: 16 }}
            />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

function PopularPostsWidget({ posts, feedPosts, onScrollTo }) {
  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
          Popular Posts
        </Typography>
        {posts.map((post, i) => (
          <Box
            key={post.id}
            sx={{
              display: "flex",
              gap: 1,
              mb: 1,
              cursor: "pointer",
              "&:hover": { "& .title": { color: "primary.main" } },
            }}
          >
            <Typography
              variant="body2"
              fontWeight="bold"
              color="text.secondary"
              sx={{ minWidth: 18 }}
            >
              {i + 1}.
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Typography
                className="title"
                variant="caption"
                fontWeight="medium"
                sx={{ display: "block", transition: "color 0.15s" }}
              >
                {post.title}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {post.author}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, ml: "auto" }}>
                  <Visibility sx={{ fontSize: 11, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary">
                    {post.views}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

function BirthdaysWidget({ birthdays }) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <CakeOutlined fontSize="small" color="error" />
          <Typography variant="subtitle2" fontWeight="bold">
            Birthdays
          </Typography>
        </Box>
        {birthdays.map((b) => {
          const isToday = b.date === todayStr;
          return (
            <Box key={b.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <UserAvatar name={b.name} size={32} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="medium">
                  {b.name}
                </Typography>
                <Typography
                  variant="caption"
                  color={isToday ? "error.main" : "text.secondary"}
                  sx={{ display: "block" }}
                >
                  {isToday ? "🎂 Today!" : b.date}
                </Typography>
              </Box>
              {isToday && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ py: 0.25, fontSize: "0.65rem", minWidth: 0, px: 1 }}
                >
                  Wish!
                </Button>
              )}
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Stream Filter Bar ────────────────────────────────────────────────────────

function FilterBar({ filter, setFilter }) {
  const filters = ["All", "Mine", "Posts", "Events", "Polls", "Work Reports"];
  return (
    <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
      {filters.map((f) => (
        <Chip
          key={f}
          label={f}
          onClick={() => setFilter(f)}
          variant={filter === f ? "filled" : "outlined"}
          color={filter === f ? "primary" : "default"}
          size="small"
          sx={{ cursor: "pointer", fontWeight: filter === f ? "bold" : "normal" }}
        />
      ))}
    </Box>
  );
}

// ─── Notifications Widget ─────────────────────────────────────────────────────

function NotificationsWidget() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const typeColor = {
    task: "#1976d2", lead: "#8e24aa", deal: "#43a047", invoice: "#f4511e",
    mention: "#00897b", system: "#6d4c41", reminder: "#fb8c00",
  };
  const typeIcon = {
    task: "✅", lead: "👤", deal: "💰", invoice: "🧾",
    mention: "@", system: "⚙️", reminder: "⏰",
  };

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await notificationsAPI.getAll({ limit: 10 });
      setNotifs(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch (e) { setNotifs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <Card sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">Notifications</Typography>
            {unreadCount > 0 && (
              <Chip label={unreadCount} size="small" color="error" sx={{ height: 18, fontSize: "0.65rem", minWidth: 18 }} />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button size="small" sx={{ fontSize: "0.7rem", py: 0 }} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="caption" color="text.secondary">Loading...</Typography>
          </Box>
        ) : notifs.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No notifications</Typography>
        ) : notifs.map(n => (
          <Box key={n.id}
            onClick={() => !n.read && handleMarkRead(n.id)}
            sx={{
              display: "flex", alignItems: "flex-start", gap: 1, mb: 1, p: 1,
              borderRadius: 1, cursor: n.read ? "default" : "pointer",
              bgcolor: n.read ? "transparent" : "rgba(25,118,210,0.06)",
              "&:hover": { bgcolor: n.read ? "#f5f5f5" : "rgba(25,118,210,0.10)" },
            }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: (typeColor[n.type] || "#9e9e9e") + "22", fontSize: "0.9rem" }}>
              {typeIcon[n.type] || "•"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={n.read ? 400 : 600} sx={{ display: "block" }}>
                {n.message || n.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                {timeAgo(n.created_at || n.timestamp)}
              </Typography>
            </Box>
            {!n.read && (
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#1976d2", mt: 0.5, flexShrink: 0 }} />
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Stream Feed Component ───────────────────────────────────────────────

export default function StreamFeed() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [workReportOpen, setWorkReportOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });

  const showSnack = (msg, severity = "success") => setSnackbar({ open: true, msg, severity });

  // ── Load all data from real APIs ──────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    try {
      const data = await streamAPI.getPosts({ limit: 50 });
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadPosts();
    // Poll for new posts every 30s
    const t = setInterval(loadPosts, 30000);
    return () => clearInterval(t);
  }, [loadPosts]);

  useEffect(() => {
    // Online users from clock-in
    const loadOnline = () => timemanAPI.getOnlineUsers()
      .then(u => setOnlineUsers(Array.isArray(u) ? u.map(x => ({ name: x.user_name, status: "clocked_in" })) : []))
      .catch(() => {});
    loadOnline();
    const t = setInterval(loadOnline, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // My tasks — assigned to current user
    if (currentUser?.name) {
      tasksAPI.getAll({ assigned_to: currentUser.name })
        .then(data => setMyTasks(Array.isArray(data) ? data.slice(0, 6) : []))
        .catch(() => {});
    }
  }, [currentUser?.name]);

  useEffect(() => {
    streamAPI.getPopular().then(d => setPopularPosts(Array.isArray(d) ? d : [])).catch(() => {});
    streamAPI.getBirthdays().then(d => setBirthdays(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (filter === "All") return true;
    if (filter === "Mine") return p.author_id === String(currentUser?.id) || p.author === currentUser?.name;
    if (filter === "Posts") return p.type === "post";
    if (filter === "Events") return p.type === "event";
    if (filter === "Polls") return p.type === "poll";
    if (filter === "Work Reports") return p.type === "work_report";
    return true;
  });

  // Parse JSON string fields that come back raw from the server on insert
  const parsePost = (post) => {
    const j = (v) => { try { return typeof v === "string" ? JSON.parse(v || "[]") : (Array.isArray(v) ? v : []); } catch { return []; } };
    return { ...post, attendees: j(post.attendees), poll_options: j(post.poll_options), tasks: j(post.tasks), comments: j(post.comments), liked_by: j(post.liked_by) };
  };

  const handlePost = async (data) => {
    try {
      // Pick the first image attachment (if any) as the post image
      const attachments = data.attachments || [];
      const imageAttachment = attachments.find(a => a.fileType?.startsWith("image/"));
      const imageUrl = imageAttachment
        ? (imageAttachment.url?.startsWith("http") ? imageAttachment.url : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${imageAttachment.url}`)
        : null;

      const post = await streamAPI.createPost({
        type: data.type || "post",
        content: data.content || "",
        image: imageUrl,
        poll_options: data.pollOptions || data.poll_options || [],
        event_date: data.eventDate || data.event_date || null,
        event_time: data.eventTime || data.event_time || null,
        location: data.location || null,
        attendees: data.attendees || [],
        tasks: data.tasks || [],
        report_period: data.reportPeriod || null,
      });
      setPosts(prev => [{ ...parsePost(post), likes: 0, liked: false, views: 0 }, ...prev]);
      showSnack("Post published successfully!");
    } catch (e) { showSnack("Failed to publish post", "error"); }
  };

  const handleWorkReportSubmit = async (data) => {
    try {
      const post = await streamAPI.createPost({
        type: "work_report",
        content: data.reportText || "(No report text)",
        tasks: data.tasks || [],
        report_period: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
      // Also save as a work report in timeman
      try {
        await timemanAPI.submitReport({
          report_text: data.reportText,
          plan_text: data.planText,
          supervisor_id: data.supervisor,
          tasks: data.tasks,
          date: new Date().toISOString().split("T")[0],
        });
      } catch {}
      setPosts(prev => [{ ...parsePost(post), likes: 0, liked: false, views: 0 }, ...prev]);
      showSnack("Work report submitted to supervisor!");
      // Refresh my tasks after submitting report
      if (currentUser?.name) {
        tasksAPI.getAll({ assigned_to: currentUser.name })
          .then(d => setMyTasks(Array.isArray(d) ? d.slice(0, 6) : []))
          .catch(() => {});
      }
    } catch (e) { showSnack("Failed to submit work report", "error"); }
  };

  const handleLike = async (postId) => {
    try {
      const result = await streamAPI.likePost(postId);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: result.liked, likes: result.likes } : p
      ));
    } catch { showSnack("Failed to like post", "error"); }
  };

  const handleComment = async (postId, text) => {
    try {
      const comment = await streamAPI.addComment(postId, { text });
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p
      ));
    } catch { showSnack("Failed to add comment", "error"); }
  };

  const handleCommentLike = (postId, commentId) => {
    // Local only — no backend endpoint needed for comment likes
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: (p.comments || []).map(c => c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c) }
        : p
    ));
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      const result = await streamAPI.vote(postId, { option_index: optionIndex });
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, poll_options: result.poll_options, votedOption: optionIndex } : p
      ));
      showSnack("Vote recorded!");
    } catch { showSnack("Failed to record vote", "error"); }
  };

  const handleFollow = (postId) => {
    // Local toggle only
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, following: !p.following } : p));
  };

  const handleBookmark = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p));
    showSnack("Bookmark updated!");
  };

  const handleDelete = async (postId) => {
    try {
      await streamAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showSnack("Post deleted.", "info");
      streamAPI.getPopular().then(d => setPopularPosts(Array.isArray(d) ? d : [])).catch(() => {});
    } catch { showSnack("Failed to delete post", "error"); }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        <Grid container spacing={2.5}>
          {/* ── Main Feed ─────────────────────────── */}
          <Grid item xs={12} lg={8}>
            <PostComposer onPost={handlePost} onWorkReport={() => setWorkReportOpen(true)} currentUser={currentUser} />
            <FilterBar filter={filter} setFilter={setFilter} />
            {loading ? (
              <Card sx={{ p: 4, textAlign: "center" }}><CircularProgress size={28} /></Card>
            ) : filteredPosts.length === 0 ? (
              <Card sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No posts yet. Be the first to post something!</Typography>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onComment={handleComment}
                  onCommentLike={handleCommentLike}
                  onVote={handleVote}
                  onFollow={handleFollow}
                  onBookmark={handleBookmark}
                  onDelete={handleDelete}
                  currentUser={currentUser}
                />
              ))
            )}
          </Grid>

          {/* ── Right Panel ───────────────────────── */}
          <Grid item xs={12} lg={4}>
            <NotificationsWidget />
            <OnlineUsersWidget users={onlineUsers} />
            <CompanyPulseWidget />
            <MyTasksWidget tasks={myTasks} />
            <PopularPostsWidget posts={popularPosts} feedPosts={posts} />
            <BirthdaysWidget birthdays={birthdays} />
          </Grid>
        </Grid>
      </Box>

      {/* Work Report Modal */}
      <WorkReportModal
        open={workReportOpen}
        onClose={() => setWorkReportOpen(false)}
        onSubmit={handleWorkReportSubmit}
        currentUser={currentUser}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
