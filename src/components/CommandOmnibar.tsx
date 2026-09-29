import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface CommandOmnibarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string, payload?: string) => void;
}

export const CommandOmnibar: React.FC<CommandOmnibarProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');

  const actions = [
    { id: 'image_studio', title: 'Synthesize AI Images & Holographic Concepts', category: 'Creative AI', icon: <ImageIcon className="w-4 h-4 text-cyan-400" /> },
    { id: 'spotify', title: 'Open Spotify & Ambient Synth Matrix', category: 'Media', icon: <Music className="w-4 h-4 text-emerald-400" /> },
    { id: 'code', title: 'Launch Code Studio & Algorithm Runner', category: 'Dev Tools', icon: <Code className="w-4 h-4 text-purple-400" /> },
    { id: 'workflows', title: 'Automated AI Directives (Focus Mode, Briefing)', category: 'Automation', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { id: 'tasks', title: 'View & Manage Task Directives', category: 'Productivity', icon: <CheckSquare className="w-4 h-4 text-cyan-400" /> },
    { id: 'notes', title: 'Open Tactical Notes & Documentation Logs', category: 'Productivity', icon: <FileText className="w-4 h-4 text-cyan-400" /> },
    { id: 'timers', title: 'Temporal Countdown Timers & Reminders', category: 'Productivity', icon: <Clock className="w-4 h-4 text-cyan-400" /> },
    { id: 'memory', title: 'Inspect Local Vector Memory Vault', category: 'Intelligence', icon: <Database className="w-4 h-4 text-purple-400" /> },
    { id: 'system', title: 'Hardware Diagnostics & Telemetry', category: 'System', icon: <Activity className="w-4 h-4 text-teal-400" /> },
    { id: 'screenshot', title: 'Initiate Visual Screen Capture', category: 'Utility', icon: <Camera className="w-4 h-4 text-cyan-400" /> },
    { id: 'settings', title: 'Configure Persona Demeanor & Visualizer', category: 'System', icon: <Settings className="w-4 h-4 text-slate-400" /> },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && filtered.length > 0) {
      onSelectAction(filtered[0].id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#09121f] border border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(0,212,255,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-cyan-500/25 bg-[#060c14]">
          <Search className="w-5 h-5 text-cyan-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to an AI tool (e.g. Spotify, Code, Tasks, Focus)..."
            className="flex-1 bg-transparent text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Results */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono-hud text-slate-500">
              No matching subsystem protocols found for "{query}".
            </div>
          ) : (
            filtered.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  onSelectAction(action.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[#0a1524] border border-slate-800 group-hover:border-cyan-500/40">
                    {action.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-cyan-100 group-hover:text-cyan-300">
                      {action.title}
                    </div>
                    <div className="text-[10px] font-mono-hud text-slate-500">
                      {action.category}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-[#060c14] border-t border-slate-800 text-[10px] font-mono-hud text-slate-500 flex items-center justify-between">
          <span>NAVIGATION: PRESS ESC TO CLOSE</span>
          <span>ENTER TO EXECUTE TOP DIRECTIVE</span>
        </div>
      </div>
    </div>
  );
};
