import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Command,
  Database,
  Terminal,
  RotateCcw,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Download,
  Languages,
} from 'lucide-react';
import { AssistantState } from './OrbVisualizer';
import { detectLanguageAndStyle } from '../utils/languageEngine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  intentType?: string;
  command?: string | null;
  recalledMemories?: string | null;
  timestamp: string;
  source?: string;
  imageUrl?: string;
  imagePrompt?: string;
  groundingSources?: Array<{ uri: string; title: string }>;
  portals?: Array<{ name: string; url: string }>;
  webSearchQueries?: string[];
  language?: string;
  languageName?: string;
  isMixed?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onStateChange: (state: AssistantState) => void;
  onAudioLevelChange: (level: number) => void;
  isProcessing: boolean;
  onClearHistory: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onStateChange,
  onAudioLevelChange,
  isProcessing,
  onClearHistory,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Active conversation language tracking for adaptive STT and TTS
  const activeLanguage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].language) {
        return messages[i].language;
      }
    }
    return 'en-US';
  }, [messages]);

  const activeLanguageName = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].languageName) {
        return messages[i].languageName;
      }
    }
    return 'English';
  }, [messages]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Web Speech API STT setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Default or adapt to active conversation language
      recognition.lang = activeLanguage || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onStateChange('LISTENING');
        onAudioLevelChange(0.7);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          onSendMessage(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        onStateChange('IDLE');
        onAudioLevelChange(0);
      };

      recognition.onend = () => {
        setIsListening(false);
        onAudioLevelChange(0);
        onStateChange('IDLE');
      };

      recognitionRef.current = recognition;
    }
  }, [onSendMessage, onStateChange, onAudioLevelChange, activeLanguage]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your current browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      onStateChange('IDLE');
      onAudioLevelChange(0);
    } else {
      try {
        // Dynamically update STT language to latest active conversation language before starting
        if (activeLanguage) {
          recognitionRef.current.lang = activeLanguage;
        }
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start microphone:', err);
      }
    }
  };

  const speakText = (text: string, langHint?: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const detected = detectLanguageAndStyle(text);
    const targetLang = langHint || detected.code || 'en-US';
    const baseCode = targetLang.split('-')[0].toLowerCase();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.98;
    utterance.lang = targetLang;

    // Pick a voice matching the target language or language family
    const voices = window.speechSynthesis.getVoices();
    let matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(baseCode)
    );
    if (!matchingVoice && (baseCode === 'fil' || baseCode === 'tl')) {
      matchingVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('fil') ||
          v.lang.toLowerCase().startsWith('tl') ||
          v.name.includes('Natural') ||
          v.lang.startsWith('en')
      );
    }
    if (!matchingVoice) {
      matchingVoice = voices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('David') ||
          v.lang.startsWith('en')
      );
    }
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => {
      onStateChange('SPEAKING');
      onAudioLevelChange(0.85);
    };

    utterance.onend = () => {
      onStateChange('IDLE');
      onAudioLevelChange(0);
    };

    utterance.onerror = () => {
      onStateChange('IDLE');
      onAudioLevelChange(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputValue.trim();
    if (!clean || isProcessing) return;
    setInputValue('');
    onSendMessage(clean);
  };

  const sampleCommands = [
    'Kumusta JARVIS, can you check the system status today?',
    'Translate "All systems nominal" to Spanish',
    'Pakisalin sa Tagalog: "Welcome to Stark Industries"',
    'Hola JARVIS, ¿cuál es el estado de los sistemas?',
    'Create an image of an Arc Reactor in cyan',
    'Search the datas: what are the latest quantum computing breakthroughs?',
    'Set a timer for 3 minutes',
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a1322]/85 border border-cyan-500/25 rounded-2xl p-4 backdrop-blur-lg shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Header with speech toggle & clear */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-hud text-xs tracking-widest text-cyan-200 uppercase font-semibold">
            Console Communications Log
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeLanguageName && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono-hud shadow-sm"
              title={`Active Linguistic State: ${activeLanguageName} (${activeLanguage})`}
            >
              <Languages className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{activeLanguageName.toUpperCase()}</span>
            </div>
          )}

          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              speechEnabled
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
            title={speechEnabled ? 'Speech Voice output enabled' : 'Speech Voice output muted'}
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-mono-hud hidden sm:inline">
              {speechEnabled ? 'VOICE ON' : 'MUTED'}
            </span>
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 text-xs transition-all"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 text-sm min-h-[160px] max-h-[380px]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Message metadata tag */}
              <div className="flex items-center gap-2 text-[10px] font-mono-hud text-slate-400 mb-1 px-1">
                <span>{isUser ? 'USER // AUTHORIZED' : 'J.A.R.V.I.S. // CORE'}</span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>

                {msg.intentType === 'command' && (
                  <span className="px-1.5 py-0.2 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded text-[9px]">
                    CMD: {msg.command || 'EXEC'}
                  </span>
                )}
                {msg.intentType === 'image_generation' && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded text-[9px] flex items-center gap-1">
                    <ImageIcon className="w-2.5 h-2.5 text-purple-400" /> IMAGE SYNTHESIS
                  </span>
                )}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-emerald-400" /> SEARCH GROUNDED
                  </span>
                )}
                {msg.recalledMemories && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded text-[9px] flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-purple-400" /> MEMORY CONTEXT
                  </span>
                )}
                {msg.languageName && (
                  <span className="px-1.5 py-0.2 bg-cyan-950/50 text-cyan-300 border border-cyan-500/35 rounded text-[9px] flex items-center gap-1">
                    <Languages className="w-2.5 h-2.5 text-cyan-400" /> {msg.languageName.toUpperCase()}
                  </span>
                )}
                {msg.intentType === 'translation' && (
                  <span className="px-1.5 py-0.2 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded text-[9px] flex items-center gap-1">
                    <Languages className="w-2.5 h-2.5 text-teal-400" /> TRANSLATION
                  </span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 leading-relaxed font-sans ${
                  isUser
                    ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 rounded-tr-none shadow-md'
                    : 'bg-[#0f1d2e]/90 border border-slate-700/60 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Generated Image Card */}
                {msg.imageUrl && (
                  <div className="mt-3 p-2 bg-[#060c14] border border-cyan-500/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                    <div className="relative group">
                      <img
                        src={msg.imageUrl}
                        alt={msg.imagePrompt || 'Generated Visual'}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-72 object-contain rounded-lg bg-[#050a12]"
                      />
                      <div className="mt-2 flex items-center justify-between px-1">
                        <div className="text-[11px] font-mono-hud text-cyan-300 truncate max-w-[260px]">
                          TARGET: {msg.imagePrompt || 'Visual Frame'}
                        </div>
                        <a
                          href={msg.imageUrl}
                          download={`jarvis-frame-${Date.now()}.png`}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 text-xs font-mono-hud flex items-center gap-1 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          <span>SAVE</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multiple Direct News Portals & Websites Section */}
                {msg.portals && msg.portals.length > 0 && (
                  <div className="mt-3 p-3 bg-[#06121f] border border-cyan-500/40 rounded-xl shadow-md">
                    <div className="text-[10px] font-mono-hud text-cyan-300 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>Direct Verified News Portals ({msg.portals.length} Websites):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          msg.portals?.slice(0, 3).forEach((p) => window.open(p.url, '_blank'));
                        }}
                        className="text-[9px] bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 px-2 py-0.5 rounded border border-cyan-500/40 transition-colors tracking-wider"
                      >
                        OPEN TOP 3 SITES
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {msg.portals.map((portal, pIdx) => (
                        <a
                          key={pIdx}
                          href={portal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="p-2 rounded-lg bg-[#0a1829] hover:bg-cyan-500/20 border border-slate-700/60 hover:border-cyan-400 text-xs font-mono-hud text-cyan-200 flex items-center justify-between transition-all group"
                        >
                          <span className="truncate mr-1 group-hover:text-cyan-100">{portal.name}</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tactical Web Intelligence & Google Search Grounding Drawer */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-500/30 text-[11px] font-mono-hud bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Verified Live News Articles ({msg.groundingSources.length} Publications):</span>
                      </div>
                      <span className="text-[9px] text-emerald-300/70">CLICK ANY TO OPEN ARTICLE</span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {msg.groundingSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-[#06121d] hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-400/50 text-emerald-200 text-xs transition-colors group"
                        >
                          <span className="truncate mr-2 font-sans font-medium text-emerald-100 group-hover:text-emerald-300">
                            {source.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-mono-hud text-emerald-400/80 uppercase">READ</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                          </div>
                        </a>
                      ))}
                    </div>

                    {msg.webSearchQueries && msg.webSearchQueries.length > 0 && (
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                        <span className="text-slate-500">QUERIES:</span>
                        {msg.webSearchQueries.map((q, qIdx) => (
                          <span key={qIdx} className="bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-300">
                            "{q}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recalled Memory Drawer */}
                {msg.recalledMemories && (
                  <div className="mt-2.5 pt-2 border-t border-purple-500/25 text-[11px] text-purple-200 font-mono-hud bg-purple-950/20 p-2 rounded">
                    <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recalled Memory Vectors:
                    </div>
                    {msg.recalledMemories}
                  </div>
                )}
              </div>

              {/* Quick TTS replay for JARVIS */}
              {!isUser && (
                <button
                  onClick={() => speakText(msg.text, msg.language)}
                  className="mt-1 text-[10px] font-mono-hud text-slate-400 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1"
                >
                  <Volume2 className="w-3 h-3" /> Replay voice ({msg.languageName || 'Auto'})
                </button>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2.5 text-xs text-purple-300 font-hud tracking-wider py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>J.A.R.V.I.S. REASONING ENGINE ACTIVE...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Commands */}
      <div className="mt-3 pt-2.5 border-t border-cyan-500/15">
        <div className="flex items-center gap-1.5 text-[10px] font-mono-hud text-slate-400 mb-1.5">
          <Command className="w-3 h-3 text-cyan-400" />
          <span>QUICK PROTOCOL CHIPS:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sampleCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(cmd)}
              disabled={isProcessing}
              className="text-[11px] whitespace-nowrap bg-slate-900/60 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-slate-700/50 hover:border-cyan-500/40 rounded-full px-2.5 py-1 transition-all"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2.5 rounded-xl border transition-all ${
            isListening
              ? 'bg-rose-500/30 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
          }`}
          title={isListening ? 'Listening (Click to stop)' : 'Click to speak via Microphone'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening ? 'Listening to speech...' : 'Type a command, query, or task for JARVIS...'}
          disabled={isProcessing}
          className="flex-1 bg-[#070e1a]/90 border border-cyan-500/30 focus:border-cyan-400 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-cyan-100 placeholder:text-slate-500 transition-all font-sans"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isProcessing}
          className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(0,212,255,0.2)]"
        >
          <Send className="w-4 h-4 text-cyan-400" />
        </button>
      </form>
    </div>
  );
};
