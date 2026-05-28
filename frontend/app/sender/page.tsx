"use client";

import { useEffect, useState } from "react";

import { LiveKitRoom } from "@livekit/components-react";

import { Room } from "livekit-client";

export default function SenderPage() {
  const [token, setToken] = useState("");

  const roomName = "dual-stream-room";

  const serverUrl =
    "wss://dual-streaming-live-monitoring-7mwn3uss.livekit.cloud";

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const params = new URLSearchParams({
          room: roomName,
          username: "sender",
        });

        const res = await fetch(
          `http://localhost:3001/getToken?${params}`
        );

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

  const handleConnect = async () => {
    const room = new Room();

    await room.connect(serverUrl, token);

    await room.localParticipant.setCameraEnabled(true);

    await room.localParticipant.setMicrophoneEnabled(true);

    await room.localParticipant.setScreenShareEnabled(true);

    console.log("Tracks published");
  };

  useEffect(() => {
    if (token) {
      handleConnect();
    }
  }, [token]);

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <main className="h-screen flex items-center justify-center">
      <div className="text-2xl">
        Sender Connected
      </div>
    </main>
  );
}