/* eslint-disable */
import { Box, IconButton, Tooltip, Avatar } from "@mui/material";
import { Call, Videocam } from "@mui/icons-material";
import { useCall } from "context/CallContext";

/**
 * CallButton — drop anywhere, pass target user info.
 * Props:
 *   userId     — target user's ID
 *   userName   — target user's display name
 *   iconSize   — size of icons (default 16)
 *   showVideo  — show video call button (default true)
 *   showAudio  — show audio call button (default true)
 *   compact    — single icon mode (video only) (default false)
 */
export default function CallButton({ userId, userName, iconSize = 16, showVideo = true, showAudio = true, compact = false }) {
  const { startCall, callState, isOnline } = useCall();

  const online = isOnline(userId);
  const busy   = callState !== "idle";

  if (!userId || !userName) return null;

  const handleVideo = (e) => { e.stopPropagation(); if (!busy) startCall({ userId, userName }, "video"); };
  const handleAudio = (e) => { e.stopPropagation(); if (!busy) startCall({ userId, userName }, "audio"); };

  if (compact) {
    return (
      <Tooltip title={!online ? `${userName} is offline` : busy ? "Already in a call" : `Video call ${userName}`} placement="top">
        <span>
          <IconButton size="small" onClick={handleVideo} disabled={!online || busy}
            sx={{ color: online ? "#1976d2" : "#b0bec5", p: 0.5, "&:hover": { bgcolor: online ? "#e3f2fd" : "transparent" } }}>
            <Videocam sx={{ fontSize: iconSize }} />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Box display="flex" gap={0.25} alignItems="center">
      {showVideo && (
        <Tooltip title={!online ? `${userName} is offline` : busy ? "Already in a call" : `Video call`} placement="top">
          <span>
            <IconButton size="small" onClick={handleVideo} disabled={!online || busy}
              sx={{ color: online ? "#1976d2" : "#b0bec5", p: 0.5, "&:hover": { bgcolor: online ? "#e3f2fd" : "transparent" } }}>
              <Videocam sx={{ fontSize: iconSize }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {showAudio && (
        <Tooltip title={!online ? `${userName} is offline` : busy ? "Already in a call" : `Audio call`} placement="top">
          <span>
            <IconButton size="small" onClick={handleAudio} disabled={!online || busy}
              sx={{ color: online ? "#388e3c" : "#b0bec5", p: 0.5, "&:hover": { bgcolor: online ? "#e8f5e9" : "transparent" } }}>
              <Call sx={{ fontSize: iconSize }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {/* Online indicator dot */}
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: online ? "#4caf50" : "#b0bec5", flexShrink: 0, ml: 0.25 }} />
    </Box>
  );
}
