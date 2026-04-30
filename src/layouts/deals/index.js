/* eslint-disable */
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Menu,
  MenuItem,
  Drawer,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import ListIcon from "@mui/icons-material/List";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { dealsAPI, activitiesAPI } from "services/api";
import ScrollableTable from "components/ScrollableTable";

const STAGES = [
  { id: "New Opportunity", color: "#1976d2", light: "#e3f2fd" },
  { id: "In Progress", color: "#f57c00", light: "#fff3e0" },
  { id: "Need to connect in future", color: "#7b1fa2", light: "#f3e5f5" },
  { id: "Agreement", color: "#0288d1", light: "#e1f5fe" },
  { id: "Won", color: "#388e3c", light: "#e8f5e9" },
  { id: "Lost", color: "#d32f2f", light: "#ffebee" },
];

const SOURCE_OPTIONS = [
  "Website",
  "Phone",
  "Email",
  "Partner",
  "Cold Call",
  "Facebook",
  "Referral",
  "Other",
];
const PRIORITY_OPTIONS = ["low", "medium", "high"];

function DealCard({ deal, onDragStart, onOpenDetail, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const stage = STAGES.find((s) => s.id === deal.stage) || STAGES[0];
  const prob = deal.probability || 0;
  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      sx={{
        background: "#fff",
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        cursor: "grab",
        borderLeft: `4px solid ${stage.color}`,
        "&:hover": { boxShadow: "0 3px 10px rgba(0,0,0,0.15)" },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ cursor: "pointer", "&:hover": { color: "#1976d2" }, flex: 1 }}
          onClick={() => onOpenDetail(deal)}
        >
          {deal.title}
        </Typography>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>
      {deal.contact_name && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
          <PersonIcon sx={{ fontSize: 13, color: "#666" }} />
          <Typography variant="caption" color="text.secondary">
            {deal.contact_name}
          </Typography>
        </Box>
      )}
      {deal.company_name && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <BusinessIcon sx={{ fontSize: 13, color: "#666" }} />
          <Typography variant="caption" color="text.secondary">
            {deal.company_name}
          </Typography>
        </Box>
      )}
      {deal.close_date && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CalendarTodayIcon sx={{ fontSize: 13, color: "#666" }} />
          <Typography variant="caption" color="text.secondary">
            {deal.close_date}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
        <Typography variant="body2" color="success.main" fontWeight={700}>
          {deal.amount > 0 ? `$${Number(deal.amount).toLocaleString()}` : "$0"}
        </Typography>
        <Chip
          label={`${prob}%`}
          size="small"
          sx={{
            fontSize: 10,
            height: 18,
            bgcolor: prob >= 70 ? "#e8f5e9" : prob >= 40 ? "#fff8e1" : "#ffebee",
            color: prob >= 70 ? "#2e7d32" : prob >= 40 ? "#f57f17" : "#c62828",
          }}
        />
      </Box>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onOpenDetail(deal);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDelete(deal.id);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

function DealDetailDrawer({ open, deal, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState(0);
  const [newAct, setNewAct] = useState({ type: "call", title: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (deal) {
      setForm({ ...deal });
      setActivities(deal.activities || []);
    }
  }, [deal]);
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(deal.id, form);
    } finally {
      setSaving(false);
    }
  };
  const handleAddAct = async () => {
    if (!newAct.title) return;
    const act = await activitiesAPI.create({ ...newAct, entity_type: "deal", entity_id: deal.id });
    setActivities([act, ...activities]);
    setNewAct({ type: "call", title: "" });
  };
  if (!deal) return null;
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 480 } }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {form.title || "Deal Detail"}
        </Typography>
        <Box>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving}
            sx={{ mr: 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ px: 2, borderBottom: "1px solid #eee" }}
      >
        <Tab label="Details" />
        <Tab label={`Activities (${activities.length})`} />
      </Tabs>
      <Box sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Title"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Contact Name"
              value={form.contact_name || ""}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Company"
              value={form.company_name || ""}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Phone"
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Amount"
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Probability (%)"
              type="number"
              value={form.probability || ""}
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Close Date"
              type="date"
              value={form.close_date || ""}
              onChange={(e) => setForm({ ...form, close_date: e.target.value })}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select
                value={form.stage || "New Opportunity"}
                label="Stage"
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              >
                {STAGES.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={form.source || "Website"}
                label="Source"
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {SOURCE_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={form.priority || "medium"}
                label="Priority"
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
              size="small"
            />
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => {
                onDelete(deal.id);
                onClose();
              }}
            >
              Delete Deal
            </Button>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select
                  value={newAct.type}
                  onChange={(e) => setNewAct({ ...newAct, type: e.target.value })}
                >
                  {["call", "email", "task", "meeting"].map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Activity title..."
                value={newAct.title}
                onChange={(e) => setNewAct({ ...newAct, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAddAct()}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" size="small" onClick={handleAddAct}>
                Add
              </Button>
            </Box>
            {activities.length === 0 && (
              <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>
                No activities yet
              </Typography>
            )}
            {activities.map((act) => (
              <Box key={act.id} sx={{ p: 1.5, mb: 1, border: "1px solid #eee", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Chip label={act.type} size="small" sx={{ textTransform: "capitalize" }} />
                  <Typography variant="caption" color="text.secondary">
                    {act.created_at ? new Date(act.created_at).toLocaleDateString() : ""}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600} mt={0.5}>
                  {act.title}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function AddDealDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    contact_name: "",
    company_name: "",
    phone: "",
    email: "",
    amount: "",
    stage: "New Opportunity",
    source: "Website",
    priority: "medium",
    probability: 20,
    close_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
      setForm({
        title: "",
        contact_name: "",
        company_name: "",
        phone: "",
        email: "",
        amount: "",
        stage: "New Opportunity",
        source: "Website",
        priority: "medium",
        probability: 20,
        close_date: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Deal</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}
      >
        <TextField
          label="Title *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          fullWidth
          size="small"
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Contact Name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Company"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            fullWidth
            size="small"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
            size="small"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Probability (%)"
            type="number"
            value={form.probability}
            onChange={(e) => setForm({ ...form, probability: e.target.value })}
            fullWidth
            size="small"
          />
        </Box>
        <TextField
          label="Close Date"
          type="date"
          value={form.close_date}
          onChange={(e) => setForm({ ...form, close_date: e.target.value })}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Stage</InputLabel>
            <Select
              value={form.stage}
              label="Stage"
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            >
              {STAGES.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={form.priority}
              label="Priority"
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TextField
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          multiline
          rows={2}
          fullWidth
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.title}>
          {saving ? "Saving..." : "Add Deal"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CRMDeals() {
  const [view, setView] = useState("kanban");
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [detailDeal, setDetailDeal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [stageFilter, setStageFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const dragId = useRef(null);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await dealsAPI.getAll(search ? { search } : {});
      setDeals(data);
    } catch {
      setSnack({
        open: true,
        msg: "Failed to load deals. Make sure backend is running.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);
  useEffect(() => {
    const t = setTimeout(fetchDeals, 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [search, stageFilter]);

  const handleDragStart = (e, id) => {
    dragId.current = id;
  };
  const handleDrop = async (e, stage) => {
    e.preventDefault();
    if (!dragId.current) return;
    const deal = deals.find((d) => d.id === dragId.current);
    if (deal && deal.stage !== stage) {
      setDeals((prev) => prev.map((d) => (d.id === dragId.current ? { ...d, stage } : d)));
      try {
        await dealsAPI.updateStage(dragId.current, stage);
        setSnack({ open: true, msg: "Stage updated", severity: "success" });
      } catch {
        fetchDeals();
      }
    }
    setDragOverStage(null);
    dragId.current = null;
  };

  const handleDelete = async (id) => {
    try {
      await dealsAPI.delete(id);
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setSnack({ open: true, msg: "Deal deleted", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Delete failed", severity: "error" });
    }
  };

  const handleSaveDeal = async (id, data) => {
    try {
      const updated = await dealsAPI.update(id, data);
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...updated } : d)));
      setDetailDeal(updated);
      setSnack({ open: true, msg: "Deal updated", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Update failed", severity: "error" });
    }
  };

  const handleAddDeal = async (data) => {
    try {
      const created = await dealsAPI.create(data);
      setDeals((prev) => [created, ...prev]);
      setSnack({ open: true, msg: "Deal created!", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Create failed", severity: "error" });
    }
  };

  const filteredDeals =
    stageFilter === "All" ? deals : deals.filter((d) => d.stage === stageFilter);
  const totalPipeline = deals
    .filter((d) => !["Won", "Lost"].includes(d.stage))
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalWon = deals
    .filter((d) => d.stage === "Won")
    .reduce((s, d) => s + Number(d.amount || 0), 0);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              CRM Deals
            </Typography>
            <Chip label={`${deals.length} total`} size="small" color="primary" />
            <Chip
              label={`Pipeline: $${totalPipeline.toLocaleString()}`}
              size="small"
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`Won: $${totalWon.toLocaleString()}`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => setAddOpen(true)}
            >
              Add Deal
            </Button>
            <IconButton
              onClick={() => setView(view === "kanban" ? "list" : "kanban")}
              sx={{ border: "1px solid #ddd" }}
            >
              {view === "kanban" ? <ListIcon /> : <ViewKanbanIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220 }}
          />
          <Chip
            label="All"
            onClick={() => setStageFilter("All")}
            color={stageFilter === "All" ? "primary" : "default"}
            variant={stageFilter === "All" ? "filled" : "outlined"}
            size="small"
          />
          {STAGES.map((s) => (
            <Chip
              key={s.id}
              label={s.id}
              onClick={() => setStageFilter(s.id)}
              size="small"
              sx={{
                bgcolor: stageFilter === s.id ? s.color : "transparent",
                color: stageFilter === s.id ? "#fff" : s.color,
                borderColor: s.color,
                border: "1px solid",
                "&:hover": { bgcolor: s.light },
              }}
            />
          ))}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Kanban */}
        {!loading && view === "kanban" && (
          <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2, alignItems: "flex-start" }}>
            {STAGES.filter((s) => stageFilter === "All" || s.id === stageFilter).map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id);
              const total = stageDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);
              return (
                <Box
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage.id);
                  }}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  onDragLeave={() => setDragOverStage(null)}
                  sx={{
                    minWidth: 240,
                    maxWidth: 260,
                    flex: "0 0 240px",
                    background: dragOverStage === stage.id ? stage.light : "#f8f9fa",
                    borderRadius: 2,
                    p: 1.5,
                    border: `2px solid ${dragOverStage === stage.id ? stage.color : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color={stage.color}>
                        {stage.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stageDeals.length} · ${total.toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={stageDeals.length}
                      size="small"
                      sx={{ bgcolor: stage.light, color: stage.color, fontWeight: 700 }}
                    />
                  </Box>
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={handleDragStart}
                      onOpenDetail={setDetailDeal}
                      onDelete={handleDelete}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 4, color: "#ccc" }}>
                      <Typography variant="caption">Drop deals here</Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* List */}
        {!loading && view === "list" && (
          <Box
            sx={{
              background: "#fff",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <ScrollableTable
              totalCount={filteredDeals.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
            >
                            <Table>

                            <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell>
                    <b>Title</b>
                  </TableCell>
                  <TableCell>
                    <b>Contact</b>
                  </TableCell>
                  <TableCell>
                    <b>Company</b>
                  </TableCell>
                  <TableCell>
                    <b>Stage</b>
                  </TableCell>
                  <TableCell>
                    <b>Amount</b>
                  </TableCell>
                  <TableCell>
                    <b>Prob.</b>
                  </TableCell>
                  <TableCell>
                    <b>Close Date</b>
                  </TableCell>
                  <TableCell>
                    <b>Source</b>
                  </TableCell>
                  <TableCell>
                    <b>Actions</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDeals.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((deal) => {
                  const stage = STAGES.find((s) => s.id === deal.stage) || STAGES[0];
                  return (
                    <TableRow key={deal.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ cursor: "pointer", color: "#1976d2" }}
                          onClick={() => setDetailDeal(deal)}
                        >
                          {deal.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{deal.contact_name || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{deal.company_name || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={deal.stage}
                          size="small"
                          sx={{ bgcolor: stage.light, color: stage.color, fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          ${Number(deal.amount || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{deal.probability || 0}%</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{deal.close_date || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{deal.source || "—"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setDetailDeal(deal)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(deal.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDeals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                      No deals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </ScrollableTable>
          </Box>
        )}
      </Box>

      <DealDetailDrawer
        open={Boolean(detailDeal)}
        deal={detailDeal}
        onClose={() => setDetailDeal(null)}
        onSave={handleSaveDeal}
        onDelete={handleDelete}
      />
      <AddDealDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddDeal} />
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
