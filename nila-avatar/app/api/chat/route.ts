import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatKnowledgeAnswer, normalizeAssistantReply } from '@/lib/formatMessage';
import { searchKnowledge } from '@/lib/rag';

const PLACEHOLDER_KEY = 'AIzaSyCtQ9vorzl-EPzS--D1tkG8bVbo9OWk4FI';

function isValidApiKey(key: string | undefined): boolean {
  return Boolean(key && key !== PLACEHOLDER_KEY && key.length > 10);
}

function buildGeminiHistory(history: { role: string; content: string }[]) {
  const turns = history.filter((m) => m.role === 'user' || m.role === 'assistant');
  let start = 0;
  while (start < turns.length && turns[start].role !== 'user') start++;
  const relevant = turns.slice(start);

  const geminiHistory: { role: string; parts: { text: string }[] }[] = [];
  for (const msg of relevant) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const last = geminiHistory[geminiHistory.length - 1];
    if (last?.role === role) continue;
    geminiHistory.push({ role, parts: [{ text: msg.content }] });
  }
  return geminiHistory;
}

function fallbackReply(context: string): string {
  if (!context.trim()) {
    return 'I do not have specific information on that yet. Call 1919 (Government Information Centre) or visit your nearest Divisional Secretariat.';
  }
  return `Here's the official information:\n\n${formatKnowledgeAnswer(context)}`;
}

async function askGemini(
  apiKey: string,
  message: string,
  language: string,
  context: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const systemPrompt = `You are Nila, Sri Lanka's Government Information Centre (GIC) AI assistant.

RULES:
- Answer ONLY using the KNOWLEDGE below. Do not invent phone numbers, URLs, or offices.
- Use PLAIN TEXT only. Do NOT use markdown: no # headers, no ** bold, no --- lines.
- Structure answers with a short title line, then sections like "How to apply:", "Required documents:", "Contact:", "Resources:".
- Use numbered steps (1. 2. 3.) for procedures and bullet lines starting with • for lists.
- ALWAYS include official links (https://...) and phone numbers from the knowledge when present.
- End with: "Need more help? Call [best number from knowledge]."
- If the user asks about farmer subsidies, answer ONLY about Department of Agrarian Development / Agrarian.lk — NOT passport, NIC, or DS civil registration unless the knowledge says so.
- If the user asks about school or GCE exams, answer ONLY about Department of Examinations (doenets.lk / onlineexams.gov.lk) — NOT marriage or birth registration.
- If the knowledge does not cover the question, say you will connect them to a human GIC agent and suggest calling 1919.

Language: ${language}.

KNOWLEDGE:
${context}`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-preview-05-20'];

  let lastError: unknown;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      const chat = model.startChat({ history: buildGeminiHistory(history) });
      const result = await chat.sendMessage(message);
      return normalizeAssistantReply(result.response.text());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { message, language = 'en', history = [] } = body;

  if (!message?.trim()) {
    return Response.json({ error: 'Message is required.' }, { status: 400 });
  }

  const context = await searchKnowledge(message);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!isValidApiKey(apiKey)) {
    return Response.json({
      reply: fallbackReply(context),
      source: 'knowledge-base',
      notice:
        'Add a real GEMINI_API_KEY in .env.local (from aistudio.google.com) for full AI replies.',
    });
  }

  try {
    const reply = await askGemini(apiKey!, message, language, context, history);
    return Response.json({ reply, source: 'gemini' });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat]', detail);
    return Response.json({
      reply: fallbackReply(context),
      source: 'knowledge-base',
      notice: `Gemini unavailable (${detail}). Showing knowledge-base answer.`,
    });
  }
}
