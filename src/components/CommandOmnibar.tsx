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
const HighlightedText: React.FC<{ text: string; indices: number[] }> = ({ text, indices }) => {
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
            className="text-cyan-300 font-bold bg-cyan-500/25 px-0.5 rounded shadow-[0_0_8px_rgba(0,212,255,0.4)] underline decoration-cyan-400 decoration-1"
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

export const CommandOmnibar: React.FC<CommandOmnibarProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<InteractionHistoryMap>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load interaction history on open
  useEffect(() => {
    if (isOpen) {
      setHistory(getInteractionHistory());
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('ALL');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const actions: OmnibarAction[] = useMemo(
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

  // Available Category Filter Tabs
  const categories = useMemo(() => {
    return ['ALL', 'FREQUENT', 'EDUCATION', 'CREATIVE AI', 'PRODUCTIVITY', 'DEV TOOLS', 'SYSTEM'];
  }, []);

  // Real-time fuzzy filtering and interaction history prioritization
  const filteredActions = useMemo(() => {
    const trimmed = query.trim();

    return actions
      .map((action) => {
        const interaction = history[action.id] || { count: 0, lastUsed: 0 };
        const interactionScore = calculateInteractionScore(interaction);

        // When query is empty, match everything and sort purely by frequency/recency
        if (!trimmed) {
          const isCategoryMatch =
            selectedCategory === 'ALL' ||
            (selectedCategory === 'FREQUENT' && interaction.count > 0) ||
            action.category.toUpperCase() === selectedCategory;

          return {
            action,
            matchResult: { isMatch: isCategoryMatch, score: 0, matchedIndices: [] },
            compositeScore: interactionScore,
            interaction,
          };
        }

        // Fuzzy match across title, category, keywords, and description
        const titleMatch = fuzzyMatch(trimmed, action.title);
        const categoryMatch = fuzzyMatch(trimmed, action.category);
        const descMatch = fuzzyMatch(trimmed, action.description);

        // Keyword fuzzy match
        let bestKeywordMatch: FuzzyMatchResult = { isMatch: false, score: 0, matchedIndices: [] };
        for (const kw of action.keywords) {
          const kwMatch = fuzzyMatch(trimmed, kw);
          if (kwMatch.isMatch && kwMatch.score > bestKeywordMatch.score) {
            bestKeywordMatch = kwMatch;
          }
        }

        const isMatch =
          titleMatch.isMatch ||
          categoryMatch.isMatch ||
          descMatch.isMatch ||
          bestKeywordMatch.isMatch;

        // Apply category filter if active
        const passesCategory =
          selectedCategory === 'ALL' ||
          (selectedCategory === 'FREQUENT' && interaction.count > 0) ||
          action.category.toUpperCase() === selectedCategory;

        if (!isMatch || !passesCategory) {
          return {
            action,
            matchResult: { isMatch: false, score: 0, matchedIndices: [] },
            compositeScore: -1,
            interaction,
          };
        }

        // Determine best text match score
        const textScore = Math.max(
          titleMatch.score,
          categoryMatch.score * 0.75,
          descMatch.score * 0.5,
          bestKeywordMatch.score * 0.8
        );

        // Composite prioritization: Text match score is primary, interaction history gives priority boost
        const compositeScore = textScore + interactionScore * 0.45;

        return {
          action,
          matchResult: titleMatch.isMatch ? titleMatch : { isMatch: true, score: textScore, matchedIndices: [] },
          compositeScore,
          interaction,
        };
      })
      .filter((item) => item.matchResult.isMatch && item.compositeScore >= 0)
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }, [actions, query, history, selectedCategory]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [filteredActions.length, selectedIndex]);

  // Execute selected action and record interaction
  const executeAction = (actionId: string) => {
    const updated = recordActionInteraction(actionId);
    setHistory(updated);
    onSelectAction(actionId);
    onClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredActions.length - 1) : prev - 1
      );
      return;
    }

    if (e.key === 'Enter' && filteredActions.length > 0) {
      e.preventDefault();
      const targetAction = filteredActions[selectedIndex] || filteredActions[0];
      if (targetAction) {
        executeAction(targetAction.action.id);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle category filter
      const currentIdx = categories.indexOf(selectedCategory);
      const nextCategory = categories[(currentIdx + 1) % categories.length];
      setSelectedCategory(nextCategory);
      setSelectedIndex(0);
    }
  };

  // Handle clearing history
  const handleResetHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Reset Omnibar action interaction frequency history?')) {
      clearInteractionHistory();
      setHistory({});
    }
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#09121f] border border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(0,212,255,0.28)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-cyan-500/25 bg-[#060c14]">
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
            placeholder="Type a command, tool, or shortcut (e.g. Study, Notes, Spotify, Image, Focus)..."
            className="flex-1 bg-transparent text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="mr-2 text-slate-500 hover:text-cyan-300 text-xs font-mono-hud px-1.5 py-0.5 rounded bg-slate-800/60"
            >
              CLEAR
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 transition-colors"
            title="Close Omnibar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Pills & Interaction Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#07101c] border-b border-cyan-500/15 overflow-x-auto text-[11px] font-mono-hud gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-cyan-500/25 border-cyan-400/80 text-cyan-200 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                      : 'border-slate-800/80 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 bg-[#0a1524]/60'
                  }`}
                >
                  {cat === 'FREQUENT' && <Flame className="w-3 h-3 text-amber-400" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Reset History Action */}
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

        {/* Real-time Fuzzy Match Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-cyan-500/20"
        >
          {filteredActions.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <Command className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-mono-hud text-slate-400">
                No matching subsystem protocols for "{query}"
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                Try searching for "study", "code", "notes", "spotify", "hologram", or "timer"
              </p>
            </div>
          ) : (
            filteredActions.map((item, index) => {
              const isSelected = index === selectedIndex;
              const hasHistory = item.interaction.count > 0;
              const isFrequentlyUsed = item.interaction.count >= 3;

              return (
                <button
                  key={item.action.id}
                  data-active={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => executeAction(item.action.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all group ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/80 shadow-[0_0_15px_rgba(0,212,255,0.18)] scale-[1.002]'
                      : 'border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Icon container */}
                    <div
                      className={`p-2 rounded-xl bg-[#0a1524] border transition-colors shrink-0 ${
                        isSelected
                          ? 'border-cyan-400/70 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                          : 'border-slate-800 group-hover:border-cyan-500/40'
                      }`}
                    >
                      {item.action.icon}
                    </div>

                    {/* Title, description & fuzzy match highlight */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`text-xs font-semibold truncate transition-colors ${
                            isSelected ? 'text-cyan-200' : 'text-slate-200 group-hover:text-cyan-300'
                          }`}
                        >
                          <HighlightedText
                            text={item.action.title}
                            indices={item.matchResult.matchedIndices}
                          />
                        </div>

                        {/* Frequent / Usage Counter Badge */}
                        {hasHistory && (
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-mono-hud px-1.5 py-0.2 rounded border ${
                              isFrequentlyUsed
                                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                            }`}
                            title={`Used ${item.interaction.count} times. Last used ${formatLastUsed(
                              item.interaction.lastUsed
                            )}`}
                          >
                            {isFrequentlyUsed ? (
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                            )}
                            <span>{item.interaction.count}x used</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.action.description}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono-hud text-cyan-400/75 uppercase tracking-wider">
                          {item.action.category}
                        </span>
                        {item.action.shortcutBadge && (
                          <span className="text-[9px] font-mono-hud text-slate-500 px-1 rounded bg-slate-900 border border-slate-800">
                            {item.action.shortcutBadge}
                          </span>
                        )}
                        {item.interaction.lastUsed > 0 && (
                          <span className="text-[9px] font-mono-hud text-slate-500">
                            • {formatLastUsed(item.interaction.lastUsed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Execution Prompt / Arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono-hud px-1.5 py-0.5 rounded transition-opacity ${
                        isSelected
                          ? 'opacity-100 bg-cyan-400 text-slate-950 font-bold'
                          : 'opacity-0 text-slate-500'
                      }`}
                    >
                      PRESS ↵
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-all ${
                        isSelected
                          ? 'text-cyan-400 translate-x-0 opacity-100'
                          : 'text-slate-600 -translate-x-1 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2.5 bg-[#060c14] border-t border-slate-800/80 text-[10px] font-mono-hud text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↓</kbd>
              NAVIGATE
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">↵</kbd>
              EXECUTE
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">TAB</kbd>
              CYCLE CATEGORY
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 mr-1">ESC</kbd>
              CLOSE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400/80">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span>REAL-TIME FUZZY & FREQUENCY RANKING ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
