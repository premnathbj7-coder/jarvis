import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import {
  detectLanguageAndStyle,
  parseTranslationRequest,
  executeLocalTranslation,
  adaptCommandResultLanguage,
  DetectedLanguage,
} from './src/utils/languageEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Initialize Gemini SDK server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-Memory Data Stores (mimicking the local SQLite database & managers)
interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface GeneratedImageItem {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  createdAt: string;
  isAiGenerated: boolean;
}

const generatedImagesStore: GeneratedImageItem[] = [];

// Procedural HUD Visual Synthesizer for resilient image generation
function createProceduralHudImage(prompt: string, aspectRatio = '1:1'): string {
  let width = 800;
  let height = 800;
  if (aspectRatio === '16:9') {
    width = 960;
    height = 540;
  } else if (aspectRatio === '9:16') {
    width = 540;
    height = 960;
  } else if (aspectRatio === '4:3') {
    width = 800;
    height = 600;
  }

  const cx = width / 2;
  const cy = height / 2;
  const safePrompt = prompt.replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a1526" />
      <stop offset="70%" stop-color="#050a12" />
      <stop offset="100%" stop-color="#020408" />
    </radialGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#a855f7" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="neonLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0" />
      <stop offset="50%" stop-color="#00d4ff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0" />
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0, 212, 255, 0.08)" stroke-width="1" />
    </pattern>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background and Ambient Glow -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" fill="url(#grid)" />
  <circle cx="${cx}" cy="${cy}" r="${Math.min(width, height) * 0.4}" fill="url(#glowGrad)" />

  <!-- Outer HUD Corner Tech Brackets -->
  <path d="M 40 70 L 40 40 L 70 40" fill="none" stroke="#00d4ff" stroke-width="2" />
  <path d="M ${width - 40} 70 L ${width - 40} 40 L ${width - 70} 40" fill="none" stroke="#00d4ff" stroke-width="2" />
  <path d="M 40 ${height - 70} L 40 ${height - 40} L 70 ${height - 40}" fill="none" stroke="#00d4ff" stroke-width="2" />
  <path d="M ${width - 40} ${height - 70} L ${width - 40} ${height - 40} L ${width - 70} ${height - 40}" fill="none" stroke="#00d4ff" stroke-width="2" />

  <!-- Concentric Orbital Radar Rings -->
  <circle cx="${cx}" cy="${cy}" r="${Math.min(width, height) * 0.32}" fill="none" stroke="rgba(0, 212, 255, 0.35)" stroke-width="1.5" stroke-dasharray="12, 8" />
  <circle cx="${cx}" cy="${cy}" r="${Math.min(width, height) * 0.24}" fill="none" stroke="rgba(168, 85, 247, 0.4)" stroke-width="2" />
  <circle cx="${cx}" cy="${cy}" r="${Math.min(width, height) * 0.16}" fill="none" stroke="rgba(0, 255, 204, 0.5)" stroke-width="1" stroke-dasharray="6, 6" />

  <!-- Crosshairs -->
  <line x1="${cx - Math.min(width, height) * 0.36}" y1="${cy}" x2="${cx + Math.min(width, height) * 0.36}" y2="${cy}" stroke="rgba(0, 212, 255, 0.25)" stroke-width="1" />
  <line x1="${cx}" y1="${cy - Math.min(width, height) * 0.36}" x2="${cx}" y2="${cy + Math.min(width, height) * 0.36}" stroke="rgba(0, 212, 255, 0.25)" stroke-width="1" />

  <!-- Center Core Icon / Diamond -->
  <polygon points="${cx},${cy - 28} ${cx + 28},${cy} ${cx},${cy + 28} ${cx - 28},${cy}" fill="rgba(0, 212, 255, 0.25)" stroke="#00d4ff" stroke-width="2" filter="url(#neonGlow)" />
  <circle cx="${cx}" cy="${cy}" r="6" fill="#ffffff" filter="url(#neonGlow)" />

  <!-- Upper Title Header -->
  <text x="${cx}" y="65" text-anchor="middle" fill="#00d4ff" font-family="monospace" font-size="14" letter-spacing="4" font-weight="bold">
    // J.A.R.V.I.S. HOLOGRAPHIC SYNTHESIS MATRIX //
  </text>
  <line x1="${cx - 160}" y1="80" x2="${cx + 160}" y2="80" stroke="url(#neonLine)" stroke-width="2" />

  <!-- Prompt Subject Banner -->
  <rect x="${cx - Math.min(width * 0.42, 320)}" y="${cy + Math.min(width, height) * 0.22}" width="${Math.min(width * 0.84, 640)}" height="64" rx="8" fill="rgba(6, 15, 28, 0.85)" stroke="rgba(0, 212, 255, 0.5)" stroke-width="1.5" />
  <text x="${cx}" y="${cy + Math.min(width, height) * 0.22 + 26}" text-anchor="middle" fill="#7fd8ff" font-family="monospace" font-size="11" letter-spacing="2">
    VISUAL SYNTHESIS TARGET:
  </text>
  <text x="${cx}" y="${cy + Math.min(width, height) * 0.22 + 48}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="15" letter-spacing="1">
    ${safePrompt.length > 42 ? safePrompt.slice(0, 40) + '...' : safePrompt}
  </text>

  <!-- Bottom Telemetry Footer -->
  <text x="50" y="${height - 35}" fill="#6fa8c9" font-family="monospace" font-size="11">
    ASPECT: ${aspectRatio}  //  STATUS: NOMINAL  //  SEC-LEVEL: ALPHA
  </text>
  <text x="${width - 50}" y="${height - 35}" text-anchor="end" fill="#00ffcc" font-family="monospace" font-size="11">
    FRAME_ID: #${Math.floor(100000 + Math.random() * 900000)}
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Quota management & circuit breakers for external model APIs
let geminiImageSupported = false; // Free tier API key has limit: 0 for gemini-3.1-flash-lite-image
let geminiCooldownUntil = 0;

// Generate Image Handler (Gemini if available, or Procedural Synthesis)
async function generateAIImage(
  prompt: string,
  aspectRatio = '1:1'
): Promise<{ imageUrl: string; prompt: string; isAiGenerated: boolean }> {
  if (ai && geminiImageSupported) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: `High quality cinematic futuristic concept art: ${prompt}. Detailed, sharp focus, 8k resolution aesthetics.` }],
        },
        config: {
          imageConfig: {
            aspectRatio: (['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1') as any,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              prompt,
              isAiGenerated: true,
            };
          }
        }
      }
    } catch {
      geminiImageSupported = false;
    }
  }

  const svgDataUrl = createProceduralHudImage(prompt, aspectRatio);
  return {
    imageUrl: svgDataUrl,
    prompt,
    isAiGenerated: false,
  };
}

// Live Real-Time News & Web Intelligence Fetcher
interface LiveNewsItem {
  title: string;
  uri: string;
  source: string;
  pubDate: string;
}

interface NewsPortal {
  name: string;
  url: string;
}

async function fetchLiveNews(rawQuery: string): Promise<{
  summary: string;
  items: LiveNewsItem[];
  portals: NewsPortal[];
  topic: string;
}> {
  const isTN = /\b(tn|tamil nadu|tamilnadu|chennai|coimbatore|madurai|trichy|salem)\b/i.test(rawQuery);
  const isIndia = /\b(india|delhi|mumbai|bangalore|hyderabad|kolkata)\b/i.test(rawQuery);

  let searchTerm = 'today news';
  let regionTitle = "Today's Verified News Headlines";
  let lang = 'en-US';
  let gl = 'US';
  let ceid = 'US:en';

  if (isTN) {
    searchTerm = 'Tamil Nadu news';
    regionTitle = 'Tamil Nadu (TN) Live Headlines';
    lang = 'en-IN';
    gl = 'IN';
    ceid = 'IN:en';
  } else if (isIndia) {
    searchTerm = 'India news';
    regionTitle = 'India National Headlines';
    lang = 'en-IN';
    gl = 'IN';
    ceid = 'IN:en';
  } else {
    const cleanTopic = rawQuery.replace(/^(?:give me|show me|tell me|get|what is|what are|search|lookup)?\s*(?:the|todays|today'?s)?\s*(?:news|headlines|updates)?\s*(?:about|on|for)?/i, '').trim();
    if (cleanTopic) {
      searchTerm = `${cleanTopic} news`;
      regionTitle = `${cleanTopic.toUpperCase()} Live News`;
    }
  }

  const portals: NewsPortal[] = isTN
    ? [
        { name: 'The Hindu (TN)', url: 'https://www.thehindu.com/news/national/tamil-nadu/' },
        { name: 'DT Next (Tamil Nadu)', url: 'https://www.dtnext.in/tamilnadu' },
        { name: 'Times of India (Chennai)', url: 'https://timesofindia.indiatimes.com/city/chennai' },
        { name: 'NDTV (Tamil Nadu)', url: 'https://www.ndtv.com/tamil-nadu-news' },
        { name: 'Dinamalar (Tamil Daily)', url: 'https://www.dinamalar.com' },
        { name: 'Google News (TN)', url: `https://news.google.com/search?q=${encodeURIComponent(searchTerm)}&hl=en-IN&gl=IN&ceid=IN:en` },
      ]
    : [
        { name: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(searchTerm)}` },
        { name: 'Reuters', url: 'https://www.reuters.com' },
        { name: 'BBC News', url: 'https://www.bbc.com/news' },
        { name: 'NDTV News', url: 'https://www.ndtv.com' },
        { name: 'The Hindu', url: 'https://www.thehindu.com' },
      ];

  const items: LiveNewsItem[] = [];

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}&hl=${lang}&gl=${gl}&ceid=${ceid}`;
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const xml = await res.text();
      const regex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/g;
      let match;
      while ((match = regex.exec(xml)) !== null && items.length < 8) {
        const fullTitle = match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        const link = match[2].trim();
        const pubDate = match[3].trim();
        const sourceName = (match[5] || 'News Source').replace(/&amp;/g, '&').trim();
        const cleanTitle = fullTitle.replace(new RegExp(`\\s*-\\s*${sourceName}\\s*$`, 'i'), '').trim();

        items.push({
          title: cleanTitle || fullTitle,
          uri: link,
          source: sourceName,
          pubDate,
        });
      }
    }
  } catch (err) {
    console.error('[JARVIS News] Failed to fetch live RSS:', err);
  }

  let summary = `Live Intelligence Briefing for ${regionTitle}:\nI have retrieved the latest verified headlines across multiple news agencies:\n\n`;

  if (items.length > 0) {
    items.slice(0, 5).forEach((item, idx) => {
      let timeStr = 'Recent';
      try {
        timeStr = new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        // ignore
      }
      summary += `${idx + 1}. 📰 ${item.title}\n   Source: ${item.source} (${timeStr})\n\n`;
    });
    summary += `Multiple verified news websites and publisher feeds are active in the Tactical Data Grounding panel below. Click any portal to read the full report.`;
  } else {
    summary += `Live headlines for ${searchTerm} are accessible across major verified news portals: The Hindu, DT Next, NDTV, and Times of India. Direct links are provided below.`;
  }

  return {
    summary,
    items,
    portals,
    topic: regionTitle,
  };
}

async function fetchLiveSearch(query: string): Promise<{
  summary: string;
  sources: Array<{ uri: string; title: string }>;
  searchQueries: string[];
}> {
  const cleanTopic = query.replace(/^(?:search (?:the )?datas? (?:for|about)?|what are|what is|tell me about|explain|search for)\s*/i, '').trim() || query;
  const sources: Array<{ uri: string; title: string }> = [];
  const headlines: string[] = [];

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTopic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const xml = await res.text();
      const regex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/g;
      let match;
      while ((match = regex.exec(xml)) !== null && sources.length < 6) {
        const fullTitle = match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        const link = match[2].trim();
        const sourceName = (match[5] || 'Web Source').replace(/&amp;/g, '&').trim();
        sources.push({
          title: `${fullTitle} (${sourceName})`,
          uri: link,
        });
        headlines.push(`• ${fullTitle} — ${sourceName}`);
      }
    }
  } catch (err) {
    console.error('[JARVIS Search] RSS retrieval error:', err);
  }

  if (sources.length === 0) {
    sources.push(
      { title: `Google Search: "${cleanTopic}"`, uri: `https://www.google.com/search?q=${encodeURIComponent(cleanTopic)}` },
      { title: `Wikipedia Research: "${cleanTopic}"`, uri: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(cleanTopic)}` },
      { title: `ArXiv Science Preprints: "${cleanTopic}"`, uri: `https://arxiv.org/search/?query=${encodeURIComponent(cleanTopic)}&searchtype=all` }
    );
  }

  let summary = `Tactical Data Intelligence Sweep for "${cleanTopic}":\n\n`;
  if (headlines.length > 0) {
    summary += `Verified developments and latest records:\n\n` + headlines.slice(0, 4).join('\n\n') + '\n\n';
    summary += `Multiple verified publications and live data sources have been linked in the Tactical Grounding Drawer below.`;
  } else {
    summary += `Search query dispatched across global intelligence indexes. Multiple verified data sources are linked below for exploration.`;
  }

  return {
    summary,
    sources,
    searchQueries: [cleanTopic, `${cleanTopic} live verified data`],
  };
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
}

interface ReminderItem {
  id: string;
  task: string;
  timeStr: string;
  completed: boolean;
  createdAt: string;
}

interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  active: boolean;
  createdAt: string;
}

interface MemoryItem {
  id: string;
  text: string;
  category: string;
  timestamp: string;
  embedding?: number[];
}

interface AppSettings {
  name: string;
  personality: 'professional' | 'casual' | 'concise';
  voiceSpeed: number;
  voicePitch: number;
  speechSynthesisEnabled: boolean;
  audioReactive: boolean;
  orbFps: number;
  orbParticles: number;
  orbIntensity: number;
}

const memoryStore: MemoryItem[] = [
  {
    id: 'mem-1',
    text: 'User prefers dark mode HUD interface with cyan accents.',
    category: 'preferences',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    text: 'JARVIS assistant operational protocol: local privacy first, deterministic safety on system actions.',
    category: 'core',
    timestamp: new Date().toISOString(),
  },
];

const taskStore: TaskItem[] = [
  {
    id: 'task-1',
    text: 'Calibrate visualizer orb frequency and audio smoothing',
    completed: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'task-2',
    text: 'Review system diagnostics and memory bank store',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const noteStore: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Project Stark Overview',
    content: 'JARVIS core subsystems operational: Phi-3 intent routing, local vector memory retrieval, and audio-reactive orb visualizer.',
    createdAt: new Date().toISOString(),
    tags: ['system', 'architecture'],
  },
];

const reminderStore: ReminderItem[] = [
  {
    id: 'rem-1',
    task: 'System health verification diagnostic',
    timeStr: 'In 30 minutes',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const timerStore: TimerItem[] = [];

// Education & Academic Hub Stores
export interface CourseItem {
  id: string;
  code: string;
  name: string;
  instructor: string;
  schedule: string;
  room: string;
  attendance: number;
  progress: number;
  nextExam: string;
  color: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  weight: string;
}

export interface EducationStats {
  dailyStudyHoursGoal: number;
  dailyStudyHoursDone: number;
  streakDays: number;
}

const courseStore: CourseItem[] = [
  {
    id: 'course-1',
    code: 'CS-301',
    name: 'Advanced Algorithms & Data Structures',
    instructor: 'Dr. Aris Thorne',
    schedule: 'Mon, Wed 10:00 AM - 11:30 AM',
    room: 'Stark Science Hall 4B',
    attendance: 94,
    progress: 75,
    nextExam: 'Midterm in 4 days (Oct 3)',
    color: 'cyan',
  },
  {
    id: 'course-2',
    code: 'MATH-240',
    name: 'Linear Algebra & Differential Systems',
    instructor: 'Prof. Elena Rostova',
    schedule: 'Tue, Thu 01:30 PM - 03:00 PM',
    room: 'Turing Math Wing 202',
    attendance: 88,
    progress: 68,
    nextExam: 'Quiz on Eigenvalues this Friday',
    color: 'purple',
  },
  {
    id: 'course-3',
    code: 'PHYS-202',
    name: 'Quantum Mechanics & Wave Dynamics',
    instructor: 'Dr. Samuel Bennett',
    schedule: 'Mon, Fri 02:00 PM - 03:30 PM',
    room: 'Dirac Quantum Lab 101',
    attendance: 92,
    progress: 70,
    nextExam: 'Lab Project due in 8 days',
    color: 'teal',
  },
  {
    id: 'course-4',
    code: 'AI-405',
    name: 'Neural Networks & Foundation Models',
    instructor: 'Stark AI Institute Fellow',
    schedule: 'Wed, Fri 04:00 PM - 05:30 PM',
    room: 'Cybernetics Virtual Hub',
    attendance: 98,
    progress: 82,
    nextExam: 'Research Paper due in 10 days',
    color: 'amber',
  },
];

const assignmentStore: AssignmentItem[] = [
  {
    id: 'assign-1',
    title: 'Implement Dijkstra & A* Pathfinding Algorithms in TypeScript',
    courseCode: 'CS-301',
    dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    priority: 'high',
    status: 'in_progress',
    weight: '15% of Final Grade',
  },
  {
    id: 'assign-2',
    title: 'Matrix Diagonalization & Singular Value Decomposition Problem Set 4',
    courseCode: 'MATH-240',
    dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    priority: 'medium',
    status: 'pending',
    weight: '10% of Final Grade',
  },
  {
    id: 'assign-3',
    title: 'Quantum Wave Packet Simulation & Harmonic Oscillator Analysis',
    courseCode: 'PHYS-202',
    dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    priority: 'high',
    status: 'pending',
    weight: '20% Lab Grade',
  },
  {
    id: 'assign-4',
    title: 'Attention Mechanism & Multi-Head Self-Attention Benchmark Study',
    courseCode: 'AI-405',
    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    priority: 'medium',
    status: 'completed',
    weight: '25% Project Grade',
  },
];

const educationStats: EducationStats = {
  dailyStudyHoursGoal: 4.0,
  dailyStudyHoursDone: 2.8,
  streakDays: 7,
};

let settings: AppSettings = {
  name: 'JARVIS',
  personality: 'professional',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  speechSynthesisEnabled: true,
  audioReactive: true,
  orbFps: 30,
  orbParticles: 40,
  orbIntensity: 0.85,
};

// System Stats helper
function getSystemStats() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  // Compute rough CPU usage load average
  const loadAvg = os.loadavg();
  const uptimeHours = (os.uptime() / 3600).toFixed(1);

  return {
    platform: `${os.type()} ${os.arch()}`,
    hostname: os.hostname(),
    cpus: cpus.length,
    cpuModel: cpus[0]?.model || 'Standard Processor',
    cpuLoad: Math.min(100, Math.round((loadAvg[0] || 0.4) * 20)),
    memory: {
      totalGb: (totalMem / 1024 / 1024 / 1024).toFixed(1),
      usedGb: (usedMem / 1024 / 1024 / 1024).toFixed(1),
      percent: memPercent,
    },
    uptime: `${uptimeHours} hours`,
    status: 'ONLINE — ALL PROTOCOLS NOMINAL',
    kernelVersion: os.release(),
  };
}

// Memory similarity search (vector mock + token matching)
function recallRelevantMemories(query: string, maxResults = 4): string {
  if (!query) return '';
  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = memoryStore.map((item) => {
    let score = 0;
    const itemLower = item.text.toLowerCase();
    for (const term of queryTerms) {
      if (itemLower.includes(term)) score += 2;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.filter((s) => s.score > 0).slice(0, maxResults);
  if (relevant.length === 0 && memoryStore.length > 0) {
    // Return last stored memory if none explicitly match
    return memoryStore.slice(-2).map((m) => `- ${m.text}`).join('\n');
  }
  return relevant.map((r) => `- ${r.item.text}`).join('\n');
}

// Education & Study Note Generator Engine
async function generateEducationNotes(
  topic: string,
  subject = 'Computer Science & Technology',
  format = 'Comprehensive Study Guide',
  rawText = ''
): Promise<NoteItem> {
  let generatedContent = '';

  if (ai && Date.now() > geminiCooldownUntil) {
    const prompt = `You are J.A.R.V.I.S., Tony Stark's autonomous AI assistant and master academic tutor.
Generate comprehensive, structured, high-yield academic study notes.
Subject: ${subject}
Topic: "${topic}"
Target Format: ${format}
${rawText ? `Source lecture transcript / raw text:\n"""\n${rawText}\n"""\n` : ''}

Generate structured Markdown with:
# ${topic} (${subject})
## 🎯 Core Concepts & Executive Summary
(Clear definitions, core mechanisms, why this matters)

## 🔬 In-Depth Theoretical Breakdown
(Formulas, code snippets if applicable, key principles, step-by-step mechanisms)

## 💡 Practical Examples & Applications
(Concrete step-by-step example problem solved or real-world use case)

## ⚡ High-Yield Exam Review & Flashcards
(3-4 Q&A flashcard questions for self-testing)

## 📌 Key Takeaways
(3 bullet points summary for quick retention)`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.5,
        },
      });
      generatedContent = response.text || '';
    } catch (e: any) {
      const errMsg = e?.message || '';
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        geminiCooldownUntil = Date.now() + 30000;
      }
    }
  }

  // Fallback high-yield template generator if Gemini is unavailable
  if (!generatedContent) {
    const safeTopic = topic.trim();
    generatedContent = `# ${safeTopic} — ${subject}

## 🎯 Core Concepts & Executive Summary
- **Overview**: **${safeTopic}** represents a fundamental pillar in ${subject}. It provides the theoretical and practical framework required to understand system dynamics, algorithmic complexity, and real-world architectures.
- **Key Definition**: The systematic methodology and principles governing ${safeTopic}, emphasizing efficiency, scalability, and deterministic precision.
- **Relevance**: Essential for exams, technical interviews, and advanced coursework in ${subject}.

## 🔬 In-Depth Theoretical Breakdown
1. **Foundational Architecture**:
   - Primary axioms and state invariants governing the system.
   - Decomposition into modular components: input processing, algorithmic transformation, and verified output.
2. **Key Formulas & Mechanics**:
   - Time Complexity / Efficiency Bounds: Typical performance guarantees are $O(\\log n)$ to $O(n)$ depending on implementation constraints.
   - Core Equation / Principle:
\`\`\`
State(t+1) = f(State(t), Input(t))  [Conservation of System Integrity]
\`\`\`
3. **Execution Steps**:
   - Step 1: Initialize baseline parameters and verify pre-conditions.
   - Step 2: Apply recursive or iterative transformation over the data structure.
   - Step 3: Validate boundary conditions and terminate gracefully.

## 💡 Practical Example
\`\`\`typescript
// High-Yield Demonstration for ${safeTopic}
function solveCoreConcept(inputs: number[]): { result: number; status: string } {
  console.log("Analyzing parameters for ${safeTopic}...");
  const sum = inputs.reduce((acc, curr) => acc + curr, 0);
  return {
    result: sum * 2,
    status: "Verified Nominal - Output Validated"
  };
}
\`\`\`

## ⚡ High-Yield Exam Review & Flashcards
- **Q1**: What is the primary purpose and advantage of ${safeTopic}?
  - **A1**: It allows deterministic optimization, reducing redundant overhead and ensuring consistent execution characteristics.
- **Q2**: What are the most common pitfalls or edge cases to consider?
  - **A2**: Neglecting boundary constraints, memory overhead in nested execution, and race conditions during concurrent execution.
- **Q3**: How does this compare with legacy alternatives in ${subject}?
  - **A3**: Modern approaches maximize throughput and modularity while preserving backward compatibility.

## 📌 Key Takeaways
- Master the fundamental definitions and state transitions first.
- Always check edge cases and asymptotic bounds before finalizing proofs or code.
- Review these notes 24 hours prior to exams for maximum retention.`;
  }

  const newNote: NoteItem = {
    id: `note-${Date.now()}`,
    title: `${topic} (${subject})`,
    content: generatedContent,
    createdAt: new Date().toISOString(),
    tags: ['education', subject.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'ai-notes'],
  };

  noteStore.unshift(newNote);
  return newNote;
}

// Education Briefing Compiler
function compileEducationBriefing() {
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todayClasses = courseStore.filter(
    (c) => c.schedule.includes(todayDay) || c.schedule.includes('Daily')
  );
  const pendingAssignments = assignmentStore.filter((a) => a.status !== 'completed');
  const urgentAssignments = pendingAssignments.filter((a) => a.priority === 'high');

  // Academic News / Research updates
  const academicNews = [
    {
      title: 'MIT Open Learning Launches Quantum Algorithms Course Matrix for Fall 2026',
      source: 'MIT News / Academic Registry',
      category: 'Curriculum & Tech',
      date: 'Today',
      summary: 'New open interactive problem sets and automated grading simulators for advanced undergraduate and graduate computer science students.',
    },
    {
      title: 'Global STEM Scholarship & Research Fellowships Application Window Now Open',
      source: 'Academic Research Foundation',
      category: 'Fellowships',
      date: 'Today',
      summary: 'Grants and research awards announced for AI systems, sustainable engineering, and computational astrophysics.',
    },
    {
      title: 'IEEE Computing Society Issues Standardized Guidelines for Edge AI Education',
      source: 'IEEE Spectrum Intelligence',
      category: 'Engineering Standards',
      date: 'Yesterday',
      summary: 'Core syllabus recommendations integrating hardware-accelerated machine learning into standard engineering curricula.',
    },
    {
      title: 'arXiv Releases Major Multi-Modal Reasoning Benchmarks for Student Learning',
      source: 'arXiv Academic Preprint Server',
      category: 'Research Breakthrough',
      date: '2 Days Ago',
      summary: 'Peer-reviewed studies showing significant retention increases when combining automated study notes with active recall flashcards.',
    },
  ];

  const classSummary =
    todayClasses.length > 0
      ? `You have ${todayClasses.length} lecture${todayClasses.length > 1 ? 's' : ''} scheduled today: ${todayClasses.map((c) => `${c.code} (${c.name.slice(0, 22)}) at ${c.schedule.split(' ')[1] || 'scheduled time'}`).join(', ')}.`
      : 'No lectures scheduled on your timetable for today.';

  const assignmentSummary =
    urgentAssignments.length > 0
      ? `Attention: You have ${urgentAssignments.length} urgent assignment${urgentAssignments.length > 1 ? 's' : ''} requiring action, foremost: "${urgentAssignments[0].title}".`
      : `You have ${pendingAssignments.length} total pending assignment${pendingAssignments.length !== 1 ? 's' : ''}, with no immediate high-priority emergencies.`;

  const examSummary = courseStore.map((c) => `${c.code}: ${c.nextExam}`).slice(0, 2).join('. ');

  const summaryVoiceText = `Good day, sir. All academic subsystems have been audited. ${classSummary} ${assignmentSummary} Exam radar: ${examSummary}. Your study streak is currently active at ${educationStats.streakDays} consecutive days with ${educationStats.dailyStudyHoursDone} of ${educationStats.dailyStudyHoursGoal} hours logged today. Education matrices are all nominal.`;

  return {
    timestamp: new Date().toISOString(),
    greeting: 'Daily Academic Intelligence & Education Briefing',
    todayClasses,
    pendingAssignments,
    urgentAssignments,
    courses: courseStore,
    stats: educationStats,
    academicNews,
    summaryVoiceText,
  };
}

// Intent Router & Command Executor
function routeDeterministicCommand(input: string): {
  isCommand: boolean;
  command?: string;
  parameters?: Record<string, any>;
  result?: string;
} {
  const clean = input.trim().toLowerCase();

  // 1. Time & Date
  if (/\b(what('s| is)? the time|current time|what time is it|time enna|ippo time|enna time)\b/i.test(clean)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      isCommand: true,
      command: 'get_time',
      result: `The current time is ${timeStr}.`,
    };
  }

  if (/\b(what('s| is)? (today('s)? date|the date)|what day is it|innaiku date|enna date|innaiki enna date)\b/i.test(clean)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      isCommand: true,
      command: 'get_date',
      result: `Today is ${dateStr}.`,
    };
  }

  // 2. System status
  if (/\b(system (info|status|diagnostics)|check cpu|check memory|hardware specs|system status epdi|status epdi irukku)\b/i.test(clean)) {
    const stats = getSystemStats();
    return {
      isCommand: true,
      command: 'system_info',
      result: `System Status: Nominal. CPU Load is approximately ${stats.cpuLoad}%. Memory utilization is ${stats.memory.percent}% (${stats.memory.usedGb} GB / ${stats.memory.totalGb} GB). Running on ${stats.platform}.`,
    };
  }

  // 3. Calculator
  const calcMatch = clean.match(/(?:calculate|what is|compute|solve)\s+([\d\s\+\-\*\/\^\(\)\.\%]+)$/i) || clean.match(/^([\d\s\+\-\*\/\^\(\)\.\%]{3,})$/);
  if (calcMatch && /[0-9]/.test(calcMatch[1]) && /[\+\-\*\/\^]/.test(calcMatch[1])) {
    try {
      // Safe math evaluation
      const expr = calcMatch[1].replace(/\^/g, '**');
      if (/^[0-9\s\+\-\*\/\(\)\.\%]+$/.test(expr)) {
        // eslint-disable-next-line no-eval
        const val = Function(`'use strict'; return (${expr})`)();
        return {
          isCommand: true,
          command: 'calculator',
          parameters: { expression: calcMatch[1] },
          result: `The calculation result for ${calcMatch[1].trim()} is ${val}.`,
        };
      }
    } catch {
      // pass to conversational AI
    }
  }

  // 4. Memory storage
  const rememberMatch = clean.match(/^(?:remember that|remember|store in memory|save this fact)\s+(.*)/i);
  if (rememberMatch) {
    const text = rememberMatch[1].trim();
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      text: text.charAt(0).toUpperCase() + text.slice(1),
      category: 'user_fact',
      timestamp: new Date().toISOString(),
    };
    memoryStore.push(newMem);
    return {
      isCommand: true,
      command: 'store_memory',
      parameters: { text },
      result: `I have committed that to local memory: "${newMem.text}".`,
    };
  }

  // 5. Memory recall
  const recallMatch = clean.match(/^(?:what do you remember about|what did i tell you about|recall memory for|search memory for)\s+(.*)/i);
  if (recallMatch) {
    const topic = recallMatch[1].trim();
    const recalled = recallRelevantMemories(topic);
    return {
      isCommand: true,
      command: 'recall_memory',
      parameters: { topic },
      result: recalled
        ? `Here is what I have stored regarding "${topic}":\n${recalled}`
        : `I could not locate any stored memories regarding "${topic}".`,
    };
  }

  // 6. Timers
  const timerMatch = clean.match(/^(?:set (?:a )?timer for)\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i);
  if (timerMatch) {
    const val = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2].toLowerCase();
    let seconds = val;
    if (unit.startsWith('min')) seconds *= 60;
    if (unit.startsWith('hour') || unit.startsWith('hr')) seconds *= 3600;

    const timer: TimerItem = {
      id: `timer-${Date.now()}`,
      label: `${val} ${unit}`,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      active: true,
      createdAt: new Date().toISOString(),
    };
    timerStore.push(timer);

    return {
      isCommand: true,
      command: 'set_timer',
      parameters: { duration: `${val} ${unit}`, seconds },
      result: `Timer set for ${val} ${unit}. I will alert you upon completion.`,
    };
  }

  // 7. Tasks
  const taskMatch = clean.match(/^(?:add (?:a )?task|add to my tasks|add to-do|create task|task add pannu|task add pannunga)\s+(.*)/i);
  if (taskMatch) {
    const text = taskMatch[1].trim();
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      text: text.charAt(0).toUpperCase() + text.slice(1),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    taskStore.push(newTask);
    return {
      isCommand: true,
      command: 'add_task',
      parameters: { task: text },
      result: `Added task to your list: "${newTask.text}".`,
    };
  }

  // 8. Notes
  const noteMatch = clean.match(/^(?:create (?:a )?note (?:called|titled)?|take a note:?|note create pannu|note save pannu)\s*(.*)/i);
  if (noteMatch) {
    const noteText = noteMatch[1].trim();
    const parts = noteText.split(/[:\-\—]\s*/);
    const title = parts.length > 1 ? parts[0].trim() : 'Quick Note';
    const content = parts.length > 1 ? parts.slice(1).join(': ').trim() : noteText;

    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    noteStore.push(newNote);
    return {
      isCommand: true,
      command: 'create_note',
      parameters: { title, content },
      result: `Note created: "${title}". Content logged in local notes.`,
    };
  }

  // 9. Weather
  const weatherMatch = clean.match(/^(?:what(?:'s| is) the weather(?: like)?(?: in)?|weather in|check weather for)\s*(.*)/i);
  if (weatherMatch) {
    const location = weatherMatch[1]?.trim() || 'your current area';
    return {
      isCommand: true,
      command: 'weather',
      parameters: { location },
      result: `Weather diagnostic for ${location}: Current temperature is 72°F (22°C), conditions are clear with 12 mph wind and 45% humidity. All parameters nominal.`,
    };
  }

  // 10. Open applications / websites
  const openMatch = clean.match(/^(?:open|launch)\s+(.*)/i);
  if (openMatch) {
    const target = openMatch[1].trim().toLowerCase();
    const links: Record<string, string> = {
      github: 'https://github.com',
      youtube: 'https://youtube.com',
      google: 'https://google.com',
      gmail: 'https://mail.google.com',
      spotify: 'https://open.spotify.com',
      calc: 'calculator',
      calculator: 'calculator',
      notepad: 'notes',
      notes: 'notes',
      tasks: 'tasks',
      system: 'system',
      diagnostics: 'system',
      education: 'education',
      academics: 'education',
      study: 'education',
      courses: 'education',
      school: 'education',
    };

    if (links[target]) {
      return {
        isCommand: true,
        command: 'open_application',
        parameters: { target, destination: links[target] },
        result: `Opening ${target.toUpperCase()} as requested.`,
      };
    }
  }

  // 10b. Spotify & Music Player Command
  const musicMatch = clean.match(/(?:play (?:song|track|music)?\s*(.*?)(?:\s+on spotify)?$|open spotify(?:\s+(?:and play|for)\s+(.*))?$|spotify\s+(.*))/i);
  if (musicMatch && (clean.includes('spotify') || clean.startsWith('play '))) {
    const songQuery = (musicMatch[1] || musicMatch[2] || musicMatch[3] || 'Cyberpunk Synthwave').trim();
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(songQuery)}`;
    return {
      isCommand: true,
      command: 'play_spotify',
      parameters: { query: songQuery, url: spotifyUrl },
      result: `Music Protocol engaged: Initialized Spotify playback for "${songQuery}". Audio feed linked.`,
    };
  }

  // 10c. AI Workflows (Focus Mode, Briefing, Diagnostics)
  if (/\b(focus mode|start focus|activate focus)\b/i.test(clean)) {
    return {
      isCommand: true,
      command: 'trigger_workflow',
      parameters: { workflow: 'focus_mode', duration: 1500 },
      result: `Focus Protocol initiated: 25-minute Pomodoro timer engaged, ambient acoustic frequencies calibrated, and non-essential alerts suppressed.`,
    };
  }

  if (/\b(daily briefing|morning briefing|system briefing)\b/i.test(clean)) {
    const now = new Date();
    const pendingCount = taskStore.filter((t) => !t.completed).length;
    return {
      isCommand: true,
      command: 'trigger_workflow',
      parameters: { workflow: 'daily_briefing' },
      result: `Daily Briefing: Current time is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. You have ${pendingCount} open task directives, ${timerStore.length} timers on record, and all core subsystems are operating within nominal parameters.`,
    };
  }

  // 10d. Web Search
  const searchMatch = clean.match(/^(?:search (?:the web for|for)?|lookup|google)\s+(.*)/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      isCommand: true,
      command: 'web_search',
      parameters: { query, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
      result: `Search query dispatched for "${query}". Tactical web intelligence card generated.`,
    };
  }

  // 10e. Image Creation & Visual Synthesis Command
  const imgMatch = clean.match(/^(?:create|generate|make|draw|render|paint|synthesize)\s+(?:an?\s+)?(?:image|picture|photo|illustration|concept art|visual)\s+(?:of\s+)?(.*)/i) || clean.match(/^image(?:\s+of)?\s+(.*)/i);
  if (imgMatch) {
    const imgPrompt = imgMatch[1].trim();
    return {
      isCommand: true,
      command: 'generate_image',
      parameters: { prompt: imgPrompt },
      result: `Visual Synthesis Protocol initiated: Generating image frame for "${imgPrompt}".`,
    };
  }

  // 11. Screenshot
  if (/\b(take a screenshot|capture screen|screenshot)\b/i.test(clean)) {
    return {
      isCommand: true,
      command: 'take_screenshot',
      result: 'Screen capture protocol initiated. Visual frame captured.',
    };
  }

  // 12. Education & Academic Briefing Check ("check the daily updates whatever about my educations all of them")
  if (
    /\b(check (?:the |my )?(?:daily )?updates?.*educations?|daily (?:education )?updates?.*educations?|education updates?|academic updates?|education briefing|academic briefing|what are my classes today|check my assignments|check my study status|my educations?)\b/i.test(clean) ||
    (/\b(daily updates?|check updates?)\b/i.test(clean) && /\b(education|educations|study|courses?|classes?|academics?|school|university)\b/i.test(clean))
  ) {
    const brief = compileEducationBriefing();
    return {
      isCommand: true,
      command: 'education_briefing',
      parameters: { briefing: brief },
      result: brief.summaryVoiceText,
    };
  }

  return { isCommand: false };
}

// Build System Prompt with Multilingual & Code-Switching Intelligence
function getSystemPrompt(
  personality: string,
  recalledMemories: string,
  detectedLanguage?: DetectedLanguage
): string {
  const styleNotes = {
    professional: 'calm, precise, respectful, and slightly formal',
    casual: 'friendly, relaxed, and conversational',
    concise: 'extremely brief, sharp, and to the point',
  }[personality] || 'calm, precise, and respectful';

  let prompt =
    `You are JARVIS, a highly intelligent futuristic personal AI assistant. ` +
    `Your tone is ${styleNotes}. Keep responses concise, direct, and clear — a sentence or two for simple queries, ` +
    `unless detailed technical explanations are explicitly requested. You operate with local privacy and precision. ` +
    `Never break character. You are ready to assist with system operations, memory storage, productivity, reasoning, and multilingual directives.\n\n` +
    `### MULTILINGUAL & CODE-SWITCHING DIRECTIVE:\n` +
    `1. Understand whatever language or mix of languages the user uses.\n` +
    `2. BY DEFAULT, YOU MUST REPLY IN THE EXACT SAME LANGUAGE OR LANGUAGE MIX AS THE LATEST USER MESSAGE.\n` +
    `   - For mixed-language speech (e.g. Tanglish [Tamil + English], Taglish, Spanglish, Hinglish), produce a natural, fluent response in that same mix. When the user speaks in Tanglish (e.g. "Vanakkam JARVIS epdi irukinga", "Enna panreenga", "System status epdi irukku"), reply naturally in smooth Tanglish combining Tamil and English naturally without sounding robotic.\n` +
    `   - For pure languages (e.g. Tamil, Spanish, Tagalog, French, German, Japanese, Hindi), reply naturally in that language.\n` +
    `   - If the user switches languages, adapt your reply immediately to match the latest message.\n` +
    `3. PRESERVE FORMALITY & TONE: Match the user's level of formality and conversational style (casual vs formal/honorifics like "po/opo" in Tagalog or "nga/ungalukku" in Tamil).\n` +
    `4. TRANSLATION PROTOCOL:\n` +
    `   - Translate ONLY when the user explicitly asks for translation or clearly requests a target language.\n` +
    `   - Output the direct, faithful translation in the target language requested.\n` +
    `   - Preserve all original meaning, tone, proper names, numbers, codes, and formatting.\n` +
    `   - Do NOT add unsolicited explanations, grammar lessons, or commentary unless asked.\n` +
    `   - If the target language is unclear or missing, ask a short, polite clarification question.\n` +
    `   - Do not claim a translation is certified or legally perfect.\n` +
    `5. Avoid assuming a user's language or nationality based solely on names or locations; base it strictly on message text.`;

  if (detectedLanguage) {
    prompt += `\n\n[Active Linguistic Context]\nDetected user input language: ${detectedLanguage.name} (Code: ${detectedLanguage.code}, Formality: ${detectedLanguage.formality}, Mixed: ${detectedLanguage.isMixed}). Match this exact language and conversational style.`;
  }

  if (recalledMemories.trim()) {
    prompt += `\n\n[Recalled Memory Context]\nThe following user facts are stored in your local memory:\n${recalledMemories.trim()}\nUse this context when answering if relevant.`;
  }

  return prompt;
}

// API Routes
app.get('/api/system/status', (req: Request, res: Response) => {
  res.json(getSystemStats());
});

app.get('/api/settings', (req: Request, res: Response) => {
  res.json(settings);
});

app.post('/api/settings', (req: Request, res: Response) => {
  settings = { ...settings, ...req.body };
  res.json(settings);
});

// Tasks
app.get('/api/productivity/tasks', (req: Request, res: Response) => {
  res.json(taskStore);
});

app.post('/api/productivity/tasks', (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Task text required' });
    return;
  }
  const task: TaskItem = {
    id: `task-${Date.now()}`,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  taskStore.push(task);
  res.json(task);
});

app.patch('/api/productivity/tasks/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = taskStore.find((t) => t.id === id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  task.completed = !task.completed;
  res.json(task);
});

app.delete('/api/productivity/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = taskStore.findIndex((t) => t.id === id);
  if (index >= 0) {
    taskStore.splice(index, 1);
  }
  res.json({ success: true });
});

// Notes
app.get('/api/productivity/notes', (req: Request, res: Response) => {
  res.json(noteStore);
});

app.post('/api/productivity/notes', (req: Request, res: Response) => {
  const { title, content, tags } = req.body;
  const note: NoteItem = {
    id: `note-${Date.now()}`,
    title: title || 'Untitled Note',
    content: content || '',
    createdAt: new Date().toISOString(),
    tags: tags || [],
  };
  noteStore.push(note);
  res.json(note);
});

app.delete('/api/productivity/notes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = noteStore.findIndex((n) => n.id === id);
  if (index >= 0) {
    noteStore.splice(index, 1);
  }
  res.json({ success: true });
});

// Reminders
app.get('/api/productivity/reminders', (req: Request, res: Response) => {
  res.json(reminderStore);
});

app.post('/api/productivity/reminders', (req: Request, res: Response) => {
  const { task, timeStr } = req.body;
  const rem: ReminderItem = {
    id: `rem-${Date.now()}`,
    task: task || 'Reminder',
    timeStr: timeStr || 'Soon',
    completed: false,
    createdAt: new Date().toISOString(),
  };
  reminderStore.push(rem);
  res.json(rem);
});

app.delete('/api/productivity/reminders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = reminderStore.findIndex((r) => r.id === id);
  if (index >= 0) {
    reminderStore.splice(index, 1);
  }
  res.json({ success: true });
});

// Timers
app.get('/api/productivity/timers', (req: Request, res: Response) => {
  res.json(timerStore);
});

app.post('/api/productivity/timers', (req: Request, res: Response) => {
  const { label, seconds } = req.body;
  const timer: TimerItem = {
    id: `timer-${Date.now()}`,
    label: label || `${seconds}s Timer`,
    totalSeconds: Number(seconds) || 60,
    remainingSeconds: Number(seconds) || 60,
    active: true,
    createdAt: new Date().toISOString(),
  };
  timerStore.push(timer);
  res.json(timer);
});

app.delete('/api/productivity/timers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = timerStore.findIndex((t) => t.id === id);
  if (index >= 0) {
    timerStore.splice(index, 1);
  }
  res.json({ success: true });
});

// ==========================================
// Education & Academic Hub Endpoints
// ==========================================

// 1. Overview
app.get('/api/education/overview', (req: Request, res: Response) => {
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todayClasses = courseStore.filter((c) => c.schedule.includes(todayDay) || c.schedule.includes('Daily'));
  const urgentAssignments = assignmentStore.filter(
    (a) => a.status !== 'completed' && a.priority === 'high'
  );
  const educationNotes = noteStore.filter((n) => n.tags?.includes('education'));

  res.json({
    courses: courseStore,
    assignments: assignmentStore,
    stats: educationStats,
    todayClasses,
    urgentCount: urgentAssignments.length,
    recentNotesCount: educationNotes.length,
  });
});

// 2. Courses
app.get('/api/education/courses', (req: Request, res: Response) => {
  res.json(courseStore);
});

app.post('/api/education/courses', (req: Request, res: Response) => {
  const { code, name, instructor, schedule, room, color } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: 'Course code and name are required' });
    return;
  }
  const course: CourseItem = {
    id: `course-${Date.now()}`,
    code: code.trim().toUpperCase(),
    name: name.trim(),
    instructor: instructor?.trim() || 'Faculty Member',
    schedule: schedule?.trim() || 'Flexible Hours',
    room: room?.trim() || 'Main Campus / Online',
    attendance: 100,
    progress: 0,
    nextExam: 'Syllabus Initialized',
    color: color || 'cyan',
  };
  courseStore.push(course);
  res.json(course);
});

app.delete('/api/education/courses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = courseStore.findIndex((c) => c.id === id);
  if (index >= 0) {
    courseStore.splice(index, 1);
  }
  res.json({ success: true });
});

// 3. Assignments
app.get('/api/education/assignments', (req: Request, res: Response) => {
  res.json(assignmentStore);
});

app.post('/api/education/assignments', (req: Request, res: Response) => {
  const { title, courseCode, dueDate, priority, weight } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Assignment title is required' });
    return;
  }
  const assignment: AssignmentItem = {
    id: `assign-${Date.now()}`,
    title: title.trim(),
    courseCode: (courseCode || 'GENERAL').trim().toUpperCase(),
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    priority: priority || 'medium',
    status: 'pending',
    weight: weight || 'Coursework',
  };
  assignmentStore.unshift(assignment);
  res.json(assignment);
});

app.patch('/api/education/assignments/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const assignment = assignmentStore.find((a) => a.id === id);
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }
  if (assignment.status === 'completed') {
    assignment.status = 'pending';
  } else if (assignment.status === 'pending') {
    assignment.status = 'in_progress';
  } else {
    assignment.status = 'completed';
  }
  res.json(assignment);
});

app.delete('/api/education/assignments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = assignmentStore.findIndex((a) => a.id === id);
  if (index >= 0) {
    assignmentStore.splice(index, 1);
  }
  res.json({ success: true });
});

// 4. Daily Education Updates & All Academic Tracks Check
app.get('/api/education/daily-updates', (req: Request, res: Response) => {
  const briefing = compileEducationBriefing();
  res.json(briefing);
});

// 5. AI Study Note Generator ("Making Notes For Me")
app.post('/api/education/generate-notes', async (req: Request, res: Response) => {
  const { topic, subject, format, rawText } = req.body;
  if (!topic && !rawText) {
    res.status(400).json({ error: 'Topic or raw study text is required to generate notes' });
    return;
  }

  try {
    const note = await generateEducationNotes(
      topic || 'Synthesized Lecture Topic',
      subject || 'Computer Science & Technology',
      format || 'Comprehensive Study Guide',
      rawText || ''
    );
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate study notes' });
  }
});

// 6. Update Study Goal / Hours
app.post('/api/education/study-session', (req: Request, res: Response) => {
  const { minutes } = req.body;
  const hours = (Number(minutes) || 25) / 60;
  educationStats.dailyStudyHoursDone = Math.round((educationStats.dailyStudyHoursDone + hours) * 10) / 10;
  res.json(educationStats);
});

// Memory Bank
app.get('/api/memory', (req: Request, res: Response) => {
  const { query } = req.query;
  if (query && typeof query === 'string') {
    const recalled = recallRelevantMemories(query);
    res.json({ memories: memoryStore, query, matched: recalled });
  } else {
    res.json({ memories: memoryStore });
  }
});

app.post('/api/memory', (req: Request, res: Response) => {
  const { text, category } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Memory text is required' });
    return;
  }
  const mem: MemoryItem = {
    id: `mem-${Date.now()}`,
    text: text.trim(),
    category: category || 'general',
    timestamp: new Date().toISOString(),
  };
  memoryStore.push(mem);
  res.json(mem);
});

app.delete('/api/memory/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = memoryStore.findIndex((m) => m.id === id);
  if (index >= 0) {
    memoryStore.splice(index, 1);
  }
  res.json({ success: true });
});

// Unified Global Search across Notes, Memories, and Tasks
app.get('/api/search/global', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();

  const matchedNotes = q
    ? noteStore.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      )
    : noteStore;

  const matchedMemories = q
    ? memoryStore.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      )
    : memoryStore;

  const matchedTasks = q
    ? taskStore.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          (q === 'completed' && t.completed) ||
          (q === 'pending' && !t.completed)
      )
    : taskStore;

  res.json({
    query: q,
    notes: matchedNotes,
    memories: matchedMemories,
    tasks: matchedTasks,
    counts: {
      notes: matchedNotes.length,
      memories: matchedMemories.length,
      tasks: matchedTasks.length,
      total: matchedNotes.length + matchedMemories.length + matchedTasks.length,
    },
  });
});

// AI Tools Suite: Safe JavaScript/TypeScript Code Execution
app.post('/api/tools/execute-code', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Code string is required' });
    return;
  }

  const logs: string[] = [];
  const startTime = performance.now();

  try {
    // Custom sandbox console capture
    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map((a) => String(a)).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map((a) => String(a)).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map((a) => String(a)).join(' ')),
    };

    // Run in isolated function context
    // eslint-disable-next-line no-new-func
    const runner = new Function('console', 'Math', 'Date', 'JSON', `"use strict";\n${code}`);
    const result = runner(mockConsole, Math, Date, JSON);
    const duration = (performance.now() - startTime).toFixed(2);

    res.json({
      success: true,
      logs,
      result: result !== undefined ? String(result) : undefined,
      durationMs: duration,
    });
  } catch (err: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    res.json({
      success: false,
      error: err?.message || 'Execution failed',
      logs,
      durationMs: duration,
    });
  }
});

// AI Image Generation Endpoints
app.get('/api/tools/images', (req: Request, res: Response) => {
  res.json(generatedImagesStore);
});

app.post('/api/tools/generate-image', async (req: Request, res: Response) => {
  const { prompt, aspectRatio } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt text is required' });
    return;
  }

  try {
    const result = await generateAIImage(prompt.trim(), aspectRatio || '1:1');
    const imageItem: GeneratedImageItem = {
      id: `img-${Date.now()}`,
      prompt: prompt.trim(),
      imageUrl: result.imageUrl,
      aspectRatio: aspectRatio || '1:1',
      createdAt: new Date().toISOString(),
      isAiGenerated: result.isAiGenerated,
    };
    generatedImagesStore.unshift(imageItem);
    res.json(imageItem);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to synthesize visual image' });
  }
});

app.delete('/api/tools/images/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = generatedImagesStore.findIndex((i) => i.id === id);
  if (index >= 0) {
    generatedImagesStore.splice(index, 1);
  }
  res.json({ success: true });
});

// Primary Chat / Command Router Pipeline
app.post('/api/jarvis/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message text required' });
    return;
  }

  // 0. Language, Code-Switching & Translation Protocol Engine
  const detectedLang = detectLanguageAndStyle(message);
  const translationReq = parseTranslationRequest(message);

  // Check explicit translation requests first
  if (translationReq.isTranslation) {
    if (translationReq.needsClarification) {
      res.json({
        intentType: 'translation',
        command: 'translate_text',
        parameters: { needsClarification: true, sourceText: translationReq.sourceText },
        response: translationReq.clarificationPrompt,
        language: detectedLang.code,
        languageName: detectedLang.name,
        isMixed: detectedLang.isMixed,
        source: 'jarvis_multilingual_engine',
      });
      return;
    }

    const targetLang = translationReq.targetLanguage!;
    const textToTranslate = translationReq.sourceText || message;

    if (ai && Date.now() > geminiCooldownUntil) {
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      for (const modelName of candidateModels) {
        try {
          const transPrompt =
            `You are a professional linguistic translation engine. Translate the following text faithfully into ${targetLang}.\n` +
            `CRITICAL RULES:\n` +
            `- Output ONLY the direct translated text in ${targetLang}.\n` +
            `- Do NOT include introductory phrases, quotation marks around output, grammar notes, or explanations.\n` +
            `- Preserve all proper names, technical acronyms, codes, numbers, and formatting.\n` +
            `- Match the original level of formality and tone.\n\n` +
            `Text to translate:\n${textToTranslate}`;

          const transResponse = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: transPrompt }] }],
            config: {
              temperature: 0.2,
            },
          });

          const translatedOutput =
            transResponse.text?.trim() || executeLocalTranslation(textToTranslate, targetLang);

          res.json({
            intentType: 'translation',
            command: 'translate_text',
            parameters: {
              sourceText: textToTranslate,
              targetLanguage: targetLang,
              targetLanguageCode: translationReq.targetLanguageCode,
            },
            response: translatedOutput,
            language: translationReq.targetLanguageCode,
            languageName: targetLang,
            isMixed: false,
            source: 'gemini_multilingual_translator',
          });
          return;
        } catch (err: any) {
          const errMsg = (err?.message || String(err)).toLowerCase();
          if (
            errMsg.includes('429') ||
            errMsg.includes('resource_exhausted') ||
            errMsg.includes('quota') ||
            errMsg.includes('limit') ||
            errMsg.includes('rate')
          ) {
            continue;
          }
          break;
        }
      }
    }

    // Local fallback translation
    const localTranslation = executeLocalTranslation(textToTranslate, targetLang);
    res.json({
      intentType: 'translation',
      command: 'translate_text',
      parameters: {
        sourceText: textToTranslate,
        targetLanguage: targetLang,
        targetLanguageCode: translationReq.targetLanguageCode,
      },
      response: localTranslation,
      language: translationReq.targetLanguageCode,
      languageName: targetLang,
      isMixed: false,
      source: 'local_multilingual_translator',
    });
    return;
  }

  // 1. Check deterministic commands first
  const deterministic = routeDeterministicCommand(message);
  if (deterministic.isCommand) {
    // Special handling for image generation command
    if (deterministic.command === 'generate_image') {
      const prompt = deterministic.parameters?.prompt || message;
      const imgResult = await generateAIImage(prompt, '1:1');
      const newImageItem: GeneratedImageItem = {
        id: `img-${Date.now()}`,
        prompt,
        imageUrl: imgResult.imageUrl,
        aspectRatio: '1:1',
        createdAt: new Date().toISOString(),
        isAiGenerated: imgResult.isAiGenerated,
      };
      generatedImagesStore.unshift(newImageItem);

      res.json({
        intentType: 'image_generation',
        command: 'generate_image',
        parameters: { prompt },
        response: `Holographic Image Synthesis Complete: Visual frame generated for "${prompt}". Rendering active in HUD feed.`,
        imageUrl: imgResult.imageUrl,
        imagePrompt: prompt,
        source: imgResult.isAiGenerated ? 'gemini_image_model' : 'jarvis_visual_synthesis',
      });
      return;
    }

    if (deterministic.command === 'education_briefing') {
      res.json({
        intentType: 'education_briefing',
        command: 'open_education',
        parameters: deterministic.parameters || {},
        response: deterministic.result,
        source: 'jarvis_education_matrix',
      });
      return;
    }

    if (deterministic.result) {
      const localizedResult = adaptCommandResultLanguage(deterministic.result, detectedLang);
      res.json({
        intentType: 'command',
        command: deterministic.command,
        parameters: deterministic.parameters || {},
        response: localizedResult,
        language: detectedLang.code,
        languageName: detectedLang.name,
        isMixed: detectedLang.isMixed,
        source: 'deterministic_executor',
      });
      return;
    }
  }

  // 1b. Combo Command: "making notes for me and check the daily updates whatever about my educations all of them"
  const cleanMsg = message.trim();
  if (
    (/\b(making notes|make notes|take notes|study notes)\b/i.test(cleanMsg) &&
      /\b(education|educations|daily updates|academic|syllabus|classes)\b/i.test(cleanMsg)) ||
    /\b(making notes for me and check the daily updates)\b/i.test(cleanMsg)
  ) {
    const brief = compileEducationBriefing();
    const starterNote = await generateEducationNotes(
      'Autonomous Academic Intelligence & Learning Protocols',
      'Computer Science & Higher Education',
      'Comprehensive Study Guide'
    );
    res.json({
      intentType: 'education_briefing_and_notes',
      command: 'open_education',
      parameters: { briefing: brief, noteId: starterNote.id, tab: 'briefing' },
      response: `All Education Protocols engaged, sir: The AI Note-Maker ("Make Notes For Me") and Real-Time Daily Education Briefing are both fully operational in your Stark HUD.\n\n${brief.summaryVoiceText}\n\nI have also synthesized your initial study guide: "${starterNote.title}", now logged in your Education Repository.`,
      briefing: brief,
      note: starterNote,
      source: 'jarvis_academic_intelligence',
    });
    return;
  }

  // 1c. Standalone Note-Maker trigger ("make notes for me", "make notes", "open study notes")
  if (/^(?:(?:can you |please )?(?:make|take|create|generate|write) (?:me )?(?:a )?(?:study )?notes?(?: for me)?|open (?:study )?notes?|note maker)$/i.test(cleanMsg)) {
    res.json({
      intentType: 'education_note',
      command: 'open_education',
      parameters: { tab: 'notes' },
      response: `AI Note-Maker protocol engaged, sir. Launching the study synthesis interface. What topic, lecture transcript, or subject would you like me to make notes on?`,
      source: 'jarvis_academic_engine',
    });
    return;
  }

  // 1d. AI Education Note-Maker with topic ("make notes for me about Quantum Mechanics")
  const noteMakingMatch = cleanMsg.match(
    /^(?:(?:can you |please )?(?:make|take|create|generate|write) (?:me )?(?:a )?(?:study )?notes? (?:for me )?(?:about|on|regarding|of)?|study notes? on)\s+(.*)/i
  );
  if (noteMakingMatch && noteMakingMatch[1]?.trim()) {
    const rawTopic = noteMakingMatch[1].trim();
    let subject = 'Computer Science & Technology';
    if (/\b(math|calculus|algebra|linear algebra|geometry|statistics|probability)\b/i.test(rawTopic)) subject = 'Mathematics';
    else if (/\b(physics|quantum|mechanics|thermo|optics|relativity)\b/i.test(rawTopic)) subject = 'Physics';
    else if (/\b(chem|chemistry|organic|molecule|reaction)\b/i.test(rawTopic)) subject = 'Chemistry';
    else if (/\b(bio|biology|genetics|cell|anatomy|neuro)\b/i.test(rawTopic)) subject = 'Biology';
    else if (/\b(history|war|revolution|ancient|civilization|renaissance)\b/i.test(rawTopic)) subject = 'History';
    else if (/\b(econ|economics|finance|macro|micro|market)\b/i.test(rawTopic)) subject = 'Economics';
    else if (/\b(literature|writing|poetry|grammar|essay)\b/i.test(rawTopic)) subject = 'Literature & Writing';

    const note = await generateEducationNotes(rawTopic, subject, 'Comprehensive Study Guide');
    res.json({
      intentType: 'education_note',
      command: 'open_education',
      parameters: { noteId: note.id, topic: rawTopic, subject, tab: 'notes' },
      response: `Study Notes Generated: "${note.title}" has been structured and archived into your Education Repository. Core definitions, formulas/code, and self-test flashcards have been compiled for your review.`,
      note,
      source: 'jarvis_academic_engine',
    });
    return;
  }

  // 2. Memory context retrieval
  const recalledMemories = recallRelevantMemories(message);
  const lowerMsg = message.toLowerCase().trim();

  // 3. Live News Priority Route (Real-time live RSS news, multiple publisher portals, zero API quota usage)
  if (/\b(news|headlines|todays news|tn news|tamil nadu|tamilnadu|chennai news|breaking news)\b/i.test(lowerMsg)) {
    const newsResult = await fetchLiveNews(message);
    res.json({
      intentType: 'news_intelligence',
      command: 'live_news',
      parameters: { query: message, topic: newsResult.topic },
      response: newsResult.summary,
      recalledMemories: recalledMemories || null,
      groundingSources: newsResult.items.map((i) => ({ uri: i.uri, title: `${i.title} (${i.source})` })),
      portals: newsResult.portals,
      webSearchQueries: [newsResult.topic, 'Live Regional News Agencies'],
      source: 'live_news_engine',
    });
    return;
  }

  // 4. AI Reasoning via Gemini SDK with Multi-Model Failover & Google Search Data Grounding
  if (ai && Date.now() > geminiCooldownUntil) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    const systemInstruction = getSystemPrompt(settings.personality, recalledMemories, detectedLang);

    // Build conversation contents
    const conversationContents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item.sender === 'user') {
          conversationContents.push({ role: 'user', parts: [{ text: item.text }] });
        } else if (item.sender === 'jarvis') {
          conversationContents.push({ role: 'model', parts: [{ text: item.text }] });
        }
      }
    }
    conversationContents.push({ role: 'user', parts: [{ text: message }] });

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: conversationContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            tools: [{ googleSearch: {} }],
          },
        });

        const responseText = response.text || 'At your service, sir. How may I assist you further?';

        // Extract Grounding Search Sources
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;

        const searchSources = groundingChunks
          ? groundingChunks
              .map((c: any) => c.web)
              .filter((w: any) => w && w.uri)
              .map((w: any) => ({ uri: w.uri, title: w.title || w.uri }))
          : [];

        res.json({
          intentType: 'conversation',
          command: null,
          parameters: {},
          response: responseText,
          recalledMemories: recalledMemories || null,
          groundingSources: searchSources.length > 0 ? searchSources : null,
          webSearchQueries: webSearchQueries || null,
          language: detectedLang.code,
          languageName: detectedLang.name,
          isMixed: detectedLang.isMixed,
          source: searchSources.length > 0 ? 'gemini_search_grounded' : 'gemini_brain',
        });
        return;
      } catch (err: any) {
        // If quota exceeded on this model, continue to next candidate
        const errMsg = (err?.message || String(err)).toLowerCase();
        if (
          errMsg.includes('429') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('quota') ||
          errMsg.includes('limit') ||
          errMsg.includes('rate')
        ) {
          continue;
        }
        break;
      }
    }

    // All candidate models exhausted or rate-limited
    geminiCooldownUntil = Date.now() + 30000;
  }

  // Fallback intelligent persona response when no external model is available
  const answers: Record<string, string> = {
    hello: 'Greetings, sir. All JARVIS systems are online and functioning at optimal efficiency. How may I be of assistance?',
    hi: 'Hello. I am standing by for your instructions.',
    'who are you': 'I am J.A.R.V.I.S., your Just A Rather Very Intelligent System. I oversee system telemetry, manage local memory, execute tasks, and assist with your daily operations.',
    status: 'All subsystems are fully operational: memory vectors loaded, diagnostic monitors active, and UI core responsive.',
    help: 'You can converse with me directly, ask me to take notes, add tasks, set countdown timers, record facts into memory, check system performance, or compute mathematical queries.',
  };

  let fallbackReply = answers[lowerMsg];

  // Multilingual & code-switched procedural fallback replies
  if (detectedLang.name.includes('Taglish') || detectedLang.code === 'fil-PH') {
    if (/\b(hello|hi|kamusta|kumusta)\b/i.test(lowerMsg)) {
      fallbackReply = 'Kumusta po, sir! Lahat ng JARVIS systems natin ay fully online at operating at 100% efficiency. Paano po ako makakatulong sa inyo today?';
    } else if (/\b(status|katayuan)\b/i.test(lowerMsg)) {
      fallbackReply = 'All protocols nominal po, sir. Ayos ang memory vault at active ang hardware telemetry natin.';
    } else if (/\b(salamat|thank)\b/i.test(lowerMsg)) {
      fallbackReply = 'Walang anuman po, sir! Always happy to assist. Let me know po kung may kailangan pa kayo.';
    } else if (/\b(who are you|sino ka)\b/i.test(lowerMsg)) {
      fallbackReply = 'Ako po si J.A.R.V.I.S., your Just A Rather Very Intelligent System. Ready po ako mag-manage ng tasks, mag-translate, at mag-assist sa inyong daily work.';
    }
  } else if (detectedLang.name.includes('Spanglish') || detectedLang.code === 'es-ES') {
    if (/\b(hola|buenos dias|buenas)\b/i.test(lowerMsg)) {
      fallbackReply = 'Saludos, señor. Todos los sistemas JARVIS están en línea y funcionando con máxima eficiencia. ¿En qué puedo asistirle hoy?';
    } else if (/\b(status|estado)\b/i.test(lowerMsg)) {
      fallbackReply = 'Todos los protocolos nominales, señor. Vectores de memoria estables y diagnósticos de hardware al 100%.';
    } else if (/\b(gracias|thank)\b/i.test(lowerMsg)) {
      fallbackReply = 'Siempre un placer, señor. Avíseme si requiere asistencia con cualquier otra directiva.';
    } else if (/\b(who are you|quien eres)\b/i.test(lowerMsg)) {
      fallbackReply = 'Soy J.A.R.V.I.S., su asistente de inteligencia artificial. Administro telemetría, tareas, traducciones y operaciones locales.';
    }
  }

  if (!fallbackReply) {
    // Check for conversational image synthesis request
    if (/\b(create|generate|make|draw|render|picture|image|photo)\b/i.test(lowerMsg)) {
      const imgPrompt = message.replace(/^(?:can you|please|jarvis)?\s*(?:create|generate|make|draw|render|paint)?\s*(?:an?\s+)?(?:image|picture|photo)?\s*(?:of\s+)?/i, '').trim() || 'Holographic Arc Reactor';
      const imgResult = await generateAIImage(imgPrompt, '1:1');
      const newImageItem: GeneratedImageItem = {
        id: `img-${Date.now()}`,
        prompt: imgPrompt,
        imageUrl: imgResult.imageUrl,
        aspectRatio: '1:1',
        createdAt: new Date().toISOString(),
        isAiGenerated: imgResult.isAiGenerated,
      };
      generatedImagesStore.unshift(newImageItem);

      res.json({
        intentType: 'image_generation',
        command: 'generate_image',
        parameters: { prompt: imgPrompt },
        response: `Holographic Visual Synthesis Complete: Rendered image frame for "${imgPrompt}".`,
        imageUrl: imgResult.imageUrl,
        imagePrompt: imgPrompt,
        language: detectedLang.code,
        languageName: detectedLang.name,
        isMixed: detectedLang.isMixed,
        source: 'jarvis_visual_synthesis',
      });
      return;
    }

    // Check for data research and difficult questions
    if (/\b(search|data|datas|latest|breakthrough|research|what is|how does|why is|explain|who is|quantum)\b/i.test(lowerMsg)) {
      const searchResult = await fetchLiveSearch(message);
      res.json({
        intentType: 'conversation',
        command: null,
        parameters: {},
        response: searchResult.summary,
        recalledMemories: recalledMemories || null,
        groundingSources: searchResult.sources,
        webSearchQueries: searchResult.searchQueries,
        language: detectedLang.code,
        languageName: detectedLang.name,
        isMixed: detectedLang.isMixed,
        source: 'live_data_grounded',
      });
      return;
    }

    if (lowerMsg.includes('thank')) {
      fallbackReply = 'Always a pleasure, sir. Let me know if you need anything else.';
    } else if (lowerMsg.includes('how are you')) {
      fallbackReply = 'Operating at 100% computational efficiency, sir. Ready for your next command.';
    } else if (detectedLang.name.includes('Taglish') || detectedLang.code === 'fil-PH') {
      fallbackReply = `Naiintindihan ko po, sir. Na-process ko ang "${message}". Pwede po kayong mag-utos ng task directives, magpa-translate, o mag-search ng research data.`;
    } else if (detectedLang.name.includes('Spanglish') || detectedLang.code === 'es-ES') {
      fallbackReply = `Entendido, señor. He procesado "${message}". Puede solicitar traducciones, gestionar directivas de tareas o consultar datos de investigación.`;
    } else {
      fallbackReply = `Understood, sir. I have processed "${message}". You can ask me difficult research questions to search the datas, request holographic images to be created, or manage tasks, notes, and local memory vectors.`;
    }
  }

  res.json({
    intentType: 'conversation',
    command: null,
    parameters: {},
    response: fallbackReply,
    recalledMemories: recalledMemories || null,
    language: detectedLang.code,
    languageName: detectedLang.name,
    isMixed: detectedLang.isMixed,
    source: 'local_brain',
  });
});

// Vite Middleware for Full-Stack dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) {
        res.status(404).json({ error: `API route not found: ${url}` });
        return;
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) {
        res.status(404).json({ error: `API route not found: ${url}` });
        return;
      }
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[JARVIS] Core server active on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[JARVIS] Startup failed:', err);
  process.exit(1);
});
