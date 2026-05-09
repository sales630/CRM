/* eslint-disable */
import { useCall } from "context/CallContext";
import { useAuth } from "context/AuthContext";

function CallWindow() {
    const { callState, jitsiRoom, remoteUser, callType, endCall } = useCall();
    const { currentUser } = useAuth() || {};

  if (callState !== "active" || !jitsiRoom) return null;

  const name = (currentUser && currentUser.name) || "User";
    const config = [
          "config.prejoinPageEnabled=false",
          "config.startWithVideoMuted=" + (callType === "audio" ? "true" : "false"),
          "config.startWithAudioMuted=false",
          "config.disableDeepLinking=true",
          "config.disableInviteFunctions=true",
          "userInfo.displayName=\"" + encodeURIComponent(name) + "\"",
        ].join("&");
    const url = "https://meet.jit.si/" + encodeURIComponent(jitsiRoom) + "#" + config;

  return (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 480,
          height: 560,
          zIndex: 9999,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
          background: "#0f1923",
          display: "flex",
          flexDirection: "column",
  }}>
      <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "rgba(255,255,255,0.06)",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 600,
}}>
        <span>{callType === "audio" ? "Audio" : "Video"} Call · {(remoteUser && remoteUser.userName) || "Call"}</span>
        <button onClick={endCall} style={{
            background: "#ff4d4f",
            color: "#fff",
            border: 0,
            borderRadius: "6px",
            padding: "4px 12px",
            cursor: "pointer",
            fontWeight: 600,
}}>End</button>
  </div>
      <iframe
        src={url}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        style={{ flex: 1, border: 0, width: "100%" }}
        title="Call"
      />
          </div>
  );
}

export default CallWindow;
