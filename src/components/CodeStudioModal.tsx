import React, { useState } from 'react';
import {
  Code,
  Play,
  RotateCcw,
  Copy,
  Check,
  X,
  Terminal,
  Zap,
  Clock,
} from 'lucide-react';

interface CodeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_SCRIPTS = [
  {
    name: 'Vector Similarity Test',
    code: `// Cosine similarity test for local memory embeddings
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const v1 = [0.85, 0.45, -0.12, 0.94];
const v2 = [0.81, 0.42, -0.09, 0.91];
const sim = cosineSimilarity(v1, v2);

console.log("Vector A:", v1);
console.log("Vector B:", v2);
console.log("Semantic Cosine Similarity Score:", (sim * 100).toFixed(2) + "%");
return sim;`,
  },
  {
    name: 'CPU Benchmark Stress',
    code: `// Compute Fibonacci iterations benchmark
const t0 = performance.now();
function fib(n) {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

const target = 32;
const result = fib(target);
const elapsed = (performance.now() - t0).toFixed(2);

console.log("Fibonacci(" + target + ") Result:", result);
console.log("Total Execution Latency:", elapsed + " ms");
return { target, result, elapsedMs: elapsed };`,
  },
  {
    name: 'Telemetry Diagnostics Filter',
    code: `// Filter and score diagnostic metrics
const telemetry = [
  { subsystem: "Arc Reactor Core", status: "NOMINAL", efficiency: 98.4 },
  { subsystem: "Repulsor Arrays", status: "NOMINAL", efficiency: 96.1 },
  { subsystem: "Orbital Rings", status: "CALIBRATING", efficiency: 89.2 },
  { subsystem: "Thermal Dissipation", status: "NOMINAL", efficiency: 94.7 }
];

const highEfficiency = telemetry.filter(t => t.efficiency > 90);
console.log("Subsystems with >90% Efficiency:", highEfficiency.length);
console.log("Summary Matrix:", highEfficiency);
return highEfficiency;`,
  },
];

export const CodeStudioModal: React.FC<CodeStudioModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState(SAMPLE_SCRIPTS[0].code);
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutputLogs([]);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/tools/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (data.logs) {
        setOutputLogs(data.logs);
      }
      if (data.result !== undefined) {
        setExecutionResult(data.result);
      }
      if (data.durationMs) {
        setExecutionTime(data.durationMs);
      }
      if (!data.success && data.error) {
        setOutputLogs((prev) => [...prev, `[RUNTIME ERROR] ${data.error}`]);
      }
    } catch (err: any) {
      setOutputLogs([`[NETWORK/SYSTEM ERROR] ${err?.message || 'Failed to execute code'}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#09121f] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,212,255,0.2)] flex flex-col h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hud text-lg tracking-wider text-cyan-200">
                Code & Algorithm Execution Studio
              </h2>
              <div className="text-[11px] font-mono-hud text-slate-400">
                LIVE JAVASCRIPT/TYPESCRIPT RUNTIME SANDBOX & SCRATCHPAD
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-cyan-500/40 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-mono-hud">{copied ? 'COPIED' : 'COPY'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Templates Bar */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono-hud text-slate-500 whitespace-nowrap">SCRIPTS:</span>
          {SAMPLE_SCRIPTS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCode(s.code)}
              className="px-2.5 py-1 text-xs font-mono-hud whitespace-nowrap rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-200 transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Editor & Console Split View */}
        <div className="mt-3 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
          {/* Code Editor */}
          <div className="flex flex-col bg-[#050b14] border border-cyan-500/25 rounded-xl p-3 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-mono-hud text-slate-400">
              <span className="text-cyan-400 font-bold">SOURCE CODE (SANDBOX)</span>
              <span>JS / ES2022</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-transparent text-xs font-mono-hud text-cyan-100 placeholder:text-slate-600 focus:outline-none resize-none pt-2.5 leading-relaxed selection:bg-purple-500/30"
            />
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={runCode}
                disabled={isRunning}
                className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/60 rounded-xl text-purple-200 text-xs font-hud tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? 'EXECUTING...' : 'EXECUTE CODE'}</span>
              </button>
            </div>
          </div>

          {/* Console Output */}
          <div className="flex flex-col bg-[#050b14] border border-cyan-500/25 rounded-xl p-3 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-mono-hud text-slate-400">
              <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>TERMINAL LOGS</span>
              </div>
              {executionTime && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {executionTime} ms
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pt-2.5 font-mono-hud text-xs text-slate-300">
              {outputLogs.length === 0 && !executionResult ? (
                <div className="text-slate-600 italic py-6 text-center">
                  Terminal idle. Click "EXECUTE CODE" to compile and run in sandbox.
                </div>
              ) : (
                <>
                  {outputLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed whitespace-pre-wrap ${
                        log.startsWith('[ERROR]')
                          ? 'text-rose-400'
                          : log.startsWith('[WARN]')
                          ? 'text-amber-400'
                          : log.startsWith('[INFO]')
                          ? 'text-cyan-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {log}
                    </div>
                  ))}

                  {executionResult !== null && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-emerald-300">
                      <span className="text-slate-500">[RETURN VALUE] </span>
                      {executionResult}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
