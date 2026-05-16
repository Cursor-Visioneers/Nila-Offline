/**
 * Converts knowledge-base / markdown text into clean chat-friendly plain text.
 * Used for API fallbacks and offline built-ins so users never see raw #, **, or ---.
 */

const SECTION_PRIORITY: Record<string, number> = {
  'how to apply': 1,
  'required documents': 2,
  documents: 2,
  fees: 3,
  'processing time': 4,
  contact: 5,
  'office hours': 6,
  forms: 7,
  resources: 8,
};

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function normalizeHeader(line: string): string {
  return line.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '').trim();
}

/** Split markdown blob into titled sections */
function parseSections(raw: string): { title: string; body: string[] }[] {
  const lines = raw.split('\n');
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---' || /^---+$/.test(trimmed)) continue;

    const isHeader = /^#{1,3}\s+/.test(trimmed) || (/^[A-Z]/.test(trimmed) && trimmed.length < 60 && !trimmed.startsWith('•') && !/^\d+\./.test(trimmed) && !trimmed.startsWith('http'));

    if (/^#{1,3}\s+/.test(trimmed)) {
      const title = normalizeHeader(trimmed);
      if (title.toLowerCase().startsWith('resources')) {
        current = { title: 'Resources', body: [] };
      } else {
        current = { title, body: [] };
      }
      sections.push(current);
      continue;
    }

    if (!current) {
      const title = normalizeHeader(trimmed);
      if (/^#{1,3}\s+/.test(line) || (title.length < 80 && !trimmed.includes(':'))) {
        current = { title: title.replace(/^#+\s*/, ''), body: [] };
        sections.push(current);
        continue;
      }
      current = { title: '', body: [] };
      sections.push(current);
    }

    const cleaned = stripInlineMarkdown(trimmed.replace(/^[-*]\s+/, '• '));
    if (cleaned) current.body.push(cleaned);
  }

  return sections.filter((s) => s.title || s.body.length > 0);
}

function sectionSortKey(title: string): number {
  const lower = title.toLowerCase();
  for (const [key, order] of Object.entries(SECTION_PRIORITY)) {
    if (lower.includes(key)) return order;
  }
  return 50;
}

export function toChatPlainText(raw: string): string {
  if (!raw?.trim()) return raw;

  let text = raw.replace(/\n---+\n/g, '\n\n').replace(/^---+\s*$/gm, '');
  text = stripInlineMarkdown(text);
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*]\s+/gm, '• ');
  text = text.replace(/^RESOURCES:\s*$/gim, '\nResources:\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/** Structured answer with logical section order and a resources block */
export function formatKnowledgeAnswer(context: string): string {
  if (!context.trim()) {
    return 'I do not have details on that yet. Call 1919 (Government Information Centre) or visit your nearest government office.';
  }

  const sections = parseSections(context);
  if (sections.length === 0) {
    return toChatPlainText(context);
  }

  const mainTitle = sections.find((s) => s.title && s.title.length > 10)?.title ?? '';
  const ordered = [...sections].sort(
    (a, b) => sectionSortKey(a.title) - sectionSortKey(b.title)
  );

  const parts: string[] = [];
  if (mainTitle && !mainTitle.toLowerCase().includes('how to')) {
    parts.push(mainTitle);
    parts.push('');
  }

  for (const section of ordered) {
    const title = section.title.trim();
    if (!title || title === mainTitle) {
      parts.push(...section.body);
      continue;
    }
    if (title.toLowerCase() === 'resources' || title.toLowerCase().startsWith('resources')) {
      parts.push('Resources:');
      parts.push(...section.body);
      continue;
    }
    parts.push(`${title}:`);
    parts.push(...section.body.map((l) => (l.startsWith('•') || /^\d+\./.test(l) ? l : `• ${l}`)));
    parts.push('');
  }

  let answer = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!/1919|1920|1911/.test(answer)) {
    answer += '\n\nNeed more help? Call 1919 (Government Information Centre).';
  }

  return answer;
}

/** Normalize any assistant reply (Gemini, cache, or built-in) for display */
export function normalizeAssistantReply(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Already plain conversational answer without markdown noise
  const hasMarkdown = /#{1,3}\s|\*\*|^---$/m.test(trimmed);
  if (!hasMarkdown) return trimmed;

  if (trimmed.includes("Here's the official information")) {
    const body = trimmed.replace(/^Here's the official information[^:]*:\s*/i, '');
    return `Here's the official information:\n\n${formatKnowledgeAnswer(body)}`;
  }

  return formatKnowledgeAnswer(trimmed);
}
