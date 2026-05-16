'use client';

import { useState, useRef, useEffect } from 'react';
import { AssistantMessage } from '@/components/AssistantMessage';
import {
  preCacheAllQueries,
  getOfflineResponse,
  getCacheCount,
  OFFLINE_QUERIES,
} from '@/lib/offlineCache';
import { normalizeAssistantReply } from '@/lib/formatMessage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type Message = { role: 'user' | 'assistant'; content: string; time: string };

const QUICK_PROMPTS = [
  { label: 'Birth certificate', query: 'How do I get a birth certificate?' },
  { label: 'National ID', query: 'How do I apply for a National ID Card?' },
  { label: 'Passport', query: 'How do I apply for a passport?' },
  { label: 'Driving licence', query: 'How do I get a driving licence?' },
  { label: '1920 Agriculture', query: 'What is the 1920 agriculture hotline?' },
  { label: 'Farmer subsidy', query: 'How do I apply for farmer fertilizer subsidy in Sri Lanka?' },
  { label: 'Income tax', query: 'How do I file income tax in Sri Lanka?' },
  { label: 'School exams', query: 'How do I register for GCE O Level exams in Sri Lanka?' },
];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function GlobeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.5 3.5 5.8 3.5 9s-1.3 6.5-3.5 9c-2.2-2.5-3.5-5.8-3.5-9s1.3-6.5 3.5-9z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function OfflineBadge() {
  return (
    <span className="rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      Offline
    </span>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am Nila, your GIC assistant. Ask about civil documents (birth, NIC, passport, licence), agriculture (call 1920), taxes, or education.',
      time: nowTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [isKiosk, setIsKiosk] = useState(false);
  const [forceOffline, setForceOffline] = useState(false);
  const [activeChip, setActiveChip] = useState(-1);
  const [cacheCount, setCacheCount] = useState(0);
  const [warming, setWarming] = useState(false);
  const [warmProgress, setWarmProgress] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const online = useOnlineStatus(forceOffline);
  const isOfflineMode = !online;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsKiosk(params.get('kiosk') === 'true');
    setForceOffline(params.get('offline') === 'true');
  }, []);

  useEffect(() => {
    getCacheCount().then(setCacheCount);
  }, [warming, isOfflineMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!isKiosk) return;
    const reset = () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setMessages([
          {
            role: 'assistant',
            content:
              'Hello! I am Nila, your GIC assistant. Ask about civil documents (birth, NIC, passport, licence), agriculture (call 1920), taxes, or education.',
            time: nowTime(),
          },
        ]);
        setInput('');
      }, 5 * 60 * 1000);
    };
    window.addEventListener('click', reset);
    window.addEventListener('keydown', reset);
    reset();
    return () => {
      window.removeEventListener('click', reset);
      window.removeEventListener('keydown', reset);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [isKiosk]);

  async function handleWarmCache() {
    setWarming(true);
    setWarmProgress(`0 / ${OFFLINE_QUERIES.length}`);
    await preCacheAllQueries((done, total) => {
      setWarmProgress(`${done} / ${total}`);
    });
    const count = await getCacheCount();
    setCacheCount(count);
    setWarming(false);
    setWarmProgress('');
  }

  async function sendMessage(text?: string) {
    const currentInput = (text ?? input).trim();
    if (!currentInput) return;

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: currentInput, time: nowTime() },
    ]);
    setInput('');
    setLoading(true);

    if (isOfflineMode) {
      const offlineReply = await getOfflineResponse(currentInput);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: normalizeAssistantReply(
            offlineReply ??
              'I can help with birth certificates, NIC, passport, driving licence, agriculture (1920), subsidies, taxes, and school exams. Try a quick button below.'
          ),
          time: nowTime(),
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          language,
          history: messages,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.error ?? 'Sorry, I could not get a response.',
            time: nowTime(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: normalizeAssistantReply(
            data.reply ?? 'Sorry, I could not get a response.'
          ),
          time: nowTime(),
        },
      ]);
    } catch {
      const fallback = await getOfflineResponse(currentInput);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: normalizeAssistantReply(
            fallback ?? 'Network error — try offline mode or check your connection.'
          ),
          time: nowTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`mx-auto flex h-screen max-w-lg flex-col overflow-hidden bg-[var(--nila-bg)] ${
        isKiosk ? 'max-w-3xl' : ''
      }`}
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
            style={{ background: 'var(--nila-avatar-gradient)' }}
          >
            N
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Nila</h1>
            <p className="text-xs text-slate-500">GIC Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOfflineMode && <OfflineBadge />}
          <label className="flex items-center gap-2 rounded-full border border-[var(--nila-border)] bg-white px-3 py-2 text-sm text-slate-700">
            <GlobeIcon />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Language"
              className="cursor-pointer appearance-none bg-transparent outline-none"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </label>
        </div>
      </header>

      <section className="mx-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--nila-border)] bg-white shadow-[var(--nila-shadow)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--nila-border)] px-4 py-2">
          <span className="text-xs font-semibold text-slate-600">Chat with Nila</span>
          {isOfflineMode ? (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-700">
              <OfflineBadge />
              <span>
                {cacheCount > 0 ? `${cacheCount} cached` : 'Built-in answers'}
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              {cacheCount > 0 ? `${cacheCount} in offline cache` : 'Online'}
            </span>
          )}
        </div>

        <div className="nila-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-[var(--nila-user-bubble)] text-white'
                      : 'rounded-bl-md bg-slate-50 text-slate-700'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <AssistantMessage content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
                <span className="mt-1 px-1 text-[11px] text-slate-400">{m.time}</span>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-50 px-4 py-3 text-sm text-slate-400">
                  Nila is thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--nila-border)] bg-white px-3 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((chip, i) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setActiveChip(i);
                  sendMessage(chip.query);
                }}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  activeChip === i
                    ? 'border-[var(--nila-chip-active-border)] bg-[var(--nila-chip-active-bg)] text-[var(--nila-chip-active-text)]'
                    : 'border-[var(--nila-border)] bg-white text-slate-600 hover:border-blue-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              className={`min-w-0 flex-1 rounded-full border border-[var(--nila-border)] bg-white px-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
                isKiosk ? 'py-4 text-base' : 'py-3'
              }`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Nila anything..."
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading || warming}
              aria-label="Send"
              className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--nila-primary)] text-white shadow-md hover:bg-[var(--nila-primary-hover)] disabled:opacity-50 ${
                isKiosk ? 'h-14 w-14' : 'h-11 w-11'
              }`}
            >
              <SendIcon />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400">
            {!isOfflineMode && (
              <button
                type="button"
                onClick={handleWarmCache}
                disabled={warming}
                className="text-[var(--nila-primary)] underline disabled:no-underline"
              >
                {warming ? `Caching ${warmProgress}…` : `Warm up cache (${OFFLINE_QUERIES.length} questions)`}
              </button>
            )}
            {isOfflineMode && (
              <span>Offline — {OFFLINE_QUERIES.length} topics supported</span>
            )}
            <span>·</span>
            <button
              type="button"
              onClick={() => setForceOffline((v) => !v)}
              className="underline"
            >
              {forceOffline ? 'Go online' : 'Test offline'}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
