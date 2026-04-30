import PropTypes from "prop-types";

// @mui material components
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";
import Box from "@mui/material/Box";

// Outsourcedbookeeping CRM React components
import MDBox from "components/MDBox";

// Custom styles for the SidenavCollapse
import {
  collapseItem,
  collapseIconBox,
  collapseIcon,
  collapseText,
} from "examples/Sidenav/styles/sidenavCollapse";

// Outsourcedbookeeping CRM React context
import { useMaterialUIController } from "context";

function SidenavCollapse({ icon, name, active, badge, ...rest }) {
  const [controller] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode, sidenavColor } = controller;

  return (
    <ListItem component="li">
      <MDBox
        {...rest}
        sx={(theme) =>
          collapseItem(theme, {
            active,
            transparentSidenav,
            whiteSidenav,
            darkMode,
            sidenavColor,
          })
        }
      >
        {/* Icon with optional red badge dot */}
        <ListItemIcon
          sx={(theme) =>
            collapseIconBox(theme, { transparentSidenav, whiteSidenav, darkMode, active })
          }
        >
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            {typeof icon === "string" ? (
              <Icon sx={(theme) => collapseIcon(theme, { active })}>{icon}</Icon>
            ) : (
              icon
            )}
            {badge > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -5,
                  right: -6,
                  minWidth: badge > 99 ? 18 : badge > 9 ? 16 : 14,
                  height: badge > 99 ? 18 : badge > 9 ? 16 : 14,
                  bgcolor: "#e53935",
                  color: "#fff",
                  borderRadius: "50%",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  px: 0.3,
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.25)",
                  zIndex: 10,
                }}
              >
                {badge > 99 ? "99+" : badge}
              </Box>
            )}
          </Box>
        </ListItemIcon>

        {/* Name with badge count shown when sidebar is expanded */}
        <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
          <ListItemText
            primary={name}
            sx={(theme) =>
              collapseText(theme, {
                miniSidenav,
                transparentSidenav,
                whiteSidenav,
                active,
              })
            }
          />
          {badge > 0 && !miniSidenav && (
            <Box
              sx={{
                ml: 0.5,
                minWidth: 18,
                height: 18,
                bgcolor: "#e53935",
                color: "#fff",
                borderRadius: "10px",
                fontSize: "0.6rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 0.5,
                flexShrink: 0,
              }}
            >
              {badge > 99 ? "99+" : badge}
            </Box>
          )}
        </Box>
      </MDBox>
    </ListItem>
  );
}

// Setting default values for the props of SidenavCollapse
SidenavCollapse.defaultProps = {
  active: false,
  badge: 0,
};

// Typechecking props for the SidenavCollapse
SidenavCollapse.propTypes = {
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  active: PropTypes.bool,
  badge: PropTypes.number,
};

export default SidenavCollapse;
