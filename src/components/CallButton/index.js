/* eslint-disable */
import { Box, IconButton, Tooltip } from "@mui/material";
import { Call, Videocam } from "@mui/icons-material";
import { useCall } from "context/CallContext";

export default function CallButton({ userId, userName, iconSize = 16, showVideo = true, showAudio = true, compact = false }) {
    const ctx = useCall() || {};
    const startCall = ctx.startCall;
    const callState = ctx.callState || "idle";
    const busy = callState !== "idle";
    if (!userId && !userName) return null;
    const onVideo = (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (!busy && startCall) startCall({ userId: userId, userName: userName }, "video", userName); };
    const onAudio = (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (!busy && startCall) startCall({ userId: userId, userName: userName }, "audio", userName); };
    if (compact) {
          return (
                  <Tooltip title={busy ? "Already in a call" : ("Video call " + (userName || ""))} placement="top">
              <span><IconButton size="small" onClick={onVideo} disabled={busy}><Videocam sx={{ fontSize: iconSize }} /></IconButton></span>
  </Tooltip>
    );
}
  return (
        <Box sx={{ display: "flex", gap: 0.5 }}>
{showAudio && (
          <Tooltip title={busy ? "Already in a call" : ("Audio call " + (userName || ""))} placement="top">
            <span><IconButton size="small" onClick={onAudio} disabled={busy}><Call sx={{ fontSize: iconSize }} /></IconButton></span>
  </Tooltip>
      )}
{showVideo && (
          <Tooltip title={busy ? "Already in a call" : ("Video call " + (userName || ""))} placement="top">
            <span><IconButton size="small" onClick={onVideo} disabled={busy}><Videocam sx={{ fontSize: iconSize }} /></IconButton></span>
  </Tooltip>
          )}
</Box>
  );
}
