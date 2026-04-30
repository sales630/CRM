/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";
import { workgroupsAPI } from "services/api";
import { useAuth } from "context/AuthContext";
import {
  Box, Typography, Button, Chip, Avatar, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Divider, Tooltip,
  CircularProgress, Select, MenuItem, FormControl, InputLabel, Tabs, Tab,
  Card, Menu, Checkbox, Table, TableBody, TableCell, TableHead, TableRow,
  Alert, LinearProgress,
} from "@mui/material";
import {
  ArrowBack, Add, Close, Edit, Delete, Settings, DragIndicator,
  FlashOn, Bolt, MoreHoriz, Lock, Public, Search, PlayArrow, Stop,
  PushPin, KeyboardArrowDown, VideoCall, InfoOutlined, TuneOutlined,
  CheckCircle, AccessTime, ViewColumn, Refresh, PauseCircle,
} from "@mui/icons-material";
import ScrollableTable from "components/ScrollableTable";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const STAGE_COLORS = ["#3f51b5","#00bcd4","#4caf50","#ff9800","#9c27b0","#607d8b","#e91e63","#ff5722","#795548","#009688"];
const PRIORITY_COLORS = { high:"#f44336", medium:"#ff9800", low:"#4caf50" };
const ACTION_LABELS   = { send_notification:"Notification", create_task:"Create task", change_stage:"Change stage", edit_task:"Edit task" };

const ALL_COLUMNS = [
  { key:"stage",     label:"Kanban Stage" },
  { key:"active",    label:"Active" },
  { key:"deadline",  label:"Deadline" },
  { key:"createdBy", label:"Created By" },
  { key:"assignee",  label:"Assignee" },
  { key:"project",   label:"Project" },
  { key:"timeSpent", label:"Time Spent" },
  { key:"status",    label:"Status" },
  { key:"tags",      label:"Tags" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const getColor = (name = "U") => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0; for (let c of String(name)) s += c.charCodeAt(0);
  return C[s % C.length];
};

const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }
  catch { return d; }
};

const formatTime = (secs = 0) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

/* ─── StageBar — clickable pipeline with stage picker ───────────────────── */
function StageBar({ stages, currentStageId, onMove, taskId }) {
  const [anchor, setAnchor] = useState(null);
  const idx     = stages.findIndex(s => s.id === currentStageId);
  const current = stages[idx] || stages[0];

  return (
    <Box sx={{ minWidth: 140 }}>
      {/* Colored segments — click any segment to jump to that stage */}
      <Box sx={{ display:"flex", gap:"2px", mb:0.5 }}>
        {stages.map((s, i) => (
          <Tooltip key={s.id} title={s.name} placement="top" arrow>
            <Box
              onClick={() => onMove && onMove(taskId, s.id)}
              sx={{
                flex:1, height:6, borderRadius:2,
                bgcolor: i <= idx ? (current?.color || "#aaa") : "#e0e0e0",
                cursor: onMove ? "pointer" : "default",
                transition: "all .15s",
                "&:hover": onMove ? { opacity:0.7, transform:"scaleY(1.3)" } : {},
              }}
            />
          </Tooltip>
        ))}
      </Box>
      {/* Current stage name chip — click to open full stage menu */}
      <Chip
        label={current?.name || "—"}
        size="small"
        onClick={onMove ? e => setAnchor(e.currentTarget) : undefined}
        sx={{
          height:18, fontSize:"0.62rem",
          bgcolor:(current?.color || "#aaa") + "22",
          color: current?.color || "text.secondary",
          border:`1px solid ${(current?.color || "#aaa")}44`,
          fontWeight:"bold", cursor: onMove ? "pointer" : "default",
          "& .MuiChip-label": { px:0.75 },
        }}
      />
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
        PaperProps={{ sx:{ minWidth:220, py:0.5 } }}>
        <Typography variant="caption" sx={{ px:2, py:0.5, display:"block", color:"text.secondary", fontWeight:"bold", fontSize:"0.65rem", textTransform:"uppercase" }}>
          Move to stage
        </Typography>
        {stages.map(s => (
          <MenuItem key={s.id} selected={s.id === currentStageId}
            onClick={() => { onMove(taskId, s.id); setAnchor(null); }}
            sx={{ fontSize:"0.8rem", py:0.5 }}>
            <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:s.color, mr:1.5, flexShrink:0 }}/>
            {s.name}
            {s.id === currentStageId && <CheckCircle sx={{ fontSize:14, ml:"auto", color:"primary.main" }}/>}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

/* ─── DeadlineBadge ──────────────────────────────────────────────────────── */
function DeadlineBadge({ deadline }) {
  if (!deadline) return <Chip label="No deadline" size="small" sx={{ height:20, fontSize:"0.65rem", bgcolor:"#e0e0e0", color:"#666" }} />;
  const d = new Date(deadline), now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  const color = diff < 0 ? "#f44336" : diff < 3 ? "#ff9800" : "#4caf50";
  const label = d.toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  return <Chip label={label} size="small" sx={{ height:20, fontSize:"0.65rem", bgcolor:color+"22", color, fontWeight:"bold", border:`1px solid ${color}33` }} />;
}

/* ─── Task Timer button ──────────────────────────────────────────────────── */
function TaskTimer({ taskId, isRunning, seconds, onToggle }) {
  return (
    <Box sx={{ display:"flex", alignItems:"center", gap:0.4, cursor:"pointer", userSelect:"none" }}
      onClick={() => onToggle(taskId)}>
      <Box sx={{
        display:"flex", alignItems:"center", justifyContent:"center",
        width:18, height:18, borderRadius:"50%",
        bgcolor: isRunning ? "#f44336" : "#e8f5e9",
        border: isRunning ? "none" : "1px solid #4caf50",
        transition:"all .2s",
      }}>
        {isRunning
          ? <Stop sx={{ fontSize:10, color:"white" }}/>
          : <PlayArrow sx={{ fontSize:11, color:"#4caf50" }}/>}
      </Box>
      <Typography variant="caption" sx={{
        fontSize:"0.7rem", fontFamily:"monospace",
        color: isRunning ? "#f44336" : "text.secondary",
        fontWeight: isRunning ? "bold" : "normal",
        minWidth:38,
      }}>
        {formatTime(seconds)}
      </Typography>
    </Box>
  );
}

/* ─── Column Picker menu ─────────────────────────────────────────────────── */
function ColumnPicker({ visible, onChange, anchor, onClose }) {
  return (
    <Menu anchorEl={anchor} open={!!anchor} onClose={onClose}
      PaperProps={{ sx:{ width:210, py:1 } }}>
      <Box sx={{ px:2, pb:0.5, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize:"0.65rem", textTransform:"uppercase" }}>
          Visible Columns
        </Typography>
        <IconButton size="small" onClick={onClose}><Close sx={{ fontSize:14 }}/></IconButton>
      </Box>
      <Divider sx={{ mb:0.5 }}/>
      {/* Name is always locked */}
      <MenuItem dense disabled sx={{ py:0.25 }}>
        <Checkbox size="small" checked disabled sx={{ py:0.25, mr:0.5 }}/>
        <Typography variant="body2" sx={{ fontSize:"0.82rem", color:"text.disabled" }}>Name (always on)</Typography>
      </MenuItem>
      {ALL_COLUMNS.map(col => (
        <MenuItem key={col.key} dense onClick={() => onChange(col.key, !visible[col.key])} sx={{ py:0.25 }}>
          <Checkbox size="small" checked={!!visible[col.key]} sx={{ py:0.25, mr:0.5 }}/>
          <Typography variant="body2" sx={{ fontSize:"0.82rem" }}>{col.label}</Typography>
        </MenuItem>
      ))}
    </Menu>
  );
}

/* ─── Task Detail Dialog ─────────────────────────────────────────────────── */
function TaskDetailDialog({ task, stages, group, open, onClose, onSave, onDelete, timerSeconds }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) setForm({
      title:           task.title || "",
      description:     task.description || "",
      priority:        task.priority || "medium",
      assignee:        task.assignee || "",
      deadline:        task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : "",
      workgroup_stage: task.workgroup_stage || stages[0]?.id || "",
      status:          task.status || "pending",
    });
  }, [task]);

  if (!task) return null;
  const currentStage = stages.find(s => s.id === form.workgroup_stage) || stages[0];

  const handleSave = async () => {
    setSaving(true);
    await onSave(task.id, form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx:{ borderRadius:2 } }}>
      <DialogTitle sx={{ display:"flex", alignItems:"center", gap:1.5, pb:1.5, borderBottom:"1px solid #eee" }}>
        <Box sx={{ width:12, height:12, borderRadius:"50%", bgcolor:currentStage?.color || "#aaa", flexShrink:0 }}/>
        <Typography variant="h6" sx={{ flex:1, fontSize:"1rem", fontWeight:"bold", lineHeight:1.3 }}>{task.title}</Typography>
        <Chip
          label={currentStage?.name || "—"} size="small"
          sx={{ height:20, fontSize:"0.7rem", bgcolor:(currentStage?.color||"#aaa")+"22", color:currentStage?.color||"text.secondary",
            border:`1px solid ${(currentStage?.color||"#aaa")}44`, fontWeight:"bold" }}
        />
        <IconButton size="small" onClick={onClose}><Close/></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt:2.5 }}>
        <Grid container spacing={2.5}>
          {/* Left: editable fields */}
          <Grid item xs={8}>
            <TextField fullWidth size="small" label="Task Title *" value={form.title}
              onChange={e => setForm({ ...form, title:e.target.value })} sx={{ mb:2 }}/>
            <TextField fullWidth size="small" multiline rows={4} label="Description / Notes"
              value={form.description} onChange={e => setForm({ ...form, description:e.target.value })}
              placeholder="Add task description, instructions, or notes…" sx={{ mb:2 }}/>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kanban Stage</InputLabel>
                  <Select value={form.workgroup_stage} label="Kanban Stage"
                    onChange={e => setForm({ ...form, workgroup_stage:e.target.value })}>
                    {stages.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                          <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:s.color }}/>
                          {s.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={form.priority} label="Priority"
                    onChange={e => setForm({ ...form, priority:e.target.value })}>
                    <MenuItem value="high">🔴 High</MenuItem>
                    <MenuItem value="medium">🟡 Medium</MenuItem>
                    <MenuItem value="low">🟢 Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Assignee"
                  value={form.assignee} onChange={e => setForm({ ...form, assignee:e.target.value })}/>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Deadline" type="datetime-local"
                  InputLabelProps={{ shrink:true }} value={form.deadline}
                  onChange={e => setForm({ ...form, deadline:e.target.value })}/>
              </Grid>
            </Grid>
          </Grid>

          {/* Right: task metadata */}
          <Grid item xs={4}>
            <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1.5, p:1.75, border:"1px solid #eee" }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary"
                sx={{ fontSize:"0.65rem", textTransform:"uppercase", display:"block", mb:1.5 }}>
                Task Info
              </Typography>
              <Box sx={{ display:"flex", flexDirection:"column", gap:1.25 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>Created by</Typography>
                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5, mt:0.3 }}>
                    <Avatar sx={{ width:22, height:22, fontSize:"0.55rem", bgcolor:getColor(task.created_by||"U") }}>
                      {(task.created_by||"U").charAt(0)}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontSize:"0.76rem" }}>{task.created_by||"—"}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>Created on</Typography>
                  <Typography variant="caption" sx={{ fontSize:"0.75rem", display:"block", mt:0.2 }}>{fmtDate(task.created_at)||"—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>Last modified</Typography>
                  <Typography variant="caption" sx={{ fontSize:"0.75rem", display:"block", mt:0.2 }}>{fmtDate(task.updated_at)||"—"}</Typography>
                </Box>
                <Divider/>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>Time tracked</Typography>
                  <Typography variant="caption" sx={{ fontSize:"0.82rem", display:"block", mt:0.2, fontFamily:"monospace", color:"#4caf50", fontWeight:"bold" }}>
                    {formatTime(timerSeconds || task.time_spent || 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>Project</Typography>
                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5, mt:0.3 }}>
                    <Avatar sx={{ width:20, height:20, fontSize:"0.5rem", bgcolor:"#1976d2" }}>P</Avatar>
                    <Typography variant="caption" sx={{ fontSize:"0.72rem" }} noWrap>{group?.name||"—"}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px:3, py:2, borderTop:"1px solid #eee", gap:1 }}>
        <Button onClick={() => onDelete(task.id)} color="error"
          startIcon={<Delete sx={{ fontSize:16 }}/>} sx={{ mr:"auto", fontSize:"0.8rem" }}>
          Delete
        </Button>
        <Button onClick={onClose} sx={{ fontSize:"0.8rem" }}>Cancel</Button>
        <Button variant="contained" disabled={!form.title?.trim() || saving} onClick={handleSave}
          sx={{ fontSize:"0.8rem", minWidth:110 }}>
          {saving ? <CircularProgress size={16} sx={{ color:"inherit" }}/> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Rule Card ──────────────────────────────────────────────────────────── */
function RuleCard({ rule, onEdit, onDelete }) {
  const tc = rule.timing==="immediately" ? "#1565c0" : rule.timing==="by_condition" ? "#7b1fa2" : "#e65100";
  const ad = rule.action_data || {};
  return (
    <Box sx={{ bgcolor:"white", border:"1px solid #dce8f5", borderRadius:1, p:1, mb:0.75, position:"relative", boxShadow:"0 1px 2px rgba(0,0,0,0.05)" }}>
      <IconButton size="small" onClick={onDelete} sx={{ position:"absolute", right:2, top:2, p:0.25 }}>
        <Close sx={{ fontSize:11 }}/>
      </IconButton>
      <Chip label={rule.timing||"immediately"} size="small"
        sx={{ height:16, fontSize:"0.6rem", bgcolor:tc, color:"white", mb:0.5, borderRadius:0.5 }}/>
      <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize:"0.75rem" }}>
          {ACTION_LABELS[rule.action_type] || rule.name}
        </Typography>
        <IconButton size="small" sx={{ p:0.25 }} onClick={onEdit}><Edit sx={{ fontSize:11, color:"primary.main" }}/></IconButton>
      </Box>
      {(ad.to || ad.assignee) && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem" }}>to: </Typography>
          <Typography variant="caption" color="primary" sx={{ fontSize:"0.65rem", fontWeight:"medium" }}>
            {ad.to==="assignee"||ad.assignee==="assignee" ? "Assignee" : ad.to==="all_members" ? "All members" : ad.to||ad.assignee}
          </Typography>
        </Box>
      )}
      {ad.message && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.63rem", display:"block", mt:0.25, fontStyle:"italic" }}>
          "{ad.message.length > 60 ? ad.message.slice(0,60)+"…" : ad.message}"
        </Typography>
      )}
      <Box sx={{ display:"flex", justifyContent:"flex-end", mt:0.5 }}>
        <Typography variant="caption" color="primary" sx={{ cursor:"pointer", fontSize:"0.65rem", "&:hover":{ textDecoration:"underline" } }} onClick={onEdit}>edit</Typography>
      </Box>
    </Box>
  );
}

/* ─── Task Card (Kanban view) ────────────────────────────────────────────── */
function TaskCard({ task, onDragStart, onDragEnd, onDelete, stages, onMove, onTitleClick, isTimerRunning, timerSeconds, onTimerToggle }) {
  const [anchor, setAnchor] = useState(null);
  const pc = PRIORITY_COLORS[task.priority] || "#999";
  const over = task.deadline && new Date(task.deadline) < new Date();
  return (
    <Card draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      sx={{ mb:0.75, p:1, cursor:"grab", "&:active":{cursor:"grabbing"}, border:"1px solid #e8e8e8",
        boxShadow:"0 1px 3px rgba(0,0,0,0.08)", "&:hover":{boxShadow:"0 2px 8px rgba(0,0,0,0.14)"} }}>
      <Box sx={{ display:"flex", alignItems:"flex-start", gap:0.5 }}>
        <DragIndicator sx={{ fontSize:14, color:"#ccc", mt:0.3, flexShrink:0 }}/>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Typography variant="caption" fontWeight="medium"
            onClick={() => onTitleClick && onTitleClick(task)}
            sx={{ display:"block", lineHeight:1.4, mb:0.5, wordBreak:"break-word", cursor:"pointer",
              color:"#1565c0", "&:hover":{ textDecoration:"underline" } }}>
            {task.title}
          </Typography>
          <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:0.5 }}>
            <Chip label={task.priority||"medium"} size="small"
              sx={{ height:16, fontSize:"0.6rem", bgcolor:pc+"22", color:pc, fontWeight:"bold" }}/>
            {task.deadline && (
              <Typography variant="caption" sx={{ fontSize:"0.6rem", color:over?"#f44336":"text.secondary" }}>
                {over ? "⚠ " : ""}{new Date(task.deadline).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mt:0.5 }}>
            <TaskTimer taskId={task.id} isRunning={isTimerRunning} seconds={timerSeconds||0} onToggle={onTimerToggle}/>
            <Box sx={{ display:"flex", alignItems:"center", gap:0.25 }}>
              {task.assignee && (
                <Tooltip title={task.assignee}>
                  <Avatar sx={{ width:18, height:18, fontSize:"0.55rem", bgcolor:getColor(task.assignee) }}>
                    {task.assignee.charAt(0)}
                  </Avatar>
                </Tooltip>
              )}
              <IconButton size="small" sx={{ p:0.25 }} onClick={e => setAnchor(e.currentTarget)}>
                <MoreHoriz sx={{ fontSize:14 }}/>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onTitleClick && onTitleClick(task); setAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
          <Edit sx={{ fontSize:14, mr:1 }}/>View / Edit
        </MenuItem>
        <Typography variant="caption" sx={{ px:2, py:0.5, display:"block", color:"text.secondary", fontWeight:"bold" }}>Move to stage</Typography>
        {stages.map(s => (
          <MenuItem key={s.id} onClick={() => { onMove(task.id, s.id); setAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
            <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:s.color, mr:1, flexShrink:0 }}/>{s.name}
          </MenuItem>
        ))}
        <Divider/>
        <MenuItem onClick={() => { onDelete(task.id); setAnchor(null); }} sx={{ color:"error.main", fontSize:"0.8rem" }}>
          <Delete sx={{ fontSize:14, mr:1 }}/>Delete task
        </MenuItem>
      </Menu>
    </Card>
  );
}

/* ─── Deadline View ──────────────────────────────────────────────────────── */
function DeadlineView({ tasks, stages, onMove, onDelete, onTitleClick }) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tmrw  = new Date(today.getTime() + 86400000);
  const week  = new Date(today.getTime() + 7 * 86400000);

  const groups = [
    { key:"overdue", label:"Overdue",     color:"#f44336", tasks: tasks.filter(t => t.deadline && new Date(t.deadline) < now) },
    { key:"today",   label:"Today",       color:"#ff9800", tasks: tasks.filter(t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) < tmrw) },
    { key:"week",    label:"This Week",   color:"#4caf50", tasks: tasks.filter(t => t.deadline && new Date(t.deadline) >= tmrw && new Date(t.deadline) < week) },
    { key:"later",   label:"Later",       color:"#2196f3", tasks: tasks.filter(t => t.deadline && new Date(t.deadline) >= week) },
    { key:"none",    label:"No Deadline", color:"#9e9e9e", tasks: tasks.filter(t => !t.deadline) },
  ];

  return (
    <Box sx={{ py:1 }}>
      {groups.map(g => g.tasks.length === 0 ? null : (
        <Box key={g.key} sx={{ mb:2 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1, py:0.75, px:1.5, bgcolor:"#fafafa", borderLeft:`3px solid ${g.color}`, mb:0.5 }}>
            <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:g.color }}/>
            <Typography variant="caption" fontWeight="bold" sx={{ color:g.color, fontSize:"0.75rem" }}>{g.label}</Typography>
            <Chip label={g.tasks.length} size="small" sx={{ height:16, fontSize:"0.6rem", bgcolor:g.color+"22", color:g.color }}/>
          </Box>
          {g.tasks.map(task => {
            const stage = stages.find(s => s.id === task.workgroup_stage) || stages[0];
            return (
              <Box key={task.id} sx={{ display:"flex", alignItems:"center", gap:1.5, py:0.75, px:2.5,
                borderBottom:"1px solid #f0f0f0", "&:hover":{ bgcolor:"#f9f9f9" } }}>
                <Box sx={{ width:8, height:8, borderRadius:"50%", bgcolor:stage?.color||"#ccc", flexShrink:0 }}/>
                <Typography variant="body2"
                  onClick={() => onTitleClick && onTitleClick(task)}
                  sx={{ flex:1, fontSize:"0.82rem", cursor:"pointer", color:"#1565c0", "&:hover":{ textDecoration:"underline" } }}>
                  {task.title}
                </Typography>
                {task.assignee && (
                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                    <Avatar sx={{ width:20, height:20, fontSize:"0.55rem", bgcolor:getColor(task.assignee) }}>{task.assignee.charAt(0)}</Avatar>
                    <Typography variant="caption" sx={{ fontSize:"0.7rem" }}>{task.assignee}</Typography>
                  </Box>
                )}
                <DeadlineBadge deadline={task.deadline}/>
                <Chip label={stage?.name||"—"} size="small"
                  sx={{ height:18, fontSize:"0.6rem", bgcolor:(stage?.color||"#aaa")+"22", color:stage?.color||"text.secondary" }}/>
              </Box>
            );
          })}
        </Box>
      ))}
      {tasks.length === 0 && (
        <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>No tasks found</Box>
      )}
    </Box>
  );
}

/* ─── Feed Tab ───────────────────────────────────────────────────────────── */
function FeedTab({ groupId, stages }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    workgroupsAPI.getActivity(groupId)
      .then(d => { if (d?.tasks) setItems(d.tasks.slice(0, 20)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [groupId]);

  const getStage = id => stages.find(s => s.id === id);

  if (loading) return <Box sx={{ display:"flex", justifyContent:"center", py:8 }}><CircularProgress/></Box>;

  return (
    <Box sx={{ px:3, py:2 }}>
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:2 }}>
        <Typography variant="subtitle2" fontWeight="bold">Recent Activity</Typography>
        <Button size="small" startIcon={<Refresh sx={{ fontSize:14 }}/>} onClick={load}
          sx={{ textTransform:"none", fontSize:"0.75rem" }}>Refresh</Button>
      </Box>
      {items.length === 0 ? (
        <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>
          <Typography variant="body2">No activity yet. Create some tasks to get started.</Typography>
        </Box>
      ) : (
        <Box sx={{ maxWidth:700 }}>
          {items.map((task, i) => {
            const stage = getStage(task.workgroup_stage);
            const actor = task.updated_at && task.updated_at !== task.created_at ? task.assignee : task.created_by;
            const action = task.updated_at && task.updated_at !== task.created_at ? "updated task" : "created task";
            return (
              <Box key={task.id || i} sx={{ display:"flex", gap:2, mb:3 }}>
                <Avatar sx={{ width:36, height:36, flexShrink:0, bgcolor:getColor(actor||"U"), fontSize:"0.8rem" }}>
                  {(actor||"U").charAt(0)}
                </Avatar>
                <Box sx={{ flex:1 }}>
                  <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:0.5, flexWrap:"wrap" }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize:"0.82rem" }}>{actor||"System"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.7rem" }}>{action}</Typography>
                    {stage && (
                      <Chip label={stage.name} size="small"
                        sx={{ height:16, fontSize:"0.6rem", bgcolor:stage.color+"22", color:stage.color }}/>
                    )}
                  </Box>
                  <Box sx={{ bgcolor:"#f5f7fa", borderRadius:1, p:1.25, border:"1px solid #e8e8e8", cursor:"pointer",
                    "&:hover":{ bgcolor:"#eef2f7" } }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize:"0.82rem", mb:0.25 }}>{task.title}</Typography>
                    {task.assignee && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.7rem" }}>
                        Assignee: {task.assignee}
                      </Typography>
                    )}
                    {task.deadline && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.7rem", display:"block" }}>
                        Deadline: {fmtDate(task.deadline)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.65rem", mt:0.5, display:"block" }}>
                    {fmtDate(task.updated_at || task.created_at)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/* ─── Task Row (List view) ───────────────────────────────────────────────── */
function TaskRow({ task, stages, group, selected, onSelect, onMove, onDelete, onTitleClick,
  onTimerToggle, isTimerRunning, timerSeconds, visible }) {
  const [anchor, setAnchor] = useState(null);
  const pc = PRIORITY_COLORS[task.priority] || "#999";

  return (
    <TableRow hover selected={selected} sx={{ "&:hover .row-act":{ opacity:1 } }}>
      <TableCell padding="checkbox" sx={{ width:40 }}>
        <Checkbox size="small" checked={selected} onChange={onSelect}/>
      </TableCell>
      <TableCell sx={{ p:0.5, width:28 }}>
        <DragIndicator sx={{ fontSize:14, color:"#ccc", cursor:"grab", display:"block" }}/>
      </TableCell>

      {/* Name */}
      <TableCell sx={{ minWidth:220 }}>
        <Box>
          <Typography variant="body2"
            onClick={() => onTitleClick && onTitleClick(task)}
            sx={{ fontWeight:500, lineHeight:1.3, fontSize:"0.82rem", cursor:"pointer",
              color:"#1565c0", "&:hover":{ textDecoration:"underline" } }}>
            {task.title}
          </Typography>
          <Box sx={{ display:"flex", alignItems:"center", gap:0.75, mt:0.4 }}>
            <Chip label={task.priority||"medium"} size="small"
              sx={{ height:15, fontSize:"0.58rem", bgcolor:pc+"18", color:pc, fontWeight:"bold" }}/>
            <TaskTimer taskId={task.id} isRunning={isTimerRunning} seconds={timerSeconds||0} onToggle={onTimerToggle}/>
          </Box>
        </Box>
      </TableCell>

      {/* Kanban stage */}
      {visible.stage !== false && (
        <TableCell sx={{ width:165 }}>
          <StageBar stages={stages} currentStageId={task.workgroup_stage} onMove={onMove} taskId={task.id}/>
        </TableCell>
      )}
      {/* Active */}
      {visible.active !== false && (
        <TableCell sx={{ width:130 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize:"0.72rem" }}>
            {fmtDate(task.updated_at || task.created_at) || "—"}
          </Typography>
        </TableCell>
      )}
      {/* Deadline */}
      {visible.deadline !== false && (
        <TableCell sx={{ width:150 }}><DeadlineBadge deadline={task.deadline}/></TableCell>
      )}
      {/* Created by */}
      {visible.createdBy !== false && (
        <TableCell sx={{ width:130 }}>
          {task.created_by && (
            <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
              <Avatar sx={{ width:22, height:22, fontSize:"0.6rem", bgcolor:getColor(task.created_by) }}>{task.created_by.charAt(0)}</Avatar>
              <Typography variant="caption" sx={{ fontSize:"0.72rem" }}>{task.created_by}</Typography>
            </Box>
          )}
        </TableCell>
      )}
      {/* Assignee */}
      {visible.assignee !== false && (
        <TableCell sx={{ width:130 }}>
          {task.assignee && (
            <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
              <Avatar sx={{ width:22, height:22, fontSize:"0.6rem", bgcolor:getColor(task.assignee) }}>{task.assignee.charAt(0)}</Avatar>
              <Typography variant="caption" sx={{ fontSize:"0.72rem" }}>{task.assignee}</Typography>
            </Box>
          )}
        </TableCell>
      )}
      {/* Project */}
      {visible.project !== false && (
        <TableCell sx={{ width:170 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
            <Avatar sx={{ width:18, height:18, fontSize:"0.5rem", bgcolor:group.type==="project"?"#1976d2":"#7b1fa2" }}>
              {group.type==="project" ? "P" : "W"}
            </Avatar>
            <Typography variant="caption" sx={{ fontSize:"0.7rem", color:"text.secondary" }} noWrap>{group.name}</Typography>
          </Box>
        </TableCell>
      )}
      {/* Time Spent */}
      {visible.timeSpent && (
        <TableCell sx={{ width:90 }}>
          <Typography variant="caption" sx={{ fontSize:"0.7rem", fontFamily:"monospace", color:"#4caf50" }}>
            {formatTime(timerSeconds || task.time_spent || 0)}
          </Typography>
        </TableCell>
      )}
      {/* Status */}
      {visible.status && (
        <TableCell sx={{ width:100 }}>
          <Chip label={task.status||"pending"} size="small" sx={{ height:18, fontSize:"0.65rem" }}/>
        </TableCell>
      )}
      {/* Tags */}
      {visible.tags && <TableCell sx={{ width:100 }}/>}

      {/* Row actions */}
      <TableCell sx={{ p:0.5, width:46 }}>
        <IconButton size="small" className="row-act"
          sx={{ opacity:0, p:0.5, transition:"opacity .15s" }}
          onClick={e => setAnchor(e.currentTarget)}>
          <MoreHoriz sx={{ fontSize:16 }}/>
        </IconButton>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem onClick={() => { onTitleClick && onTitleClick(task); setAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
            <Edit sx={{ fontSize:14, mr:1 }}/>View / Edit
          </MenuItem>
          <Divider/>
          <Typography variant="caption" sx={{ px:2, py:0.5, display:"block", color:"text.secondary", fontWeight:"bold" }}>
            Move to stage
          </Typography>
          {stages.map(s => (
            <MenuItem key={s.id} onClick={() => { onMove(task.id, s.id); setAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
              <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:s.color, mr:1 }}/>{s.name}
            </MenuItem>
          ))}
          <Divider/>
          <MenuItem onClick={() => { onDelete(task.id); setAnchor(null); }} sx={{ color:"error.main", fontSize:"0.8rem" }}>
            <Delete sx={{ fontSize:14, mr:1 }}/>Delete
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function WorkgroupDetail({ group, onBack }) {
  const { currentUser } = useAuth();
  const isAdmin = ["admin", "super_admin", "team_leader"].includes(currentUser?.role);

  /* ── View state ─────────────────────────────────────────────────────── */
  const [mainTab, setMainTab]   = useState(0);  // 0=Tasks 1=Feed 2=Calendar ...
  const [subView, setSubView]   = useState("list");
  const [autoOpen, setAutoOpen] = useState(false);

  /* ── Data ──────────────────────────────────────────────────────────── */
  const [stages,   setStages]   = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  /* ── List-view state ───────────────────────────────────────────────── */
  const [selected,      setSelected]      = useState([]);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterRole,    setFilterRole]    = useState("");
  const [roleAnchor,    setRoleAnchor]    = useState(null);

  /* ── Timer state ───────────────────────────────────────────────────── */
  const [taskTimes,    setTaskTimes]    = useState({}); // { taskId: seconds }
  const [activeTimer,  setActiveTimer]  = useState(null);
  const timerRef = useRef(null);

  /* ── Column visibility ─────────────────────────────────────────────── */
  const [visibleCols, setVisibleCols] = useState({
    stage:true, active:true, deadline:true, createdBy:true,
    assignee:true, project:true, timeSpent:false, status:false, tags:false,
  });
  const [colPickerAnchor, setColPickerAnchor] = useState(null);

  /* ── Task detail ───────────────────────────────────────────────────── */
  const [taskDetail, setTaskDetail] = useState(null);

  /* ── Seed state ────────────────────────────────────────────────────── */
  const [seeding,  setSeeding]  = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  /* ── Drag state ────────────────────────────────────────────────────── */
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  /* ── Stage dialogs ─────────────────────────────────────────────────── */
  const [stageDialog, setStageDialog] = useState(false);
  const [editStage,   setEditStage]   = useState(null);
  const [stageForm,   setStageForm]   = useState({ name:"", color:STAGE_COLORS[0] });

  /* ── Task dialog (add new) ──────────────────────────────────────────── */
  const [taskDialog, setTaskDialog] = useState(null);
  const [taskForm,   setTaskForm]   = useState({ title:"", assignee:"", priority:"medium", deadline:"", description:"" });

  /* ── Trigger dialogs ───────────────────────────────────────────────── */
  const [triggerDialog, setTriggerDialog] = useState(null);
  const [triggerForm,   setTriggerForm]   = useState({ name:"", type:"stage_enter" });

  /* ── Rule dialogs ──────────────────────────────────────────────────── */
  const [ruleDialog, setRuleDialog] = useState(null);
  const dfRuleForm = { name:"Notification", timing:"immediately", timing_value:0, timing_unit:"hours",
    action_type:"send_notification", action_data:{ to:"assignee", message:"" }, condition:"" };
  const [ruleForm, setRuleForm] = useState(dfRuleForm);

  /* ── Load ───────────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    if (!group) return;
    setLoading(true);
    Promise.all([
      workgroupsAPI.getStages(group.id).catch(() => []),
      workgroupsAPI.getTasks(group.id).catch(() => []),
      workgroupsAPI.getTriggers(group.id).catch(() => []),
      workgroupsAPI.getAutomationRules(group.id).catch(() => []),
    ]).then(([s, t, tr, r]) => {
      setStages(Array.isArray(s) ? s : []);
      setTasks(Array.isArray(t) ? t : []);
      setTriggers(Array.isArray(tr) ? tr : []);
      const loadedRules = Array.isArray(r) ? r : [];
      setRules(loadedRules);
      // Auto-open automation panel when rules exist and admin is viewing
      if (loadedRules.length > 0) setAutoOpen(true);
    }).finally(() => setLoading(false));
  }, [group]);

  useEffect(() => { load(); }, [load]);

  // Init timer state from loaded tasks
  useEffect(() => {
    const times = {};
    tasks.forEach(t => { if (t.time_spent) times[t.id] = Number(t.time_spent) || 0; });
    setTaskTimes(prev => ({ ...times, ...prev }));
  }, [tasks]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* ── Timer toggle ──────────────────────────────────────────────────── */
  const toggleTimer = useCallback((taskId) => {
    if (activeTimer === taskId) {
      clearInterval(timerRef.current);
      const secs = taskTimes[taskId] || 0;
      setActiveTimer(null);
      workgroupsAPI.updateTask(group.id, taskId, { time_spent: secs }).catch(() => {});
    } else {
      if (activeTimer && timerRef.current) {
        clearInterval(timerRef.current);
        const prev = taskTimes[activeTimer] || 0;
        workgroupsAPI.updateTask(group.id, activeTimer, { time_spent: prev }).catch(() => {});
      }
      setActiveTimer(taskId);
      timerRef.current = setInterval(() => {
        setTaskTimes(p => ({ ...p, [taskId]: (p[taskId] || 0) + 1 }));
      }, 1000);
    }
  }, [activeTimer, taskTimes, group?.id]);

  /* ── Stage handlers ─────────────────────────────────────────────────── */
  const saveStage = async () => {
    try {
      const ns = editStage
        ? stages.map(s => s.id === editStage.id ? { ...s, ...stageForm } : s)
        : [...stages, { id:`stage-${Date.now()}`, ...stageForm }];
      await workgroupsAPI.updateStages(group.id, ns);
      setStages(ns); setStageDialog(false); setEditStage(null);
      setStageForm({ name:"", color:STAGE_COLORS[0] });
    } catch (e) { console.error(e); }
  };
  const delStage = async id => {
    if (stages.length <= 1) return;
    const ns = stages.filter(s => s.id !== id);
    await workgroupsAPI.updateStages(group.id, ns).catch(() => {});
    setStages(ns);
  };

  /* ── Task handlers ──────────────────────────────────────────────────── */
  const createTask = async (stageId) => {
    try {
      const task = await workgroupsAPI.createTask(group.id, { ...taskForm, stage_id:stageId || stages[0]?.id });
      setTasks(p => [...p, task]);
      setTaskDialog(null);
      setTaskForm({ title:"", assignee:"", priority:"medium", deadline:"", description:"" });
    } catch (e) { console.error(e); }
  };

  const moveTask = async (taskId, stageId) => {
    setTasks(p => p.map(t => t.id === taskId ? { ...t, workgroup_stage:stageId } : t));
    try { await workgroupsAPI.moveTask(group.id, taskId, stageId); } catch { load(); }
  };

  const delTask = async id => {
    if (activeTimer === id) { clearInterval(timerRef.current); setActiveTimer(null); }
    setTasks(p => p.filter(t => t.id !== id));
    try { await workgroupsAPI.deleteTask(group.id, id); } catch { load(); }
  };

  const saveTaskDetail = async (taskId, form) => {
    try {
      const updated = await workgroupsAPI.updateTask(group.id, taskId, {
        ...form, assigned_to: form.assignee,
      });
      const task = tasks.find(t => t.id === taskId);
      if (form.workgroup_stage && form.workgroup_stage !== task?.workgroup_stage) {
        await workgroupsAPI.moveTask(group.id, taskId, form.workgroup_stage).catch(() => {});
      }
      setTasks(p => p.map(t => t.id === taskId ? { ...t, ...form, ...(updated || {}) } : t));
      setTaskDetail(null);
    } catch (e) { console.error(e); }
  };

  /* ── Drag handlers ──────────────────────────────────────────────────── */
  const onDragStart = id => e => { setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = sid => e => { e.preventDefault(); setDragOver(sid); };
  const onDrop      = sid => e => { e.preventDefault(); if (dragging) moveTask(dragging, sid); setDragging(null); setDragOver(null); };
  const onDragEnd   = () => { setDragging(null); setDragOver(null); };

  /* ── Trigger handlers ───────────────────────────────────────────────── */
  const createTrigger = async () => {
    try {
      const t = await workgroupsAPI.createTrigger(group.id, { ...triggerForm, stage_id:triggerDialog });
      setTriggers(p => [...p, t]); setTriggerDialog(null);
      setTriggerForm({ name:"", type:"stage_enter" });
    } catch (e) { console.error(e); }
  };
  const delTrigger = async id => {
    setTriggers(p => p.filter(t => t.id !== id));
    workgroupsAPI.deleteTrigger(group.id, id).catch(() => load());
  };

  /* ── Rule handlers ──────────────────────────────────────────────────── */
  const saveRule = async () => {
    try {
      const payload = { ...ruleForm, stage:ruleDialog.stage_id };
      if (ruleDialog.rule) {
        const u = await workgroupsAPI.updateAutomationRule(group.id, ruleDialog.rule.id, payload);
        setRules(p => p.map(r => r.id === ruleDialog.rule.id ? u : r));
      } else {
        const n = await workgroupsAPI.createAutomationRule(group.id, payload);
        setRules(p => [...p, n]);
      }
      setRuleDialog(null);
    } catch (e) { console.error(e); }
  };
  const delRule = async id => {
    setRules(p => p.filter(r => r.id !== id));
    workgroupsAPI.deleteAutomationRule(group.id, id).catch(() => load());
  };

  /* ── Seed demo data ─────────────────────────────────────────────────── */
  const seedDemo = async () => {
    setSeeding(true);
    try {
      const result = await workgroupsAPI.seed(group.id);
      if (result?.stages) setStages(result.stages);
      await load();
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 4000);
    } catch (e) { console.error(e); }
    setSeeding(false);
  };

  if (!group) return null;

  /* ── Derived data ───────────────────────────────────────────────────── */
  const memberList = (() => {
    try {
      const m = typeof group.members === "string" ? JSON.parse(group.members) : group.members;
      return Array.isArray(m) ? m : [];
    } catch { return []; }
  })();

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && t.workgroup_stage !== filterStatus) return false;
    if (filterRole && t.assignee !== filterRole) return false;
    return true;
  });

  const tasksByStage = {};
  stages.forEach(s => { tasksByStage[s.id] = []; });
  tasks.forEach(t => {
    const sid = t.workgroup_stage;
    if (sid && tasksByStage[sid]) tasksByStage[sid].push(t);
    else if (stages.length > 0) (tasksByStage[stages[0].id] = tasksByStage[stages[0].id] || []).push(t);
  });

  const triggersByStage = {}, rulesByStage = {};
  stages.forEach(s => { triggersByStage[s.id] = []; rulesByStage[s.id] = []; });
  triggers.forEach(t => { if (triggersByStage[t.stage_id]) triggersByStage[t.stage_id].push(t); });
  rules.forEach(r => { if (rulesByStage[r.stage]) rulesByStage[r.stage].push(r); });

  const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length;
  const toggleSelect = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll    = () => setSelected(p => p.length === filteredTasks.length ? [] : filteredTasks.map(t => t.id));

  // Dynamic colSpan: checkbox + drag + name + visible columns + actions
  const colSpan = 3
    + (visibleCols.stage     !== false ? 1 : 0)
    + (visibleCols.active    !== false ? 1 : 0)
    + (visibleCols.deadline  !== false ? 1 : 0)
    + (visibleCols.createdBy !== false ? 1 : 0)
    + (visibleCols.assignee  !== false ? 1 : 0)
    + (visibleCols.project   !== false ? 1 : 0)
    + (visibleCols.timeSpent ? 1 : 0)
    + (visibleCols.status    ? 1 : 0)
    + (visibleCols.tags      ? 1 : 0)
    + 1;

  /* ── Unique assignees for "All roles" filter ───────────────────────── */
  const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ mx:-2, mt:-2 }}>

      {/* ── PROJECT HEADER ── */}
      <Box sx={{ background:"linear-gradient(135deg,#1565c0 0%,#1976d2 60%,#42a5f5 100%)", px:3, pt:2, pb:0, color:"white" }}>
        <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:1.5 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
            <IconButton onClick={onBack} size="small" sx={{ color:"rgba(255,255,255,0.8)", "&:hover":{color:"white"} }}>
              <ArrowBack fontSize="small"/>
            </IconButton>
            <Avatar sx={{ bgcolor:"rgba(255,255,255,0.2)", width:36, height:36, fontSize:"0.9rem", fontWeight:"bold" }}>
              {group.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ lineHeight:1.2, fontSize:"1rem" }}>{group.name}</Typography>
              <Box sx={{ display:"flex", alignItems:"center", gap:1, mt:0.25 }}>
                {group.privacy === "Private"
                  ? <Lock sx={{ fontSize:12, opacity:0.8 }}/>
                  : <Public sx={{ fontSize:12, opacity:0.8 }}/>}
                <Typography variant="caption" sx={{ opacity:0.8, fontSize:"0.7rem" }}>
                  {group.type} · {group.privacy}
                </Typography>
                <Box sx={{ display:"flex", ml:0.5 }}>
                  {memberList.slice(0, 5).map((m, i) => (
                    <Tooltip key={m} title={m}>
                      <Avatar sx={{ width:20, height:20, fontSize:"0.55rem", bgcolor:getColor(m), ml:i?-0.5:0, border:"1.5px solid rgba(255,255,255,0.5)" }}>
                        {m.charAt(0)}
                      </Avatar>
                    </Tooltip>
                  ))}
                  {memberList.length > 5 && (
                    <Avatar sx={{ width:20, height:20, fontSize:"0.5rem", bgcolor:"rgba(0,0,0,0.2)", ml:-0.5, border:"1.5px solid rgba(255,255,255,0.4)" }}>
                      +{memberList.length-5}
                    </Avatar>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display:"flex", gap:1 }}>
            <Button size="small" variant="contained" startIcon={<VideoCall sx={{ fontSize:14 }}/>}
              sx={{ bgcolor:"rgba(255,255,255,0.2)", color:"white", textTransform:"none", fontSize:"0.75rem",
                "&:hover":{ bgcolor:"rgba(255,255,255,0.3)" } }}>
              Video call
            </Button>
            <Button size="small" variant="outlined" startIcon={<InfoOutlined sx={{ fontSize:14 }}/>}
              onClick={() => setMainTab(4)}
              sx={{ borderColor:"rgba(255,255,255,0.4)", color:"white", textTransform:"none", fontSize:"0.75rem",
                "&:hover":{ borderColor:"white" } }}>
              About project
            </Button>
            {isAdmin && (
              <Tooltip title="Manage stages">
                <IconButton size="small" sx={{ color:"rgba(255,255,255,0.7)" }}
                  onClick={() => { setEditStage(null); setStageForm({ name:"", color:STAGE_COLORS[0] }); setStageDialog(true); }}>
                  <Settings fontSize="small"/>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Main nav tabs */}
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}
          TabIndicatorProps={{ style:{ backgroundColor:"white", height:3 } }}
          sx={{ minHeight:36, "& .MuiTab-root":{ color:"rgba(255,255,255,0.7)", minHeight:36, fontSize:"0.82rem",
            textTransform:"none", "&.Mui-selected":{ color:"white", fontWeight:"bold" } } }}>
          <Tab label="Tasks"/>
          <Tab label="Feed"/>
          <Tab label="Drive"/>
          <Tab label="More"/>
        </Tabs>
      </Box>

      {/* ── TASKS PANEL ── */}
      {mainTab === 0 && (
        <Box sx={{ px:3, pt:2 }}>

          {/* Seed success banner */}
          {seedDone && (
            <Alert severity="success" sx={{ mb:1.5 }} onClose={() => setSeedDone(false)}>
              Demo data loaded — 3 sample tasks, 6 accounting stages, and 4 automation rules added!
            </Alert>
          )}

          {/* Toolbar */}
          <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:1.5, flexWrap:"wrap" }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
              <PushPin sx={{ fontSize:16, color:"#666" }}/>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize:"0.95rem" }}>Workgroup tasks</Typography>
            </Box>
            <Box sx={{ display:"flex", gap:0.75, ml:1, flexWrap:"wrap" }}>
              <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize:14 }}/>}
                onClick={() => { setTaskDialog(stages[0]?.id || ""); setTaskForm({ title:"", assignee:"", priority:"medium", deadline:"", description:"" }); }}
                sx={{ textTransform:"none", fontSize:"0.8rem", bgcolor:"#2ecc71", "&:hover":{ bgcolor:"#27ae60" }, px:1.5 }}>
                + Create
              </Button>

              {/* All roles / assignee filter */}
              <Button variant="outlined" size="small" endIcon={<KeyboardArrowDown sx={{ fontSize:14 }}/>}
                onClick={e => setRoleAnchor(e.currentTarget)}
                sx={{ textTransform:"none", fontSize:"0.75rem", borderColor:filterRole?"#1565c0":"#ccc",
                  color:filterRole?"#1565c0":"#555", px:1 }}>
                {filterRole || "All roles"}
              </Button>
              <Menu anchorEl={roleAnchor} open={!!roleAnchor} onClose={() => setRoleAnchor(null)}>
                <MenuItem onClick={() => { setFilterRole(""); setRoleAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
                  <CheckCircle sx={{ fontSize:14, mr:1, opacity: filterRole?"0":"1", color:"primary.main" }}/>
                  All roles
                </MenuItem>
                {assignees.map(a => (
                  <MenuItem key={a} onClick={() => { setFilterRole(a); setRoleAnchor(null); }} sx={{ fontSize:"0.8rem" }}>
                    <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                      <Avatar sx={{ width:20, height:20, fontSize:"0.55rem", bgcolor:getColor(a) }}>{a.charAt(0)}</Avatar>
                      {a}
                      {filterRole === a && <CheckCircle sx={{ fontSize:14, ml:"auto", color:"primary.main" }}/>}
                    </Box>
                  </MenuItem>
                ))}
              </Menu>

              {isAdmin && tasks.length === 0 && !seeding && (
                <Button variant="outlined" size="small" startIcon={<Refresh sx={{ fontSize:13 }}/>}
                  onClick={seedDemo}
                  sx={{ textTransform:"none", fontSize:"0.75rem", borderColor:"#ff9800", color:"#e65100", px:1 }}>
                  Load demo data
                </Button>
              )}
              {seeding && <CircularProgress size={18} sx={{ ml:0.5 }}/>}
            </Box>

            {/* Stage filter chips */}
            <Box sx={{ display:"flex", gap:0.5, flexWrap:"wrap" }}>
              {filterStatus && (
                <Chip
                  label={stages.find(s => s.id === filterStatus)?.name || filterStatus}
                  onDelete={() => setFilterStatus("")}
                  size="small"
                  sx={{ height:24, fontSize:"0.72rem", bgcolor:"#e3f2fd", color:"#1565c0", border:"1px solid #90caf9" }}
                />
              )}
              <Chip label="+ filter" size="small" variant="outlined"
                sx={{ height:24, fontSize:"0.72rem", cursor:"pointer" }}
                onClick={e => {}}/>
            </Box>

            {/* Search */}
            <Box sx={{ display:"flex", alignItems:"center", border:"1px solid #ddd", borderRadius:1, px:1,
              bgcolor:"white", ml:"auto" }}>
              <Search sx={{ fontSize:16, color:"#aaa", mr:0.5 }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search…"
                style={{ border:"none", outline:"none", fontSize:"0.8rem", width:150, background:"transparent" }}/>
              {search && <Close sx={{ fontSize:14, color:"#aaa", cursor:"pointer" }} onClick={() => setSearch("")}/>}
            </Box>

            {/* Column picker */}
            <Tooltip title="Column settings">
              <IconButton size="small" sx={{ color: colPickerAnchor ? "#1565c0" : "#666" }}
                onClick={e => setColPickerAnchor(e.currentTarget)}>
                <ViewColumn fontSize="small"/>
              </IconButton>
            </Tooltip>
            <ColumnPicker
              visible={visibleCols}
              onChange={(key, val) => setVisibleCols(p => ({ ...p, [key]:val }))}
              anchor={colPickerAnchor}
              onClose={() => setColPickerAnchor(null)}
            />

            {/* Stage settings */}
            <Tooltip title="Manage stages">
              <IconButton size="small" sx={{ color:"#666" }} onClick={() => setStageDialog(true)}>
                <TuneOutlined fontSize="small"/>
              </IconButton>
            </Tooltip>

            {/* Automation toggle */}
            {isAdmin && (
              <Tooltip title="Automation rules">
                <IconButton size="small" sx={{ color: autoOpen ? "#1565c0" : "#666" }} onClick={() => setAutoOpen(!autoOpen)}>
                  <Bolt fontSize="small"/>
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Sub-nav */}
          <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"2px solid #e0e0e0", mb:0 }}>
            <Box sx={{ display:"flex", gap:0 }}>
              {[
                { key:"list",     label:"List" },
                { key:"kanban",   label:"Kanban" },
                { key:"deadline", label:"Deadline" },
                { key:"planner",  label:"Planner" },
                { key:"gantt",    label:"Gantt" },
              ].map(v => (
                <Button key={v.key} size="small" onClick={() => setSubView(v.key)}
                  sx={{
                    textTransform:"none", fontSize:"0.8rem", px:1.5, py:0.75,
                    borderRadius:0, minHeight:34,
                    color: subView === v.key ? "#1565c0" : "#666",
                    fontWeight: subView === v.key ? "bold" : "normal",
                    borderBottom: subView === v.key ? "2px solid #1565c0" : "2px solid transparent",
                    mb:"-2px",
                  }}>
                  {v.label}
                </Button>
              ))}
            </Box>
            <Box sx={{ display:"flex", alignItems:"center", gap:2, pr:1, pb:"2px" }}>
              <Box sx={{ display:"flex", gap:0.75, alignItems:"center" }}>
                <Chip label={`${tasks.length} tasks`} size="small" variant="outlined"
                  sx={{ height:20, fontSize:"0.65rem" }}/>
                <Chip label={`${overdueCount} Overdue`} size="small" variant="outlined"
                  sx={{ height:20, fontSize:"0.65rem",
                    color: overdueCount > 0 ? "#f44336" : "inherit",
                    borderColor: overdueCount > 0 ? "#f44336" : "inherit" }}/>
                <Chip label={`${rules.length} Automation rules`} size="small" variant="outlined"
                  sx={{ height:20, fontSize:"0.65rem", cursor:"pointer",
                    color: autoOpen ? "#1565c0" : "inherit",
                    borderColor: autoOpen ? "#1565c0" : "inherit" }}
                  onClick={() => isAdmin && setAutoOpen(!autoOpen)}/>
              </Box>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display:"flex", justifyContent:"center", py:8 }}><CircularProgress/></Box>
          ) : (
            <>
              {/* ════════ AUTOMATION PANEL ════════ */}
              {autoOpen && isAdmin && (
                <Box sx={{ bgcolor:"#f7fbff", border:"1px solid #dce8f5", borderRadius:1, p:2, mb:2, mt:1 }}>
                  <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:1.5 }}>
                    <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                      <Bolt sx={{ color:"#1565c0" }}/>
                      <Typography variant="subtitle2" fontWeight="bold">Automation Rules & Triggers</Typography>
                      <Chip label={`${rules.length} rules`} size="small"
                        sx={{ height:18, fontSize:"0.65rem", bgcolor:"#e3f2fd", color:"#1565c0" }}/>
                    </Box>
                    <IconButton size="small" onClick={() => setAutoOpen(false)}><Close fontSize="small"/></IconButton>
                  </Box>
                  <Box sx={{ overflowX:"auto" }}>
                    <Box sx={{ display:"flex", gap:0, minWidth:"max-content", alignItems:"flex-start" }}>
                      {stages.map((stage, idx) => {
                        const stT = triggersByStage[stage.id] || [];
                        const stR = rulesByStage[stage.id] || [];
                        return (
                          <Box key={stage.id} sx={{ display:"flex", alignItems:"flex-start" }}>
                            <Box sx={{ width:240, flexShrink:0 }}>
                              <Box sx={{ bgcolor:stage.color, px:1.5, py:1, borderRadius:"6px 6px 0 0" }}>
                                <Typography variant="body2" fontWeight="bold" color="white">{stage.name}</Typography>
                              </Box>
                              <Box sx={{ border:"1px solid #dce8f5", borderTop:"none", borderRadius:"0 0 6px 6px", bgcolor:"white" }}>
                                {/* Triggers */}
                                <Box sx={{ p:1.25, borderBottom:"1px dashed #cde" }}>
                                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5, mb:0.75 }}>
                                    <FlashOn sx={{ fontSize:13, color:"#f57c00" }}/>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary"
                                      sx={{ fontSize:"0.67rem", textTransform:"uppercase" }}>Triggers</Typography>
                                  </Box>
                                  {stT.map(tr => (
                                    <Box key={tr.id} sx={{ bgcolor:"#fff8f0", border:"1px solid #ffe0b2", borderRadius:1,
                                      p:0.75, mb:0.5, display:"flex", alignItems:"center" }}>
                                      <FlashOn sx={{ fontSize:12, color:"#f57c00", mr:0.5, flexShrink:0 }}/>
                                      <Typography variant="caption" sx={{ flex:1, fontSize:"0.7rem" }}>{tr.name}</Typography>
                                      <IconButton size="small" onClick={() => delTrigger(tr.id)} sx={{ p:0.25 }}>
                                        <Close sx={{ fontSize:11 }}/>
                                      </IconButton>
                                    </Box>
                                  ))}
                                  <Button size="small" startIcon={<Add sx={{ fontSize:12 }}/>}
                                    onClick={() => { setTriggerDialog(stage.id); setTriggerForm({ name:"", type:"stage_enter" }); }}
                                    sx={{ fontSize:"0.68rem", py:0.25, textTransform:"none", color:"#e65100" }}>
                                    Add trigger
                                  </Button>
                                </Box>
                                {/* Rules */}
                                <Box sx={{ p:1.25 }}>
                                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5, mb:0.75 }}>
                                    <Bolt sx={{ fontSize:13, color:"#1565c0" }}/>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary"
                                      sx={{ fontSize:"0.67rem", textTransform:"uppercase" }}>Rules</Typography>
                                  </Box>
                                  {stR.map(rule => (
                                    <RuleCard key={rule.id} rule={rule}
                                      onEdit={() => {
                                        setRuleForm({ name:rule.name||"Notification", timing:rule.timing||"immediately",
                                          timing_value:rule.timing_value||0, timing_unit:rule.timing_unit||"hours",
                                          action_type:rule.action_type||"send_notification",
                                          action_data:rule.action_data||{to:"assignee",message:""},
                                          condition:rule.condition||"" });
                                        setRuleDialog({ stage_id:stage.id, rule });
                                      }}
                                      onDelete={() => delRule(rule.id)}
                                    />
                                  ))}
                                  <Button size="small" startIcon={<Add sx={{ fontSize:12 }}/>}
                                    onClick={() => { setRuleForm(dfRuleForm); setRuleDialog({ stage_id:stage.id }); }}
                                    sx={{ fontSize:"0.68rem", py:0.25, textTransform:"none", color:"#1565c0" }}>
                                    Add rule
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                            {idx < stages.length - 1 && (
                              <Box sx={{ display:"flex", alignItems:"center", px:0.25, pt:1.5 }}>
                                <Typography sx={{ fontSize:"0.45rem", color:"#ccc", writingMode:"vertical-rl",
                                  transform:"rotate(180deg)", py:0.5, userSelect:"none" }}>▶</Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ════════ LIST VIEW ════════ */}
              {subView === "list" && (
                <Card sx={{ boxShadow:"0 1px 4px rgba(0,0,0,0.08)", mt:0, borderRadius:"0 0 8px 8px" }}>
                  <ScrollableTable>
                    <Table size="small" sx={{ tableLayout:"fixed" }}>
                      <TableHead style={{ display:"table-header-group" }}>
                        <TableRow sx={{ bgcolor:"#f5f7fa" }}>
                          <TableCell padding="checkbox" sx={{ width:40 }}>
                            <Checkbox size="small"
                              checked={selected.length === filteredTasks.length && filteredTasks.length > 0}
                              indeterminate={selected.length > 0 && selected.length < filteredTasks.length}
                              onChange={toggleAll}/>
                          </TableCell>
                          <TableCell sx={{ width:28 }}/>
                          <TableCell sx={{ minWidth:220 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">NAME</Typography>
                          </TableCell>
                          {visibleCols.stage !== false && (
                            <TableCell sx={{ width:165 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">KANBAN STAGE</Typography>
                            </TableCell>
                          )}
                          {visibleCols.active !== false && (
                            <TableCell sx={{ width:130 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">ACTIVE ▼</Typography>
                            </TableCell>
                          )}
                          {visibleCols.deadline !== false && (
                            <TableCell sx={{ width:150 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">DEADLINE</Typography>
                            </TableCell>
                          )}
                          {visibleCols.createdBy !== false && (
                            <TableCell sx={{ width:130 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">CREATED BY</Typography>
                            </TableCell>
                          )}
                          {visibleCols.assignee !== false && (
                            <TableCell sx={{ width:130 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">ASSIGNEE</Typography>
                            </TableCell>
                          )}
                          {visibleCols.project !== false && (
                            <TableCell sx={{ width:170 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">PROJECT</Typography>
                            </TableCell>
                          )}
                          {visibleCols.timeSpent && (
                            <TableCell sx={{ width:90 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">TIME SPENT</Typography>
                            </TableCell>
                          )}
                          {visibleCols.status && (
                            <TableCell sx={{ width:100 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">STATUS</Typography>
                            </TableCell>
                          )}
                          {visibleCols.tags && (
                            <TableCell sx={{ width:100 }}>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">TAGS</Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ width:46 }}/>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stages.map(stage => {
                          const stageTasks = filteredTasks.filter(t =>
                            t.workgroup_stage === stage.id || (!t.workgroup_stage && stage.id === stages[0]?.id)
                          );
                          if (stageTasks.length === 0) return null;
                          return [
                            /* Stage header row */
                            <TableRow key={`hdr-${stage.id}`} sx={{ bgcolor:"#fafafa" }}>
                              <TableCell colSpan={colSpan} sx={{ py:0.5, pl:2, borderLeft:`3px solid ${stage.color}` }}>
                                <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                                  <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:stage.color }}/>
                                  <Typography variant="caption" fontWeight="bold"
                                    sx={{ color:stage.color, fontSize:"0.75rem" }}>
                                    {stage.name}
                                  </Typography>
                                  <Chip label={stageTasks.length} size="small"
                                    sx={{ height:16, fontSize:"0.6rem", bgcolor:stage.color+"22", color:stage.color }}/>
                                  {isAdmin && (
                                    <Button size="small" startIcon={<Add sx={{ fontSize:11 }}/>}
                                      onClick={() => { setTaskDialog(stage.id); setTaskForm({ title:"", assignee:"", priority:"medium", deadline:"", description:"" }); }}
                                      sx={{ fontSize:"0.68rem", py:0, textTransform:"none", color:"text.secondary", ml:0.5 }}>
                                      Add task
                                    </Button>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>,
                            ...stageTasks.map(task => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                stages={stages}
                                group={group}
                                selected={selected.includes(task.id)}
                                onSelect={() => toggleSelect(task.id)}
                                onMove={moveTask}
                                onDelete={delTask}
                                onTitleClick={t => setTaskDetail(t)}
                                onTimerToggle={toggleTimer}
                                isTimerRunning={activeTimer === task.id}
                                timerSeconds={taskTimes[task.id] || 0}
                                visible={visibleCols}
                              />
                            )),
                          ];
                        })}
                        {filteredTasks.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={colSpan} align="center" sx={{ py:6, color:"text.secondary" }}>
                              <Box>
                                <Typography variant="body2" sx={{ mb:1 }}>No tasks yet.</Typography>
                                {isAdmin && tasks.length === 0 && (
                                  <Button variant="outlined" size="small" onClick={seedDemo} disabled={seeding}
                                    startIcon={<Refresh sx={{ fontSize:13 }}/>}
                                    sx={{ textTransform:"none", fontSize:"0.8rem" }}>
                                    {seeding ? "Loading…" : "Load demo data from Bitrix24"}
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollableTable>
                </Card>
              )}

              {/* ════════ KANBAN VIEW ════════ */}
              {subView === "kanban" && (
                <Box sx={{ overflowX:"auto", pb:2, mt:1 }}>
                  <Box sx={{ display:"flex", gap:2, minWidth:"max-content", alignItems:"flex-start" }}>
                    {stages.map(stage => {
                      const st = tasksByStage[stage.id] || [];
                      const over = dragOver === stage.id;
                      return (
                        <Box key={stage.id} sx={{ width:265, flexShrink:0 }}
                          onDragOver={onDragOver(stage.id)} onDrop={onDrop(stage.id)}>
                          <Box sx={{ bgcolor:stage.color, borderRadius:"6px 6px 0 0", px:1.5, py:1,
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            outline: over ? "2px dashed rgba(255,255,255,0.8)" : "none", outlineOffset:"-3px" }}>
                            <Typography variant="body2" fontWeight="bold" color="white" noWrap sx={{ flex:1 }}>{stage.name}</Typography>
                            <Chip label={st.length} size="small"
                              sx={{ bgcolor:"rgba(255,255,255,0.25)", color:"white", height:18, fontSize:"0.65rem", minWidth:24 }}/>
                          </Box>
                          <Box sx={{ bgcolor: over ? "#e3f2fd" : "#f8f9fa", border:"1px solid #e0e0e0",
                            borderTop:"none", minHeight:150, borderRadius:"0 0 6px 6px", p:1, transition:"background .15s" }}>
                            {st.map(task => (
                              <TaskCard key={task.id} task={task}
                                onDragStart={onDragStart(task.id)} onDragEnd={onDragEnd}
                                onDelete={delTask} stages={stages} onMove={moveTask}
                                onTitleClick={t => setTaskDetail(t)}
                                isTimerRunning={activeTimer === task.id}
                                timerSeconds={taskTimes[task.id] || 0}
                                onTimerToggle={toggleTimer}
                              />
                            ))}
                            <Button fullWidth startIcon={<Add sx={{ fontSize:13 }}/>}
                              onClick={() => { setTaskDialog(stage.id); setTaskForm({ title:"", assignee:"", priority:"medium", deadline:"", description:"" }); }}
                              sx={{ mt:0.5, color:"text.secondary", justifyContent:"flex-start",
                                fontSize:"0.75rem", py:0.5, textTransform:"none" }}>
                              Add task
                            </Button>
                          </Box>
                        </Box>
                      );
                    })}
                    {isAdmin && (
                      <Box sx={{ width:200, flexShrink:0 }}>
                        <Button fullWidth variant="outlined" startIcon={<Add/>}
                          onClick={() => { setEditStage(null); setStageForm({ name:"", color:STAGE_COLORS[stages.length % STAGE_COLORS.length] }); setStageDialog(true); }}
                          sx={{ height:44, borderStyle:"dashed", color:"text.secondary", textTransform:"none" }}>
                          Add Stage
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* ════════ DEADLINE VIEW ════════ */}
              {subView === "deadline" && (
                <DeadlineView tasks={filteredTasks} stages={stages}
                  onMove={moveTask} onDelete={delTask}
                  onTitleClick={t => setTaskDetail(t)}/>
              )}

              {/* ════════ PLANNER VIEW ════════ */}
              {subView === "planner" && (
                <Box sx={{ py:2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb:1.5 }}>All Tasks — Planner</Typography>
                  {[...filteredTasks]
                    .sort((a, b) => {
                      if (!a.deadline && !b.deadline) return 0;
                      if (!a.deadline) return 1;
                      if (!b.deadline) return -1;
                      return new Date(a.deadline) - new Date(b.deadline);
                    })
                    .map(task => {
                      const stage = stages.find(s => s.id === task.workgroup_stage) || stages[0];
                      const pc = PRIORITY_COLORS[task.priority] || "#999";
                      return (
                        <Box key={task.id} sx={{ display:"flex", alignItems:"center", gap:1.5, py:1,
                          px:1.5, borderBottom:"1px solid #f0f0f0", borderLeft:`3px solid ${stage?.color||"#ccc"}`,
                          mb:0.5, bgcolor:"white", "&:hover":{ bgcolor:"#f9f9f9" } }}>
                          <Checkbox size="small" checked={selected.includes(task.id)} onChange={() => toggleSelect(task.id)}/>
                          <Box sx={{ flex:1, minWidth:0 }}>
                            <Typography variant="body2"
                              onClick={() => setTaskDetail(task)}
                              sx={{ fontSize:"0.82rem", fontWeight:500, cursor:"pointer",
                                color:"#1565c0", "&:hover":{ textDecoration:"underline" } }}>
                              {task.title}
                            </Typography>
                            <Box sx={{ display:"flex", alignItems:"center", gap:0.75, mt:0.3 }}>
                              <Chip label={task.priority||"medium"} size="small"
                                sx={{ height:15, fontSize:"0.58rem", bgcolor:pc+"18", color:pc, fontWeight:"bold" }}/>
                              <Chip label={stage?.name||"—"} size="small"
                                sx={{ height:15, fontSize:"0.58rem", bgcolor:(stage?.color||"#aaa")+"22", color:stage?.color||"text.secondary" }}/>
                            </Box>
                          </Box>
                          {task.assignee && (
                            <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                              <Avatar sx={{ width:22, height:22, fontSize:"0.6rem", bgcolor:getColor(task.assignee) }}>{task.assignee.charAt(0)}</Avatar>
                              <Typography variant="caption" sx={{ fontSize:"0.7rem" }}>{task.assignee}</Typography>
                            </Box>
                          )}
                          <TaskTimer taskId={task.id} isRunning={activeTimer===task.id}
                            seconds={taskTimes[task.id]||0} onToggle={toggleTimer}/>
                          <DeadlineBadge deadline={task.deadline}/>
                        </Box>
                      );
                    })}
                  {filteredTasks.length === 0 && (
                    <Box sx={{ textAlign:"center", py:6, color:"text.secondary" }}>No tasks found</Box>
                  )}
                </Box>
              )}

              {/* ════════ GANTT (placeholder) ════════ */}
              {subView === "gantt" && (
                <Box sx={{ py:4, textAlign:"center", color:"text.secondary" }}>
                  <AccessTime sx={{ fontSize:40, opacity:0.3, mb:1 }}/>
                  <Typography variant="body2">Gantt chart — coming soon</Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* ── FEED TAB ── */}
      {mainTab === 1 && <FeedTab groupId={group.id} stages={stages}/>}

      {/* ── DRIVE / MORE tabs ── */}
      {mainTab === 2 && (
        <Box sx={{ px:3, py:4, textAlign:"center", color:"text.secondary" }}>
          <Typography>Drive / Documents coming soon</Typography>
        </Box>
      )}
      {mainTab === 3 && (
        <Box sx={{ px:3, py:3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb:2 }}>About Project</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1, p:2, border:"1px solid #eee" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:0.5, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:"bold" }}>Project Name</Typography>
                <Typography variant="body1" fontWeight="medium">{group.name}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1, p:2, border:"1px solid #eee" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:0.5, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:"bold" }}>Type / Privacy</Typography>
                <Typography variant="body1">{group.type} · {group.privacy}</Typography>
              </Box>
            </Grid>
            {group.description && (
              <Grid item xs={12}>
                <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1, p:2, border:"1px solid #eee" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:0.5, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:"bold" }}>Description</Typography>
                  <Typography variant="body2">{group.description}</Typography>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1, p:2, border:"1px solid #eee" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:1, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:"bold" }}>Members ({memberList.length})</Typography>
                <Box sx={{ display:"flex", flexWrap:"wrap", gap:1 }}>
                  {memberList.map(m => (
                    <Box key={m} sx={{ display:"flex", alignItems:"center", gap:0.5, bgcolor:"white", border:"1px solid #e0e0e0", borderRadius:2, px:1, py:0.4 }}>
                      <Avatar sx={{ width:22, height:22, fontSize:"0.6rem", bgcolor:getColor(m) }}>{m.charAt(0)}</Avatar>
                      <Typography variant="caption" sx={{ fontSize:"0.75rem" }}>{m}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor:"#f8f9fa", borderRadius:1, p:2, border:"1px solid #eee" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display:"block", mb:1, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:"bold" }}>Stages ({stages.length})</Typography>
                <Box sx={{ display:"flex", gap:1.5, flexWrap:"wrap" }}>
                  {stages.map(s => (
                    <Box key={s.id} sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                      <Box sx={{ width:10, height:10, borderRadius:"50%", bgcolor:s.color }}/>
                      <Typography variant="caption" sx={{ fontSize:"0.75rem" }}>{s.name}</Typography>
                      <Chip label={tasksByStage[s.id]?.length || 0} size="small"
                        sx={{ height:16, fontSize:"0.6rem", bgcolor:s.color+"22", color:s.color }}/>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════════════ DIALOGS ════════════════════ */}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={taskDetail}
        stages={stages}
        group={group}
        open={!!taskDetail}
        onClose={() => setTaskDetail(null)}
        onSave={saveTaskDetail}
        onDelete={id => { delTask(id); setTaskDetail(null); }}
        timerSeconds={taskDetail ? (taskTimes[taskDetail.id] || 0) : 0}
      />

      {/* Stage dialog */}
      <Dialog open={stageDialog} onClose={() => { setStageDialog(false); setEditStage(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {editStage ? "Edit Stage" : "Manage Stages"}
          <IconButton size="small" onClick={() => { setStageDialog(false); setEditStage(null); }}><Close/></IconButton>
        </DialogTitle>
        <Divider/>
        <DialogContent>
          {!editStage && stages.length > 0 && (
            <Box sx={{ mb:3 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb:1.5 }}>Current Stages</Typography>
              {stages.map(s => (
                <Box key={s.id} sx={{ display:"flex", alignItems:"center", gap:1, mb:0.75, p:1, bgcolor:"#f5f5f5", borderRadius:1 }}>
                  <Box sx={{ width:14, height:14, borderRadius:"50%", bgcolor:s.color, flexShrink:0 }}/>
                  <Typography variant="body2" sx={{ flex:1 }}>{s.name}</Typography>
                  <Chip label={`${tasksByStage[s.id]?.length||0} tasks`} size="small"
                    sx={{ height:16, fontSize:"0.6rem", bgcolor:s.color+"22", color:s.color }}/>
                  <IconButton size="small" onClick={() => { setEditStage(s); setStageForm({ name:s.name, color:s.color }); }}>
                    <Edit sx={{ fontSize:15 }}/>
                  </IconButton>
                  <IconButton size="small" onClick={() => delStage(s.id)} disabled={stages.length <= 1}>
                    <Delete sx={{ fontSize:15 }}/>
                  </IconButton>
                </Box>
              ))}
              <Divider sx={{ my:2 }}/>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb:1 }}>Add New Stage</Typography>
            </Box>
          )}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Stage Name *" value={stageForm.name}
                onChange={e => setStageForm({ ...stageForm, name:e.target.value })} autoFocus/>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb:0.5 }}>Color</Typography>
              <Box sx={{ display:"flex", gap:0.5, flexWrap:"wrap" }}>
                {STAGE_COLORS.map(c => (
                  <Box key={c} onClick={() => setStageForm({ ...stageForm, color:c })}
                    sx={{ width:22, height:22, borderRadius:"50%", bgcolor:c, cursor:"pointer",
                      border:stageForm.color===c ? "3px solid #333" : "3px solid transparent" }}/>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px:3 }}>
          <Button onClick={() => { setStageDialog(false); setEditStage(null); }}>Close</Button>
          <Button variant="contained" disabled={!stageForm.name.trim()} onClick={saveStage}>
            {editStage ? "Update" : "Add Stage"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Task dialog */}
      <Dialog open={!!taskDialog} onClose={() => setTaskDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          Add Task — <span style={{ color:stages.find(s=>s.id===taskDialog)?.color||"inherit" }}>{stages.find(s => s.id === taskDialog)?.name || ""}</span>
          <IconButton size="small" onClick={() => setTaskDialog(null)}><Close/></IconButton>
        </DialogTitle>
        <Divider/>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt:0.25 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Task Title *" value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title:e.target.value })} autoFocus/>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Assignee" value={taskForm.assignee}
                onChange={e => setTaskForm({ ...taskForm, assignee:e.target.value })}/>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select value={taskForm.priority} label="Priority"
                  onChange={e => setTaskForm({ ...taskForm, priority:e.target.value })}>
                  <MenuItem value="high">🔴 High</MenuItem>
                  <MenuItem value="medium">🟡 Medium</MenuItem>
                  <MenuItem value="low">🟢 Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Deadline" type="datetime-local"
                InputLabelProps={{ shrink:true }} value={taskForm.deadline}
                onChange={e => setTaskForm({ ...taskForm, deadline:e.target.value })}/>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline rows={2} label="Description"
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description:e.target.value })}/>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px:3 }}>
          <Button onClick={() => setTaskDialog(null)}>Cancel</Button>
          <Button variant="contained" disabled={!taskForm.title.trim()} onClick={() => createTask(taskDialog)}>
            Add Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trigger dialog */}
      <Dialog open={!!triggerDialog} onClose={() => setTriggerDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          Add Trigger — {stages.find(s => s.id === triggerDialog)?.name}
          <IconButton size="small" onClick={() => setTriggerDialog(null)}><Close/></IconButton>
        </DialogTitle>
        <Divider/>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt:0.25 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Trigger Type</InputLabel>
                <Select value={triggerForm.type} label="Trigger Type" onChange={e => {
                  const L = { stage_enter:"Status changed — enters this stage", stage_leave:"Status changed — leaves this stage",
                    task_created:"Task created in this stage", deadline_passed:"Deadline passed", field_changed:"Field value changed" };
                  setTriggerForm({ ...triggerForm, type:e.target.value, name:L[e.target.value]||"" });
                }}>
                  <MenuItem value="stage_enter">Status changed — enters this stage</MenuItem>
                  <MenuItem value="stage_leave">Status changed — leaves this stage</MenuItem>
                  <MenuItem value="task_created">Task created in this stage</MenuItem>
                  <MenuItem value="deadline_passed">Deadline passed</MenuItem>
                  <MenuItem value="field_changed">Field value changed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Trigger Name" value={triggerForm.name}
                onChange={e => setTriggerForm({ ...triggerForm, name:e.target.value })}/>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px:3 }}>
          <Button onClick={() => setTriggerDialog(null)}>Cancel</Button>
          <Button variant="contained" disabled={!triggerForm.name.trim()} onClick={createTrigger}>Add Trigger</Button>
        </DialogActions>
      </Dialog>

      {/* Rule dialog */}
      <Dialog open={!!ruleDialog} onClose={() => setRuleDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {ruleDialog?.rule ? "Edit Rule" : "Add Automation Rule"} — {stages.find(s => s.id === ruleDialog?.stage_id)?.name}
          <IconButton size="small" onClick={() => setRuleDialog(null)}><Close/></IconButton>
        </DialogTitle>
        <Divider/>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt:0.25 }}>
            <Grid item xs={ruleForm.timing === "after_delay" ? 4 : 6}>
              <FormControl fullWidth size="small">
                <InputLabel>Timing</InputLabel>
                <Select value={ruleForm.timing} label="Timing"
                  onChange={e => setRuleForm({ ...ruleForm, timing:e.target.value })}>
                  <MenuItem value="immediately">Immediately</MenuItem>
                  <MenuItem value="after_delay">After delay</MenuItem>
                  <MenuItem value="by_condition">By condition</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {ruleForm.timing === "after_delay" && <>
              <Grid item xs={4}>
                <TextField fullWidth size="small" type="number" label="Delay"
                  value={ruleForm.timing_value}
                  onChange={e => setRuleForm({ ...ruleForm, timing_value:Number(e.target.value) })}
                  inputProps={{ min:1 }}/>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select value={ruleForm.timing_unit} label="Unit"
                    onChange={e => setRuleForm({ ...ruleForm, timing_unit:e.target.value })}>
                    <MenuItem value="hours">Hours</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>}
            <Grid item xs={ruleForm.timing === "after_delay" ? 12 : 6}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select value={ruleForm.action_type} label="Action"
                  onChange={e => setRuleForm({ ...ruleForm, action_type:e.target.value, name:ACTION_LABELS[e.target.value]||e.target.value, action_data:{} })}>
                  <MenuItem value="send_notification">📣 Notification</MenuItem>
                  <MenuItem value="create_task">📋 Create task</MenuItem>
                  <MenuItem value="change_stage">↔️ Change stage</MenuItem>
                  <MenuItem value="edit_task">✏️ Edit task</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {ruleForm.action_type === "send_notification" && <>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Send to</InputLabel>
                  <Select value={ruleForm.action_data?.to || "assignee"} label="Send to"
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, to:e.target.value } })}>
                    <MenuItem value="assignee">Assignee</MenuItem>
                    <MenuItem value="all_members">All members</MenuItem>
                    <MenuItem value="author">Author / Created by</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" multiline rows={2} label="Message (optional)"
                  value={ruleForm.action_data?.message || ""}
                  onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, message:e.target.value } })}/>
              </Grid>
            </>}

            {ruleForm.action_type === "create_task" && <>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Task Title"
                  value={ruleForm.action_data?.title || ""}
                  onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, title:e.target.value } })}/>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assign to</InputLabel>
                  <Select value={ruleForm.action_data?.assignee || "assignee"} label="Assign to"
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, assignee:e.target.value } })}>
                    <MenuItem value="assignee">Same assignee</MenuItem>
                    <MenuItem value="automatically">Automatically</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Place in stage</InputLabel>
                  <Select value={ruleForm.action_data?.stage_id || ""} label="Place in stage"
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, stage_id:e.target.value } })}>
                    <MenuItem value="">Same stage</MenuItem>
                    {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </>}

            {ruleForm.action_type === "change_stage" && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Move to stage</InputLabel>
                  <Select value={ruleForm.action_data?.stage_id || ""} label="Move to stage"
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, stage_id:e.target.value } })}>
                    {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {ruleForm.action_type === "edit_task" && <>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Field</InputLabel>
                  <Select value={ruleForm.action_data?.field || "priority"} label="Field"
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, field:e.target.value, value:"" } })}>
                    <MenuItem value="priority">Priority</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="assignee">Assignee</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                {ruleForm.action_data?.field === "priority" ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>Value</InputLabel>
                    <Select value={ruleForm.action_data?.value || ""} label="Value"
                      onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, value:e.target.value } })}>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <TextField fullWidth size="small" label="Value"
                    value={ruleForm.action_data?.value || ""}
                    onChange={e => setRuleForm({ ...ruleForm, action_data:{ ...ruleForm.action_data, value:e.target.value } })}/>
                )}
              </Grid>
            </>}

            {ruleForm.timing === "by_condition" && (
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Condition"
                  placeholder="e.g. priority = high" value={ruleForm.condition || ""}
                  onChange={e => setRuleForm({ ...ruleForm, condition:e.target.value })}/>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px:3 }}>
          <Button onClick={() => setRuleDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveRule}>
            {ruleDialog?.rule ? "Update Rule" : "Add Rule"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
