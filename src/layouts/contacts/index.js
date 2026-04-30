/* eslint-disable */
import { useState, useEffect } from "react";
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
  Avatar,
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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import { contactsAPI } from "services/api";
import ScrollableTable from "components/ScrollableTable";

const CONTACT_TYPES = ["All", "Job Seekers", "Clients-Bill To", "Other", "HR", "Vendor", "Partner"];
const SOURCE_OPTIONS = [
  "Website",
  "Phone",
  "Email",
  "Partner",
  "Cold Call",
  "Facebook",
  "Instagram",
  "Referral",
  "Other",
];
const TYPE_COLORS = {
  "Job Seekers": "#1976d2",
  "Clients-Bill To": "#388e3c",
  Other: "#666",
  HR: "#7b1fa2",
  Vendor: "#f57c00",
  Partner: "#0288d1",
};

function ContactDetailDrawer({ open, contact, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (contact) setForm({ ...contact });
  }, [contact]);
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(contact.id, form);
    } finally {
      setSaving(false);
    }
  };
  if (!contact) return null;
  const deals = contact.deals || [];
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "#1976d2", width: 40, height: 40 }}>
            {(form.name || "?")[0]}
          </Avatar>
          <Typography variant="h6" fontWeight={600}>
            {form.name || "Contact"}
          </Typography>
        </Box>
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
        <Tab label={`Deals (${deals.length})`} />
      </Tabs>
      <Box sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="First Name"
                value={form.first_name || ""}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Last Name"
                value={form.last_name || ""}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
            <TextField
              label="Full Name"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              label="Company"
              value={form.company || ""}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Position"
              value={form.position || ""}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type || "Other"}
                label="Type"
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {CONTACT_TYPES.filter((t) => t !== "All").map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
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
            <TextField
              label="Country"
              value={form.country || ""}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Present Software"
              value={form.present_software || ""}
              onChange={(e) => setForm({ ...form, present_software: e.target.value })}
              fullWidth
              size="small"
            />
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
                onDelete(contact.id);
                onClose();
              }}
            >
              Delete Contact
            </Button>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            {deals.length === 0 && (
              <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>
                No deals linked
              </Typography>
            )}
            {deals.map((deal) => (
              <Box key={deal.id} sx={{ p: 1.5, mb: 1, border: "1px solid #eee", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {deal.title}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Chip label={deal.stage} size="small" sx={{ fontSize: 10 }} />
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    ${Number(deal.amount || 0).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function AddContactDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    type: "Other",
    company: "",
    position: "",
    source: "Website",
    country: "",
    present_software: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
      setForm({
        name: "",
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        type: "Other",
        company: "",
        position: "",
        source: "Website",
        country: "",
        present_software: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Contact</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="First Name"
            value={form.first_name}
            onChange={(e) =>
              setForm({
                ...form,
                first_name: e.target.value,
                name: `${e.target.value} ${form.last_name}`.trim(),
              })
            }
            fullWidth
            size="small"
          />
          <TextField
            label="Last Name"
            value={form.last_name}
            onChange={(e) =>
              setForm({
                ...form,
                last_name: e.target.value,
                name: `${form.first_name} ${e.target.value}`.trim(),
              })
            }
            fullWidth
            size="small"
          />
        </Box>
        <TextField
          label="Full Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          fullWidth
          size="small"
        />
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
            label="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Position"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            fullWidth
            size="small"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={form.type}
              label="Type"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {CONTACT_TYPES.filter((t) => t !== "All").map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Source</InputLabel>
            <Select
              value={form.source}
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
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Present Software"
            value={form.present_software}
            onChange={(e) => setForm({ ...form, present_software: e.target.value })}
            fullWidth
            size="small"
          />
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
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? "Saving..." : "Add Contact"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CRMContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selected, setSelected] = useState([]);
  const [detailContact, setDetailContact] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== "All") params.type = typeFilter;
      const data = await contactsAPI.getAll(params);
      setContacts(data);
    } catch {
      setSnack({
        open: true,
        msg: "Failed to load contacts. Make sure backend is running.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [typeFilter]);
  useEffect(() => {
    const t = setTimeout(fetchContacts, 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [search, typeFilter]);

  const handleOpenDetail = async (id) => {
    try {
      const data = await contactsAPI.getById(id);
      setDetailContact(data);
    } catch {
      setSnack({ open: true, msg: "Failed to load contact", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await contactsAPI.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSnack({ open: true, msg: "Contact deleted", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Delete failed", severity: "error" });
    }
  };

  const handleSave = async (id, data) => {
    try {
      const updated = await contactsAPI.update(id, data);
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...updated } : c)));
      setDetailContact(updated);
      setSnack({ open: true, msg: "Contact updated", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Update failed", severity: "error" });
    }
  };

  const handleAdd = async (data) => {
    try {
      const created = await contactsAPI.create(data);
      setContacts((prev) => [created, ...prev]);
      setSnack({ open: true, msg: "Contact created!", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Create failed", severity: "error" });
    }
  };

  const toggleSelectAll = () => {
    if (selected.length === contacts.length) setSelected([]);
    else setSelected(contacts.map((c) => c.id));
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              CRM Contacts
            </Typography>
            <Chip label={`${contacts.length} total`} size="small" color="primary" />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setAddOpen(true)}
          >
            Add Contact
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search contacts..."
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
          {CONTACT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              onClick={() => setTypeFilter(t)}
              sx={{
                bgcolor: typeFilter === t ? TYPE_COLORS[t] || "#1976d2" : "transparent",
                color: typeFilter === t ? "#fff" : TYPE_COLORS[t] || "#666",
                border: `1px solid ${TYPE_COLORS[t] || "#ccc"}`,
                "&:hover": { bgcolor: typeFilter === t ? "" : "#f5f5f5" },
              }}
            />
          ))}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <Box
            sx={{
              background: "#fff",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <ScrollableTable
              totalCount={contacts.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
            >
                            <Table>

                            <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.length === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <b>Name</b>
                  </TableCell>
                  <TableCell>
                    <b>Type</b>
                  </TableCell>
                  <TableCell>
                    <b>Company</b>
                  </TableCell>
                  <TableCell>
                    <b>Phone</b>
                  </TableCell>
                  <TableCell>
                    <b>Email</b>
                  </TableCell>
                  <TableCell>
                    <b>Country</b>
                  </TableCell>
                  <TableCell>
                    <b>Software</b>
                  </TableCell>
                  <TableCell>
                    <b>Source</b>
                  </TableCell>
                  <TableCell>
                    <b>Created</b>
                  </TableCell>
                  <TableCell>
                    <b>Actions</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((c) => (
                  <TableRow key={c.id} hover selected={selected.includes(c.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.id]
                              : selected.filter((id) => id !== c.id)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "#1976d2", fontSize: 12 }}>
                          {(c.name || "?")[0]}
                        </Avatar>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ cursor: "pointer", color: "#1976d2" }}
                          onClick={() => handleOpenDetail(c.id)}
                        >
                          {c.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.type || "Other"}
                        size="small"
                        sx={{
                          bgcolor: `${TYPE_COLORS[c.type] || "#666"}20`,
                          color: TYPE_COLORS[c.type] || "#666",
                          fontSize: 10,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.company || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.phone || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.email || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.country || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.present_software || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.source || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDetail(c.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} sx={{ textAlign: "center", py: 4 }}>
                      No contacts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </ScrollableTable>
          </Box>
        )}
      </Box>

      <ContactDetailDrawer
        open={Boolean(detailContact)}
        contact={detailContact}
        onClose={() => setDetailContact(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <AddContactDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAdd} />
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
