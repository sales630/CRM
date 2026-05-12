/* eslint-disable */
import { useEffect, useRef } from "react";
import { useCall } from "context/CallContext";

function CallWindow() {
        const { callState, localStream, remoteStream, remoteUser, callType, endCall } = useCall();
        const localVideoRef = useRef(null);
        const remoteVideoRef = useRef(null);

  useEffect(() => {
            if (localVideoRef.current && localStream) {
                        localVideoRef.current.srcObject = localStream;
            }
  }, [localStream]);

  useEffect(() => {
            if (remoteVideoRef.current && remoteStream) {
                        remoteVideoRef.current.srcObject = remoteStream;
            }
  }, [remoteStream]);

  if (callState !== "active" && callState !== "calling" && callState !== "connecting") return null;

  const isVideo = callType === "video";

  return (
            <div style={{ position: "fixed", bottom: 20, right: 20, width: 480, height: 360, background: "#1a1a1a", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 9999, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 12px", background: "#0d0d0d", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13 }}>{isVideo ? "Video" : "Audio"} call · {(remoteUser && remoteUser.name) || "User"} · {callState}</span>
        <button onClick={endCall} style={{ background: "#e53935", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>End Call</button>
      </div>
      <div style={{ flex: 1, position: "relative", background: "#000" }}>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: isVideo ? "block" : "none" }} />
{!isVideo && (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>
            🎧 Audio call in progress
                  </div>
        )}
        <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 8, right: 8, width: 100, height: 75, objectFit: "cover", border: "2px solid #fff", borderRadius: 6, display: isVideo ? "block" : "none" }} />
              </div>
              </div>
  );
}

export default CallWindow;
