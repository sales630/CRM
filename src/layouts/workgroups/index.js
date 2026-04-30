/* eslint-disable */
import ScrollableTable from "components/ScrollableTable";
import { useState, useEffect, useCallback } from "react";
import { workgroupsAPI } from "services/api";
import { useAuth } from "context/AuthContext";
import WorkgroupDetail from "./WorkgroupDetail";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  AvatarGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  Close,
  Search,
  MoreHoriz,
  Edit,
  Delete,
  People,
  Lock,
  Public,
  Visibility,
  Message,
  Task,
  FolderOpen,
  CalendarToday,
} from "@mui/icons-material";

const getColor = (name) => {
  const C = [
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
  let s = 0;
  for (let c of name || "U") s += c.charCodeAt(0);
  return C[s % C.length];
};


function CreateGroupModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    type: "workgroup",
    privacy: "Private",
    description: "",
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography fontWeight="bold">Create Workgroup / Project</Typography>
        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="workgroup">Workgroup</MenuItem>
                <MenuItem value="project">Project</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Privacy</InputLabel>
              <Select
                value={form.privacy}
                label="Privacy"
                onChange={(e) => setForm({ ...form, privacy: e.target.value })}
              >
                <MenuItem value="Public">
                  <Public fontSize="small" sx={{ mr: 0.5 }} />
                  Public
                </MenuItem>
                <MenuItem value="Private">
                  <Lock fontSize="small" sx={{ mr: 0.5 }} />
                  Private
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!form.name.trim()}
          onClick={() => {
            onCreate(form);
            onClose();
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}


export default function Workgroups() {
  const { currentUser } = useAuth();
  const isEmployee = currentUser?.role === "employee";
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewGroup, setViewGroup] = useState(null);   // full-page detail view
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuGroup, setMenuGroup] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadGroups = useCallback(() => {
    setLoading(true);
    workgroupsAPI.getAll().then(res => {
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // Parse members from JSON string if needed
      const parsed = data.map(g => ({
        ...g,
        members: (() => { try { return typeof g.members === "string" ? JSON.parse(g.members) : (Array.isArray(g.members) ? g.members : []); } catch { return []; } })(),
      }));
      setGroups(parsed);
    }).catch(() => setGroups([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  // Helper: check if current user is a member or owner of a group
  const isUserMember = (g) => {
    const members = Array.isArray(g.members) ? g.members : [];
    return members.includes(currentUser?.name) || g.owner === currentUser?.name || g.owner_id === String(currentUser?.id);
  };

  const filtered = groups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    // Employees can only see groups they belong to
    if (isEmployee) return isUserMember(g);
    if (statusFilter === "My Groups") return isUserMember(g);
    if (statusFilter === "I manage") {
      return g.owner === currentUser?.name || g.owner_id === String(currentUser?.id);
    }
    return true; // "Active" and "All"
  });
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const toggleSelect = (id) =>
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const toggleAll = () =>
    setSelected(selected.length === paginated.length ? [] : paginated.map((g) => g.id));

  const handleCreate = async (form) => {
    try {
      await workgroupsAPI.create(form);
      loadGroups();
    } catch (e) { console.error(e); }
  };

  const handleJoin = async (id) => {
    try {
      await workgroupsAPI.join(id);
      loadGroups();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await workgroupsAPI.delete(id);
      setMenuAnchor(null);
      loadGroups();
    } catch (e) { console.error(e); }
  };

  // ── Full-page workgroup detail view ──────────────────────────────────────
  if (viewGroup) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ mt: 2, mb: 4 }}>
          <WorkgroupDetail group={viewGroup} onBack={() => setViewGroup(null)} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Workgroups and projects
          </Typography>
          {!isEmployee && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
              + Create
            </Button>
          )}
        </Box>

        {/* Filter row — hidden for employees (they only see their own groups) */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          {!isEmployee && ["Active", "All", "My Groups", "I manage"].map((f) => (
            <Chip
              key={f}
              label={f}
              onClick={() => setStatusFilter(f)}
              variant={statusFilter === f ? "filled" : "outlined"}
              color={statusFilter === f ? "primary" : "default"}
              size="small"
              sx={{ cursor: "pointer" }}
              onDelete={
                statusFilter === f && f !== "Active" ? () => setStatusFilter("Active") : undefined
              }
            />
          ))}
          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <TextField
              size="small"
              placeholder="search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Search fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />
                ),
              }}
              sx={{ width: 180 }}
            />
          </Box>
        </Box>

        {/* Overdue/Communications chips */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {["Overdue: 0", "Communications: 0", "Overdue: 0", "Communications: 0"].map((l, i) => (
            <Chip key={i} label={l} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
          ))}
        </Box>

        <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <ScrollableTable
            totalCount={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          >
            <Table size="small">
              <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.length === paginated.length && paginated.length > 0}
                      indeterminate={selected.length > 0 && selected.length < paginated.length}
                      onChange={toggleAll}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 40 }}>
                    <Typography variant="caption" fontWeight="bold">
                      ⚙
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 60 }}>
                    <Typography variant="caption" fontWeight="bold">
                      ID
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      NAME
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      CREATED ON
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      PRIVACY TYPE
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      LAST UPDATED ON
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      VIEW MEMBERS
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      ROLE
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      {isEmployee
                        ? "You are not a member of any workgroup or project yet."
                        : "No workgroups yet. Click \"+ Create\" to add one."}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && paginated.map((group) => (
                  <TableRow key={group.id} hover selected={selected.includes(group.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selected.includes(group.id)}
                        onChange={() => toggleSelect(group.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setMenuAnchor(e.currentTarget);
                          setMenuGroup(group);
                        }}
                      >
                        <MoreHoriz fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {group.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: group.type === "project" ? "#1976d2" : "#7b1fa2",
                            fontSize: "0.7rem",
                          }}
                        >
                          {group.type === "project" ? "P" : "W"}
                        </Avatar>
                        <Typography
                          variant="body2"
                          color="primary"
                          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                          onClick={() => setViewGroup(group)}
                        >
                          {group.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {group.created_at ? new Date(group.created_at).toLocaleString() : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {group.privacy === "Private" ? (
                          <Lock fontSize="small" sx={{ fontSize: 14, color: "text.secondary" }} />
                        ) : (
                          <Public fontSize="small" sx={{ fontSize: 14, color: "text.secondary" }} />
                        )}
                        <Typography variant="caption">{group.privacy}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {group.updated_at ? new Date(group.updated_at).toLocaleString() : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <AvatarGroup
                        max={4}
                        sx={{ "& .MuiAvatar-root": { width: 22, height: 22, fontSize: "0.6rem" } }}
                      >
                        {group.members.map((m) => (
                          <Tooltip key={m} title={m}>
                            <Avatar
                              sx={{
                                width: 22,
                                height: 22,
                                bgcolor: getColor(m),
                                fontSize: "0.6rem",
                              }}
                            >
                              {m.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const myName = currentUser?.name || "";
                        const isOwner = group.owner === myName || group.owner_id === String(currentUser?.id || "");
                        const isMember = Array.isArray(group.members) && group.members.includes(myName);
                        const roleLabel = isOwner ? "Owner" : isMember ? "Member" : "Join";
                        return (
                          <Button
                            size="small"
                            variant={roleLabel === "Join" ? "outlined" : "contained"}
                            onClick={() => !isOwner && !isMember && handleJoin(group.id)}
                            sx={{ fontSize: "0.7rem", py: 0.25, px: 1, minWidth: 0, textTransform: "none" }}
                          >
                            {roleLabel}
                          </Button>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTable>

          {/* Selection info */}
          <Box sx={{ px: 2, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              SELECTED: {selected.length} / {filtered.length} &nbsp;&nbsp; TOTAL: {filtered.length}
            </Typography>
          </Box>
        </Card>

        {/* Context Menu */}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setViewGroup(menuGroup);
              setMenuAnchor(null);
            }}
          >
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
          <MenuItem>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem
            sx={{ color: "error.main" }}
            onClick={() => {
              handleDelete(menuGroup?.id);
            }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </Box>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </DashboardLayout>
  );
}
