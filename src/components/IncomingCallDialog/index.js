/* eslint-disable */
import { useEffect, useRef } from "react";
import { Box, Typography, Avatar, IconButton, Tooltip } from "@mui/material";
import { Call, CallEnd, Videocam } from "@mui/icons-material";
import { useCall } from "context/CallContext";

const avatarColor = (name = "") => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00"];
  let s = 0; for (let c of name) s += c.charCodeAt(0);
  return C[s % C.length];
};
const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

export default function IncomingCallDialog() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const audioRef = useRef(null);

  // Play ringtone
  useEffect(() => {
    if (!incomingCall) return;
    // Simple beep via AudioContext
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    const ring = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
      setTimeout(ring, 2000);
    };
    ring();
    return () => { stopped = true; ctx.close(); };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";
  const name = incomingCall.fromName || "Unknown";

  return (
    <Box sx={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 10000,
      width: 320,
      borderRadius: "20px",
      bgcolor: "#1a2332",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      overflow: "hidden",
      animation: "slideIn 0.35s ease-out",
      "@keyframes slideIn": {
        from: { opacity: 0, transform: "translateY(40px) scale(0.92)" },
        to:   { opacity: 1, transform: "translateY(0) scale(1)" },
      },
    }}>
      {/* Animated top bar */}
      <Box sx={{ height: 4, bgcolor: "#21a038", animation: "progress 2s linear infinite", "@keyframes progress": { from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "200px 0" } }, backgroundImage: "linear-gradient(90deg,#21a038 40%,#4cde6e 50%,#21a038 60%)", backgroundSize: "200px 4px" }} />

      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        {/* Caller info */}
        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
          <Box sx={{ position: "relative" }}>
            <Avatar sx={{ width: 56, height: 56, fontSize: 22, fontWeight: 700, bgcolor: avatarColor(name), boxShadow: "0 0 0 3px rgba(33,160,56,0.5)" }}>
              {getInitials(name)}
            </Avatar>
            {/* Ripple */}
            <Box sx={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid rgba(33,160,56,0.4)", animation: "ripple 1.5s ease-out infinite", "@keyframes ripple": { from: { opacity: 1, transform: "scale(1)" }, to: { opacity: 0, transform: "scale(1.5)" } } }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", mb: 0.3 }}>
              Incoming {isVideo ? "video" : "audio"} call
            </Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{name}</Typography>
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              {isVideo ? <Videocam sx={{ fontSize: 13, color: "#90caf9" }} /> : <Call sx={{ fontSize: 13, color: "#90caf9" }} />}
              <Typography sx={{ fontSize: "0.68rem", color: "#90caf9" }}>{isVideo ? "Video call" : "Audio call"}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box display="flex" justifyContent="space-around" alignItems="center">
          <Box sx={{ textAlign: "center" }}>
            <IconButton onClick={rejectCall}
              sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" }, color: "#fff", width: 52, height: 52, mb: 0.5 }}>
              <CallEnd sx={{ fontSize: 24 }} />
            </IconButton>
            <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>Decline</Typography>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <IconButton onClick={acceptCall}
              sx={{ bgcolor: "#21a038", "&:hover": { bgcolor: "#1a8a30" }, color: "#fff", width: 52, height: 52, mb: 0.5, animation: "pulse-green 1.2s ease-in-out infinite", "@keyframes pulse-green": { "0%,100%": { boxShadow: "0 0 0 0 rgba(33,160,56,0.5)" }, "50%": { boxShadow: "0 0 0 10px rgba(33,160,56,0)" } } }}>
              {isVideo ? <Videocam sx={{ fontSize: 24 }} /> : <Call sx={{ fontSize: 24 }} />}
            </IconButton>
            <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>Accept</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
