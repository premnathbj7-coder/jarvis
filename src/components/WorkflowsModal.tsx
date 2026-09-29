import React, { useState } from 'react';
import {
  Zap,
  Target,
  FileCheck,
  ShieldAlert,
  Sparkles,
  X,
  Play,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface WorkflowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerFocusMode: () => void;
  onTriggerBriefing: () => void;
  onTriggerDiagnostics: () => void;
}

export const WorkflowsModal: React.FC<WorkflowsModalProps> = ({
  isOpen,
  onClose,
  onTriggerFocusMode,
  onTriggerBriefing,
  onTriggerDiagnostics,
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);

  const workflows = [
    {
      id: 'focus',
      title: 'Deep Focus Protocol (Pomodoro + Synth Drone)',
      desc: 'Sets a 25-minute tactical focus countdown timer, initializes the ambient alpha wave synthesizer, and logs a focus milestone.',
      icon: <Target className="w-5 h-5 text-amber-400" />,
      actionLabel: 'ENGAGE FOCUS PROTOCOL',
      handler: () => {
        setActiveWorkflow('focus');
        onTriggerFocusMode();
        setTimeout(() => setActiveWorkflow(null), 2500);
      },
    },
    {
      id: 'briefing',
      title: 'Daily Operations Intelligence Briefing',
      desc: 'Compiles current time, weather metrics, pending task directives, and system telemetry into a single unified summary.',
      icon: <FileCheck className="w-5 h-5 text-cyan-400" />,
      actionLabel: 'GENERATE BRIEFING',
      handler: () => {
        setActiveWorkflow('briefing');
        onTriggerBriefing();
        setTimeout(() => setActiveWorkflow(null), 2500);
      },
    },
    {
      id: 'diagnostics',
      title: 'Full Hardware & Memory Telemetry Sweep',
      desc: 'Conducts an exhaustive health audit of CPU load, memory utilization, platform uptime, and vector memory index counts.',
      icon: <ShieldAlert className="w-5 h-5 text-emerald-400" />,
      actionLabel: 'RUN SYSTEM AUDIT',
      handler: () => {
        setActiveWorkflow('diagnostics');
        onTriggerDiagnostics();
        setTimeout(() => setActiveWorkflow(null), 2500);
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#09121f] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,212,255,0.2)] flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hud text-lg tracking-wider text-cyan-200">
                Automated Directive Workflows
              </h2>
              <div className="text-[11px] font-mono-hud text-slate-400">
                MULTI-STEP AI MACRO PROTOCOLS & SYSTEM AUTOMATIONS
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflows List */}
        <div className="mt-4 space-y-3.5 overflow-y-auto pr-1 flex-1">
          {workflows.map((wf) => {
            const isRunning = activeWorkflow === wf.id;
            return (
              <div
                key={wf.id}
                className="p-4 rounded-xl bg-[#060c14] border border-cyan-500/25 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-[#0a1524] border border-slate-800 shrink-0 mt-0.5">
                    {wf.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-100">{wf.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                      {wf.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={wf.handler}
                  disabled={isRunning}
                  className={`px-4 py-2 rounded-xl text-xs font-hud tracking-wider whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
                    isRunning
                      ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-200'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>DEPLOYED</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{wf.actionLabel}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
