import { openDB } from 'idb';
import { normalizeAssistantReply } from '@/lib/formatMessage';
import { REPLIES } from '@/lib/knowledgeReplies';

const DB_NAME = 'nila-offline';
/** Bump when knowledge or cache queries change — clears stale IndexedDB answers */
const DB_VERSION = 3;

const PRIORITY_BUILTIN_TOPICS =
  /subsidy|subsidies|agrarian|fertilizer|gce|o level|school exam|doenets|onlineexams/i;

function openOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion > 0 && oldVersion < DB_VERSION && db.objectStoreNames.contains('responses')) {
        db.deleteObjectStore('responses');
      }
      if (!db.objectStoreNames.contains('responses')) {
        db.createObjectStore('responses', { keyPath: 'id' });
      }
    },
  });
}

/** Queries to pre-cache while online (warm-up button) */
export const OFFLINE_QUERIES = [
  // Birth certificate
  { id: 'birth-cert-en', lang: 'en', q: 'How do I get a birth certificate?' },
  { id: 'birth-apply-en', lang: 'en', q: 'How do I apply for a birth certificate in Sri Lanka?' },
  { id: 'birth-docs-en', lang: 'en', q: 'What documents do I need for a birth certificate?' },
  { id: 'birth-fee-en', lang: 'en', q: 'How much does a birth certificate cost?' },
  { id: 'birth-time-en', lang: 'en', q: 'How long does it take to get a birth certificate?' },
  { id: 'birth-where-en', lang: 'en', q: 'Where do I register a birth?' },
  { id: 'birth-copy-en', lang: 'en', q: 'How do I get a copy of my birth certificate?' },
  { id: 'birth-ds-en', lang: 'en', q: 'Can I get a birth certificate from the Divisional Secretariat?' },

  // National ID (NIC)
  { id: 'nic-en', lang: 'en', q: 'How do I apply for a National ID Card?' },
  { id: 'nic-apply-en', lang: 'en', q: 'How do I get a new NIC?' },
  { id: 'nic-docs-en', lang: 'en', q: 'What documents do I need for a National ID?' },
  { id: 'nic-fee-en', lang: 'en', q: 'How much does a National ID card cost?' },
  { id: 'nic-time-en', lang: 'en', q: 'How long does it take to get a National ID?' },
  { id: 'nic-replace-en', lang: 'en', q: 'How do I replace a lost NIC?' },
  { id: 'nic-first-en', lang: 'en', q: 'How do I apply for my first National Identity Card?' },
  { id: 'nic-office-en', lang: 'en', q: 'Where do I apply for NIC in Sri Lanka?' },

  // Passport
  { id: 'passport-en', lang: 'en', q: 'How do I apply for a passport?' },
  { id: 'passport-apply-en', lang: 'en', q: 'How do I get a new passport in Sri Lanka?' },
  { id: 'passport-docs-en', lang: 'en', q: 'What documents do I need for a passport?' },
  { id: 'passport-fee-en', lang: 'en', q: 'How much does a passport cost?' },
  { id: 'passport-time-en', lang: 'en', q: 'How long does it take to get a passport?' },
  { id: 'passport-renew-en', lang: 'en', q: 'How do I renew my passport?' },
  { id: 'passport-express-en', lang: 'en', q: 'How do I get an express passport?' },
  { id: 'passport-online-en', lang: 'en', q: 'Can I apply for a passport online?' },

  // Driving licence
  { id: 'driving-en', lang: 'en', q: 'How do I get a driving licence?' },
  { id: 'driving-apply-en', lang: 'en', q: 'How do I apply for a driving license in Sri Lanka?' },
  { id: 'driving-docs-en', lang: 'en', q: 'What documents do I need for a driving licence?' },
  { id: 'driving-fee-en', lang: 'en', q: 'How much does a driving licence cost?' },
  { id: 'driving-time-en', lang: 'en', q: 'How long does it take to get a driving licence?' },
  { id: 'driving-learner-en', lang: 'en', q: 'How do I get a learner driver permit?' },
  { id: 'driving-test-en', lang: 'en', q: 'What is the process for the driving test?' },
  { id: 'driving-dmt-en', lang: 'en', q: 'Where is the Department of Motor Traffic?' },

  // Marriage
  { id: 'marriage-en', lang: 'en', q: 'How do I register my marriage?' },
  { id: 'marriage-apply-en', lang: 'en', q: 'How do I apply for marriage registration?' },
  { id: 'marriage-docs-en', lang: 'en', q: 'What documents do I need to register a marriage?' },
  { id: 'marriage-fee-en', lang: 'en', q: 'How much does marriage registration cost?' },
  { id: 'marriage-time-en', lang: 'en', q: 'How long does marriage registration take?' },
  { id: 'marriage-cert-en', lang: 'en', q: 'How do I get a marriage certificate?' },
  { id: 'marriage-witness-en', lang: 'en', q: 'Do I need witnesses for marriage registration?' },

  // GIC & general
  { id: 'gic-contact-en', lang: 'en', q: 'How do I contact the Government Information Centre?' },
  { id: 'gic-services-en', lang: 'en', q: 'What services does the Government Information Centre offer?' },
  { id: 'gic-what-en', lang: 'en', q: 'What is the GIC?' },
  { id: 'ds-hours-en', lang: 'en', q: 'What are the office hours of the Divisional Secretariat?' },
  { id: 'ds-what-en', lang: 'en', q: 'What is a Divisional Secretariat?' },
  { id: 'gov-services-en', lang: 'en', q: 'What government services can Nila help with?' },
  { id: 'help-en', lang: 'en', q: 'What can you help me with?' },
  { id: 'hello-en', lang: 'en', q: 'Hello' },

  // Common phrasing variants
  { id: 'birth-hi-en', lang: 'en', q: 'I need a birth certificate' },
  { id: 'nic-hi-en', lang: 'en', q: 'I need to apply for NIC' },
  { id: 'passport-hi-en', lang: 'en', q: 'I need a passport urgently' },
  { id: 'license-hi-en', lang: 'en', q: 'I want a driving license' },
  { id: 'marriage-hi-en', lang: 'en', q: 'We want to register our marriage' },

  // Agriculture — Ministry & policy
  { id: 'agri-ministry-en', lang: 'en', q: 'What does the Ministry of Agriculture do in Sri Lanka?' },
  { id: 'agri-policy-en', lang: 'en', q: 'Where can I find national agricultural policies?' },
  { id: 'agri-climate-en', lang: 'en', q: 'What is the Climate Smart Irrigated Agriculture Project?' },

  // Agriculture — DOA
  { id: 'agri-doa-en', lang: 'en', q: 'What services does the Department of Agriculture provide?' },
  { id: 'agri-crop-guide-en', lang: 'en', q: 'Where can I get crop production guides in Sri Lanka?' },
  { id: 'agri-pest-en', lang: 'en', q: 'How do I identify crop diseases in Sri Lanka?' },
  { id: 'agri-nvq-en', lang: 'en', q: 'How do I apply for NVQ agriculture diploma?' },

  // 1920 Agriculture helpline
  { id: 'agri-1920-en', lang: 'en', q: 'What is the 1920 agriculture hotline?' },
  { id: 'agri-1920-call-en', lang: 'en', q: 'How do I call an agronomist for pest problems?' },
  { id: 'agri-naicc-en', lang: 'en', q: 'What is NAICC agriculture advisory service?' },

  // Agrarian Development & Agrarian.lk
  { id: 'agri-agrarian-en', lang: 'en', q: 'What is the Department of Agrarian Development?' },
  { id: 'agri-fertilizer-en', lang: 'en', q: 'How do I get subsidized fertilizer in Sri Lanka?' },
  { id: 'agri-agrarian-lk-en', lang: 'en', q: 'How do I use Agrarian.lk farmer profile?' },
  { id: 'agri-subsidy-en', lang: 'en', q: 'How do I apply for farmer fertilizer subsidy in Sri Lanka?' },
  { id: 'agri-prices-en', lang: 'en', q: 'Where can I check wholesale crop prices in Sri Lanka?' },

  // Export Agriculture (DEA)
  { id: 'agri-export-en', lang: 'en', q: 'What is the Department of Export Agriculture?' },
  { id: 'agri-spice-en', lang: 'en', q: 'How do I grow cinnamon or pepper for export?' },
  { id: 'agri-spice-grant-en', lang: 'en', q: 'Are there grants for spice post-harvest processing?' },

  // NRMC & CROPIX
  { id: 'agri-nrmc-en', lang: 'en', q: 'Where can I find soil maps for farming in Sri Lanka?' },
  { id: 'agri-cropix-en', lang: 'en', q: 'What is the CROPIX agricultural monitoring system?' },
  { id: 'agri-overproduction-en', lang: 'en', q: 'How do I check vegetable overproduction warnings?' },

  // Statistics & livestock
  { id: 'agri-paddy-stats-en', lang: 'en', q: 'Where are Maha and Yala paddy yield statistics?' },
  { id: 'agri-livestock-en', lang: 'en', q: 'What does the Department of Animal Production and Health do?' },
  { id: 'agri-poultry-en', lang: 'en', q: 'How do I get poultry farming guidance in Sri Lanka?' },
  { id: 'agri-dairy-cert-en', lang: 'en', q: 'How do I get dairy production certification?' },

  // Tax
  { id: 'tax-ird-en', lang: 'en', q: 'How do I file income tax in Sri Lanka?' },
  { id: 'tax-tin-en', lang: 'en', q: 'How do I get a Tax Identification Number TIN?' },
  { id: 'tax-pay-en', lang: 'en', q: 'Where do I pay taxes in Sri Lanka?' },
  { id: 'tax-deadline-en', lang: 'en', q: 'When is income tax filing deadline Sri Lanka?' },

  // Education
  { id: 'edu-school-en', lang: 'en', q: 'How do I enroll my child in school in Sri Lanka?' },
  { id: 'edu-ol-en', lang: 'en', q: 'How do I register for GCE O Level exams in Sri Lanka?' },
  { id: 'edu-al-en', lang: 'en', q: 'How do I register for GCE A Level exams?' },
  { id: 'edu-results-en', lang: 'en', q: 'How do I get exam results certificate Sri Lanka?' },
  { id: 'edu-ugc-en', lang: 'en', q: 'How does university admission work in Sri Lanka?' },
  { id: 'edu-nvq-en', lang: 'en', q: 'What is NVQ vocational training in Sri Lanka?' },
];

type BuiltinEntry = {
  phrases?: string[];
  keywords: string[];
  reply: string;
  /** Require at least N keyword hits (after phrases) */
  minKeywords?: number;
};

const BUILTIN_ANSWERS: BuiltinEntry[] = [
  // High-priority: specific intents (checked first)
  {
    phrases: [
      'agricultural subsidies',
      'farmer subsidy',
      'fertilizer subsidy',
      'subsidies online',
      'apply for agricultural',
    ],
    keywords: ['subsidy', 'subsidies', 'agrarian.lk', 'agrarian', 'fertilizer', 'farmer profile'],
    minKeywords: 1,
    reply: REPLIES.subsidy,
  },
  {
    phrases: [
      'gce o level',
      'o level exam',
      'school exam',
      'register for gce',
      'ordinary level',
    ],
    keywords: ['gce', 'doenets', 'onlineexams', 'index number', 'private candidate'],
    minKeywords: 1,
    reply: REPLIES.exams,
  },
  {
    keywords: ['birth', 'certificate', 'born', 'bdr'],
    reply: REPLIES.birth,
  },
  {
    keywords: ['national', 'nic', 'identity card', 'identity'],
    reply: REPLIES.nic,
  },
  {
    keywords: ['passport', 'immigration', 'travel document'],
    reply: REPLIES.passport,
  },
  {
    keywords: ['driving', 'licence', 'license', 'learner', 'dmt', 'motor traffic'],
    reply: REPLIES.driving,
  },
  {
    phrases: ['register marriage', 'marriage registration', 'register my marriage'],
    keywords: ['marriage', 'wedding', 'married', 'marry'],
    minKeywords: 1,
    reply:
      'Marriage registration — Sri Lanka\n\n' +
      'How to apply:\n' +
      '1. Register at the Registrar General\'s Department or the Divisional Secretariat where the marriage took place.\n' +
      '2. Both parties attend with witnesses.\n\n' +
      'Required documents:\n' +
      '• NIC and birth certificates (both parties)\n' +
      '• Two witnesses with valid NIC\n\n' +
      'Fees:\n' +
      '• Registration: about Rs. 500–1,000\n' +
      '• Certified copy: about Rs. 100–200\n\n' +
      'Processing time:\n' +
      '• Usually 1–3 working days\n\n' +
      'Contact:\n' +
      '• Hours: Monday–Friday, 8:30am–4:15pm\n' +
      '• GIC helpline: 1919',
  },
  {
    keywords: ['gic', 'government information', 'information centre', '1919'],
    reply:
      'Government Information Centre (GIC)\n\n' +
      'Call 1919 for live assistance with any government service.\n\n' +
      'Nila can guide you on civil documents, agriculture (1920), subsidies, taxes (IRD), and exams (doenets.lk).\n\n' +
      'Contact:\n' +
      '• GIC hotline: 1919\n' +
      '• Visit your nearest Divisional Secretariat for in-person help',
  },
  {
    keywords: ['divisional', 'secretariat', 'ds office', 'office hours', 'hours'],
    reply:
      'Divisional Secretariat offices are generally open Monday to Friday, 8:30am to 4:15pm (some departments close slightly earlier). Bring original documents and copies when you visit.',
  },
  {
    keywords: ['1920', 'naicc', 'agronomist', 'pest hotline', 'agriculture helpline', 'farm helpline'],
    reply: REPLIES.hotline1920,
  },
  {
    keywords: ['department of agriculture', 'doa', 'crop guide', 'plant protection', 'rice research'],
    reply:
      'The Department of Agriculture (DOA) is Sri Lanka\'s technical farming backbone: crop guides, disease checklists, plant protection protocols, and research institutes (e.g. Rice Research and Development Institute). NVQ Level 6 diplomas in Agricultural Production Technology are advertised through DOA channels. Hours: Mon–Fri 8:30am–4:15pm.',
  },
  {
    keywords: ['ministry of agriculture', 'agrarian policy', 'climate smart', 'national agriculture'],
    reply:
      'The Ministry of Agriculture & Plantation sets national agrarian policy, regulatory frameworks, and major programs such as the Climate Smart Irrigated Agriculture Project. Use the ministry site for official announcements and national budgeting plans.',
  },
  {
    keywords: ['export agriculture', 'dea', 'cinnamon', 'pepper', 'cardamom', 'spice export', 'nutmeg', 'cloves'],
    reply:
      'The Department of Export Agriculture (DEA) supports export crops (EAC)—cinnamon, pepper, cardamom, cloves, nutmeg, coffee, cocoa—with cultivation assistance, post-harvest grants, and export business counseling (not tea/rubber/coconut).',
  },
  {
    keywords: ['nrmc', 'cropix', 'soil map', 'gis', 'agro-ecological', 'overproduction', 'vegetable scarcity'],
    reply:
      'NRMC (under DOA) provides GIS soil maps, rainfall patterns, and crop–soil recommendations. CROPIX is the national monitoring system with early warnings on vegetable overproduction or scarcity and dynamic crop registries for planners.',
  },
  {
    keywords: ['livestock', 'daph', 'poultry', 'dairy', 'animal health', 'veterinary', 'maha', 'yala', 'paddy yield'],
    reply:
      'Department of Census and Statistics publishes Maha/Yala paddy yields and livestock counts. DAPH handles breeding, poultry, transport permits, disease control, and dairy/meat certifications. Mon–Fri 8:30am–4:15pm.',
  },
  {
    keywords: ['farmer', 'farming', 'crop', 'harvest', 'irrigation'],
    minKeywords: 2,
    reply:
      'Farming help — Sri Lanka\n\n' +
      '• Technical advice (pests, soil): call 1920 (toll-free)\n' +
      '• Crop guides: http://www.doa.gov.lk\n' +
      '• Subsidies & farmer profile: https://www.agrarian.lk\n' +
      '• Export spices: Department of Export Agriculture\n' +
      '• GIC: 1919',
  },
  {
    keywords: ['tax', 'ird', 'inland revenue', 'tin', 'income tax', 'paye', 'efiling'],
    reply: REPLIES.tax,
  },
  {
    keywords: ['education', 'school enroll', 'ministry of education', 'enroll child', 'school placement'],
    minKeywords: 2,
    reply:
      'School enrollment — Sri Lanka\n\n' +
      'How to apply:\n' +
      '1. Contact your local school or Provincial Department of Education for placement.\n' +
      '2. Bring birth certificate, previous school records, and parent NIC.\n\n' +
      'For G.C.E. exams, see O/L and A/L registration (doenets.lk).\n\n' +
      'Resources:\n' +
      '• Ministry of Education: http://www.moe.gov.lk\n' +
      '• Examinations: https://www.doenets.lk\n' +
      '• GIC: 1919',
  },
  {
    keywords: ['university', 'ugc', 'z-score', 'higher education'],
    reply:
      'University Grants Commission (UGC) places eligible A/L students in state universities using Z-scores. Check UGC announcements for intake dates and degree programmes.',
  },
  {
    keywords: ['hello', 'hi', 'help', 'what can you', 'gov-services'],
    reply:
      'Hello! I am Nila, your GIC assistant. I can help with birth certificates, NIC, passports, driving licences, marriage registration, agriculture (1920 helpline, subsidies, export crops), taxes (IRD/TIN), and education (exams, schools, university). What would you like to know?',
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

function scoreMatch(question: string, target: string): number {
  const qWords = tokenize(question);
  const targetLower = target.toLowerCase();
  return qWords.reduce((n, w) => n + (targetLower.includes(w) ? 1 : 0), 0);
}

function builtinReply(question: string): string | null {
  const q = question.toLowerCase();
  let best: { reply: string; score: number } | null = null;

  for (const entry of BUILTIN_ANSWERS) {
    let score = 0;
    for (const phrase of entry.phrases ?? []) {
      if (q.includes(phrase)) score += 12;
    }
    const kwHits = entry.keywords.filter((kw) => q.includes(kw)).length;
    if (entry.minKeywords && kwHits < entry.minKeywords && score < 12) continue;
    score += kwHits * 2;
    if (score > 0 && (!best || score > best.score)) {
      best = { reply: entry.reply, score };
    }
  }
  const reply = best?.reply ?? null;
  return reply ? normalizeAssistantReply(reply) : null;
}

export async function preCacheAllQueries(onProgress?: (done: number, total: number) => void) {
  const total = OFFLINE_QUERIES.length;
  const db = await openOfflineDB();

  let done = 0;
  for (const query of OFFLINE_QUERIES) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query.q, language: query.lang }),
      });
      const data = await res.json();
      const raw = data.reply ?? data.error ?? 'No response available.';
      const reply = normalizeAssistantReply(raw);
      await db.put('responses', {
        id: query.id,
        query: query.q,
        reply,
        cachedAt: Date.now(),
      });
      console.log(`Cached: ${query.id}`);
    } catch {
      console.error(`Failed to cache: ${query.id}`);
    }
    done += 1;
    onProgress?.(done, total);
  }
  console.log(`Pre-cache complete! ${done}/${total} queries.`);
}

export async function getCacheCount(): Promise<number> {
  try {
    const db = await openOfflineDB();
    return (await db.getAll('responses')).length;
  } catch {
    return 0;
  }
}

export async function getOfflineResponse(question: string): Promise<string | null> {
  if (PRIORITY_BUILTIN_TOPICS.test(question)) {
    const priority = builtinReply(question);
    if (priority) return priority;
  }

  const qWords = tokenize(question);
  if (qWords.length === 0) return builtinReply(question);

  try {
    const db = await openOfflineDB();
    const all = await db.getAll('responses');

    if (all.length > 0) {
      const ranked = all
        .map((r) => ({
          ...r,
          score: Math.max(scoreMatch(question, r.query), scoreMatch(question, r.reply) * 0.8),
        }))
        .sort((a, b) => b.score - a.score);

      if (ranked[0]?.reply) {
        return normalizeAssistantReply(ranked[0].reply);
      }
    }
  } catch {
    /* IndexedDB unavailable */
  }

  return builtinReply(question);
}

// Backward compatibility
export const TOP_50_QUERIES = OFFLINE_QUERIES;
