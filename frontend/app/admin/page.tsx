"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { RemoteTrackPublication, Track } from "livekit-client";

import "@livekit/components-styles";

const roomName = "dual-stream-room";
const tokenServerUrl = "http://localhost:3001";
const liveKitServerUrl =
  "wss://dual-streaming-live-monitoring-7mwn3uss.livekit.cloud";

function createIdentity(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomId}`;
}

function formatIdentity(identity: string) {
  return identity
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatJoinedAt(joinedAt?: Date) {
  if (!joinedAt) {
    return "Waiting";
  }

  return joinedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(joinedAt: Date | undefined, now: number) {
  if (!joinedAt) {
    return "00:00";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((now - joinedAt.getTime()) / 1000)
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function useClockTick() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function isClientParticipant(identity: string, role?: string) {
  return role !== "admin" && !identity.startsWith("admin-");
}

function RemoteVideoPreview({ trackRef }: { trackRef: TrackReference }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAttached, setIsAttached] = useState(false);

  useEffect(() => {
    const publication = trackRef.publication;

    if (publication instanceof RemoteTrackPublication) {
      publication.setSubscribed(true);
    }

    const videoTrack = publication.videoTrack;
    const videoElement = videoRef.current;

    if (!videoTrack || !videoElement) {
      setIsAttached(false);
      return;
    }

    videoElement.muted = true;
    videoElement.playsInline = true;
    videoTrack.attach(videoElement);
    setIsAttached(true);

    void videoElement.play().catch((err) => {
      console.warn("Unable to autoplay remote video", err);
    });

    return () => {
      videoTrack.detach(videoElement);
      setIsAttached(false);
    };
  }, [trackRef]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        className="client-video"
        muted
        playsInline
      />
      {!isAttached ? (
        <span className="video-loading">Subscribing to video</span>
      ) : null}
    </>
  );
}

function AdminDashboard() {
  const now = useClockTick();
  const connectionState = useConnectionState();
  const participants = useRemoteParticipants();
  const videoTracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    {
      onlySubscribed: false,
    }
  );

  const clients = useMemo(() => {
    const tracksByParticipant = new Map<string, TrackReference[]>();

    for (const trackRef of videoTracks) {
      const identity = trackRef.participant.identity;
      const currentTracks = tracksByParticipant.get(identity) ?? [];

      tracksByParticipant.set(identity, [...currentTracks, trackRef]);
    }

    return participants
      .filter((participant) =>
        isClientParticipant(participant.identity, participant.attributes.role)
      )
      .map((participant) => {
        const tracks = tracksByParticipant.get(participant.identity) ?? [];
        const joinedAt = participant.joinedAt;

        return {
          identity: participant.identity,
          name: participant.name || formatIdentity(participant.identity),
          joinedAt,
          elapsed: formatDuration(joinedAt, now),
          joinedAtLabel: formatJoinedAt(joinedAt),
          cameraOn: participant.isCameraEnabled,
          microphoneOn: participant.isMicrophoneEnabled,
          screenOn: participant.isScreenShareEnabled,
          tracks,
        };
      })
      .sort((first, second) => {
        const firstJoinedAt = first.joinedAt?.getTime() ?? 0;
        const secondJoinedAt = second.joinedAt?.getTime() ?? 0;

        return firstJoinedAt - secondJoinedAt;
      });
  }, [now, participants, videoTracks]);

  const activeVideoCount = clients.reduce(
    (count, client) => count + client.tracks.length,
    0
  );

  return (
    <main className="monitor-page">
      <header className="monitor-header">
        <div>
          <p className="eyebrow">LiveKit Admin</p>
          <h1>Client Monitor</h1>
        </div>

        <div className="monitor-stats" aria-label="Room status">
          <span className="status-pill online">{connectionState}</span>
          <span>{clients.length} clients</span>
          <span>{activeVideoCount} video tracks</span>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="video-grid" aria-live="polite">
          {clients.length === 0 ? (
            <div className="empty-state">
              <h2>No clients connected</h2>
              <p>Open the client page on another device or browser tab.</p>
            </div>
          ) : (
            clients.map((client) => (
              <article className="client-card" key={client.identity}>
                <div className="client-card-header">
                  <div>
                    <h2>{client.name}</h2>
                    <p>{client.identity}</p>
                  </div>

                  <span className="status-pill">{client.elapsed}</span>
                </div>

                <div className="video-stack">
                  {client.tracks.length > 0 ? (
                    client.tracks.map((trackRef) => (
                      <div
                        className={`video-shell ${
                          trackRef.source === Track.Source.ScreenShare
                            ? "is-screen-share"
                            : ""
                        }`}
                        key={trackRef.publication.trackSid}
                      >
                        <RemoteVideoPreview trackRef={trackRef} />
                        <span className="track-label">
                          {trackRef.source === Track.Source.ScreenShare
                            ? "Screen"
                            : "Camera"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="video-placeholder">
                      <span>
                        {client.cameraOn || client.screenOn
                          ? "Waiting for video"
                          : "No video published"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="client-meta">
                  <span>Joined {client.joinedAtLabel}</span>
                  <span className={client.cameraOn ? "media-on" : "media-off"}>
                    Camera {client.cameraOn ? "on" : "off"}
                  </span>
                  <span
                    className={client.microphoneOn ? "media-on" : "media-off"}
                  >
                    Mic {client.microphoneOn ? "on" : "off"}
                  </span>
                  <span className={client.screenOn ? "media-on" : "media-off"}>
                    Screen {client.screenOn ? "on" : "off"}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="client-list" aria-label="Connected clients">
          <div className="panel-title">
            <h2>Clients</h2>
            <span>{clients.length}</span>
          </div>

          <div className="client-list-items">
            {clients.length === 0 ? (
              <p className="muted">Waiting for clients to join.</p>
            ) : (
              clients.map((client) => (
                <div className="client-row" key={client.identity}>
                  <div>
                    <strong>{client.name}</strong>
                    <span>
                      {client.joinedAtLabel} · Mic{" "}
                      {client.microphoneOn ? "on" : "off"}
                    </span>
                  </div>
                  <div className="client-row-status">
                    <span
                      className={`mini-status ${
                        client.microphoneOn ? "is-on" : ""
                      }`}
                    >
                      Mic
                    </span>
                    <time>{client.elapsed}</time>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <RoomAudioRenderer />
    </main>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const params = new URLSearchParams({
          name: "Admin Monitor",
          role: "admin",
          room: roomName,
          username: createIdentity("admin"),
        });

        const res = await fetch(`${tokenServerUrl}/getToken?${params}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch admin token");
        }

        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load admin");
      }
    };

    fetchToken();
  }, []);

  if (error) {
    return (
      <main className="loading-page">
        <h1>Admin unavailable</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="loading-page">
        <h1>Connecting admin</h1>
        <p>Requesting a room token.</p>
      </main>
    );
  }

  return (
    <LiveKitRoom
      audio={false}
      className="lk-room-shell"
      connect
      data-lk-theme="default"
      serverUrl={liveKitServerUrl}
      token={token}
      video={false}
    >
      <AdminDashboard />
    </LiveKitRoom>
  );
}
