'use client';

import { useEffect, useState } from 'react';

type OfflineAvatarProps = {
  isKiosk?: boolean;
  isSpeaking?: boolean;
  compact?: boolean;
};

export function OfflineAvatar({
  isKiosk = false,
  isSpeaking = false,
  compact = false,
}: OfflineAvatarProps) {
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    fetch('/nila-offline.mp4', { method: 'HEAD' })
      .then((r) => setHasVideo(r.ok))
      .catch(() => setHasVideo(false));
  }, []);

  if (hasVideo) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <video
          src="/nila-offline.mp4"
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#0f2744] via-[#1a3a5c] to-[#0f2744]"
      style={{ perspective: '800px' }}
    >
      <div className="relative nila-avatar-float">
        <div
          className="relative mx-auto rounded-full"
          style={{
            width: compact ? 100 : 130,
            height: compact ? 115 : 150,
            background: 'linear-gradient(145deg, #fcd9b6 0%, #e8b88a 55%, #c9956a 100%)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            transform: 'translateZ(40px)',
          }}
        >
          <div className="absolute left-[28%] top-[38%] h-2.5 w-4 rounded-full bg-slate-800" />
          <div className="absolute right-[28%] top-[38%] h-2.5 w-4 rounded-full bg-slate-800" />
          <div
            className={`absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full bg-rose-400/80 ${
              isSpeaking ? 'nila-avatar-speak' : ''
            }`}
            style={{
              width: isSpeaking ? 32 : 24,
              height: isSpeaking ? 16 : 7,
              transition: 'width 0.15s, height 0.15s',
            }}
          />
        </div>
        <div
          className="mx-auto -mt-2 rounded-b-[40%]"
          style={{
            width: compact ? 150 : 180,
            height: compact ? 75 : 90,
            background: 'linear-gradient(180deg, #1e4a8c 0%, #15366b 100%)',
            boxShadow: '0 16px 32px rgba(0,0,0,0.25)',
            transform: 'translateZ(20px) rotateX(8deg)',
          }}
        />
      </div>
      {!compact && (
        <p className="mt-4 text-center text-sm text-blue-200">
          Nila — offline assistant ready
        </p>
      )}
    </div>
  );
}
