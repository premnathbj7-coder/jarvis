import React, { useState, useEffect } from 'react';
import { Database, Search, Plus, Trash2, X, Sparkles, BrainCircuit } from 'lucide-react';

interface MemoryItem {
  id: string;
  text: string;
  category: string;
  timestamp: string;
}

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryUpdate?: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, onMemoryUpdate }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFact, setNewFact] = useState('');
  const [category, setCategory] = useState('user_fact');
  const [loading, setLoading] = useState(true);

  const fetchMemories = async (query = '') => {
    try {
      const url = query ? `/api/memory?query=${encodeURIComponent(query)}` : '/api/memory';
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.memories)) {
            setMemories(data.memories);
          }
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  const addMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newFact.trim(),
          category,
        }),
      });
      if (res.ok) {
        setNewFact('');
        fetchMemories();
        onMemoryUpdate?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      fetchMemories();
      onMemoryUpdate?.();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="font-hud text-lg tracking-wider text-purple-200">
                Local Vector Memory Vault
              </h2>
              <div className="text-[10px] font-mono-hud text-slate-400">
                100% PRIVATE PERSISTENCE & SEMANTIC RETRIEVAL
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recalled vector memories or facts..."
              className="w-full bg-[#060c14] border border-purple-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-purple-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl text-purple-300 text-xs font-semibold"
          >
            Recall
          </button>
        </form>

        {/* Add Memory Form */}
        <form onSubmit={addMemory} className="mt-3 flex gap-2 bg-[#060c14] p-2.5 rounded-xl border border-purple-500/20">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Store new fact (e.g. My preferred editor is VSCode with Solarized Dark)..."
            className="flex-1 bg-transparent text-xs text-purple-100 placeholder:text-slate-500 focus:outline-none px-2"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#0c1420] border border-purple-500/30 rounded-lg px-2 py-1 text-[11px] text-purple-200 focus:outline-none"
          >
            <option value="user_fact">User Fact</option>
            <option value="preferences">Preference</option>
            <option value="project">Project Note</option>
            <option value="core">Core Protocol</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/40 rounded-lg text-purple-300 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Embed
          </button>
        </form>

        {/* Memory Items List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-purple-400 font-mono-hud">
              INDEXING LOCAL MEMORY STORES...
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono-hud">
              NO RELEVANT MEMORY VECTORS RETRIEVED.
            </div>
          ) : (
            memories.map((mem) => (
              <div
                key={mem.id}
                className="flex items-center justify-between p-3 rounded-xl border bg-[#0d1626]/80 border-purple-500/25 hover:border-purple-500/40 transition-all text-slate-200"
              >
                <div className="flex-1 mr-3">
                  <div className="text-xs font-sans text-purple-100 leading-relaxed">
                    {mem.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono-hud text-slate-400">
                    <span className="text-purple-400 uppercase tracking-wider font-semibold">
                      [{mem.category}]
                    </span>
                    <span>•</span>
                    <span>{new Date(mem.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteMemory(mem.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Purge memory vector"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
