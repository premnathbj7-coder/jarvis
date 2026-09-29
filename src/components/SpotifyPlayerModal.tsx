import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  X,
  Search,
} from 'lucide-react';

interface SpotifyPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onAudioLevelChange?: (level: number) => void;
}

const AMBIENT_PRESETS = [
  { id: 'synthwave', name: 'Cyberpunk Synth Focus', freq: 110, modFreq: 0.2, type: 'sawtooth' as OscillatorType },
  { id: 'deepspace', name: 'Deep Space Drone', freq: 55, modFreq: 0.1, type: 'sine' as OscillatorType },
  { id: 'reactor', name: 'Arc Reactor Hum', freq: 65, modFreq: 0.4, type: 'triangle' as OscillatorType },
  { id: 'binaural', name: 'Gamma Wave High Focus', freq: 220, modFreq: 0.05, type: 'sine' as OscillatorType },
];

export const SpotifyPlayerModal: React.FC<SpotifyPlayerModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onAudioLevelChange,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery || 'Hans Zimmer Interstellar');
  const [activePreset, setActivePreset] = useState(AMBIENT_PRESETS[0]);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startAmbient = (preset = activePreset) => {
    try {
      stopAmbient();

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = audioCtxRef.current || new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      audioCtxRef.current = ctx;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainRef.current = masterGain;

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);
      filter.connect(masterGain);
      filterRef.current = filter;

      // Primary Synth Tone
      const osc = ctx.createOscillator();
      osc.type = preset.type;
      osc.frequency.setValueAtTime(preset.freq, ctx.currentTime);
      osc.connect(filter);
      osc.start();
      oscRef.current = osc;

      // LFO modulation for breathing drone effect
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(preset.modFreq, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(150, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      lfoRef.current = lfo;

      setIsAmbientPlaying(true);

      // Audio level pulse animation loop
      const updateAudioPulse = () => {
        if (!isAmbientPlaying) return;
        const time = ctx.currentTime;
        const pulse = (Math.sin(time * 2.5) + 1) * 0.35 * volume;
        onAudioLevelChange?.(pulse);
        animFrameRef.current = requestAnimationFrame(updateAudioPulse);
      };
      animFrameRef.current = requestAnimationFrame(updateAudioPulse);
    } catch (err) {
      console.error('Ambient audio initialization error:', err);
    }
  };

  const stopAmbient = () => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      onAudioLevelChange?.(0);
      setIsAmbientPlaying(false);
    } catch (e) {
      // ignore
    }
  };

  const toggleAmbient = () => {
    if (isAmbientPlaying) {
      stopAmbient();
    } else {
      startAmbient();
    }
  };

  const selectPreset = (preset: typeof AMBIENT_PRESETS[0]) => {
    setActivePreset(preset);
    if (isAmbientPlaying) {
      startAmbient(preset);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(newVol * 0.35, audioCtxRef.current.currentTime);
    }
  };

  const openInSpotify = () => {
    const url = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#09121f] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,212,255,0.2)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hud text-lg tracking-wider text-cyan-200">
                Acoustic & Media Matrix
              </h2>
              <div className="text-[11px] font-mono-hud text-slate-400">
                SPOTIFY MUSIC CONTROLLER & SCI-FI AMBIENT SYNTHESIS
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

        {/* Content */}
        <div className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Section 1: Spotify Web Integration */}
          <div className="p-4 rounded-xl bg-[#060c14] border border-emerald-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Spotify Direct Search & Player</span>
              </div>
              <button
                onClick={openInSpotify}
                className="text-[11px] font-mono-hud text-emerald-300 hover:text-emerald-100 flex items-center gap-1 transition-colors"
              >
                <span>Launch in Spotify App</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search artist, song, album, or playlist..."
                  className="w-full bg-[#0a1524] border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-emerald-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-sans"
                />
              </div>
              <button
                onClick={openInSpotify}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </button>
            </div>

            {/* Quick Genres / Tracks */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono-hud text-slate-500">QUICK CHIPS:</span>
              {[
                'Hans Zimmer Dune',
                'Daft Punk Tron Legacy',
                'Synthwave Radio',
                'Lofi Beats Focus',
                'Cyberpunk 2077 OST',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setSearchQuery(chip)}
                  className="text-[10px] font-mono-hud bg-slate-900/60 hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 rounded-full px-2.5 py-0.5 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Built-in Sci-Fi Ambient Synth Generator */}
          <div className="p-4 rounded-xl bg-[#060c14] border border-cyan-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-300 font-bold uppercase tracking-wider">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Futuristic Ambient Sound Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAmbient}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all ${
                    isAmbientPlaying
                      ? 'bg-cyan-500/30 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(0,212,255,0.3)] animate-pulse'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  {isAmbientPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAmbientPlaying ? 'HALT FREQUENCY' : 'START AUDIO DRONE'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {AMBIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    activePreset.id === preset.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                      : 'bg-[#091322] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{preset.name}</div>
                  <div className="text-[10px] font-mono-hud text-slate-500 mt-0.5">
                    {preset.freq} Hz // {preset.type.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-400"
              />
              <span className="text-xs font-mono-hud text-cyan-300 w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
