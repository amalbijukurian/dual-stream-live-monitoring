"use client";

import { useEffect, useState } from "react";

import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";

import "@livekit/components-styles";

export default function ViewerPage() {
  const [token, setToken] = useState("");

  const roomName = "dual-stream-room";
  const serverUrl =
    "wss://dual-streaming-live-monitoring-7mwn3uss.livekit.cloud";

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const params = new URLSearchParams({
          room: roomName,
          username: "viewer",
        });

        const res = await fetch(`http://localhost:3001/getToken?${params}`);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch token");
        }

        setToken(data.token);
      } catch (err) {
        console.error(err);
      }
    };

    fetchToken();
  }, []);

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <main className="h-screen">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={false}
        audio={false}
        data-lk-theme="default"
        style={{ height: "100vh" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </main>
  );
}
