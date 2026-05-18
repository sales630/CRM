/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useAuth } from "context/AuthContext";
import { timemanAPI, usersAPI } from "services/api";
import {
  Box, Typography, Card, CardContent, Button, IconButton, Chip, Avatar,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Snackbar, Alert,
  LinearProgress, Tooltip, Badge, Divider, List, ListItem, ListItemAvatar,
  ListItemText, ListItemSecondaryAction, Checkbox, FormControlLabel,
} from "@mui/material";
import {
  AccessTime, Login, Logout, EventNote, Schedule, CalendarMonth,
  Add, Delete, Edit, Check, Close, Person, Group, Timer, TimerOff,
  WorkOutline, Assessment, Today, ChevronLeft, ChevronRight, Info,
  CheckCircle, Cancel, Pending, Star, StarBorder,
  BarChart, FilterList, Download, ArrowDropDown, PlayArrow, Stop,
  People, DateRange, HourglassEmpty, TrendingUp,
} from "@mui/icons-material";

// ── Colour helpers ─────────────────────────────────────────────────────────
const getColor = (name) => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41"];
  let s = 0; for (let c of (name || "U")) s += c.charCodeAt(0);
  return C[s % C.length];
};

function fmtTime(iso) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(mins) {
  if (!mins) return "0h 0m";
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}
function dateStr(d) { return d.toISOString().slice(0,10); }
function getDaysInMonth(year, month) { return new Date(year, month+1, 0).getDate(); }
function isoToLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

// ── Live Clock ─────────────────────────────────────────────────────────────
function LiveClock({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startTime)) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "monospace", color: "#1976d2" }}>
      {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
    </Typography>
  );
}

// ── Clock In/Out Widget (main card) ─────────────────────────────────────────
function ClockWidget({ onStatusChange }) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([timemanAPI.myStatus(), timemanAPI.getStats()]);
      setStatus(s);
      setStats(st);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      await timemanAPI.clockIn({ user_name: currentUser?.name, department: currentUser?.department });
      await load();
      onStatusChange?.();
      setSnack({ open: true, msg: "✅ Clocked In successfully!", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
    finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await timemanAPI.clockOut({ notes });
      await load();
      onStatusChange?.();
      setNotes("");
      setSnack({ open: true, msg: "✅ Clocked Out successfully!", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
    finally { setActionLoading(false); }
  };

  if (loading) return <CircularProgress />;
  const isClockedIn = status?.is_clocked_in;

  return (
    <Box>
     <Card
          sx={{
            background: isClockedIn ? "#daffff" : "#ffffff",
            color: isClockedIn ? "#000" : "#000",
            borderRadius: 3,
            mb: 3,
          }}
        >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 52, height: 52 }}>
                <AccessTime sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">Time Tracker</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {isClockedIn ? `Clocked in at ${fmtTime(status?.clock_in_time)}` : "Not clocked in today"}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={isClockedIn ? "WORKING" : "OFFLINE"}
              sx={{ bgcolor: isClockedIn ? "#4caf50" : "rgba(255,255,255,0.2)", color: "white", fontWeight: "bold" }}
            />
          </Box>

          {isClockedIn && (
            <Box sx={{ textAlign: "center", my: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Time Elapsed</Typography>
              <LiveClock startTime={status?.clock_in_time} />
            </Box>
          )}

          {!isClockedIn && (
            <Box sx={{ textAlign: "center", my: 2 }}>
              <Typography variant="h5" sx={{ opacity: 0.7, fontFamily: "monospace" }}>
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Current time</Typography>
            </Box>
          )}

          {isClockedIn && (
            <TextField
              fullWidth size="small" placeholder="Add notes before clocking out (optional)..."
              value={notes} onChange={e => setNotes(e.target.value)}
              sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1,
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.6)" },
                "& fieldset": { borderColor: "rgba(255,255,255,0.3)" }
              }}
            />
          )}

          <Button
            fullWidth variant="contained" size="large"
            disabled={actionLoading}
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : isClockedIn ? <Logout /> : <Login />}
            sx={{
              bgcolor: isClockedIn ? "#2D86EC" : "#4caf50",
              color: isClockedIn ? "#ffffff" : "#ffffff",
              "&:hover": { bgcolor: isClockedIn ? "#2D86EC" : "#388e3c" },
              fontWeight: "bold", fontSize: "1rem", py: 1.2,
            }}
          >
            {actionLoading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
          </Button>
        </CardContent>
      </Card>

      {/* Company Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Clocked In", value: stats.clocked_in, color: "#4caf50", icon: <Login /> },
            { label: "Clocked Out", value: stats.clocked_out, color: "#f44336", icon: <Logout /> },
            { label: "Total Staff", value: stats.total_employees, color: "#1976d2", icon: <Group /> },
            { label: "Hrs Today", value: stats.total_hours_today, color: "#ff9800", icon: <Timer /> },
          ].map((s) => (
            <Grid item xs={6} key={s.label}>
              <Card sx={{ textAlign: "center", p: 1.5, borderTop: `3px solid ${s.color}` }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" fontWeight="bold">{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ── Worktime Grid ──────────────────────────────────────────────────────────
function WorktimeGrid() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = dateStr(new Date(period.year, period.month, 1));
      const end = dateStr(new Date(period.year, period.month+1, 0));
      const res = await timemanAPI.getWorktime({ start, end });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(0);
  }, [period]);

  const days = getDaysInMonth(period.year, period.month);
  const monthLabel = new Date(period.year, period.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setPeriod(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
  const nextMonth = () => setPeriod(p => p.month === 11 ? { year: p.year+1, month: 0 } : { ...p, month: p.month+1 });
  const today = new Date();

  const getDayRecord = (records, day) => {
    const d = dateStr(new Date(period.year, period.month, day));
    return records.find(r => r.date === d);
  };

  if (loading) return <Box sx={{ display:"flex", justifyContent:"center", pt: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Month Navigation */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb: 2 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
          <IconButton onClick={prevMonth}><ChevronLeft /></IconButton>
          <Typography variant="h6" fontWeight="bold">{monthLabel}</Typography>
          <IconButton onClick={nextMonth}><ChevronRight /></IconButton>
        </Box>
        <Button variant="outlined" size="small" startIcon={<Today />}
          onClick={() => setPeriod({ year: today.getFullYear(), month: today.getMonth() })}>
          Today
        </Button>
      </Box>

      {/* Grid Table */}
      <ScrollableTable component={Paper} sx={{ borderRadius: 2, overflow: "auto", maxHeight: 520 }}
        totalCount={data ? Object.entries(data.departments || {}).reduce((sum, [_, members]) => sum + (Array.isArray(members) ? members.length : 0), 0) : 0}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
        <Table size="small" stickyHeader>
          <TableHead style={{ display: "table-header-group" }}>
            <TableRow>
              <TableCell sx={{ minWidth: 180, fontWeight: "bold", bgcolor: "#f5f5f5", position:"sticky", left:0, zIndex: 3 }}>Employee</TableCell>
              {Array.from({ length: days }, (_, i) => i+1).map(d => {
                const dt = new Date(period.year, period.month, d);
                const isToday = dateStr(dt) === dateStr(today);
                const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                return (
                  <TableCell key={d} align="center"
                    sx={{ minWidth: 72, fontWeight:"bold", bgcolor: isToday ? "#e3f2fd" : isWeekend ? "#fafafa" : "#f5f5f5",
                      color: isToday ? "#1976d2" : isWeekend ? "#bbb" : "inherit", fontSize: "0.72rem" }}>
                    <Box>{d}</Box>
                    <Box sx={{ fontSize:"0.6rem", opacity: 0.7 }}>
                      {dt.toLocaleDateString("en-US",{weekday:"short"})}
                    </Box>
                  </TableCell>
                );
              })}
              <TableCell align="center" sx={{ minWidth:90, fontWeight:"bold", bgcolor:"#f5f5f5" }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data && Object.entries(data.departments || {}).slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(([dept, members]) => (
              <>
                <TableRow key={`dept-${dept}`}>
                  <TableCell colSpan={days + 2} sx={{ bgcolor: "#e8f0fe", fontWeight:"bold", py: 0.5, fontSize:"0.8rem", color:"#1976d2" }}>
                    {dept}
                  </TableCell>
                </TableRow>
                {members.map(({ user, records, total_minutes }) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ position:"sticky", left:0, bgcolor:"white", zIndex: 1 }}>
                      <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
                        <Avatar sx={{ width:28, height:28, bgcolor: getColor(user.name), fontSize:"0.7rem" }}>
                          {(user.name||"?").charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" fontWeight="medium">{user.name}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary" sx={{fontSize:"0.62rem"}}>{user.role}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    {Array.from({ length: days }, (_, i) => i+1).map(d => {
                      const rec = getDayRecord(records, d);
                      const dt = new Date(period.year, period.month, d);
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <TableCell key={d} align="center" sx={{ bgcolor: isWeekend ? "#fafafa" : "white", fontSize:"0.68rem" }}>
                          {rec ? (
                            <Tooltip title={`In: ${fmtTime(rec.clock_in)} | Out: ${fmtTime(rec.clock_out) || "Active"}`}>
                              <Box sx={{ color: rec.clock_out ? (rec.duration_minutes < 240 ? "#f44336" : "#4caf50") : "#ff9800", cursor:"default" }}>
                                {fmtDuration(rec.duration_minutes)}
                                {!rec.clock_out && <Box sx={{ fontSize:"0.55rem", color:"#ff9800" }}>active</Box>}
                              </Box>
                            </Tooltip>
                          ) : isWeekend ? (
                            <Box sx={{ color:"#ddd", fontSize:"0.6rem" }}>—</Box>
                          ) : null}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ fontWeight:"bold", color:"#1976d2", fontSize:"0.75rem" }}>
                      {fmtDuration(total_minutes)}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </ScrollableTable>
    </Box>
  );
}

// ── Work Reports ──────────────────────────────────────────────────────────
function WorkReports() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ report_text: "", plan_text: "", date: dateStr(new Date()), supervisor_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = dateStr(new Date(period.year, period.month, 1));
      const end = dateStr(new Date(period.year, period.month+1, 0));
      const [r, u] = await Promise.all([
        timemanAPI.getReports({ start, end }),
        usersAPI.getAll(),
      ]);
      setReports(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await timemanAPI.submitReport(form);
      await load();
      setDialogOpen(false);
      setForm({ report_text: "", plan_text: "", date: dateStr(new Date()), supervisor_id: "" });
      setSnack({ open: true, msg: "Report submitted!", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await timemanAPI.deleteReport(id);
      setReports(r => r.filter(x => x.id !== id));
      setSnack({ open: true, msg: "Report deleted", sev: "info" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const monthLabel = new Date(period.year, period.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevMonth = () => setPeriod(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
  const nextMonth = () => setPeriod(p => p.month === 11 ? { year: p.year+1, month: 0 } : { ...p, month: p.month+1 });

  const statusColor = { draft: "#ff9800", sent: "#1976d2", reviewed: "#4caf50" };
  const statusIcon = { draft: <Pending />, sent: <CheckCircle />, reviewed: <Star /> };

  return (
    <Box>
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb: 2 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
          <IconButton onClick={prevMonth}><ChevronLeft /></IconButton>
          <Typography variant="h6" fontWeight="bold">{monthLabel}</Typography>
          <IconButton onClick={nextMonth}><ChevronRight /></IconButton>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          Submit Report
        </Button>
      </Box>

      {loading ? <CircularProgress /> : reports.length === 0 ? (
        <Box sx={{ textAlign:"center", py: 6, color:"text.secondary" }}>
          <EventNote sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography>No work reports for this period</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setDialogOpen(true)}>Submit First Report</Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {reports.map(rep => (
            <Grid item xs={12} md={6} key={rep.id}>
              <Card sx={{ borderLeft: `4px solid ${statusColor[rep.status] || "#ccc"}`, borderRadius: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">{rep.user_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{rep.date}</Typography>
                    </Box>
                    <Box sx={{ display:"flex", alignItems:"center", gap: 0.5 }}>
                      <Chip
                        size="small"
                        icon={statusIcon[rep.status]}
                        label={rep.status?.toUpperCase()}
                        sx={{ bgcolor: `${statusColor[rep.status]}20`, color: statusColor[rep.status], fontWeight:"bold", fontSize:"0.65rem" }}
                      />
                      {rep.score !== null && rep.score !== undefined && (
                        <Chip size="small" label={`${rep.score}/10`} color="warning" sx={{ fontSize:"0.65rem" }} />
                      )}
                    </Box>
                  </Box>
                  {rep.report_text && (
                    <Typography variant="body2" sx={{ mb: 1, display:"-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      <strong>Report:</strong> {rep.report_text}
                    </Typography>
                  )}
                  {rep.plan_text && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize:"0.8rem", display:"-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      <strong>Plan:</strong> {rep.plan_text}
                    </Typography>
                  )}
                  {rep.comment && (
                    <Box sx={{ mt: 1, p: 1, bgcolor:"#f9f9f9", borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Supervisor comment: {rep.comment}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display:"flex", justifyContent:"flex-end", mt: 1 }}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(rep.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Submit Report Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Work Report
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ float:"right" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth type="date" label="Date" size="small" sx={{ mb: 2 }}
            value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            InputLabelProps={{ shrink: true }} />
          <TextField fullWidth multiline rows={5} label="Today's Report" size="small" sx={{ mb: 2 }}
            placeholder="What did you accomplish today?"
            value={form.report_text} onChange={e => setForm(f => ({ ...f, report_text: e.target.value }))} />
          <TextField fullWidth multiline rows={3} label="Tomorrow's Plan" size="small" sx={{ mb: 2 }}
            placeholder="What are you planning for tomorrow?"
            value={form.plan_text} onChange={e => setForm(f => ({ ...f, plan_text: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>Send To (Supervisor)</InputLabel>
            <Select value={form.supervisor_id} label="Send To (Supervisor)"
              onChange={e => setForm(f => ({ ...f, supervisor_id: e.target.value }))}>
              <MenuItem value=""><em>Save as draft</em></MenuItem>
              {users.filter(u => u.id !== currentUser?.id && ["admin","super_admin","team_leader"].includes(u.role)).map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name} — {u.role}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" onClick={handleSubmit} disabled={submitting || !form.report_text}>
            Save Draft
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || !form.report_text || !form.supervisor_id}
            startIcon={submitting ? <CircularProgress size={14} /> : <Check />}>
            Send to Supervisor
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ── Work Schedules ──────────────────────────────────────────────────────────
function WorkSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", type: "Fixed", start_time: "09:00", end_time: "18:00", reporting_period: "month", work_days: [1,2,3,4,5], members: [] });
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([timemanAPI.getSchedules(), usersAPI.getAll()]);
      setSchedules(Array.isArray(s) ? s : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", type: "Fixed", start_time: "09:00", end_time: "18:00", reporting_period: "month", work_days: [1,2,3,4,5], members: [] });
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditItem(s);
    setForm({ name: s.name, type: s.type, start_time: s.start_time, end_time: s.end_time, reporting_period: s.reporting_period, work_days: s.work_days || [1,2,3,4,5], members: s.members || [] });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        const u = await timemanAPI.updateSchedule(editItem.id, form);
        setSchedules(s => s.map(x => x.id === editItem.id ? u : x));
      } else {
        const n = await timemanAPI.createSchedule(form);
        setSchedules(s => [n, ...s]);
      }
      setDialogOpen(false);
      setSnack({ open: true, msg: editItem ? "Schedule updated" : "Schedule created", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const handleDelete = async (id) => {
    try {
      await timemanAPI.deleteSchedule(id);
      setSchedules(s => s.filter(x => x.id !== id));
      setSnack({ open: true, msg: "Schedule deleted", sev: "info" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const toggleDay = (d) => setForm(f => ({
    ...f, work_days: f.work_days.includes(d) ? f.work_days.filter(x => x !== d) : [...f.work_days, d].sort()
  }));

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>Add Schedule</Button>
      </Box>

      {loading ? <CircularProgress /> : schedules.length === 0 ? (
        <Box sx={{ textAlign:"center", py: 6, color:"text.secondary" }}>
          <Schedule sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography>No work schedules defined</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={openAdd}>Create Schedule</Button>
        </Box>
      ) : (
        <ScrollableTable component={Paper} sx={{ borderRadius: 2 }}
          totalCount={schedules.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}>
                      <Table>

                      <TableHead style={{ display: "table-header-group" }}>
              <TableRow sx={{ bgcolor:"#f5f5f5" }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong># Employees</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Hours</strong></TableCell>
                <TableCell><strong>Work Days</strong></TableCell>
                <TableCell><strong>Reporting Period</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(s => (
                <TableRow key={s.id} hover>
                  <TableCell><Typography variant="body2" fontWeight="medium" color="primary">{s.name}</Typography></TableCell>
                  <TableCell>{s.employees_count || 0}</TableCell>
                  <TableCell><Chip size="small" label={s.type} color="primary" variant="outlined" /></TableCell>
                  <TableCell><Typography variant="body2">{s.start_time} – {s.end_time}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display:"flex", gap: 0.3 }}>
                      {DAYS.map((d, i) => (
                        <Chip key={i} size="small" label={d.slice(0,1)}
                          sx={{ width:22, height:22, fontSize:"0.6rem",
                            bgcolor: (s.work_days||[]).includes(i) ? "#1976d2" : "#eee",
                            color: (s.work_days||[]).includes(i) ? "white" : "#999" }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell><Chip size="small" label={s.reporting_period} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(s)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTable>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? "Edit Schedule" : "Add Work Schedule"}
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ float:"right" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Schedule Name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="Fixed">Fixed</MenuItem>
                  <MenuItem value="Flexible">Flexible</MenuItem>
                  <MenuItem value="Shift">Shift</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Reporting Period</InputLabel>
                <Select value={form.reporting_period} label="Reporting Period"
                  onChange={e => setForm(f => ({ ...f, reporting_period: e.target.value }))}>
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="time" label="Start Time"
                value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="time" label="End Time"
                value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display:"block" }}>Work Days</Typography>
              <Box sx={{ display:"flex", gap: 0.5, flexWrap:"wrap" }}>
                {DAYS.map((d, i) => (
                  <Chip key={i} label={d} clickable size="small"
                    onClick={() => toggleDay(i)}
                    sx={{ bgcolor: form.work_days.includes(i) ? "#1976d2" : "#eee",
                      color: form.work_days.includes(i) ? "white" : "#555",
                      fontWeight: form.work_days.includes(i) ? "bold" : "normal" }} />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Assign Members</InputLabel>
                <Select multiple value={form.members} label="Assign Members"
                  onChange={e => setForm(f => ({ ...f, members: e.target.value }))}
                  renderValue={sel => `${sel.length} selected`}>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      <Checkbox checked={form.members.includes(u.id)} size="small" />
                      {u.name} — {u.role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>
            {editItem ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ── Absence Chart ──────────────────────────────────────────────────────────
function AbsenceChart() {
  const [absences, setAbsences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", start_date: dateStr(new Date()), end_date: dateStr(new Date()), type: "Sick Leave", reason: "" });
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [period, setPeriod] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [view, setView] = useState("month");

  const ABSENCE_TYPES = ["Sick Leave", "Vacation", "Work From Home", "Business Trip", "Day Off", "Maternity/Paternity", "Other"];
  const TYPE_COLORS = { "Sick Leave":"#f44336", "Vacation":"#4caf50", "Work From Home":"#2196f3", "Business Trip":"#ff9800", "Day Off":"#9c27b0", "Maternity/Paternity":"#e91e63", "Other":"#607d8b" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = dateStr(new Date(period.year, period.month, 1));
      const end = dateStr(new Date(period.year, period.month+1, 0));
      const [a, u] = await Promise.all([timemanAPI.getAbsences({ start, end }), usersAPI.getAll()]);
      setAbsences(Array.isArray(a) ? a : []);
      setUsers(Array.isArray(u) ? u : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try {
      const user = users.find(u => u.id === form.user_id);
      await timemanAPI.addAbsence({ ...form, user_name: user?.name });
      await load();
      setDialogOpen(false);
      setForm({ user_id: "", start_date: dateStr(new Date()), end_date: dateStr(new Date()), type: "Sick Leave", reason: "" });
      setSnack({ open: true, msg: "Absence added", sev: "success" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const handleDelete = async (id) => {
    try {
      await timemanAPI.deleteAbsence(id);
      setAbsences(a => a.filter(x => x.id !== id));
      setSnack({ open: true, msg: "Absence removed", sev: "info" });
    } catch (e) { setSnack({ open: true, msg: e.message, sev: "error" }); }
  };

  const days = getDaysInMonth(period.year, period.month);
  const monthLabel = new Date(period.year, period.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevMonth = () => setPeriod(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
  const nextMonth = () => setPeriod(p => p.month === 11 ? { year: p.year+1, month: 0 } : { ...p, month: p.month+1 });

  const getUserAbsenceDays = (userId) => {
    return absences.filter(a => a.user_id === userId).map(a => ({
      ...a,
      days: Array.from({ length: days }, (_, i) => {
        const d = dateStr(new Date(period.year, period.month, i+1));
        return d >= a.start_date && d <= a.end_date ? i+1 : null;
      }).filter(Boolean)
    }));
  };

  return (
    <Box>
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb: 2 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
          <IconButton onClick={prevMonth}><ChevronLeft /></IconButton>
          <Typography variant="h6" fontWeight="bold">{monthLabel}</Typography>
          <IconButton onClick={nextMonth}><ChevronRight /></IconButton>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>Add Entry</Button>
      </Box>

      {/* Legend */}
      <Box sx={{ display:"flex", flexWrap:"wrap", gap: 1, mb: 2 }}>
        {Object.entries(TYPE_COLORS).map(([t, c]) => (
          <Chip key={t} size="small" label={t} sx={{ bgcolor: c + "22", color: c, borderColor: c, border: "1px solid" }} />
        ))}
      </Box>

      {loading ? <CircularProgress /> : (
        <ScrollableTable component={Paper} sx={{ borderRadius: 2, overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead style={{ display: "table-header-group" }}>
              <TableRow>
                <TableCell sx={{ minWidth: 160, fontWeight:"bold", bgcolor:"#f5f5f5", position:"sticky", left:0, zIndex:3 }}>Employee</TableCell>
                {Array.from({ length: days }, (_, i) => i+1).map(d => {
                  const dt = new Date(period.year, period.month, d);
                  const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                  return (
                    <TableCell key={d} align="center"
                      sx={{ minWidth: 32, fontWeight:"bold", bgcolor: isWeekend ? "#f5f5f5" : "#fafafa", fontSize:"0.68rem", p: 0.5 }}>
                      {d}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => {
                const userAbsences = getUserAbsenceDays(user.id);
                return (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ position:"sticky", left:0, bgcolor:"white", zIndex:1 }}>
                      <Box sx={{ display:"flex", alignItems:"center", gap: 1 }}>
                        <Avatar sx={{ width:24, height:24, bgcolor: getColor(user.name), fontSize:"0.65rem" }}>
                          {(user.name||"?").charAt(0)}
                        </Avatar>
                        <Typography variant="caption" fontWeight="medium">{user.name}</Typography>
                      </Box>
                    </TableCell>
                    {Array.from({ length: days }, (_, i) => i+1).map(d => {
                      const absence = userAbsences.find(a => a.days.includes(d));
                      const dt = new Date(period.year, period.month, d);
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <TableCell key={d} align="center" sx={{ p: 0.25, bgcolor: isWeekend ? "#f9f9f9" : "white" }}>
                          {absence && (
                            <Tooltip title={`${absence.type}${absence.reason ? ": " + absence.reason : ""}`}>
                              <Box sx={{ width:20, height:20, borderRadius:0.5, bgcolor: TYPE_COLORS[absence.type] || "#ccc", mx:"auto", cursor:"default" }} />
                            </Tooltip>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollableTable>
      )}

      {/* Absence List */}
      {absences.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Absence Records</Typography>
          <List dense>
            {absences.map(a => (
              <ListItem key={a.id} sx={{ bgcolor:"white", mb: 0.5, borderRadius: 1, border:"1px solid #eee" }}>
                <ListItemAvatar>
                  <Avatar sx={{ width:32, height:32, bgcolor: TYPE_COLORS[a.type], fontSize:"0.7rem" }}>
                    {(a.user_name||"?").charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight="medium">{a.user_name} — <span style={{ color: TYPE_COLORS[a.type] }}>{a.type}</span></Typography>}
                  secondary={`${a.start_date} → ${a.end_date}${a.reason ? " | " + a.reason : ""}`}
                />
                <ListItemSecondaryAction>
                  <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><Delete fontSize="small" /></IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Absence Entry
          <IconButton size="small" onClick={() => setDialogOpen(false)} sx={{ float:"right" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Employee</InputLabel>
                <Select value={form.user_id} label="Employee" onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                  {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} — {u.role}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="date" label="Start Date"
                value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="date" label="End Date"
                value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Absence Type</InputLabel>
                <Select value={form.type} label="Absence Type" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {ABSENCE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Reason (optional)" value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.user_id}>Add Entry</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
        <Alert severity={snack.sev} onClose={() => setSnack(s=>({...s,open:false}))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ── Main Time Management Page ──────────────────────────────────────────────
// ── Time Report ────────────────────────────────────────────────────────────
function TimeReport() {
  const { currentUser } = useAuth();
  const isAdmin = ["admin", "super_admin"].includes(currentUser?.role);
  const isTeamLeader = currentUser?.role === "team_leader";
  // Admin & Team Leader may edit (backend enforces scope: TL only for own department)
  const canEdit = isAdmin || isTeamLeader;

  // Edit dialog state
  const [editing, setEditing]   = useState(null); // session being edited, or null
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null); // { type, msg }

  // Date range defaults
  const getDefaults = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: dateStr(start),
      end: dateStr(now),
    };
  };

  const [range, setRange] = useState(getDefaults);
  const [quickRange, setQuickRange] = useState("this_month");
  const [userFilter, setUserFilter] = useState("all"); // admin only
  const [users, setUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});

  // Load users list for admin filter
  useEffect(() => {
    if (isAdmin) {
      usersAPI.getAll().then(u => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
    }
  }, [isAdmin]);

  const applyQuickRange = (key) => {
    const now = new Date();
    let start, end = dateStr(now);
    if (key === "today") { start = dateStr(now); }
    else if (key === "this_week") {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1);
      start = dateStr(d);
    } else if (key === "this_month") {
      start = dateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (key === "last_month") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      start = dateStr(s); end = dateStr(e);
    } else if (key === "last_7") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      start = dateStr(d);
    } else if (key === "last_30") {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      start = dateStr(d);
    }
    setQuickRange(key);
    setRange({ start, end });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { start: range.start, end: range.end };
      if (isAdmin && userFilter !== "all") params.user_id = userFilter;
      const res = await timemanAPI.getTimeReport(params);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range, userFilter, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const fmtHM = (mins) => {
    if (!mins) return "0h 00m";
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
  };

  const toggleDay = (date) => setExpandedDays(p => ({ ...p, [date]: !p[date] }));

  // Status chip for a session
  const SessionStatus = ({ session }) => {
    if (!session.clock_out)
      return <Chip label="Active" size="small" icon={<PlayArrow sx={{ fontSize: "10px !important" }} />}
        sx={{ bgcolor: "#e8f5e9", color: "#388e3c", fontWeight: 700, height: 20, fontSize: "0.65rem" }} />;
    return <Chip label="Done" size="small" icon={<CheckCircle sx={{ fontSize: "10px !important" }} />}
      sx={{ bgcolor: "#f5f5f5", color: "#757575", fontWeight: 700, height: 20, fontSize: "0.65rem" }} />;
  };

  // ── Summary stat card
  const StatBox = ({ label, value, icon, color }) => (
    <Card sx={{ borderRadius: "12px", border: `1px solid ${color}25`, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <CardContent sx={{ p: "14px 18px !important" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#90a4ae", letterSpacing: "0.5px" }}>{label}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color, mt: 0.25 }}>{value}</Typography>
          </Box>
          <Box sx={{ bgcolor: color + "18", borderRadius: "10px", p: 1.2, color, display: "flex" }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  const summary = data?.summary || {};
  const days    = data?.days || [];
  const userSummaries = data?.user_summaries || [];

  return (
    <Box>
      {/* ── Filters bar ──────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: "12px", mb: 2.5, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <CardContent sx={{ p: "14px 20px !important" }}>
          <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
            {/* Quick range */}
            <Box display="flex" gap={0.75} flexWrap="wrap">
              {[
                { key: "today",      label: "Today" },
                { key: "last_7",     label: "Last 7 Days" },
                { key: "this_week",  label: "This Week" },
                { key: "this_month", label: "This Month" },
                { key: "last_month", label: "Last Month" },
                { key: "last_30",    label: "Last 30 Days" },
              ].map(q => (
                <Chip key={q.key} label={q.label} size="small" clickable
                  onClick={() => applyQuickRange(q.key)}
                  variant={quickRange === q.key ? "filled" : "outlined"}
                  sx={{ fontWeight: quickRange === q.key ? 700 : 400,
                    bgcolor: quickRange === q.key ? "#1976d2" : "transparent",
                    color: quickRange === q.key ? "#fff" : "#546e7a",
                    borderColor: quickRange === q.key ? "#1976d2" : "#cfd8dc",
                    fontSize: "0.72rem" }} />
              ))}
            </Box>
            <Box display="flex" gap={1} alignItems="center" sx={{ ml: "auto" }}>
              {/* Custom date inputs */}
              <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                value={range.start} onChange={e => { setRange(r => ({ ...r, start: e.target.value })); setQuickRange("custom"); }}
                sx={{ width: 150 }} />
              <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                value={range.end} onChange={e => { setRange(r => ({ ...r, end: e.target.value })); setQuickRange("custom"); }}
                sx={{ width: 150 }} />
              {/* User filter (admin only) */}
              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Employee</InputLabel>
                  <Select value={userFilter} label="Employee" onChange={e => setUserFilter(e.target.value)}>
                    <MenuItem value="all">All Employees</MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: getColor(u.name) }}>
                            {(u.name || "?")[0]}
                          </Avatar>
                          {u.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button variant="contained" size="small" startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <FilterList />}
                onClick={load} disabled={loading}
                sx={{ textTransform: "none", bgcolor: "#1976d2", borderRadius: "8px", px: 2 }}>
                Apply
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <StatBox label="Total Hours" value={fmtHM(summary.total_minutes)} icon={<AccessTime />} color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatBox label="Days Worked" value={summary.unique_days || 0} icon={<DateRange />} color="#388e3c" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatBox label="Avg / Day" value={fmtHM(summary.avg_minutes_per_day)} icon={<TrendingUp />} color="#f57c00" />
        </Grid>
        {isAdmin ? (
          <Grid item xs={6} sm={3}>
            <StatBox label="Employees" value={summary.unique_users || 0} icon={<People />} color="#7b1fa2" />
          </Grid>
        ) : (
          <Grid item xs={6} sm={3}>
            <StatBox label="Sessions" value={data?.records?.length || 0} icon={<Timer />} color="#7b1fa2" />
          </Grid>
        )}
      </Grid>

      {/* ── Admin: User Summary Table ─────────────────────────────────────── */}
      {isAdmin && userFilter === "all" && userSummaries.length > 0 && (
        <Card sx={{ borderRadius: "12px", mb: 2.5, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <CardContent sx={{ p: "14px 20px !important" }}>
            <Typography fontWeight={800} fontSize="0.85rem" sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <People sx={{ fontSize: 18, color: "#7b1fa2" }} /> Employee Summary
            </Typography>
            <ScrollableTable>
              <Table size="small">
                <TableHead style={{ display: "table-header-group" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Department</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Days Worked</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Total Hours</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Avg / Day</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userSummaries.sort((a, b) => b.total_minutes - a.total_minutes).map((u) => (
                    <TableRow key={u.user_id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: getColor(u.user_name) }}>
                            {(u.user_name || "?")[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{u.user_name}</Typography>
                            <Typography sx={{ fontSize: "0.65rem", color: "#90a4ae" }}>{u.role}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.75rem", color: "#546e7a" }}>{u.department || "—"}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={u.days_worked} size="small" sx={{ bgcolor: "#e8f5e9", color: "#388e3c", fontWeight: 700, height: 20, fontSize: "0.7rem" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1976d2" }}>{fmtHM(u.total_minutes)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: "0.75rem", color: "#546e7a" }}>
                          {fmtHM(u.days_worked ? Math.round(u.total_minutes / u.days_worked) : 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTable>
          </CardContent>
        </Card>
      )}

      {/* ── Daily Records ─────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <CardContent sx={{ p: "14px 20px !important" }}>
          <Typography fontWeight={800} fontSize="0.85rem" sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.75 }}>
            <EventNote sx={{ fontSize: 18, color: "#1976d2" }} />
            Daily Time Log
            <Chip label={`${days.length} day${days.length !== 1 ? "s" : ""}`} size="small" sx={{ ml: 1, height: 20, fontSize: "0.65rem", bgcolor: "#e3f2fd", color: "#1976d2", fontWeight: 700 }} />
          </Typography>

          {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}

          {!loading && days.length === 0 && (
            <Box sx={{ textAlign: "center", py: 5, color: "#90a4ae" }}>
              <HourglassEmpty sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
              <Typography fontWeight={600}>No time records found</Typography>
              <Typography variant="caption">Try adjusting the date range or employee filter</Typography>
            </Box>
          )}

          {!loading && days.map((day) => {
            const isExpanded = expandedDays[day.date] !== false; // default expanded
            const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
            const isToday   = day.date === dateStr(new Date());
            const hasActive = day.sessions.some(s => !s.clock_out);

            return (
              <Box key={day.date} sx={{ mb: 1.5, border: "1px solid #edf0f4", borderRadius: "10px", overflow: "hidden" }}>
                {/* Day header */}
                <Box
                  onClick={() => toggleDay(day.date)}
                  sx={{ display: "flex", alignItems: "center", px: 2, py: 1.2, bgcolor: isToday ? "#e3f2fd" : "#f8f9fa",
                    cursor: "pointer", "&:hover": { bgcolor: isToday ? "#bbdefb" : "#edf0f4" }, transition: "background 0.15s" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
                    <Box sx={{
                      width: 42, height: 42, borderRadius: "10px", flexShrink: 0, textAlign: "center",
                      bgcolor: isToday ? "#1976d2" : "#fff", border: `1px solid ${isToday ? "#1976d2" : "#dde2ea"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", color: isToday ? "#90caf9" : "#90a4ae", lineHeight: 1 }}>
                        {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </Typography>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: isToday ? "#fff" : "#263238", lineHeight: 1.1 }}>
                        {new Date(day.date + "T12:00:00").getDate()}
                      </Typography>
                    </Box>
                    <Box>
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: isToday ? "#1565c0" : "#263238" }}>{dateLabel}</Typography>
                        {isToday && <Chip label="Today" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#1976d2", color: "#fff", fontWeight: 700 }} />}
                        {hasActive && <Chip label="Active" size="small" icon={<PlayArrow sx={{ fontSize: "9px !important" }} />} sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#e8f5e9", color: "#388e3c", fontWeight: 700 }} />}
                      </Box>
                      <Typography sx={{ fontSize: "0.7rem", color: "#78909c" }}>
                        {day.sessions.length} session{day.sessions.length !== 1 ? "s" : ""} · Total: <strong style={{ color: "#1976d2" }}>{fmtHM(day.total_minutes)}</strong>
                      </Typography>
                    </Box>
                  </Box>
                  {/* Total badge */}
                  <Box sx={{ textAlign: "right", mr: 1.5 }}>
                    <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: day.total_minutes >= 480 ? "#388e3c" : "#f57c00" }}>
                      {fmtHM(day.total_minutes)}
                    </Typography>
                    <LinearProgress variant="determinate"
                      value={Math.min(100, Math.round((day.total_minutes / 480) * 100))}
                      sx={{ width: 80, height: 4, borderRadius: 2, mt: 0.25,
                        "& .MuiLinearProgress-bar": { bgcolor: day.total_minutes >= 480 ? "#388e3c" : "#f57c00" } }} />
                    <Typography sx={{ fontSize: "0.58rem", color: "#90a4ae", mt: 0.25 }}>
                      {Math.min(100, Math.round((day.total_minutes / 480) * 100))}% of 8h
                    </Typography>
                  </Box>
                  <ArrowDropDown sx={{ fontSize: 20, color: "#90a4ae", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </Box>

                {/* Sessions */}
                {isExpanded && (
                  <Box>
                    {day.sessions.map((s, idx) => (
                      <Box key={s.id} sx={{
                        display: "flex", alignItems: "center", px: 2, py: 1,
                        borderTop: "1px solid #f0f4f8",
                        bgcolor: !s.clock_out ? "#f1f8e9" : idx % 2 === 0 ? "#fff" : "#fafbfc",
                        gap: 2,
                      }}>
                        {/* Session number */}
                        <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1976d2" }}>{idx + 1}</Typography>
                        </Box>

                        {/* User info (admin view) */}
                        {isAdmin && userFilter === "all" && (
                          <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 140 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 700, bgcolor: getColor(s.user_name) }}>
                              {(s.user_name || "?")[0]}
                            </Avatar>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }} noWrap>{s.user_name}</Typography>
                          </Box>
                        )}

                        {/* Clock In */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 110 }}>
                          <Login sx={{ fontSize: 15, color: "#4caf50" }} />
                          <Box>
                            <Typography sx={{ fontSize: "0.6rem", color: "#90a4ae", lineHeight: 1 }}>Clock In</Typography>
                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#263238" }}>{fmtTime(s.clock_in)}</Typography>
                          </Box>
                        </Box>

                        {/* Arrow */}
                        <Typography sx={{ color: "#b0bec5", fontSize: "1.2rem" }}>→</Typography>

                        {/* Clock Out */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 110 }}>
                          <Logout sx={{ fontSize: 15, color: s.clock_out ? "#f44336" : "#bdbdbd" }} />
                          <Box>
                            <Typography sx={{ fontSize: "0.6rem", color: "#90a4ae", lineHeight: 1 }}>Clock Out</Typography>
                            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: s.clock_out ? "#263238" : "#bdbdbd" }}>
                              {s.clock_out ? fmtTime(s.clock_out) : "—"}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Duration */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 80 }}>
                          <AccessTime sx={{ fontSize: 14, color: "#90a4ae" }} />
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#546e7a" }}>
                            {s.clock_out ? fmtHM(s.duration_minutes) : <LiveDuration start={s.clock_in} />}
                          </Typography>
                        </Box>

                        {/* Status */}
                        <SessionStatus session={s} />

                        {/* Notes */}
                        {s.notes && (
                          <Tooltip title={s.notes}>
                            <Info sx={{ fontSize: 15, color: "#90a4ae", cursor: "help", ml: !canEdit ? "auto" : 0 }} />
                          </Tooltip>
                        )}

                        {/* Edit button (admin & team_leader only) */}
                        {canEdit && (
                          <Tooltip title="Edit session">
                            <IconButton
                              size="small"
                              onClick={() => setEditing(s)}
                              sx={{ ml: "auto", color: "#1976d2", "&:hover": { bgcolor: "#e3f2fd" } }}
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Edit Session Dialog ───────────────────────────────────────────── */}
      <EditSessionDialog
        session={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={async (updates) => {
          if (!editing) return;
          setSaving(true);
          try {
            const res = await timemanAPI.updateRecord(editing.id, updates);
            if (res?.success === false) {
              setToast({ type: "error", msg: res.error || "Update failed" });
            } else {
              setToast({ type: "success", msg: "Session updated" });
              setEditing(null);
              load();
            }
          } catch (e) {
            setToast({ type: "error", msg: e.message || "Update failed" });
          } finally {
            setSaving(false);
          }
        }}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast ? <Alert severity={toast.type} onClose={() => setToast(null)}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

// ── Edit Session Dialog ────────────────────────────────────────────────────
// Lets admin/team_leader adjust clock_in, clock_out, and notes on a session.
// The backend (PUT /timeman/records/:id) enforces authorization based on role
// and department scope.
function EditSessionDialog({ session, saving, onClose, onSave }) {
  const [clockIn, setClockIn]   = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes]       = useState("");

  // Convert ISO string → "YYYY-MM-DDTHH:mm" for datetime-local input (local TZ)
  const isoToLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };
  // Convert "YYYY-MM-DDTHH:mm" (local) → ISO string
  const localInputToIso = (val) => {
    if (!val) return null;
    return new Date(val).toISOString();
  };

  useEffect(() => {
    if (!session) return;
    setClockIn(isoToLocalInput(session.clock_in));
    setClockOut(isoToLocalInput(session.clock_out));
    setNotes(session.notes || "");
  }, [session]);

  if (!session) return null;

  const computedMinutes = (() => {
    const ci = localInputToIso(clockIn);
    const co = localInputToIso(clockOut);
    if (!ci || !co) return null;
    return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 60000));
  })();
  const computedLabel = computedMinutes == null
    ? "—"
    : `${Math.floor(computedMinutes / 60)}h ${String(computedMinutes % 60).padStart(2, "0")}m`;

  const handleSave = () => {
    const updates = { notes };
    const ci = localInputToIso(clockIn);
    const co = localInputToIso(clockOut);
    if (ci) updates.clock_in = ci;
    if (co) updates.clock_out = co;
    if (ci && co && new Date(co) < new Date(ci)) {
      alert("Clock Out must be after Clock In");
      return;
    }
    onSave(updates);
  };

  return (
    <Dialog open={!!session} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <Edit sx={{ fontSize: 20, color: "#1976d2" }} />
        Edit Time Session
        <Chip
          label={session.user_name}
          size="small"
          sx={{ ml: "auto", bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 600 }}
        />
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Clock In"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Clock Out"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={!clockOut ? "Leave empty to keep the session active" : ""}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p: 1.2, bgcolor: "#f5f7fa", borderRadius: 1, display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: "0.78rem", color: "#546e7a", fontWeight: 600 }}>Computed duration</Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "#1976d2", fontWeight: 800 }}>{computedLabel}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Notes"
              multiline
              minRows={2}
              maxRows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography sx={{ fontSize: "0.7rem", color: "#90a4ae" }}>
              Session ID: {session.id} · Date: {session.date}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} startIcon={<Close />}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <Check />}
          sx={{ bgcolor: "#1976d2" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
