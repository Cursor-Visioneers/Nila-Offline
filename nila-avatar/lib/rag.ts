import fs from 'fs';
import path from 'path';

type Chunk = { content: string; source: string };

let chunks: Chunk[] | null = null;

const STOPWORDS = new Set([
  'how', 'what', 'when', 'where', 'who', 'why', 'the', 'and', 'for', 'you',
  'can', 'get', 'need', 'want', 'apply', 'from', 'with', 'that', 'this', 'are',
  'was', 'were', 'have', 'has', 'had', 'does', 'did', 'will', 'would', 'could',
  'should', 'about', 'into', 'your', 'our', 'their', 'there', 'here', 'much',
  'many', 'long', 'take', 'cost', 'fee', 'fees', 'document', 'documents',
]);

/** Boost chunks from files that match query intent */
const FILE_INTENT: { pattern: RegExp; files: string[]; bonus: number }[] = [
  {
    pattern: /subsidy|subsidies|agrarian|fertilizer|farmer profile|agrarian\.lk/i,
    files: ['agriculture-agrarian.md'],
    bonus: 12,
  },
  {
    pattern: /gce|o\s*\/\s*l|o level|a\s*\/\s*l|a level|exam|examination|doenets|school exam|index number/i,
    files: ['education-sri-lanka.md'],
    bonus: 12,
  },
  {
    pattern: /1920|naicc|agronomist|pest|helpline/i,
    files: ['agriculture-1920-hotline.md'],
    bonus: 10,
  },
  {
    pattern: /birth|born|bdr/i,
    files: ['birth-certificate.md'],
    bonus: 10,
  },
  {
    pattern: /\bnic\b|national id|identity card/i,
    files: ['national-id.md'],
    bonus: 10,
  },
  {
    pattern: /passport|immigration/i,
    files: ['passport.md'],
    bonus: 10,
  },
  {
    pattern: /driving|licen[cs]e|learner|dmt|motor traffic/i,
    files: ['driving-license.md'],
    bonus: 10,
  },
  {
    pattern: /marriage|wedding|married/i,
    files: ['marriage-certificate.md'],
    bonus: 10,
  },
  {
    pattern: /tax|ird|tin|income tax|paye/i,
    files: ['tax-sri-lanka.md'],
    bonus: 10,
  },
];

const PHRASE_HINTS: { phrase: string; files: string[]; bonus: number }[] = [
  { phrase: 'agricultural subsidies', files: ['agriculture-agrarian.md'], bonus: 15 },
  { phrase: 'fertilizer subsidy', files: ['agriculture-agrarian.md'], bonus: 15 },
  { phrase: 'farmer profile', files: ['agriculture-agrarian.md'], bonus: 12 },
  { phrase: 'gce o level', files: ['education-sri-lanka.md'], bonus: 15 },
  { phrase: 'o level exam', files: ['education-sri-lanka.md'], bonus: 15 },
  { phrase: 'school exam', files: ['education-sri-lanka.md'], bonus: 12 },
  { phrase: 'private candidate', files: ['education-sri-lanka.md'], bonus: 10 },
];

function loadChunks(): Chunk[] {
  if (chunks) return chunks;

  const contentDir = path.join(process.cwd(), 'content', 'en');
  const loaded: Chunk[] = [];

  if (!fs.existsSync(contentDir)) return loaded;

  for (const file of fs.readdirSync(contentDir)) {
    if (!file.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(contentDir, file), 'utf-8');
    const sections = text.split(/\n(?=## )/);
    for (const section of sections) {
      const trimmed = section.trim();
      if (trimmed.length > 40) {
        loaded.push({ content: trimmed, source: file });
      }
    }
  }

  chunks = loaded;
  return loaded;
}

function scoreChunk(query: string, chunk: Chunk): number {
  const qLower = query.toLowerCase();
  const text = chunk.content.toLowerCase();

  let score = 0;
  const words = qLower.split(/\W+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  for (const word of words) {
    if (text.includes(word)) score += 2;
  }

  // Phrases in chunk body
  for (const { phrase, files, bonus } of PHRASE_HINTS) {
    if (qLower.includes(phrase) && files.includes(chunk.source)) {
      score += bonus;
    }
  }

  // File intent from full query
  for (const { pattern, files, bonus } of FILE_INTENT) {
    if (pattern.test(query) && files.includes(chunk.source)) {
      score += bonus;
    }
  }

  // URLs and phone numbers in chunk are valuable for contact questions
  if (/https?:\/\/|\+94|011|1920|1911|1919/.test(chunk.content) && words.length > 0) {
    score += 1;
  }

  return score;
}

export async function searchKnowledge(query: string, k = 4): Promise<string> {
  const all = loadChunks();
  if (all.length === 0) {
    return 'No knowledge base content found. Please add markdown files under content/en/.';
  }

  const ranked = all
    .map((chunk) => ({ ...chunk, score: scoreChunk(query, chunk) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]?.score > 0 ? ranked.slice(0, k) : all.slice(0, k);
  return top.map((r) => r.content).join('\n\n');
}

/** Clear cache when content files change in dev */
export function resetKnowledgeCache() {
  chunks = null;
}
