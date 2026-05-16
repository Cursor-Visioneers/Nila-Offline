'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { LocalAvatar3D } from '@/components/LocalAvatar3D';
import { OfflineAvatar } from '@/components/OfflineAvatar';

const personaId = process.env.NEXT_PUBLIC_BP_PERSONA_ID;

type NilaAvatarProps = {
  isKiosk?: boolean;
  isSpeaking?: boolean;
  forceOffline?: boolean;
  compact?: boolean;
};

export function NilaAvatar({
  isKiosk = false,
  isSpeaking = false,
  forceOffline = false,
}: NilaAvatarProps) {
  const online = useOnlineStatus(forceOffline);

  const configured =
    personaId && !personaId.startsWith('paste_') && personaId.length > 4;

  if (!online) {
    return <LocalAvatar3D isSpeaking={isSpeaking} />;
  }

  if (configured) {
    return (
      <iframe
        src={`https://bey.chat/${personaId}`}
        title="Nila — Beyond Presence"
        className="h-full w-full border-0"
        allow="camera; microphone; fullscreen"
        allowFullScreen
      />
    );
  }

  return <OfflineAvatar isKiosk={isKiosk} isSpeaking={isSpeaking} compact />;
}
