import React, { useState, useEffect } from 'react';
import {
  Mic,
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
        fetch('/api/memory'),
        fetch('/api/productivity/timers'),
      ]);
      if (memRes.ok) {
        const memData = await memRes.json();
        setMemoryCount(memData.memories?.length || 0);
      }
      if (timerRes.ok) {
        const timerData = await timerRes.json();
        const active = timerData.filter((t: any) => t.active && t.remainingSeconds > 0).length;
        setActiveTimersCount(active);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshSubsystems();
    const interval = setInterval(refreshSubsystems, 10000);
    return () => clearInterval(interval);
  }, []);

  // Send message to backend
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
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
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      // Command Execution Triggers
      if (data.command === 'play_spotify') {
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
        }
      } else if (data.command === 'take_screenshot') {
        setIsScreenshotOpen(true);
      } else if (data.command === 'open_application') {
        const target = data.parameters?.destination;
        if (target === 'notes') {
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

  const handleOmnibarAction = (actionId: string) => {
    switch (actionId) {
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
        setIsTasksOpen(true);
        break;
      case 'notes':
        setIsNotesOpen(true);
        break;
      case 'timers':
        setIsTimersOpen(true);
        break;
      case 'memory':
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
    <div className="relative min-h-screen bg-[#0e0204] text-[#fff0d4] flex flex-col scanline-effect selection:bg-red-500/30 selection:text-yellow-200">
      {/* HUD Background Grid Pattern in Red & Yellow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(234, 179, 8, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(239, 68, 68, 0.12) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Dual Volumetric Radial Glows behind Orb in Red & Arc Gold */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-red-600/15 blur-[140px]" />
      <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-yellow-400/12 blur-[90px]" />

      {/* Main Top HUD Header */}
      <header className="relative z-10 border-b border-red-500/30 bg-[#140306]/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-[0_4px_25px_rgba(239,68,68,0.1)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.45)] shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </div>
            <div>
              <h1 className="font-hud text-lg sm:text-xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300">
                J · A · R · V · I · S
              </h1>
              <div className="text-[10px] font-mono-hud text-yellow-400/85 tracking-widest uppercase hidden sm:block">
                Stark Armor Protocol // Hot Rod Red & Gold Edition
              </div>
            </div>
          </div>

          {/* Quick HUD Navigation Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            {/* Quick Command Omnibar Launcher */}
            <button
              onClick={() => setIsOmnibarOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-yellow-300 text-xs font-mono-hud flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              title="Command Palette (Ctrl + K)"
            >
              <CommandIcon className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden md:inline">COMMANDS</span>
              <kbd className="hidden lg:inline text-[9px] bg-red-950/80 px-1 py-0.2 rounded border border-red-500/40 text-yellow-300">
                ⌘K
              </kbd>
            </button>

            {/* Image Studio */}
            <button
              onClick={() => setIsImageStudioOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(250,204,21,0.15)]"
              title="Holographic AI Image Synthesis Studio"
            >
              <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">IMAGES</span>
            </button>

            {/* Spotify & Music Station */}
            <button
              onClick={() => setIsSpotifyOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-yellow-300 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Spotify & Ambient Sound Matrix"
            >
              <Music className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">SPOTIFY</span>
            </button>

            {/* Code Studio */}
            <button
              onClick={() => setIsCodeOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-yellow-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Code & Algorithm Studio"
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">CODE</span>
            </button>

            {/* Directives & Workflows */}
            <button
              onClick={() => setIsWorkflowsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-500/40 text-yellow-300 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="AI Workflows (Focus Mode, Briefing)"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">WORKFLOWS</span>
            </button>

            <button
              onClick={() => setIsTasksOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-100 hover:text-yellow-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Task Directives"
            >
              <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden lg:inline">TASKS</span>
            </button>

            <button
              onClick={() => setIsNotesOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-100 hover:text-yellow-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Tactical Notes"
            >
              <FileText className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden lg:inline">NOTES</span>
            </button>

            <button
              onClick={() => setIsTimersOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-100 hover:text-yellow-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all"
              title="Timers & Reminders"
            >
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden lg:inline">TIMERS</span>
              {activeTimersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setIsMemoryOpen(true)}
              className="p-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-200 hover:text-yellow-300 text-xs transition-all"
              title="Memory Bank Vault"
            >
              <Database className="w-4 h-4 text-yellow-400" />
            </button>

            <button
              onClick={() => setIsScreenshotOpen(true)}
              className="p-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-200 hover:text-yellow-300 text-xs transition-all"
              title="Screen Capture"
            >
              <Camera className="w-4 h-4 text-yellow-400" />
            </button>

            <button
              onClick={() => setIsSystemOpen(true)}
              className="p-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-200 hover:text-yellow-300 text-xs transition-all"
              title="System Diagnostics"
            >
              <Activity className="w-4 h-4 text-yellow-400" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-900/60 hover:border-yellow-500/50 text-amber-200 hover:text-yellow-300 text-xs transition-all"
              title="Configure Settings"
            >
              <SettingsIcon className="w-4 h-4 text-yellow-400" />
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
          <div className="lg:col-span-5 flex flex-col justify-between items-center bg-[#150307]/85 border border-red-500/35 rounded-2xl p-6 backdrop-blur-md shadow-[0_0_35px_rgba(239,68,68,0.15)]">
            <div className="w-full flex items-center justify-between text-xs font-mono-hud text-amber-200/70 border-b border-red-500/20 pb-2">
              <span className="text-yellow-400 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-500" />
                STARK ARC REACTOR VISUALIZER
              </span>
              <span className="text-[11px] text-yellow-400 tracking-wider">
                FREQ: 30 FPS
              </span>
            </div>

            {/* Glowing Orb Canvas */}
            <div className="py-6 flex flex-col items-center justify-center flex-1">
              <OrbVisualizer
                state={assistantState}
                audioLevel={audioLevel}
                onClick={cycleOrbState}
                size={270}
              />
              <div className="text-[11px] font-mono-hud text-amber-200/70 mt-5 text-center max-w-xs">
                Audio-reactive Red & Gold particle field & triple orbital ring system. Click orb to cycle simulation state.
              </div>
            </div>

            {/* Quick Action Matrix Dock */}
            <div className="w-full grid grid-cols-4 gap-1.5 pt-3 border-t border-red-500/20 text-xs font-hud">
              <button
                onClick={() => setIsImageStudioOpen(true)}
                className="py-2 px-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-yellow-200 text-center tracking-wider transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              >
                <ImageIcon className="w-3 h-3 text-yellow-400" />
                <span className="text-[11px]">IMAGES</span>
              </button>
              <button
                onClick={() => {
                  setSpotifyQuery('Hans Zimmer Time');
                  setIsSpotifyOpen(true);
                }}
                className="py-2 px-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-yellow-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Music className="w-3 h-3 text-amber-400" />
                <span className="text-[11px]">SPOTIFY</span>
              </button>
              <button
                onClick={() => setIsCodeOpen(true)}
                className="py-2 px-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-yellow-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Code className="w-3 h-3 text-red-400" />
                <span className="text-[11px]">CODE</span>
              </button>
              <button
                onClick={() => setIsWorkflowsOpen(true)}
                className="py-2 px-1 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-200 text-center tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[11px]">FOCUS</span>
              </button>
            </div>
          </div>

          {/* Right Column: Communications Chat & Terminal (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col h-[580px] lg:h-auto">
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
      <footer className="relative z-10 border-t border-red-500/20 bg-[#100305]/90 px-6 py-2.5 text-center text-xs text-yellow-400/70 font-mono-hud flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span>J.A.R.V.I.S. STARK ARMOR SPEC // RED & GOLD ONLINE</span>
        </div>
        <div className="hidden sm:block">
          PRESS <kbd className="text-yellow-400 px-1 py-0.2 bg-red-950 rounded border border-red-500/40">CTRL+K</kbd> FOR COMMAND MATRIX
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
      />
      <CommandOmnibar
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        onSelectAction={handleOmnibarAction}
      />
      <TasksModal
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
        onTaskChange={refreshSubsystems}
      />
      <NotesModal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
      <TimersModal
        isOpen={isTimersOpen}
        onClose={() => setIsTimersOpen(false)}
        onTimerChange={refreshSubsystems}
      />
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        onMemoryUpdate={refreshSubsystems}
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
    </div>
  );
}
