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
  Avatar,
  Drawer,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import { companiesAPI } from "services/api";
import ScrollableTable from "components/ScrollableTable";

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Real Estate",
  "Legal",
  "Consulting",
  "Accounting",
  "Other",
];
const SOURCE_OPTIONS = ["Website", "Phone", "Email", "Partner", "Cold Call", "Referral", "Other"];

function CompanyDetailDrawer({ open, company, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (company) setForm({ ...company });
  }, [company]);
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(company.id, form);
    } finally {
      setSaving(false);
    }
  };
  if (!company) return null;
  const contacts = company.contacts || [];
  const deals = company.deals || [];
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
            <BusinessIcon />
          </Avatar>
          <Typography variant="h6" fontWeight={600}>
            {form.name || "Company"}
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
        <Tab label={`Contacts (${contacts.length})`} />
        <Tab label={`Deals (${deals.length})`} />
      </Tabs>
      <Box sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Company Name"
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
              label="Website"
              value={form.website || ""}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Industry</InputLabel>
              <Select
                value={form.industry || "Other"}
                label="Industry"
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              >
                {INDUSTRIES.map((i) => (
                  <MenuItem key={i} value={i}>
                    {i}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Employees"
              type="number"
              value={form.employees || ""}
              onChange={(e) => setForm({ ...form, employees: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Annual Revenue ($)"
              type="number"
              value={form.revenue || ""}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Address"
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              fullWidth
              size="small"
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="City"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Country"
                value={form.country || ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
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
                onDelete(company.id);
                onClose();
              }}
            >
              Delete Company
            </Button>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            {contacts.length === 0 && (
              <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>
                No contacts
              </Typography>
            )}
            {contacts.map((c) => (
              <Box
                key={c.id}
                sx={{
                  p: 1.5,
                  mb: 1,
                  border: "1px solid #eee",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Avatar sx={{ width: 30, height: 30, bgcolor: "#7b1fa2", fontSize: 12 }}>
                  {(c.name || "?")[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {c.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.position || c.type}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {tab === 2 && (
          <Box>
            {deals.length === 0 && (
              <Typography color="text.secondary" variant="body2" textAlign="center" py={3}>
                No deals
              </Typography>
            )}
            {deals.map((d) => (
              <Box key={d.id} sx={{ p: 1.5, mb: 1, border: "1px solid #eee", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {d.title}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Chip label={d.stage} size="small" sx={{ fontSize: 10 }} />
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    ${Number(d.amount || 0).toLocaleString()}
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

function AddCompanyDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    website: "",
    industry: "Technology",
    employees: "",
    revenue: "",
    address: "",
    city: "",
    country: "",
    source: "Website",
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
        phone: "",
        email: "",
        website: "",
        industry: "Technology",
        employees: "",
        revenue: "",
        address: "",
        city: "",
        country: "",
        source: "Website",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Company</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}
      >
        <TextField
          label="Company Name *"
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
        <TextField
          label="Website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          fullWidth
          size="small"
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Industry</InputLabel>
            <Select
              value={form.industry}
              label="Industry"
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            >
              {INDUSTRIES.map((i) => (
                <MenuItem key={i} value={i}>
                  {i}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Employees"
            type="number"
            value={form.employees}
            onChange={(e) => setForm({ ...form, employees: e.target.value })}
            fullWidth
            size="small"
          />
        </Box>
        <TextField
          label="Annual Revenue ($)"
          type="number"
          value={form.revenue}
          onChange={(e) => setForm({ ...form, revenue: e.target.value })}
          fullWidth
          size="small"
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
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
          {saving ? "Saving..." : "Add Company"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CRMCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailCompany, setDetailCompany] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await companiesAPI.getAll(search ? { search } : {});
      setCompanies(data);
    } catch {
      setSnack({
        open: true,
        msg: "Failed to load companies. Make sure backend is running.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);
  useEffect(() => {
    const t = setTimeout(fetchCompanies, 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [search]);

  const handleOpenDetail = async (id) => {
    try {
      const data = await companiesAPI.getById(id);
      setDetailCompany(data);
    } catch {
      setSnack({ open: true, msg: "Failed to load company", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await companiesAPI.delete(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      setSnack({ open: true, msg: "Company deleted", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Delete failed", severity: "error" });
    }
  };

  const handleSave = async (id, data) => {
    try {
      const updated = await companiesAPI.update(id, data);
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...updated } : c)));
      setDetailCompany(updated);
      setSnack({ open: true, msg: "Company updated", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Update failed", severity: "error" });
    }
  };

  const handleAdd = async (data) => {
    try {
      const created = await companiesAPI.create(data);
      setCompanies((prev) => [created, ...prev]);
      setSnack({ open: true, msg: "Company created!", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Create failed", severity: "error" });
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              CRM Companies
            </Typography>
            <Chip label={`${companies.length} total`} size="small" color="primary" />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setAddOpen(true)}
          >
            Add Company
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 280 }}
          />
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
              totalCount={companies.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
            >
                            <Table>

                            <TableHead style={{ display: "table-header-group" }}>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell>
                    <b>Company</b>
                  </TableCell>
                  <TableCell>
                    <b>Industry</b>
                  </TableCell>
                  <TableCell>
                    <b>Phone</b>
                  </TableCell>
                  <TableCell>
                    <b>Email</b>
                  </TableCell>
                  <TableCell>
                    <b>Employees</b>
                  </TableCell>
                  <TableCell>
                    <b>Revenue</b>
                  </TableCell>
                  <TableCell>
                    <b>City</b>
                  </TableCell>
                  <TableCell>
                    <b>Country</b>
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
                {companies.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: "#1976d2", fontSize: 12 }}>
                          <BusinessIcon sx={{ fontSize: 16 }} />
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
                        label={c.industry || "—"}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.phone || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.email || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <PeopleIcon sx={{ fontSize: 14, color: "#666" }} />
                        <Typography variant="body2">{c.employees || "—"}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {c.revenue > 0 ? `$${Number(c.revenue).toLocaleString()}` : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.city || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.country || "—"}</Typography>
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
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                      No companies found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </ScrollableTable>
          </Box>
        )}
      </Box>

      <CompanyDetailDrawer
        open={Boolean(detailCompany)}
        company={detailCompany}
        onClose={() => setDetailCompany(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <AddCompanyDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAdd} />
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
