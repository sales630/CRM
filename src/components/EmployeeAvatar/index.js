/* eslint-disable */
/**
 * EmployeeAvatar — clickable avatar/chip that opens the full employee profile dialog.
 * Drop this anywhere in the CRM where an employee name appears.
 *
 * Props:
 *   name        {string}  Employee's display name (matched against HR employees by name)
 *   size        {number}  Avatar diameter in px (default 24)
 *   showName    {boolean} Show name text next to avatar (default false)
 *   chipMode    {boolean} Render as a small MUI Chip instead of bare Avatar
 */
import { useState, useCallback } from "react";
import { Avatar, Box, Chip, Tooltip, CircularProgress } from "@mui/material";
import { EmployeeProfileDialog } from "layouts/employees";
import { hrAPI } from "services/api";

// ── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (n = "") =>
  n.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const avatarColor = (name = "") => {
  const C = [
    "#e53935","#8e24aa","#1e88e5","#00897b",
    "#f4511e","#fb8c00","#3949ab","#00acc1","#43a047","#6d4c41",
  ];
  let s = 0;
  for (const c of name) s += c.charCodeAt(0);
  return C[s % C.length];
};

// ── Component ──────────────────────────────────────────────────────────────
export default function EmployeeAvatar({ name, size = 24, showName = false, chipMode = false }) {
  const [open, setOpen]         = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [empId, setEmpId]       = useState(null);

  const handleClick = useCallback(async (e) => {
    e.stopPropagation();
    if (!name) return;
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        hrAPI.getEmployees(),
        hrAPI.getDepartments(),
      ]);
      const emps = empRes?.data || [];
      const depts = deptRes?.data || [];
      // Match by name (case-insensitive)
      const found = emps.find(
        (e) => (e.name || "").trim().toLowerCase() === (name || "").trim().toLowerCase()
      );
      setEmployees(emps);
      setDepts(depts);
      setEmpId(found?.id || null);
      if (found) setOpen(true);
    } catch (err) {
      console.error("EmployeeAvatar: could not load HR data", err);
    } finally {
      setLoading(false);
    }
  }, [name]);

  const avatarEl = (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        bgcolor: avatarColor(name || ""),
        cursor: name ? "pointer" : "default",
        transition: "opacity 0.15s",
        "&:hover": name ? { opacity: 0.82 } : {},
      }}
    >
      {loading ? (
        <CircularProgress size={size * 0.55} sx={{ color: "#fff" }} />
      ) : (
        getInitials(name)
      )}
    </Avatar>
  );

  return (
    <>
      <Tooltip title={name ? `View ${name}'s profile` : "Unassigned"} placement="top">
        {chipMode ? (
          <Chip
            avatar={avatarEl}
            label={name || "Unassigned"}
            size="small"
            onClick={handleClick}
            sx={{ cursor: "pointer", fontWeight: 500 }}
          />
        ) : (
          <Box
            onClick={handleClick}
            display="flex"
            alignItems="center"
            gap={0.75}
            sx={{ cursor: name ? "pointer" : "default", display: "inline-flex" }}
          >
            {avatarEl}
            {showName && (
              <span style={{ fontSize: "0.75rem", color: "#546e7a", fontWeight: 500 }}>
                {name || "—"}
              </span>
            )}
          </Box>
        )}
      </Tooltip>

      {open && empId && (
        <EmployeeProfileDialog
          empId={empId}
          open={open}
          onClose={() => setOpen(false)}
          employees={employees}
          departments={departments}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
    </>
  );
}
