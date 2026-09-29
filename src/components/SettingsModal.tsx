import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Volume2, Sparkles, X, Check } from 'lucide-react';

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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsSaved }) => {
  const [settings, setSettings] = useState<AppSettings>({
    name: 'JARVIS',
    personality: 'professional',
    voiceSpeed: 1.0,
    voicePitch: 1.0,
    speechSynthesisEnabled: true,
    audioReactive: true,
    orbFps: 30,
    orbParticles: 40,
    orbIntensity: 0.85,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => setSettings(data))
        .catch(console.error);
    }
  }, [isOpen]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        onSettingsSaved?.(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              System Configuration & Persona
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={saveSettings} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Personality Style */}
          <div>
            <label className="block text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-1.5">
              Assistant Personality Demeanor
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['professional', 'casual', 'concise'] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setSettings({ ...settings, personality: mode })}
                  className={`py-2 px-3 rounded-xl border text-xs font-hud capitalize transition-all ${
                    settings.personality === mode
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,212,255,0.25)]'
                      : 'bg-[#060c14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 font-sans">
              {settings.personality === 'professional' && 'Calm, precise, respectful, and slightly formal.'}
              {settings.personality === 'casual' && 'Friendly, relaxed, conversational, and direct.'}
              {settings.personality === 'concise' && 'Extremely brief, laser-focused, direct to the point.'}
            </div>
          </div>

          {/* Assistant Name */}
          <div>
            <label className="block text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-1">
              Assistant Designation
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full bg-[#060c14] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400 font-hud"
            />
          </div>

          {/* Visualizer Tuning */}
          <div className="pt-2 border-t border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-2 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Energy Orb Visualizer Engine</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#060c14] border border-cyan-500/20 mb-2">
              <div className="text-xs text-slate-300">Audio-Reactive Energy Boost</div>
              <input
                type="checkbox"
                checked={settings.audioReactive}
                onChange={(e) => setSettings({ ...settings, audioReactive: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono-hud mb-1">
                  <span>Particle Density</span>
                  <span>{settings.orbParticles} Units</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={settings.orbParticles}
                  onChange={(e) => setSettings({ ...settings, orbParticles: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono-hud mb-1">
                  <span>Glow Field Intensity</span>
                  <span>{Math.round(settings.orbIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={settings.orbIntensity}
                  onChange={(e) => setSettings({ ...settings, orbIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Voice Tuning */}
          <div className="pt-2 border-t border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-xs font-mono-hud text-cyan-300 uppercase tracking-wider mb-2 font-bold">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vocal Synthesis Telemetry</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#060c14] border border-cyan-500/20">
              <div className="text-xs text-slate-300">Speech Synthesis Feedback</div>
              <input
                type="checkbox"
                checked={settings.speechSynthesisEnabled}
                onChange={(e) => setSettings({ ...settings, speechSynthesisEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs font-mono-hud text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> PARAMETERS COMMITTED
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2 bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-500/60 rounded-xl text-cyan-200 text-xs font-hud tracking-wider transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
            >
              Commit Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
