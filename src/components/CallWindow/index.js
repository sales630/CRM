/* eslint-disable */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, IconButton, Avatar, Tooltip, Chip,
} from "@mui/material";
import {
  Mic, MicOff, Videocam, VideocamOff, ScreenShare, StopScreenShare,
  CallEnd, DragIndicator, OpenInFull, CloseFullscreen,
} from "@mui/icons-material";
import { useCall } from "context/CallContext";

const avatarColor = (name = "") => {
  const C = ["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fb8c00"];
  let s = 0; for (let c of name) s += c.charCodeAt(0);
  return C[s % C.length];
};
const getInitials = (n = "") => n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

export default function CallWindow() {
  const {
    callState, callType, remoteUser,
    localStream, remoteStream,
    isMuted, isCamOff, isSharingScreen,
    callDuration, fmtDuration,
    endCall, toggleMute, toggleCamera, toggleScreenShare,
  } = useCall();

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const dragRef        = useRef(null);
  const dragState      = useRef({ dragging: false, ox: 0, oy: 0 });
  const [pos, setPos]  = useState({ x: 24, y: 24 });
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded]   = useState(false);

  // Attach local stream to local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote stream to dedicated <audio> element — handles audio for ALL call types
  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (audio && remoteStream) {
      audio.srcObject = remoteStream; audio.muted = false; audio.volume = 1.0;
      audio.play().catch(() => {});
    }
  }, [remoteStream]);

  // Attach remote stream to <video> element when it is mounted (callback ref)
  // Also update whenever remoteStream changes (useCallback recreates fn → React calls it again)
  const setRemoteVideoRef = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
    }
  }, [remoteStream]);

  // Drag handlers
  const onMouseDown = (e) => {
    dragState.current = { dragging: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = (e) => {
    if (!dragState.current.dragging) return;
    setPos({ x: e.clientX - dragState.current.ox, y: e.clientY - dragState.current.oy });
  };
  const onMouseUp = () => {
    dragState.current.dragging = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  if (callState === "idle" || callState === "incoming") return null;

  // Determine display labels
  const statusLabel = callState === "active"
    ? fmtDuration(callDuration)
    : callState === "calling"
      ? "Ringing…"
      : "Connecting…";

  const isVideo = callType === "video";
  const hasRemoteVideo = !!remoteStream && isVideo;

  const w = expanded ? 900 : minimized ? 240 : 380;
  const h = expanded ? 560 : minimized ? 52 : isVideo ? 280 : 160;

  return (
    <>
    {/* Remote audio — always present so audio plays even when minimized or camera is off */}
    <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

    <Box
      ref={dragRef}
      sx={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: w,
        height: h,
        zIndex: 9999,
        borderRadius: minimized ? "28px" : "16px",
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
        bgcolor: "#0f1923",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s, height 0.2s, border-radius 0.2s",
        userSelect: "none",
      }}
    >
      {/* ── Drag handle / top bar ── */}
      <Box
        onMouseDown={onMouseDown}
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1.5,
          py: 0.75,
          bgcolor: "rgba(255,255,255,0.06)",
          cursor: "grab",
          gap: 1,
          flexShrink: 0,
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragIndicator sx={{ fontSize: 16, color: "rgba(255,255,255,0.35)" }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {callState === "calling" ? `Calling ${remoteUser?.userName}…` : remoteUser?.userName || "Call"}
          </Typography>
          {!minimized && (
            <Typography sx={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>
              {statusLabel}
            </Typography>
          )}
        </Box>
        {callState === "active" && (
          <Chip
            label={fmtDuration(callDuration)}
            size="small"
            sx={{ bgcolor: "#21a038", color: "#fff", fontWeight: 700, fontSize: "0.62rem", height: 18, "& .MuiChip-label": { px: 0.75 } }}
          />
        )}
        <Tooltip title={minimized ? "Expand" : "Minimize"}><IconButton size="small" onClick={() => setMinimized(m => !m)} sx={{ color: "rgba(255,255,255,0.6)", p: 0.4 }}><CloseFullscreen sx={{ fontSize: 14 }} /></IconButton></Tooltip>
        {!minimized && <Tooltip title={expanded ? "Shrink" : "Full size"}><IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ color: "rgba(255,255,255,0.6)", p: 0.4 }}><OpenInFull sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
      </Box>

      {/* ── Video area ── */}
      {!minimized && (
        <Box sx={{ flex: 1, position: "relative", bgcolor: "#0f1923", overflow: "hidden" }}>
          {/* Remote video / avatar */}
          {hasRemoteVideo ? (
            // Use callback ref so srcObject is set immediately when this element mounts
            <video
              ref={setRemoteVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
              <Avatar sx={{ width: 72, height: 72, fontSize: 28, fontWeight: 700, bgcolor: avatarColor(remoteUser?.userName || ""), boxShadow: "0 0 0 4px rgba(255,255,255,0.15)" }}>
                {getInitials(remoteUser?.userName || "?")}
              </Avatar>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{remoteUser?.userName}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                {callState === "calling" ? "Calling…" : callState === "connecting" ? "Connecting…" : isVideo && isCamOff ? "Camera off" : "Audio call"}
              </Typography>
              {(callState === "active" || callState === "connecting") && (
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#21a038", animation: "pulse 1.5s infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
              )}
              {/* Note: audio is handled by the always-present <audio> element above */}
            </Box>
          )}

          {/* Local video (PiP) — callback ref re-attaches srcObject if element remounts */}
          {isVideo && localStream && !isCamOff && !isSharingScreen && (
            <Box sx={{ position: "absolute", bottom: 10, right: 10, width: 90, height: 68, borderRadius: "8px", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el && localStream) { el.srcObject = localStream; el.play().catch(() => {}); }
                }}
                autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
            </Box>
          )}
          {/* Screen share label */}
          {isSharingScreen && (
            <Box sx={{ position: "absolute", top: 8, left: 8, bgcolor: "rgba(25,118,210,0.85)", borderRadius: "8px", px: 1.2, py: 0.4 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>📺 Sharing screen</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Controls ── */}
      {!minimized && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, px: 1.5, py: 1, bgcolor: "rgba(0,0,0,0.5)", flexShrink: 0 }}>
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <IconButton onClick={toggleMute} size="small"
              sx={{ bgcolor: isMuted ? "#d32f2f" : "rgba(255,255,255,0.12)", "&:hover": { bgcolor: isMuted ? "#b71c1c" : "rgba(255,255,255,0.22)" }, color: "#fff", width: 38, height: 38 }}>
              {isMuted ? <MicOff sx={{ fontSize: 18 }} /> : <Mic sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {isVideo && (
            <Tooltip title={isCamOff ? "Turn camera on" : "Turn camera off"}>
              <IconButton onClick={toggleCamera} size="small"
                sx={{ bgcolor: isCamOff ? "#d32f2f" : "rgba(255,255,255,0.12)", "&:hover": { bgcolor: isCamOff ? "#b71c1c" : "rgba(255,255,255,0.22)" }, color: "#fff", width: 38, height: 38 }}>
                {isCamOff ? <VideocamOff sx={{ fontSize: 18 }} /> : <Videocam sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={isSharingScreen ? "Stop sharing" : "Share screen"}>
            <IconButton onClick={toggleScreenShare} size="small"
              sx={{ bgcolor: isSharingScreen ? "#1976d2" : "rgba(255,255,255,0.12)", "&:hover": { bgcolor: isSharingScreen ? "#1565c0" : "rgba(255,255,255,0.22)" }, color: "#fff", width: 38, height: 38 }}>
              {isSharingScreen ? <StopScreenShare sx={{ fontSize: 18 }} /> : <ScreenShare sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="End call">
            <IconButton onClick={endCall} size="small"
              sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" }, color: "#fff", width: 44, height: 44 }}>
              <CallEnd sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Minimized end-call button */}
      {minimized && (
        <Box sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
          <IconButton onClick={endCall} size="small" sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" }, color: "#fff", width: 30, height: 30 }}>
            <CallEnd sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </Box>
    </>
  );
}
