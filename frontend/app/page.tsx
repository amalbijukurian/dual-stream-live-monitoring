'use client';

import { useRef } from 'react';
import {
  Room,
  createLocalVideoTrack,
  createLocalScreenTracks,
} from 'livekit-client';

export default function Home() {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);

  const joinRoom = async () => {
    try {
      const room = new Room();

      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Nzk4OTA2MTcsImlkZW50aXR5IjoiYW1hbCIsImlzcyI6IkFQSTVXRGVjU1o4TVlDdiIsIm5hbWUiOiJhbWFsIiwibmJmIjoxNzc5ODkwMzE3LCJzdWIiOiJhbWFsIiwidmlkZW8iOnsicm9vbSI6InRlc3Qtcm9vbSIsInJvb21Kb2luIjp0cnVlfX0.B5cJ9NYbRbPhjUsmcIPbPBMJSCxN9QGs12mLfqUkLFw';

      await room.connect(
        'wss://dual-streaming-live-monitoring-7mwn3uss.livekit.cloud',
        token
      );

      console.log('Connected');

      // CAMERA TRACK
      const cameraTrack = await createLocalVideoTrack();

      await room.localParticipant.publishTrack(cameraTrack);

      if (cameraRef.current) {
        cameraTrack.attach(cameraRef.current);
      }

      console.log('Camera published');

      // SCREEN SHARE TRACKS
      const screenTracks = await createLocalScreenTracks();

      for (const track of screenTracks) {
        await room.localParticipant.publishTrack(track);

        if (track.kind === 'video' && screenRef.current) {
  track.attach(screenRef.current);
}
      }

      console.log('Screen shared');

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <button
        onClick={joinRoom}
        className="rounded bg-black px-6 py-3 text-white"
      >
        Join Room
      </button>

      <div className="flex gap-4">
        <div>
          <h2 className="mb-2 text-center font-bold">
            Camera
          </h2>

          <video
            ref={cameraRef}
            autoPlay
            muted
            playsInline
            className="w-[400px] rounded-lg border"
          />
        </div>

        <div>
          <h2 className="mb-2 text-center font-bold">
            Screen Share
          </h2>

          <video
            ref={screenRef}
            autoPlay
            muted
            playsInline
            className="w-[400px] rounded-lg border"
          />
        </div>
      </div>
    </main>
  );
}