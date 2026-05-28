"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LocalTrackPublication } from "livekit-client";
import { Room, Track } from "livekit-client";

const roomName = "dual-stream-room";
const tokenServerUrl = "https://dual-stream-live-monitoring-backend.onrender.com";
const liveKitServerUrl =
  "wss://dual-streaming-live-monitoring-7mwn3uss.livekit.cloud";

type SenderState = {
  camera: boolean;
  connected: boolean;
  microphone: boolean;
  screen: boolean;
};
type ScreenShareReason = "initial" | "manual" | "restart";
type DeviceOption = {
  deviceId: string;
  label: string;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function getClientIdentity() {
  const existingIdentity = window.sessionStorage.getItem("clientIdentity");

  if (existingIdentity) {
    return existingIdentity;
  }

  const randomId =
    "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const identity = `client-${randomId}`;

  window.sessionStorage.setItem("clientIdentity", identity);

  return identity;
}

function formatIdentity(identity: string) {
  return identity
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span className={`sender-badge ${active ? "is-active" : ""}`}>
      {label}: {active ? "On" : "Off"}
    </span>
  );
}

export default function ClientPage() {
  const [identity, setIdentity] = useState("");
  const [status, setStatus] = useState("Requesting token");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [senderState, setSenderState] = useState<SenderState>({
    camera: false,
    connected: false,
    microphone: false,
    screen: false,
  });
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [micLevel, setMicLevel] = useState(0);

  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const micAnalyserCleanupRef = useRef<(() => void) | null>(null);
  const roomRef = useRef<Room | null>(null);
  const selectedAudioDeviceIdRef = useRef("");
  const selectedVideoDeviceIdRef = useRef("");
  const screenStopHandlerRef = useRef<(() => void) | null>(null);
  const publishScreenShareRef = useRef<
    (reason?: ScreenShareReason) => Promise<void>
  >(async () => {});

  const detachLocalVideoTracks = useCallback((room: Room) => {
    room.localParticipant
      .getTrackPublications()
      .forEach((publication) => publication.videoTrack?.detach());
  }, []);

  const attachCameraPreview = useCallback((publication?: LocalTrackPublication) => {
    const previewElement = cameraPreviewRef.current;

    if (!publication?.videoTrack || !previewElement) {
      return;
    }

    publication.videoTrack.attach(previewElement);
  }, []);

  const stopMicLevelMeter = useCallback(() => {
    micAnalyserCleanupRef.current?.();
    micAnalyserCleanupRef.current = null;
    setMicLevel(0);
  }, []);

  const startMicLevelMeter = useCallback(
    (publication?: LocalTrackPublication) => {
      stopMicLevelMeter();

      const mediaStreamTrack = publication?.audioTrack?.mediaStreamTrack;

      if (!mediaStreamTrack) {
        return;
      }

      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(
        new MediaStream([mediaStreamTrack])
      );
      const samples = new Uint8Array(analyser.fftSize);

      analyser.fftSize = 512;
      source.connect(analyser);

      const timer = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);

        let sum = 0;
        for (const sample of samples) {
          const centeredSample = sample - 128;
          sum += centeredSample * centeredSample;
        }

        const rms = Math.sqrt(sum / samples.length) / 128;
        setMicLevel(Math.min(1, rms * 3.5));
      }, 100);

      micAnalyserCleanupRef.current = () => {
        window.clearInterval(timer);
        source.disconnect();
        void audioContext.close();
      };
    },
    [stopMicLevelMeter]
  );

  const refreshDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));
    const microphones = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
      }));

    setVideoDevices(cameras);
    setAudioDevices(microphones);
    setSelectedVideoDeviceId((current) => current || cameras[0]?.deviceId || "");
    setSelectedAudioDeviceId(
      (current) => current || microphones[0]?.deviceId || ""
    );

    return { cameras, microphones };
  }, []);

  useEffect(() => {
    selectedAudioDeviceIdRef.current = selectedAudioDeviceId;
  }, [selectedAudioDeviceId]);

  useEffect(() => {
    selectedVideoDeviceIdRef.current = selectedVideoDeviceId;
  }, [selectedVideoDeviceId]);

  const setCameraEnabled = useCallback(
    async (enabled: boolean, deviceId = selectedVideoDeviceIdRef.current) => {
      const room = roomRef.current;

      if (!room) {
        return;
      }

      if (!enabled) {
        const publication = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        );
        publication?.videoTrack?.detach();
        await room.localParticipant.setCameraEnabled(false);
        setSenderState((current) => ({ ...current, camera: false }));
        return;
      }

      const publication = await room.localParticipant.setCameraEnabled(true, {
        deviceId,
        resolution: {
          height: 720,
          width: 1280,
        },
      });

      attachCameraPreview(publication);
      setSenderState((current) => ({ ...current, camera: !!publication }));
      await refreshDevices();
    },
    [attachCameraPreview, refreshDevices]
  );

  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean, deviceId = selectedAudioDeviceIdRef.current) => {
      const room = roomRef.current;

      if (!room) {
        return;
      }

      if (!enabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        stopMicLevelMeter();
        setSenderState((current) => ({ ...current, microphone: false }));
        return;
      }

      const publication = await room.localParticipant.setMicrophoneEnabled(true, {
        deviceId,
      });

      startMicLevelMeter(publication);
      setSenderState((current) => ({
        ...current,
        microphone: !!publication,
      }));
      await refreshDevices();
    },
    [
      refreshDevices,
      startMicLevelMeter,
      stopMicLevelMeter,
    ]
  );

  const publishScreenShare = useCallback(
    async (reason: ScreenShareReason = "manual") => {
      const room = roomRef.current;

      if (!room) {
        return;
      }

      try {
        setWarning("");
        setStatus(
          reason === "restart"
            ? "Screen share stopped. Requesting it again"
            : "Requesting screen share"
        );

        const publication = await room.localParticipant.setScreenShareEnabled(
          true,
          {
            audio: true,
          }
        );
        const screenTrack = publication?.videoTrack;

        if (!screenTrack) {
          setSenderState((current) => ({ ...current, screen: false }));
          setWarning("Screen sharing was not started.");
          return;
        }

        const handleScreenStopped = () => {
          screenStopHandlerRef.current = null;
          setSenderState((current) => ({ ...current, screen: false }));
          setWarning("Screen sharing stopped. Please share again.");

          window.setTimeout(() => {
            void publishScreenShareRef.current("restart");
          }, 500);
        };

        screenStopHandlerRef.current = handleScreenStopped;
        screenTrack.mediaStreamTrack.addEventListener(
          "ended",
          handleScreenStopped,
          { once: true }
        );

        setSenderState((current) => ({ ...current, screen: true }));
        setStatus("Live");
      } catch (err) {
        setSenderState((current) => ({ ...current, screen: false }));
        setWarning(
          reason === "restart"
            ? "Browser needs your confirmation to resume screen sharing."
            : "Screen sharing was not allowed."
        );
        console.warn(err);
      }
    },
    []
  );

  useEffect(() => {
    publishScreenShareRef.current = publishScreenShare;
  }, [publishScreenShare]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const clientIdentity = getClientIdentity();

        setIdentity(clientIdentity);

        const params = new URLSearchParams({
          name: formatIdentity(clientIdentity),
          role: "client",
          room: roomName,
          username: clientIdentity,
        });

        const res = await fetch(`${tokenServerUrl}/getToken?${params}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch client token");
        }

        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client");
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    const room = new Room();
    roomRef.current = room;

    const connectClient = async () => {
      try {
        setStatus("Connecting to room");
        await room.connect(liveKitServerUrl, token);

        if (!active) {
          room.disconnect();
          return;
        }

        setSenderState((current) => ({ ...current, connected: true }));
        setStatus("Publishing camera and microphone");

        const devices = await refreshDevices();
        await setCameraEnabled(true, devices.cameras[0]?.deviceId || "");
        await setMicrophoneEnabled(
          true,
          devices.microphones[0]?.deviceId || ""
        );

        setStatus("Live");
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to connect client"
          );
        }
      }
    };

    connectClient();

    return () => {
      active = false;
      detachLocalVideoTracks(room);
      stopMicLevelMeter();
      room.disconnect();
      roomRef.current = null;
      screenStopHandlerRef.current = null;
    };
  }, [
    detachLocalVideoTracks,
    refreshDevices,
    setCameraEnabled,
    setMicrophoneEnabled,
    stopMicLevelMeter,
    token,
  ]);

  return (
    <main className="client-page">
      <section className="client-panel sender-panel">
        <p className="eyebrow">LiveKit Client</p>
        <h1>{identity ? formatIdentity(identity) : "Client"}</h1>
        <p className={`client-status ${error ? "has-error" : ""}`}>
          {error || status}
        </p>

        <div className="sender-status-grid" aria-label="Sender status">
          <StatusBadge active={senderState.connected} label="Connected" />
          <StatusBadge active={senderState.camera} label="Camera" />
          <StatusBadge active={senderState.microphone} label="Mic" />
          <StatusBadge active={senderState.screen} label="Screen" />
        </div>

        {warning ? <p className="sender-warning">{warning}</p> : null}

        <div className="client-preview">
          <video ref={cameraPreviewRef} autoPlay muted playsInline />
        </div>

        <div className="sender-controls">
          <div className="sender-control-row">
            <button
              className={`media-toggle ${senderState.camera ? "is-on" : ""}`}
              disabled={!senderState.connected}
              onClick={() => {
                void setCameraEnabled(!senderState.camera);
              }}
              type="button"
            >
              {senderState.camera ? "Camera On" : "Camera Off"}
            </button>

            <select
              aria-label="Camera"
              className="device-select"
              disabled={!senderState.connected || videoDevices.length === 0}
              onChange={(event) => {
                const deviceId = event.target.value;
                setSelectedVideoDeviceId(deviceId);
                if (senderState.camera) {
                  void setCameraEnabled(true, deviceId);
                }
              }}
              value={selectedVideoDeviceId}
            >
              {videoDevices.length === 0 ? (
                <option>No camera found</option>
              ) : (
                videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="sender-control-row">
            <button
              className={`media-toggle ${senderState.microphone ? "is-on" : ""}`}
              disabled={!senderState.connected}
              onClick={() => {
                void setMicrophoneEnabled(!senderState.microphone);
              }}
              type="button"
            >
              {senderState.microphone ? "Mic On" : "Mic Off"}
            </button>

            <select
              aria-label="Microphone"
              className="device-select"
              disabled={!senderState.connected || audioDevices.length === 0}
              onChange={(event) => {
                const deviceId = event.target.value;
                setSelectedAudioDeviceId(deviceId);
                if (senderState.microphone) {
                  void setMicrophoneEnabled(true, deviceId);
                }
              }}
              value={selectedAudioDeviceId}
            >
              {audioDevices.length === 0 ? (
                <option>No microphone found</option>
              ) : (
                audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="mic-meter" aria-label="Microphone input level">
            <span style={{ width: `${Math.round(micLevel * 100)}%` }} />
          </div>
        </div>

        <button
          className="sender-action"
          disabled={!senderState.connected}
          onClick={() => {
            void publishScreenShare("manual");
          }}
          type="button"
        >
          {senderState.screen ? "Share Different Screen" : "Share Screen"}
        </button>

        <p className="muted">
          Keep this page open so the admin dashboard can monitor this client.
        </p>
      </section>
    </main>
  );
}
