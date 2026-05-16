'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BEY_IDLE_CLIP,
  clipExists,
  clipForMessage,
  hasBeyOfflinePack,
} from '@/lib/beyOfflineClips';
import { OfflineAvatar } from '@/components/OfflineAvatar';

type BeyondPresenceOfflineProps = {
  isSpeaking?: boolean;
  speakTrigger?: string;
};

/**
 * Plays pre-recorded Beyond Presence videos (recorded while online).
 * Live bey.chat cannot run without internet — this is the official workaround.
 */
export function BeyondPresenceOffline({
  isSpeaking = false,
  speakTrigger = '',
}: BeyondPresenceOfflineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [packReady, setPackReady] = useState<boolean | null>(null);
  const [currentSrc, setCurrentSrc] = useState(BEY_IDLE_CLIP);

  useEffect(() => {
    hasBeyOfflinePack().then(setPackReady);
  }, []);

  useEffect(() => {
    if (!packReady || !speakTrigger) return;

    const clip = clipForMessage(speakTrigger);
    if (!clip) return;

    clipExists(clip).then((ok) => {
      if (!ok) return;
      setCurrentSrc(clip);
      const video = videoRef.current;
      if (video) {
        video.src = clip;
        video.loop = false;
        video.play().catch(() => undefined);
        const onEnd = () => {
          video.src = BEY_IDLE_CLIP;
          video.loop = true;
          video.play().catch(() => undefined);
          video.removeEventListener('ended', onEnd);
        };
        video.addEventListener('ended', onEnd);
      }
    });
  }, [speakTrigger, packReady]);

  useEffect(() => {
    if (!packReady) return;
    const video = videoRef.current;
    if (!video) return;
    video.src = currentSrc;
    video.loop = currentSrc === BEY_IDLE_CLIP;
    video.muted = true;
    video.play().catch(() => undefined);
  }, [currentSrc, packReady]);

  if (packReady === null) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-400">
        Loading avatar…
      </div>
    );
  }

  if (!packReady) {
    return (
      <div className="flex h-full flex-col">
        <OfflineAvatar isSpeaking={isSpeaking} compact />
        <div className="border-t border-blue-800 bg-[#0f2744] px-4 py-3 text-center text-[11px] leading-relaxed text-blue-200">
          <p className="font-semibold text-white">Record Beyond Presence for offline</p>
          <p className="mt-1">
            Open{' '}
            <a href="https://bey.chat" className="underline" target="_blank" rel="noreferrer">
              bey.chat
            </a>{' '}
            while online, screen-record Nila, save clips to{' '}
            <code className="text-blue-100">public/bey-offline/idle.mp4</code> (+ topic videos).
            Live BP cannot stream without Wi‑Fi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <span className="absolute left-3 top-3 rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
        Beyond Presence · offline
      </span>
    </div>
  );
}
