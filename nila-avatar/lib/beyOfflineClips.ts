/** Map chat topics → pre-recorded Beyond Presence video clips in /public/bey-offline/ */

export const BEY_IDLE_CLIP = '/bey-offline/idle.mp4';

export const BEY_CLIPS: { id: string; keywords: string[]; src: string }[] = [
  { id: 'birth', keywords: ['birth', 'certificate'], src: '/bey-offline/birth-cert.mp4' },
  { id: 'nic', keywords: ['national', 'id', 'nic'], src: '/bey-offline/nic.mp4' },
  { id: 'passport', keywords: ['passport'], src: '/bey-offline/passport.mp4' },
  { id: 'driving', keywords: ['driving', 'licence', 'license'], src: '/bey-offline/driving.mp4' },
  { id: 'marriage', keywords: ['marriage', 'register'], src: '/bey-offline/marriage.mp4' },
  { id: 'gic', keywords: ['gic', 'contact', 'support', 'services'], src: '/bey-offline/gic.mp4' },
];

export function clipForMessage(message: string): string | null {
  const q = message.toLowerCase();
  let best: { src: string; score: number } | null = null;

  for (const clip of BEY_CLIPS) {
    const score = clip.keywords.reduce((n, kw) => n + (q.includes(kw) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) {
      best = { src: clip.src, score };
    }
  }
  return best?.src ?? null;
}

export async function clipExists(src: string): Promise<boolean> {
  try {
    const res = await fetch(src, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function hasBeyOfflinePack(): Promise<boolean> {
  return clipExists(BEY_IDLE_CLIP);
}
