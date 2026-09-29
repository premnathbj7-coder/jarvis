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
} from 'lucide-react';
import { AssistantState } from './OrbVisualizer';

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
      recognition.lang = 'en-US';

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
  }, [onSendMessage, onStateChange, onAudioLevelChange]);

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
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start microphone:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    // Pick a smooth voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('David') ||
        v.name.includes('George') ||
        v.lang.startsWith('en')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

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
    'Create an image of an Arc Reactor in cyan',
    'Search the datas: what are the latest quantum computing breakthroughs?',
    'Create an image of a futuristic holographic Iron Man suit',
    'Search the datas: latest space telescope discoveries',
    'System status diagnostic',
    'Remember I am working on the Stark OS prototype',
    'Set a timer for 3 minutes',
    'Calculate (125 * 8) / 4',
  ];

  return (
    <div className="flex flex-col h-full bg-[#150307]/85 border border-red-500/35 rounded-2xl p-4 backdrop-blur-lg shadow-[0_4px_30px_rgba(239,68,68,0.15)]">
      {/* Header with speech toggle & clear */}
      <div className="flex items-center justify-between pb-3 border-b border-red-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-yellow-400" />
          <span className="font-hud text-xs tracking-widest text-yellow-200 uppercase font-semibold">
            Console Communications Log
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              speechEnabled
                ? 'bg-red-500/20 border-red-500/50 text-yellow-300'
                : 'bg-red-950/40 border-red-900/60 text-amber-200/60'
            }`}
            title={speechEnabled ? 'Speech Voice output enabled' : 'Speech Voice output muted'}
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5 text-yellow-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-mono-hud hidden sm:inline">
              {speechEnabled ? 'VOICE ON' : 'MUTED'}
            </span>
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 rounded-lg border border-red-900/60 bg-red-950/30 hover:bg-red-900/50 text-amber-200/60 hover:text-yellow-300 text-xs transition-all"
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
              <div className="flex items-center gap-2 text-[10px] font-mono-hud text-amber-200/60 mb-1 px-1">
                <span>{isUser ? 'USER // AUTHORIZED' : 'J.A.R.V.I.S. // STARK CORE'}</span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>

                {msg.intentType === 'command' && (
                  <span className="px-1.5 py-0.2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded text-[9px]">
                    CMD: {msg.command || 'EXEC'}
                  </span>
                )}
                {msg.intentType === 'image_generation' && (
                  <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-[9px] flex items-center gap-1">
                    <ImageIcon className="w-2.5 h-2.5 text-yellow-400" /> IMAGE SYNTHESIS
                  </span>
                )}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-yellow-300 border border-amber-500/40 rounded text-[9px] flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-yellow-400" /> SEARCH GROUNDED
                  </span>
                )}
                {msg.recalledMemories && (
                  <span className="px-1.5 py-0.2 bg-red-500/20 text-amber-200 border border-red-500/40 rounded text-[9px] flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" /> MEMORY CONTEXT
                  </span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 leading-relaxed font-sans ${
                  isUser
                    ? 'bg-red-600/25 border border-red-500/50 text-yellow-100 rounded-tr-none shadow-md'
                    : 'bg-[#1e050b]/90 border border-red-900/60 text-amber-50 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Generated Image Card */}
                {msg.imageUrl && (
                  <div className="mt-3 p-2 bg-[#120205] border border-yellow-500/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.15)]">
                    <div className="relative group">
                      <img
                        src={msg.imageUrl}
                        alt={msg.imagePrompt || 'Generated Visual'}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-72 object-contain rounded-lg bg-[#0e0204]"
                      />
                      <div className="mt-2 flex items-center justify-between px-1">
                        <div className="text-[11px] font-mono-hud text-yellow-300 truncate max-w-[260px]">
                          TARGET: {msg.imagePrompt || 'Visual Frame'}
                        </div>
                        <a
                          href={msg.imageUrl}
                          download={`jarvis-frame-${Date.now()}.png`}
                          className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/35 border border-yellow-500/50 text-yellow-200 text-xs font-mono-hud flex items-center gap-1 transition-all"
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
                  <div className="mt-3 p-3 bg-[#18040a] border border-yellow-500/40 rounded-xl shadow-md">
                    <div className="text-[10px] font-mono-hud text-yellow-300 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                        <span>Direct Verified News Portals ({msg.portals.length} Websites):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          msg.portals?.slice(0, 3).forEach((p) => window.open(p.url, '_blank'));
                        }}
                        className="text-[9px] bg-yellow-500/20 hover:bg-yellow-500/35 text-yellow-200 px-2 py-0.5 rounded border border-yellow-500/40 transition-colors tracking-wider"
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
                          className="p-2 rounded-lg bg-[#20060d] hover:bg-yellow-500/20 border border-red-900/60 hover:border-yellow-400 text-xs font-mono-hud text-yellow-200 flex items-center justify-between transition-all group"
                        >
                          <span className="truncate mr-1 group-hover:text-yellow-100">{portal.name}</span>
                          <ExternalLink className="w-3 h-3 text-yellow-400 shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tactical Web Intelligence & Google Search Grounding Drawer */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-yellow-500/30 text-[11px] font-mono-hud bg-[#18040a]/80 p-2.5 rounded-xl border border-red-500/25">
                    <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                        <span>Verified Live News Articles ({msg.groundingSources.length} Publications):</span>
                      </div>
                      <span className="text-[9px] text-amber-300/70">CLICK ANY TO OPEN ARTICLE</span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {msg.groundingSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-[#140307] hover:bg-yellow-950/40 border border-red-500/20 hover:border-yellow-400/50 text-amber-200 text-xs transition-colors group"
                        >
                          <span className="truncate mr-2 font-sans font-medium text-amber-100 group-hover:text-yellow-200">
                            {source.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-mono-hud text-yellow-400 uppercase">READ</span>
                            <ExternalLink className="w-3 h-3 text-yellow-400" />
                          </div>
                        </a>
                      ))}
                    </div>

                    {msg.webSearchQueries && msg.webSearchQueries.length > 0 && (
                      <div className="mt-2 text-[10px] text-amber-200/60 flex items-center gap-1 flex-wrap">
                        <span className="text-amber-400/80">QUERIES:</span>
                        {msg.webSearchQueries.map((q, qIdx) => (
                          <span key={qIdx} className="bg-red-950/80 px-1.5 py-0.5 rounded text-amber-200 border border-red-900/50">
                            "{q}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recalled Memory Drawer */}
                {msg.recalledMemories && (
                  <div className="mt-2.5 pt-2 border-t border-red-500/25 text-[11px] text-amber-200 font-mono-hud bg-red-950/20 p-2 rounded border border-red-900/40">
                    <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recalled Memory Vectors:
                    </div>
                    {msg.recalledMemories}
                  </div>
                )}
              </div>

              {/* Quick TTS replay for JARVIS */}
              {!isUser && (
                <button
                  onClick={() => speakText(msg.text)}
                  className="mt-1 text-[10px] font-mono-hud text-amber-200/60 hover:text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1"
                >
                  <Volume2 className="w-3 h-3" /> Replay voice
                </button>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2.5 text-xs text-yellow-300 font-hud tracking-wider py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>STARK REASONING ENGINE ACTIVE...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Commands */}
      <div className="mt-3 pt-2.5 border-t border-red-500/20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono-hud text-amber-200/70 mb-1.5">
          <Command className="w-3 h-3 text-yellow-400" />
          <span>QUICK PROTOCOL CHIPS:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sampleCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(cmd)}
              disabled={isProcessing}
              className="text-[11px] whitespace-nowrap bg-red-950/40 hover:bg-yellow-500/20 text-amber-100 hover:text-yellow-200 border border-red-900/60 hover:border-yellow-400/50 rounded-full px-2.5 py-1 transition-all"
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
              ? 'bg-yellow-500/30 border-yellow-400 text-yellow-300 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.5)]'
              : 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40 text-yellow-300'
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
          className="flex-1 bg-[#140307]/90 border border-red-500/35 focus:border-yellow-400 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-yellow-100 placeholder:text-amber-200/40 transition-all font-sans"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isProcessing}
          className="p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
