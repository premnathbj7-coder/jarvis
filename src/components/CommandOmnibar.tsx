import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Command,
  Music,
  Code,
  Zap,
  CheckSquare,
  FileText,
  Clock,
  Database,
  Activity,
  Camera,
  Settings,
  X,
  ArrowRight,
  Image as ImageIcon,
  GraduationCap,
  BookOpen,
  Flame,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Circle,
  BrainCircuit,
  Tag,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { fuzzyMatch, FuzzyMatchResult } from '../utils/fuzzySearch';
import {
  getInteractionHistory,
  recordActionInteraction,
  clearInteractionHistory,
  calculateInteractionScore,
  formatLastUsed,
  InteractionHistoryMap,
} from '../utils/interactionHistory';

interface CommandOmnibarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string, payload?: string) => void;
}

export type OmnibarItemType = 'command' | 'note' | 'memory' | 'task';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
}

interface MemoryItem {
  id: string;
  text: string;
  category: string;
  timestamp: string;
}

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface UnifiedOmnibarItem {
  id: string;
  type: OmnibarItemType;
  title: string;
  subtitle?: string;
  description?: string;
  snippet?: string;
  snippetIndices?: number[];
  category: string;
  tags?: string[];
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  timestamp?: string;
  isCompleted?: boolean;
  actionId?: string;
  payload?: string;
  matchResult: FuzzyMatchResult;
  compositeScore: number;
}

interface OmnibarAction {
  id: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  shortcutBadge?: string;
}

/**
 * Text component that highlights characters at matched fuzzy indices
 */
const HighlightedText: React.FC<{ text: string; indices: number[]; highlightColor?: string }> = ({
  text,
  indices,
  highlightColor = 'text-cyan-300 bg-cyan-500/25 decoration-cyan-400',
}) => {
  if (!indices || indices.length === 0) {
    return <span>{text}</span>;
  }
  const indexSet = new Set(indices);
  return (
    <span>
      {Array.from(text).map((char, i) =>
        indexSet.has(i) ? (
          <span
            key={i}
            className={`font-bold px-0.5 rounded shadow-[0_0_8px_rgba(0,212,255,0.4)] underline decoration-1 ${highlightColor}`}
          >
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </span>
  );
};

/**
 * Extracts a readable contextual window around query matches in longer text
 */
function extractContextualSnippet(
  content: string,
  query: string,
  maxLength = 110
): { snippet: string; matchedIndices: number[] } {
  if (!content) return { snippet: '', matchedIndices: [] };
  const trimmedQ = query.trim().toLowerCase();
  if (!trimmedQ) {
    const snippet = content.length > maxLength ? content.slice(0, maxLength).trim() + '...' : content;
    return { snippet, matchedIndices: [] };
  }

  const lower = content.toLowerCase();
  const directIdx = lower.indexOf(trimmedQ);

  let start = 0;
  if (directIdx !== -1) {
    start = Math.max(0, directIdx - 25);
  } else {
    const fMatch = fuzzyMatch(trimmedQ, content);
    if (fMatch.isMatch && fMatch.matchedIndices.length > 0) {
      start = Math.max(0, fMatch.matchedIndices[0] - 25);
    }
  }

  // Adjust start towards nearest space
  if (start > 0) {
    const spaceIdx = content.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx - start < 12) {
      start = spaceIdx + 1;
    }
  }

  const end = Math.min(content.length, start + maxLength);
  let snippet = content.slice(start, end).replace(/\n+/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  const snippetMatch = fuzzyMatch(trimmedQ, snippet);

  return {
    snippet,
    matchedIndices: snippetMatch.matchedIndices,
  };
}

export const CommandOmnibar: React.FC<CommandOmnibarProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<InteractionHistoryMap>({});

  // Local data stores for global multi-entity search
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load interaction history and fetch notes, memories, and tasks whenever Omnibar opens
  const fetchGlobalEntities = async () => {
    setIsLoadingData(true);
    try {
      const [notesRes, memRes, tasksRes] = await Promise.all([
        fetch('/api/productivity/notes').catch(() => null),
        fetch('/api/memory').catch(() => null),
        fetch('/api/productivity/tasks').catch(() => null),
      ]);

      if (notesRes && notesRes.ok) {
        const notesData = await notesRes.json().catch(() => null);
        if (Array.isArray(notesData)) setNotes(notesData);
      }

      if (memRes && memRes.ok) {
        const memData = await memRes.json().catch(() => null);
        if (memData && Array.isArray(memData.memories)) setMemories(memData.memories);
      }

      if (tasksRes && tasksRes.ok) {
        const tasksData = await tasksRes.json().catch(() => null);
        if (Array.isArray(tasksData)) setTasks(tasksData);
      }
    } catch (err) {
      console.error('Failed to pre-fetch global entities for omnibar:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHistory(getInteractionHistory());
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('ALL');
      fetchGlobalEntities();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Base system actions & commands
  const baseActions: OmnibarAction[] = useMemo(
    () => [
      {
        id: 'education',
        title: 'Academic Intelligence Hub & Education Briefing',
        category: 'Education',
        description: 'Comprehensive study schedule, class calendar, assignments, and academic news',
        keywords: ['study', 'courses', 'classes', 'homework', 'syllabus', 'exam', 'university', 'lecture'],
        icon: <GraduationCap className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'STUDY',
      },
      {
        id: 'education_notes',
        title: 'Make Notes For Me (AI Study Note Synthesizer)',
        category: 'Education',
        description: 'Generate structured academic cheat-sheets, key equations, and study summaries',
        keywords: ['make notes for me', 'study notes', 'summarize', 'flashcards', 'formula', 'notes'],
        icon: <BookOpen className="w-4 h-4 text-purple-400" />,
        shortcutBadge: 'NOTES-AI',
      },
      {
        id: 'image_studio',
        title: 'Synthesize AI Images & Holographic Concepts',
        category: 'Creative AI',
        description: 'Multi-aspect ratio neural visual generation and HUD render gallery',
        keywords: ['image', 'visual', 'hologram', 'render', 'picture', 'photo', 'drawing', 'concept', 'art'],
        icon: <ImageIcon className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'HOLO',
      },
      {
        id: 'spotify',
        title: 'Open Spotify & Ambient Synth Matrix',
        category: 'Media',
        description: 'Synthesizer soundscapes, lofi study frequencies, and audio visualizer',
        keywords: ['music', 'spotify', 'sound', 'lofi', 'synth', 'zimmer', 'ambient', 'audio', 'track', 'song'],
        icon: <Music className="w-4 h-4 text-emerald-400" />,
        shortcutBadge: 'AUDIO',
      },
      {
        id: 'code',
        title: 'Launch Code Studio & Algorithm Runner',
        category: 'Dev Tools',
        description: 'Python & TypeScript sandbox with integrated stdout diagnostic stream',
        keywords: ['code', 'python', 'typescript', 'algorithm', 'compile', 'sandbox', 'script', 'eval'],
        icon: <Code className="w-4 h-4 text-purple-400" />,
        shortcutBadge: 'CODE',
      },
      {
        id: 'workflows',
        title: 'Automated AI Directives (Focus Mode, Briefing)',
        category: 'Automation',
        description: 'Deep work distraction blocker, daily morning briefing, and protocol workflows',
        keywords: ['focus', 'briefing', 'workflow', 'automate', 'routine', 'deep work', 'directive'],
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        shortcutBadge: 'FOCUS',
      },
      {
        id: 'tasks',
        title: 'View & Manage Task Directives',
        category: 'Productivity',
        description: 'Tactical checklist, pending mission goals, and priority status toggles',
        keywords: ['task', 'todo', 'checklist', 'goals', 'items', 'directive', 'pending'],
        icon: <CheckSquare className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'TASKS',
      },
      {
        id: 'notes',
        title: 'Open Tactical Notes & Documentation Logs',
        category: 'Productivity',
        description: 'Encrypted tactical notepad with AI auto-draft and markdown logs',
        keywords: ['notes', 'docs', 'journal', 'scratchpad', 'memo', 'log', 'documentation'],
        icon: <FileText className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'DOCS',
      },
      {
        id: 'timers',
        title: 'Temporal Countdown Timers & Reminders',
        category: 'Productivity',
        description: 'Interval chronometers, pomodoro study timers, and scheduled audio alerts',
        keywords: ['timer', 'countdown', 'stopwatch', 'pomodoro', 'clock', 'alarm', 'reminder'],
        icon: <Clock className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'TIMER',
      },
      {
        id: 'memory',
        title: 'Inspect Local Vector Memory Vault',
        category: 'Intelligence',
        description: 'Local semantic vector store for persistent user preferences and facts',
        keywords: ['memory', 'vector', 'database', 'facts', 'vault', 'recall', 'profile'],
        icon: <Database className="w-4 h-4 text-purple-400" />,
        shortcutBadge: 'VAULT',
      },
      {
        id: 'system',
        title: 'Hardware Diagnostics & Telemetry',
        category: 'System',
        description: 'Host telemetry, CPU load, memory utilization, battery status, and network health',
        keywords: ['system', 'cpu', 'memory', 'ram', 'specs', 'status', 'telemetry', 'battery', 'hardware'],
        icon: <Activity className="w-4 h-4 text-teal-400" />,
        shortcutBadge: 'DIAG',
      },
      {
        id: 'screenshot',
        title: 'Initiate Visual Screen Capture',
        category: 'Utility',
        description: 'Instant display buffer snapshot with optical inspection preview',
        keywords: ['screenshot', 'capture', 'screen', 'snap', 'camera', 'grab', 'display'],
        icon: <Camera className="w-4 h-4 text-cyan-400" />,
        shortcutBadge: 'SNAP',
      },
      {
        id: 'settings',
        title: 'Configure Persona Demeanor & Visualizer',
        category: 'System',
        description: 'Tweak JARVIS tone, audio responsiveness, HUD theme, and vocal options',
        keywords: ['settings', 'preferences', 'demeanor', 'personality', 'theme', 'config', 'options'],
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        shortcutBadge: 'CONFIG',
      },
    ],
    []
  );

  // In-place task completion toggle directly from Omnibar
  const handleToggleTaskInPlace = async (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/productivity/tasks/${taskId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    } catch (err) {
      console.error('Failed to toggle task in place:', err);
    }
  };

  // Real-time simultaneous global search across Commands, Notes, Memories, and Tasks
  const { allItems, counts } = useMemo(() => {
    const trimmed = query.trim();
    const commandItems: UnifiedOmnibarItem[] = [];
    const noteItems: UnifiedOmnibarItem[] = [];
    const memoryItems: UnifiedOmnibarItem[] = [];
    const taskItems: UnifiedOmnibarItem[] = [];

    // 1. Process System Commands / Actions
    for (const action of baseActions) {
      const interaction = history[action.id] || { count: 0, lastUsed: 0 };
      const interactionScore = calculateInteractionScore(interaction);

      if (!trimmed) {
        commandItems.push({
          id: `cmd-${action.id}`,
          type: 'command',
          title: action.title,
          description: action.description,
          category: action.category,
          icon: action.icon,
          badge: 'COMMAND',
          badgeColor: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
          actionId: action.id,
          matchResult: { isMatch: true, score: 0, matchedIndices: [] },
          compositeScore: 100 + interactionScore,
        });
      } else {
        const titleMatch = fuzzyMatch(trimmed, action.title);
        const catMatch = fuzzyMatch(trimmed, action.category);
        const descMatch = fuzzyMatch(trimmed, action.description);

        let bestKeywordMatch: FuzzyMatchResult = { isMatch: false, score: 0, matchedIndices: [] };
        for (const kw of action.keywords) {
          const kwMatch = fuzzyMatch(trimmed, kw);
          if (kwMatch.isMatch && kwMatch.score > bestKeywordMatch.score) {
            bestKeywordMatch = kwMatch;
          }
        }

        const isMatch =
          titleMatch.isMatch ||
          catMatch.isMatch ||
          descMatch.isMatch ||
          bestKeywordMatch.isMatch;

        if (isMatch) {
          const textScore = Math.max(
            titleMatch.score,
            catMatch.score * 0.75,
            descMatch.score * 0.5,
            bestKeywordMatch.score * 0.8
          );
          const composite = textScore + interactionScore * 0.45;

          commandItems.push({
            id: `cmd-${action.id}`,
            type: 'command',
            title: action.title,
            description: action.description,
            category: action.category,
            icon: action.icon,
            badge: 'COMMAND',
            badgeColor: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
            actionId: action.id,
            matchResult: titleMatch.isMatch ? titleMatch : { isMatch: true, score: textScore, matchedIndices: [] },
            compositeScore: composite,
          });
        }
      }
    }

    // 2. Process Local Notes (Search title, content snippet, and tags)
    for (const note of notes) {
      if (!trimmed) {
        const { snippet } = extractContextualSnippet(note.content, '', 85);
        noteItems.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title,
          description: snippet,
          snippet,
          category: 'Notes',
          tags: note.tags,
          icon: <FileText className="w-4 h-4 text-cyan-300" />,
          badge: 'NOTE',
          badgeColor: 'bg-cyan-950/70 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(0,212,255,0.2)]',
          timestamp: note.createdAt,
          actionId: 'notes',
          payload: note.id,
          matchResult: { isMatch: true, score: 0, matchedIndices: [] },
          compositeScore: 90,
        });
      } else {
        const titleMatch = fuzzyMatch(trimmed, note.title);
        const contentMatch = fuzzyMatch(trimmed, note.content);

        let bestTagMatch: FuzzyMatchResult = { isMatch: false, score: 0, matchedIndices: [] };
        if (note.tags && note.tags.length > 0) {
          for (const tag of note.tags) {
            const tm = fuzzyMatch(trimmed, tag);
            if (tm.isMatch && tm.score > bestTagMatch.score) {
              bestTagMatch = tm;
            }
          }
        }

        const isMatch = titleMatch.isMatch || contentMatch.isMatch || bestTagMatch.isMatch;

        if (isMatch) {
          const { snippet, matchedIndices: snippetIndices } = extractContextualSnippet(
            note.content,
            trimmed,
            95
          );

          const textScore = Math.max(
            titleMatch.score * 1.3,
            contentMatch.score * 0.9,
            bestTagMatch.score * 1.1
          );

          noteItems.push({
            id: `note-${note.id}`,
            type: 'note',
            title: note.title,
            description: snippet,
            snippet,
            snippetIndices,
            category: 'Notes',
            tags: note.tags,
            icon: <FileText className="w-4 h-4 text-cyan-300" />,
            badge: 'NOTE',
            badgeColor: 'bg-cyan-950/70 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(0,212,255,0.2)]',
            timestamp: note.createdAt,
            actionId: 'notes',
            payload: note.id,
            matchResult: titleMatch.isMatch ? titleMatch : { isMatch: true, score: textScore, matchedIndices: [] },
            compositeScore: textScore + 15,
          });
        }
      }
    }

    // 3. Process Saved Memories (Search memory text & category)
    for (const memory of memories) {
      if (!trimmed) {
        memoryItems.push({
          id: `mem-${memory.id}`,
          type: 'memory',
          title: memory.text,
          description: `Category: #${memory.category}`,
          category: 'Memory',
          tags: [memory.category],
          icon: <BrainCircuit className="w-4 h-4 text-purple-400" />,
          badge: 'MEMORY',
          badgeColor: 'bg-purple-950/70 text-purple-300 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
          timestamp: memory.timestamp,
          actionId: 'memory',
          payload: memory.text,
          matchResult: { isMatch: true, score: 0, matchedIndices: [] },
          compositeScore: 85,
        });
      } else {
        const textMatch = fuzzyMatch(trimmed, memory.text);
        const catMatch = fuzzyMatch(trimmed, memory.category);
        const isMatch = textMatch.isMatch || catMatch.isMatch;

        if (isMatch) {
          const textScore = Math.max(textMatch.score * 1.25, catMatch.score);
          memoryItems.push({
            id: `mem-${memory.id}`,
            type: 'memory',
            title: memory.text,
            description: `Vault Tag: #${memory.category}`,
            category: 'Memory',
            tags: [memory.category],
            icon: <BrainCircuit className="w-4 h-4 text-purple-400" />,
            badge: 'MEMORY',
            badgeColor: 'bg-purple-950/70 text-purple-300 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
            timestamp: memory.timestamp,
            actionId: 'memory',
            payload: memory.text,
            matchResult: textMatch.isMatch ? textMatch : { isMatch: true, score: textScore, matchedIndices: [] },
            compositeScore: textScore + 10,
          });
        }
      }
    }

    // 4. Process Tasks (Search task text & completed status)
    for (const task of tasks) {
      if (!trimmed) {
        taskItems.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.text,
          description: task.completed ? 'Status: Completed' : 'Status: Directive Pending',
          category: 'Tasks',
          icon: task.completed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Circle className="w-4 h-4 text-amber-400" />
          ),
          badge: task.completed ? 'TASK: DONE' : 'TASK: PENDING',
          badgeColor: task.completed
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
          timestamp: task.createdAt,
          isCompleted: task.completed,
          actionId: 'tasks',
          payload: task.id,
          matchResult: { isMatch: true, score: 0, matchedIndices: [] },
          compositeScore: task.completed ? 70 : 95,
        });
      } else {
        const textMatch = fuzzyMatch(trimmed, task.text);
        const statusKeywordMatch =
          ((trimmed.includes('done') || trimmed.includes('completed')) && task.completed) ||
          ((trimmed.includes('pending') || trimmed.includes('todo')) && !task.completed);

        const isMatch = textMatch.isMatch || statusKeywordMatch;

        if (isMatch) {
          const textScore = textMatch.isMatch ? textMatch.score * 1.25 : 300;
          taskItems.push({
            id: `task-${task.id}`,
            type: 'task',
            title: task.text,
            description: task.completed ? 'Status: Completed' : 'Status: Directive Pending',
            category: 'Tasks',
            icon: task.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-amber-400" />
            ),
            badge: task.completed ? 'TASK: DONE' : 'TASK: PENDING',
            badgeColor: task.completed
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
            timestamp: task.createdAt,
            isCompleted: task.completed,
            actionId: 'tasks',
            payload: task.id,
            matchResult: textMatch.isMatch ? textMatch : { isMatch: true, score: textScore, matchedIndices: [] },
            compositeScore: textScore + (task.completed ? 0 : 20),
          });
        }
      }
    }

    const countsMap = {
      notes: noteItems.length,
      memories: memoryItems.length,
      tasks: taskItems.length,
      commands: commandItems.length,
      total: noteItems.length + memoryItems.length + taskItems.length + commandItems.length,
    };

    // Combine and sort by composite score
    const combined = [...noteItems, ...taskItems, ...memoryItems, ...commandItems].sort(
      (a, b) => b.compositeScore - a.compositeScore
    );

    return { allItems: combined, counts: countsMap };
  }, [baseActions, notes, memories, tasks, query, history]);

  // Available Category Filter Tabs
  const categories = useMemo(() => {
    return ['ALL', 'NOTES', 'MEMORIES', 'TASKS', 'COMMANDS', 'FREQUENT'];
  }, []);

  // Filter items by active category tab
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return allItems;
    }
    if (selectedCategory === 'NOTES') {
      return allItems.filter((item) => item.type === 'note');
    }
    if (selectedCategory === 'MEMORIES') {
      return allItems.filter((item) => item.type === 'memory');
    }
    if (selectedCategory === 'TASKS') {
      return allItems.filter((item) => item.type === 'task');
    }
    if (selectedCategory === 'COMMANDS') {
      return allItems.filter((item) => item.type === 'command');
    }
    if (selectedCategory === 'FREQUENT') {
      return allItems.filter(
        (item) => item.type === 'command' && item.actionId && (history[item.actionId]?.count || 0) > 0
      );
    }
    return allItems;
  }, [allItems, selectedCategory, history]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Execute selected item
  const executeItem = (item: UnifiedOmnibarItem) => {
    if (item.type === 'command' && item.actionId) {
      const updated = recordActionInteraction(item.actionId);
      setHistory(updated);
      onSelectAction(item.actionId);
      onClose();
    } else if (item.type === 'note') {
      onSelectAction('notes', item.payload);
      onClose();
    } else if (item.type === 'memory') {
      onSelectAction('memory', item.payload);
      onClose();
    } else if (item.type === 'task') {
      onSelectAction('tasks', item.payload);
      onClose();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
      return;
    }

    if (e.key === 'Enter' && filteredItems.length > 0) {
      e.preventDefault();
      const target = filteredItems[selectedIndex] || filteredItems[0];
      if (target) {
        executeItem(target);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIdx = categories.indexOf(selectedCategory);
      const nextCategory = categories[(currentIdx + 1) % categories.length];
      setSelectedCategory(nextCategory);
      setSelectedIndex(0);
    }
  };

  // Handle clearing history
  const handleResetHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearInteractionHistory();
    setHistory({});
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-18 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#08111e] border border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(0,212,255,0.28)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-cyan-500/25 bg-[#050b14]">
          <Search className="w-5 h-5 text-cyan-400 mr-3 shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, saved memories, tasks, and system directives..."
            className="flex-1 bg-transparent text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />

          {/* Quick Clear Button */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="mr-2 text-slate-400 hover:text-cyan-300 text-xs font-mono-hud px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-cyan-500/20 transition-colors"
            >
              CLEAR
            </button>
          )}

          {/* Close Omnibar Button */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            title="Close Omnibar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Multi-Entity Category Filter Tabs & Summary Counts */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#07101c] border-b border-cyan-500/15 overflow-x-auto text-[11px] font-mono-hud gap-2 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              let countBadge = null;

              if (cat === 'ALL') {
                countBadge = counts.total;
              } else if (cat === 'NOTES') {
                countBadge = counts.notes;
              } else if (cat === 'MEMORIES') {
                countBadge = counts.memories;
              } else if (cat === 'TASKS') {
                countBadge = counts.tasks;
              } else if (cat === 'COMMANDS') {
                countBadge = counts.commands;
              }

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                      : 'border-slate-800/80 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 bg-[#0a1524]/60'
                  }`}
                >
                  {cat === 'FREQUENT' && <Flame className="w-3 h-3 text-amber-400" />}
                  {cat === 'NOTES' && <FileText className="w-3 h-3 text-cyan-400" />}
                  {cat === 'MEMORIES' && <Database className="w-3 h-3 text-purple-400" />}
                  {cat === 'TASKS' && <CheckSquare className="w-3 h-3 text-amber-400" />}
                  {cat === 'COMMANDS' && <Command className="w-3 h-3 text-cyan-400" />}
                  <span>{cat}</span>
                  {countBadge !== null && (
                    <span
                      className={`text-[9px] px-1 rounded ${
                        isActive
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Reset Action Frequency Stats */}
          {Object.keys(history).length > 0 && (
            <button
              onClick={handleResetHistory}
              title="Reset interaction history"
              className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-500/10 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">RESET STATS</span>
            </button>
          )}
        </div>

        {/* Global Multi-Entity Status Ribbon when query is empty */}
        {!query && (
          <div className="px-4 py-1.5 bg-[#060e18] border-b border-cyan-500/10 flex items-center justify-between text-[10px] font-mono-hud text-slate-400">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                GLOBAL INDEX:
              </span>
              <span>{notes.length} Notes</span>
              <span>•</span>
              <span>{memories.length} Memories</span>
              <span>•</span>
              <span>{tasks.length} Tasks</span>
            </div>
            <span className="text-cyan-400/70 hidden sm:inline">
              REAL-TIME SIMULTANEOUS SEARCH ACTIVE
            </span>
          </div>
        )}

        {/* Real-time Simultaneous Results List */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-cyan-500/20"
        >
          {isLoadingData ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-mono-hud text-cyan-300">
                SYNCHRONIZING NOTES, MEMORY VAULT, AND DIRECTIVES...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <Search className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-mono-hud text-slate-300">
                No matching notes, memories, tasks, or commands for "{query}"
              </p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                Try searching for topics like "stark", "algorithm", "quantum", "focus", or "schedule".
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const hasCommandHistory =
                item.type === 'command' && item.actionId && (history[item.actionId]?.count || 0) > 0;
              const isFrequentlyUsed =
                item.type === 'command' && item.actionId && (history[item.actionId]?.count || 0) >= 3;

              return (
                <div
                  key={item.id}
                  data-active={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => executeItem(item)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all group ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/80 shadow-[0_0_15px_rgba(0,212,255,0.18)] scale-[1.002]'
                      : 'border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2 flex-1">
                    {/* Icon container */}
                    <div
                      className={`p-2 rounded-xl bg-[#0a1524] border transition-colors shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-cyan-400/70 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                          : 'border-slate-800 group-hover:border-cyan-500/40'
                      }`}
                    >
                      {item.icon}
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1">
                      {/* Header line: Title & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`text-xs font-semibold truncate transition-colors ${
                            isSelected ? 'text-cyan-200' : 'text-slate-200 group-hover:text-cyan-300'
                          }`}
                        >
                          <HighlightedText
                            text={item.title}
                            indices={item.matchResult.matchedIndices}
                          />
                        </div>

                        {/* Entity Type Badge */}
                        <span
                          className={`inline-flex items-center text-[9px] font-mono-hud px-1.5 py-0.2 rounded border uppercase tracking-wider ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>

                        {/* Frequent / Usage Counter Badge for Commands */}
                        {hasCommandHistory && item.actionId && (
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-mono-hud px-1.5 py-0.2 rounded border ${
                              isFrequentlyUsed
                                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                            }`}
                            title={`Used ${history[item.actionId].count} times.`}
                          >
                            {isFrequentlyUsed ? (
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                            )}
                            <span>{history[item.actionId].count}x used</span>
                          </span>
                        )}

                        {/* Tags for Notes / Memories */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.tags.slice(0, 3).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[9px] font-mono-hud text-cyan-400/80 bg-cyan-950/50 px-1 py-0.2 rounded border border-cyan-500/25"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Snippet / Description preview with contextual search highlighting */}
                      {item.type === 'note' && item.snippet ? (
                        <div className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed bg-[#060c14]/60 p-1.5 rounded-lg border border-cyan-500/10">
                          <HighlightedText
                            text={item.snippet}
                            indices={item.snippetIndices || []}
                            highlightColor="text-cyan-200 bg-cyan-500/30 decoration-cyan-300 font-medium"
                          />
                        </div>
                      ) : (
                        item.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.description}
                          </div>
                        )
                      )}

                      {/* Footer telemetry metadata */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono-hud text-slate-500">
                        <span className="text-cyan-400/75 uppercase tracking-wider">
                          {item.category}
                        </span>

                        {item.timestamp && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-slate-600" />
                              {new Date(item.timestamp).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* For Tasks: Direct Checkbox toggle inside Omnibar */}
                    {item.type === 'task' && item.payload && (
                      <button
                        onClick={(e) => handleToggleTaskInPlace(item.payload!, e)}
                        className={`p-1 rounded-lg border text-xs transition-colors flex items-center gap-1 font-mono-hud ${
                          item.isCompleted
                            ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-amber-950/50 border-amber-500/50 text-amber-300 hover:bg-amber-500/20'
                        }`}
                        title={item.isCompleted ? 'Mark task as pending' : 'Mark task as completed'}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="text-[9px] hidden sm:inline">
                          {item.isCompleted ? 'DONE' : 'TOGGLE'}
                        </span>
                      </button>
                    )}

                    <span
                      className={`text-[10px] font-mono-hud px-1.5 py-0.5 rounded transition-opacity ${
                        isSelected
                          ? 'opacity-100 bg-cyan-400 text-slate-950 font-bold'
                          : 'opacity-0 text-slate-500'
                      }`}
                    >
                      {item.type === 'note'
                        ? 'OPEN NOTE ↵'
                        : item.type === 'memory'
                        ? 'VIEW VAULT ↵'
                        : item.type === 'task'
                        ? 'VIEW TASK ↵'
                        : 'EXECUTE ↵'}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-all ${
                        isSelected
                          ? 'text-cyan-400 translate-x-0 opacity-100'
                          : 'text-slate-600 -translate-x-1 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation & Status Bar */}
        <div className="px-4 py-2.5 bg-[#050b14] border-t border-slate-800/80 text-[10px] font-mono-hud text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↓</kbd>
              NAVIGATE
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↵</kbd>
              OPEN
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">TAB</kbd>
              CYCLE FILTER
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">ESC</kbd>
              CLOSE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400/90">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span>GLOBAL SEARCH: NOTES + MEMORY + TASKS + COMMANDS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
