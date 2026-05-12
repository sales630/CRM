/* eslint-disable */
import { useEffect, useRef } from "react";
import { useCall } from "context/CallContext";
import { useAuth } from "context/AuthContext";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const ZEGO_APP_ID = 895252323;
const ZEGO_SERVER_SECRET = "9088fe3cbbb32220ead929e5c100e00f";

function CallWindow() {
      const { callState, jitsiRoom, remoteUser, callType, endCall } = useCall();
      const { currentUser } = useAuth() || {};
      const containerRef = useRef(null);
      const zpRef = useRef(null);

  useEffect(() => {
          if (callState !== "active" || !jitsiRoom) return;
          if (!containerRef.current) return;
          const userID = String((currentUser && currentUser.id) || Date.now());
          const userName = (currentUser && currentUser.name) || "User";
          let cancelled = false;
          try {
                    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                                ZEGO_APP_ID, ZEGO_SERVER_SECRET, jitsiRoom, userID, userName
                              );
                    const zp = ZegoUIKitPrebuilt.create(kitToken);
                    zpRef.current = zp;
                    zp.joinRoom({
                                container: containerRef.current,
                                scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
                                showPreJoinView: false,
                                turnOnCameraWhenJoining: callType !== "audio",
                                turnOnMicrophoneWhenJoining: true,
                                showScreenSharingButton: true,
                                onLeaveRoom: () => { if (!cancelled) endCall(); },
                    });
          } catch (e) { console.error("[Zego] join failed:", e && e.message); }
          return () => {
                    cancelled = true;
                    try { zpRef.current && zpRef.current.destroy(); } catch (e) {}
                    zpRef.current = null;
          };
  }, [callState, jitsiRoom, callType]);

  if (callState !== "active" || !jitsiRoom) return null;

  return (
          <div style={{
            position: "fixed", bottom: 20, right: 20,
            width: 480, height: 560, zIndex: 9999,
            borderRadius: "12px", overflow: "hidden",
            boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
            background: "#0f1923", display: "flex", flexDirection: "column",
  }}>
      <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 16px", background: "rgba(255,255,255,0.06)",
            color: "#fff", fontSize: "0.9rem", fontWeight: 600,
}}>
        <span>{callType === "audio" ? "Audio" : "Video"} Call - {(remoteUser && remoteUser.userName) || "Call"}</span>
        <button onClick={endCall} style={{
              background: "#ff4d4f", color: "#fff", border: 0,
              borderRadius: "6px", padding: "4px 12px",
              cursor: "pointer", fontWeight: 600,
}}>End</button>
    </div>
      <div ref={containerRef} style={{ flex: 1, width: "100%" }} />
    </div>
  );
}

export default CallWindow;
