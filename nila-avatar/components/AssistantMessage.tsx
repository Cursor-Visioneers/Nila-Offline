'use client';

/** Render assistant text with clickable links and clean line breaks (no raw markdown). */

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;)])/g;

function renderLine(line: string, key: number) {
  const trimmed = line.trim();
  if (!trimmed) return <div key={key} className="h-1" />;

  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(trimmed)) !== null) {
    if (match.index > last) parts.push(trimmed.slice(last, match.index));
    const url = match[1];
    parts.push(
      <a
        key={`${key}-u-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {url.replace(/^https?:\/\/(www\.)?/, '')}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < trimmed.length) parts.push(trimmed.slice(last));

  const isBullet = /^[•\-]\s/.test(trimmed);
  const isNumbered = /^\d+\.\s/.test(trimmed);
  const isLabel = /^[A-Za-z][^:]{0,48}:$/.test(trimmed);
  const isTitle =
    key === 0 && trimmed.length < 80 && !isBullet && !isNumbered && !trimmed.startsWith('http');

  if (isTitle && !trimmed.endsWith(':')) {
    return (
      <p key={key} className="font-semibold text-slate-900">
        {parts}
      </p>
    );
  }

  if (isLabel) {
    return (
      <p key={key} className="mt-2 font-semibold text-slate-800">
        {trimmed}
      </p>
    );
  }

  if (isBullet || isNumbered) {
    return (
      <p key={key} className="ml-0.5 pl-2 text-slate-700">
        {parts}
      </p>
    );
  }

  return (
    <p key={key} className="text-slate-700">
      {parts}
    </p>
  );
}

export function AssistantMessage({ content }: { content: string }) {
  return <div className="space-y-0.5">{content.split('\n').map((line, i) => renderLine(line, i))}</div>;
}
