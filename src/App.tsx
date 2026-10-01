import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Languages,
  Radio,
  Settings as SettingsIcon,
  CheckSquare,
  FileText,
  Clock,
  Database,
  Activity,
  Camera,
  Music,
  Code,
  Zap,
  Command as CommandIcon,
  Shield,
  Layers,
  Sparkles,
  Image as ImageIcon,
  GraduationCap,
  BookOpen,
  Wind,
} from 'lucide-react';
import { OrbVisualizer, AssistantState } from './components/OrbVisualizer';
import { StatusPanel } from './components/StatusPanel';
import { ChatPanel, ChatMessage } from './components/ChatPanel';
import { TasksModal } from './components/TasksModal';
import { NotesModal } from './components/NotesModal';
import { TimersModal } from './components/TimersModal';
import { MemoryModal } from './components/MemoryModal';
import { SettingsModal } from './components/SettingsModal';
import { SystemModal } from './components/SystemModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { SpotifyPlayerModal } from './components/SpotifyPlayerModal';
import { CodeStudioModal } from './components/CodeStudioModal';
import { WorkflowsModal } from './components/WorkflowsModal';
import { CommandOmnibar } from './components/CommandOmnibar';
import { ImageStudioModal } from './components/ImageStudioModal';
import { EducationModal } from './components/EducationModal';
import { recordActionInteraction } from './utils/interactionHistory';
import { useIdleTimer } from './hooks/useIdleTimer';
import { detectLanguageAndStyle } from './utils/languageEngine';
import {
  AmbientBreathingOverlay,
  ORB_BREATH_PARAMS,
} from './components/AmbientBreathingOverlay';

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'jarvis',
      text: 'Good day, sir. J.A.R.V.I.S. is fully online with the All-in-One AI Suite. Spotify media controller, code execution studio, automated workflows, and local vector memory are all standing by. How may I assist you today?',
      timestamp: new Date().toISOString(),
      source: 'core_bootstrap',
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Subsystem counts for HUD badges
  const [memoryCount, setMemoryCount] = useState(2);
  const [activeTimersCount, setActiveTimersCount] = useState(0);

  // Modals state
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTimersOpen, setIsTimersOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(false);
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [educationInitialTab, setEducationInitialTab] = useState<'briefing' | 'notes' | 'courses' | 'assignments' | 'study'>('briefing');

  // Deep-link targeted selections from Omnibar global search
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);
  const [memorySearchInitial, setMemorySearchInitial] = useState<string | undefined>(undefined);
  const [highlightTaskId, setHighlightTaskId] = useState<string | undefined>(undefined);

  // 30-second Idle detection for synchronized ambient shell breathing
  const { isIdle, idleSeconds, resetIdle, simulateIdle } = useIdleTimer(30000);

  // Hotkey listener for Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmnibarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh counts
  const refreshSubsystems = async () => {
    try {
      const [memRes, timerRes] = await Promise.all([
        fetch('/api/memory').catch(() => null),
        fetch('/api/productivity/timers').catch(() => null),
      ]);
      if (memRes && memRes.ok) {
        const memData = await memRes.json().catch(() => null);
        if (memData && Array.isArray(memData.memories)) {
          setMemoryCount(memData.memories.length);
        }
      }
      if (timerRes && timerRes.ok) {
        const timerData = await timerRes.json().catch(() => null);
        if (Array.isArray(timerData)) {
          const active = timerData.filter((t: any) => t.active && t.remainingSeconds > 0).length;
          setActiveTimersCount(active);
        }
      }
    } catch {
      // Graceful fallback during server warmup
    }
  };

  useEffect(() => {
    refreshSubsystems();
    const interval = setInterval(refreshSubsystems, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API Voice Recognition in App Component (Tamil, English, Tanglish)
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'tanglish' | 'ta-IN' | 'en-US' | 'auto'>('tanglish');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const audioIntervalRef = useRef<any>(null);

  // Active language in conversation
  const activeLanguage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].language) {
        return messages[i].language;
      }
    }
    return 'ta-IN';
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const getLanguageCodeForMode = (mode: 'tanglish' | 'ta-IN' | 'en-US' | 'auto') => {
    if (mode === 'en-US') return 'en-US';
    if (mode === 'ta-IN') return 'ta-IN';
    if (mode === 'tanglish') return 'ta-IN'; // ta-IN captures Tamil and English phonetics
    return activeLanguage || 'ta-IN';
  };

  const stopListening = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
    setAssistantState((prev) => (prev === 'LISTENING' ? 'IDLE' : prev));
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getLanguageCodeForMode(speechLanguage);

      recognition.onstart = () => {
        setIsListening(true);
        setAssistantState('LISTENING');
        setInterimTranscript('');
        let phase = 0;
        audioIntervalRef.current = setInterval(() => {
          phase += 0.25;
          setAudioLevel(0.4 + Math.sin(phase) * 0.35);
        }, 100);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
          setAudioLevel(0.85);
        }

        if (final.trim()) {
          setInterimTranscript(final.trim());
          stopListening();
          handleSendMessage(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      stopListening();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Send message to backend
  const handleSendMessage = async (text: string) => {
    const userLang = detectLanguageAndStyle(text);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      language: userLang.code,
      languageName: userLang.name,
      isMixed: userLang.isMixed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    setAssistantState('THINKING');

    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();

      const jarvisMsg: ChatMessage = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: data.response || 'Action logged, sir.',
        intentType: data.intentType,
        command: data.command,
        recalledMemories: data.recalledMemories,
        timestamp: new Date().toISOString(),
        source: data.source,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt,
        groundingSources: data.groundingSources,
        portals: data.portals,
        webSearchQueries: data.webSearchQueries,
        language: data.language,
        languageName: data.languageName,
        isMixed: data.isMixed,
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      // Command Execution Triggers
      if (data.command === 'open_education' || data.command === 'education_briefing') {
        if (data.intentType === 'education_note' || data.parameters?.tab === 'notes') {
          setEducationInitialTab('notes');
        } else {
          setEducationInitialTab('briefing');
        }
        setIsEducationOpen(true);
      } else if (data.command === 'play_spotify') {
        const query = data.parameters?.query || '';
        setSpotifyQuery(query);
        setIsSpotifyOpen(true);
      } else if (data.command === 'trigger_workflow') {
        const wf = data.parameters?.workflow;
        if (wf === 'focus_mode') {
          // Trigger 25min timer
          await fetch('/api/productivity/timers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: 'Focus Session (Pomodoro)', seconds: 1500 }),
          });
          refreshSubsystems();
          setIsSpotifyOpen(true); // Open ambient sound
        } else if (wf === 'daily_briefing') {
          // Briefing already spoken/in response
        } else if (wf === 'education_briefing') {
          setEducationInitialTab('briefing');
          setIsEducationOpen(true);
        }
      } else if (data.command === 'take_screenshot') {
        setIsScreenshotOpen(true);
      } else if (data.command === 'open_application') {
        const target = data.parameters?.destination;
        if (target === 'education' || target === 'academics' || target === 'courses' || target === 'study' || target === 'school') {
          setEducationInitialTab('briefing');
          setIsEducationOpen(true);
        } else if (target === 'education_notes') {
          setEducationInitialTab('notes');
          setIsEducationOpen(true);
        } else if (target === 'notes') {
          setIsNotesOpen(true);
        } else if (target === 'tasks') {
          setIsTasksOpen(true);
        } else if (target === 'system') {
          setIsSystemOpen(true);
        } else if (target && target.startsWith('http')) {
          window.open(target, '_blank');
        }
      }

      // Check if memory updated
      if (data.command === 'store_memory' || data.command === 'forget_memory') {
        refreshSubsystems();
      }
      if (data.command === 'set_timer') {
        refreshSubsystems();
      }

      // Transition to speaking then idle
      setAssistantState('SPEAKING');
      setAudioLevel(0.8);
      setTimeout(() => {
        setAssistantState('IDLE');
        setAudioLevel(0);
      }, 2500);
    } catch (err: any) {
      console.error('JARVIS Error:', err);
      setAssistantState('ERROR');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'jarvis',
          text: 'My apologies, sir. An unexpected error occurred while processing that request.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setTimeout(() => setAssistantState('IDLE'), 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const cycleOrbState = () => {
    const states: AssistantState[] = ['IDLE', 'LISTENING', 'THINKING', 'SPEAKING'];
    const currentIndex = states.indexOf(assistantState);
    const nextState = states[(currentIndex + 1) % states.length];
    setAssistantState(nextState);
  };

  const handleOmnibarAction = (actionId: string, payload?: string) => {
    recordActionInteraction(actionId);
    switch (actionId) {
      case 'education':
        setEducationInitialTab('briefing');
        setIsEducationOpen(true);
        break;
      case 'education_notes':
        setEducationInitialTab('notes');
        setIsEducationOpen(true);
        break;
      case 'spotify':
        setIsSpotifyOpen(true);
        break;
      case 'code':
        setIsCodeOpen(true);
        break;
      case 'workflows':
        setIsWorkflowsOpen(true);
        break;
      case 'tasks':
        setHighlightTaskId(payload);
        setIsTasksOpen(true);
        break;
      case 'notes':
        setSelectedNoteId(payload);
        setIsNotesOpen(true);
        break;
      case 'timers':
        setIsTimersOpen(true);
        break;
      case 'memory':
        setMemorySearchInitial(payload);
        setIsMemoryOpen(true);
        break;
      case 'system':
        setIsSystemOpen(true);
        break;
      case 'screenshot':
        setIsScreenshotOpen(true);
        break;
      case 'image_studio':
        setIsImageStudioOpen(true);
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`relative min-h-screen bg-[#060a12] text-[#d6f0ff] flex flex-col scanline-effect selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-1000 ${
        isIdle ? 'ambient-idle-active' : ''
      }`}
      style={{
        '--orb-breath-duration': ORB_BREATH_PARAMS[assistantState]?.duration || '5.24s',
        '--orb-glow-color': ORB_BREATH_PARAMS[assistantState]?.glowColor || 'rgba(0, 212, 255, 0.35)',
        '--orb-border-color': ORB_BREATH_PARAMS[assistantState]?.borderColor || 'rgba(0, 212, 255, 0.75)',
        '--orb-primary-color': ORB_BREATH_PARAMS[assistantState]?.colorHex || '#00d4ff',
      } as React.CSSProperties}
    >
      {/* Ambient Breathing Shell Overlay (Synchronized with OrbVisualizer when idle > 30s) */}
      <AmbientBreathingOverlay
        isIdle={isIdle}
        idleSeconds={idleSeconds}
        assistantState={assistantState}
        onResetIdle={resetIdle}
        onSimulateIdle={simulateIdle}
      />

      {/* HUD Background Grid Pattern with Breathing Modulation */}
      <div
        className={`pointer-events-none fixed inset-0 transition-opacity duration-1000 ${
          isIdle ? 'ambient-breathing-grid' : 'opacity-15'
        }`}
        style={{
          backgroundImage: `linear-gradient(to right, #00d4ff10 1px, transparent 1px), linear-gradient(to bottom, #00d4ff10 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Futuristic Radial Glow behind Orb with Breathing Core Pulse */}
      <div
        className={`pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ${
          isIdle ? 'ambient-breathing-core bg-cyan-500/15' : 'bg-cyan-500/5'
        }`}
      />

      {/* Main Top HUD Header */}
      <header className="relative z-10 border-b border-cyan-500/20 bg-[#070e18]/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,212,255,0.25)] shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>
            <div>
              <h1 className="font-hud text-lg sm:text-xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400">
                J · A · R · V · I · S
              </h1>
              <div className="text-[10px] font-mono-hud text-cyan-400/70 tracking-widest uppercase hidden sm:block">
                All-in-One Autonomous AI Workstation // Mark VII
              </div>
            </div>
          </div>

          {/* Quick HUD Navigation Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            {/* Quick Speech Input Button (Tamil, English, Tanglish) */}
            <button
              onClick={toggleListening}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono-hud flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,212,255,0.15)] ${
                isListening
                  ? 'bg-rose-500/25 border-rose-500 text-rose-200 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-200'
              }`}
              title={`Web Speech API: ${speechLanguage.toUpperCase()} - Click to speak in Tamil, English, or Tanglish`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden xl:inline text-[11px] font-bold">
                {isListening
                  ? 'LISTENING...'
                  : speechLanguage === 'tanglish'
                  ? 'TANGLISH'
                  : speechLanguage === 'ta-IN'
                  ? 'தமிழ்'
                  : speechLanguage === 'en-US'
                  ? 'ENGLISH'
                  : 'AUTO'}
              </span>
            </button>

            {/* Quick Command Omnibar Launcher */}
            <button
              onClick={() => setIsOmnibarOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono-hud flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,212,255,0.15)]"
              title="Command Palette (Ctrl + K)"
            >
              <CommandIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">COMMANDS</span>
              <kbd className="hidden lg:inline text-[9px] bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30 text-cyan-300">
                ⌘K
              </kbd>
            </button>

            {/* Education Intelligence & Daily Briefing */}
            <button
              onClick={() => {
                setEducationInitialTab('briefing');
                setIsEducationOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,212,255,0.15)]"
              title="Daily Education Updates & AI Note-Maker"
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">EDUCATION</span>
            </button>

            {/* Image Studio */}
            <button
              onClick={() => setIsImageStudioOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/40 text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,212,255,0.15)]"
              title="Holographic AI Image Synthesis Studio"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">IMAGES</span>
            </button>

            {/* Spotify & Music Station */}
            <button
              onClick={() => setIsSpotifyOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Spotify & Ambient Sound Matrix"
            >
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SPOTIFY</span>
            </button>

            {/* Code Studio */}
            <button
              onClick={() => setIsCodeOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/40 text-purple-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Code & Algorithm Studio"
            >
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">CODE</span>
            </button>

            {/* Directives & Workflows */}
            <button
              onClick={() => setIsWorkflowsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 text-amber-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="AI Workflows (Focus Mode, Briefing)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">WORKFLOWS</span>
            </button>

            <button
              onClick={() => setIsTasksOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Task Directives"
            >
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">TASKS</span>
            </button>

            <button
              onClick={() => setIsNotesOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Tactical Notes"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">NOTES</span>
            </button>

            <button
              onClick={() => setIsTimersOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Timers & Reminders"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">TIMERS</span>
              {activeTimersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setIsMemoryOpen(true)}
              className="p-1.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/40 text-purple-200 text-xs transition-all"
              title="Memory Bank Vault"
            >
              <Database className="w-4 h-4 text-purple-400" />
            </button>

            <button
              onClick={() => setIsScreenshotOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs transition-all"
              title="Screen Capture"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              onClick={() => setIsSystemOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs transition-all"
              title="System Diagnostics"
            >
              <Activity className="w-4 h-4 text-teal-400" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-cyan-500/15 border border-slate-700/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs transition-all"
              title="Configure Settings"
            >
              <SettingsIcon className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Ambient Idle Breathing Status & Simulator */}
            <button
              onClick={() => {
                if (isIdle) resetIdle();
                else simulateIdle();
              }}
              className={`p-1.5 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
                isIdle
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'bg-slate-900/60 hover:bg-cyan-500/15 border-slate-700/60 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-200'
              }`}
              title={
                isIdle
                  ? `Ambient Breathing active (${idleSeconds}s idle). Click to resume active work mode.`
                  : 'Ambient Breathing activates automatically after 30s idle. Click to simulate immediately.'
              }
            >
              <Wind className={`w-4 h-4 ${isIdle ? 'text-cyan-300 animate-spin' : 'text-slate-400'}`} />
              {isIdle && (
                <span className="hidden xl:inline text-[10px] font-mono-hud text-cyan-300">
                  {idleSeconds}s
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Center Body */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-5">
        {/* Status Telemetry Strip */}
        <StatusPanel
          onOpenSystemModal={() => setIsSystemOpen(true)}
          memoryCount={memoryCount}
          activeTimersCount={activeTimersCount}
        />

        {/* Central HUD Grid: Left Visualizer Orb & Subsystem stats, Right Chat Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
          {/* Left Column: Visualizer Orb Stage & Subsystems (lg:col-span-5) */}
          <div
            className={`lg:col-span-5 flex flex-col justify-between items-center bg-[#09121f]/75 border rounded-2xl p-6 backdrop-blur-md transition-all duration-1000 ${
              isIdle
                ? 'ambient-breathing-rim shadow-[0_0_35px_var(--orb-glow-color)]'
                : 'border-cyan-500/25 shadow-[0_0_30px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="w-full flex items-center justify-between text-xs font-mono-hud text-slate-400 border-b border-cyan-500/15 pb-2">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                NEURAL ORB VISUALIZER
              </span>
              <span className="text-[11px] text-cyan-400 tracking-wider">
                FREQ: 30 FPS
              </span>
            </div>

            {/* Glowing Orb Canvas & Multilingual Voice Deck */}
            <div className="py-3 flex flex-col items-center justify-center flex-1 w-full">
              <OrbVisualizer
                state={assistantState}
                audioLevel={audioLevel}
                onClick={toggleListening}
                size={230}
              />

              {/* Multilingual Voice Control Deck (Tamil, English, Tanglish) */}
              <div className="w-full max-w-sm mt-3 p-3 bg-[#06101c]/90 border border-cyan-500/35 rounded-xl shadow-lg flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono-hud text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
                    <span className="font-bold tracking-wider">
                      {isListening ? 'VOICE LISTENING...' : 'VOICE ENGINE'}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400/80">
                    {speechLanguage === 'tanglish'
                      ? 'TANGLISH (தமிழ்+EN)'
                      : speechLanguage === 'ta-IN'
                      ? 'TAMIL (தமிழ்)'
                      : speechLanguage === 'en-US'
                      ? 'ENGLISH (US)'
                      : 'AUTO'}
                  </span>
                </div>

                {/* Live Interim Transcript or Prompt */}
                <div className="min-h-[30px] px-2.5 py-1 rounded-lg bg-[#030812] border border-cyan-500/20 text-xs font-mono-hud flex items-center">
                  {interimTranscript ? (
                    <span className="text-cyan-200 animate-pulse font-medium">"{interimTranscript}"</span>
                  ) : isListening ? (
                    <span className="text-cyan-400/70 italic text-[11px]">Listening... speak in {speechLanguage === 'tanglish' ? 'Tanglish or Tamil' : speechLanguage === 'ta-IN' ? 'Tamil' : 'English'}...</span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Click microphone or Orb to speak in Tamil, English, or Tanglish</span>
                  )}
                </div>

                {/* Primary Voice Toggle Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-hud tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                    isListening
                      ? 'bg-rose-500/25 border-rose-500 text-rose-200 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/50 text-cyan-200 hover:shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-rose-300" /> : <Mic className="w-4 h-4 text-cyan-400" />}
                  <span>{isListening ? 'STOP RECORDING // PROCESS' : 'SPEAK DIRECTLY TO J.A.R.V.I.S.'}</span>
                </button>

                {/* Language Mode Selectors */}
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono-hud pt-1 border-t border-cyan-500/15">
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('tanglish');
                      if (isListening) startListening();
                    }}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      speechLanguage === 'tanglish'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-cyan-300'
                    }`}
                    title="Tanglish: Mix of Tamil and English words"
                  >
                    TANGLISH
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('ta-IN');
                      if (isListening) startListening();
                    }}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      speechLanguage === 'ta-IN'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-cyan-300'
                    }`}
                    title="Tamil: Pure Tamil speech input (தமிழ்)"
                  >
                    தமிழ்
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('en-US');
                      if (isListening) startListening();
                    }}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      speechLanguage === 'en-US'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-cyan-300'
                    }`}
                    title="English: Standard English speech input"
                  >
                    ENGLISH
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('auto');
                      if (isListening) startListening();
                    }}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      speechLanguage === 'auto'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900/40 border border-slate-700/50 text-slate-400 hover:text-cyan-300'
                    }`}
                    title="Auto: Automatically follows latest conversation language"
                  >
                    AUTO
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Matrix Dock */}
            <div className="w-full grid grid-cols-5 gap-1 pt-3 border-t border-cyan-500/15 text-xs font-hud">
              <button
                onClick={() => {
                  recordActionInteraction('image_studio');
                  setIsImageStudioOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-center tracking-wider transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(0,212,255,0.15)]"
              >
                <ImageIcon className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] hidden sm:inline">IMAGES</span>
              </button>
              <button
                onClick={() => {
                  recordActionInteraction('spotify');
                  setSpotifyQuery('Hans Zimmer Time');
                  setIsSpotifyOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Music className="w-3 h-3" />
                <span className="text-[10px] hidden sm:inline">SPOTIFY</span>
              </button>
              <button
                onClick={() => {
                  recordActionInteraction('code');
                  setIsCodeOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Code className="w-3 h-3" />
                <span className="text-[10px] hidden sm:inline">CODE</span>
              </button>
              <button
                onClick={() => {
                  recordActionInteraction('education');
                  setEducationInitialTab('briefing');
                  setIsEducationOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 text-center tracking-wider transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(0,212,255,0.15)]"
                title="Academic Hub & Daily Updates"
              >
                <GraduationCap className="w-3 h-3 text-cyan-300" />
                <span className="text-[10px] hidden sm:inline">STUDY</span>
              </button>
              <button
                onClick={() => {
                  recordActionInteraction('workflows');
                  setIsWorkflowsOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3" />
                <span className="text-[10px] hidden sm:inline">FOCUS</span>
              </button>
            </div>
          </div>

          {/* Right Column: Communications Chat & Terminal (lg:col-span-7) */}
          <div
            className={`lg:col-span-7 flex flex-col h-[580px] lg:h-auto rounded-2xl transition-all duration-1000 ${
              isIdle ? 'ambient-breathing-rim shadow-[0_0_30px_var(--orb-glow-color)]' : ''
            }`}
          >
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              onStateChange={setAssistantState}
              onAudioLevelChange={setAudioLevel}
              isProcessing={isProcessing}
              onClearHistory={() =>
                setMessages([
                  {
                    id: `reset-${Date.now()}`,
                    sender: 'jarvis',
                    text: 'Console history purged. Systems reset and listening.',
                    timestamp: new Date().toISOString(),
                  },
                ])
              }
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/15 bg-[#060c14]/80 px-6 py-2.5 text-center text-xs text-slate-500 font-mono-hud flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>J.A.R.V.I.S. ALL-IN-ONE PROTOCOL // OPERATIONAL</span>
        </div>
        <div className="hidden sm:block">
          PRESS <kbd className="text-cyan-400 px-1 py-0.2 bg-slate-900 rounded border border-cyan-500/30">CTRL+K</kbd> FOR COMMAND MATRIX
        </div>
      </footer>

      {/* Modals & Subsystems */}
      <SpotifyPlayerModal
        isOpen={isSpotifyOpen}
        onClose={() => setIsSpotifyOpen(false)}
        initialQuery={spotifyQuery}
        onAudioLevelChange={setAudioLevel}
      />
      <CodeStudioModal isOpen={isCodeOpen} onClose={() => setIsCodeOpen(false)} />
      <WorkflowsModal
        isOpen={isWorkflowsOpen}
        onClose={() => setIsWorkflowsOpen(false)}
        onTriggerFocusMode={() => handleSendMessage('Activate focus mode')}
        onTriggerBriefing={() => handleSendMessage('Daily briefing')}
        onTriggerDiagnostics={() => handleSendMessage('Check system status')}
        onTriggerEducation={() => handleSendMessage('Check daily updates about my educations')}
      />
      <CommandOmnibar
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        onSelectAction={handleOmnibarAction}
      />
      <TasksModal
        isOpen={isTasksOpen}
        onClose={() => {
          setIsTasksOpen(false);
          setHighlightTaskId(undefined);
        }}
        onTaskChange={refreshSubsystems}
        highlightTaskId={highlightTaskId}
      />
      <NotesModal
        isOpen={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          setSelectedNoteId(undefined);
        }}
        initialNoteId={selectedNoteId}
      />
      <TimersModal
        isOpen={isTimersOpen}
        onClose={() => setIsTimersOpen(false)}
        onTimerChange={refreshSubsystems}
      />
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => {
          setIsMemoryOpen(false);
          setMemorySearchInitial(undefined);
        }}
        onMemoryUpdate={refreshSubsystems}
        initialQuery={memorySearchInitial}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <SystemModal isOpen={isSystemOpen} onClose={() => setIsSystemOpen(false)} />
      <ScreenshotModal
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
      />
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
      />
      <EducationModal
        isOpen={isEducationOpen}
        onClose={() => setIsEducationOpen(false)}
        onOpenNotes={() => setIsNotesOpen(true)}
        initialTab={educationInitialTab}
      />
    </div>
  );
}
