import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, X, Tag, Sparkles, RefreshCw } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNoteId?: string;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, initialNoteId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Note Generator State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/productivity/notes');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNotes(data);
            if (data.length > 0) {
              if (initialNoteId) {
                const target = data.find((n: Note) => n.id === initialNoteId);
                setSelectedNote(target || data[0]);
              } else if (!selectedNote) {
                setSelectedNote(data[0]);
              }
            }
          }
        }
      }
    } catch {
      // Graceful fallback during server warmup
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/education/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiPrompt.trim(),
          subject: 'Academic & Technical Notes',
          format: 'Comprehensive Study Guide',
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setAiPrompt('');
        await fetchNotes();
        setSelectedNote(newNote);
      }
    } catch (err) {
      console.error('Failed to generate AI note:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, initialNoteId]);

  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const target = notes.find((n) => n.id === initialNoteId);
      if (target) {
        setSelectedNote(target);
      }
    }
  }, [initialNoteId, notes]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/productivity/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Document',
          content: content.trim(),
          tags,
        }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setTagInput('');
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/productivity/notes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              Tactical Notes & Logs Repository
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick AI Note-Maker Bar */}
        <form onSubmit={handleGenerateAiNote} className="mt-3 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 animate-pulse ml-1" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask J.A.R.V.I.S. to make notes for you (e.g. 'Binary Search Trees', 'Quantum Mechanics', 'Thermodynamics')..."
            className="flex-1 bg-transparent text-xs text-purple-100 placeholder:text-slate-500 focus:outline-none font-sans"
          />
          <button
            type="submit"
            disabled={isGeneratingAi || !aiPrompt.trim()}
            className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            {isGeneratingAi ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-purple-300" />
                <span>GENERATING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>MAKE AI NOTE</span>
              </>
            )}
          </button>
        </form>

        {/* Content split pane */}
        <div className="mt-4 flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
          {/* Notes list (left) */}
          <div className="md:col-span-4 flex flex-col border border-cyan-500/20 rounded-xl bg-[#060c14] p-3 overflow-hidden">
            <div className="text-xs font-mono-hud text-cyan-400 tracking-wider mb-2 font-bold flex items-center justify-between">
              <span>INDEXED NOTES ({notes.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-xs text-slate-500 py-4 text-center">LOADING...</div>
              ) : notes.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">NO NOTES LOGGED</div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedNote?.id === note.id
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-100'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{note.title}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {note.content || 'Empty note'}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.tags && note.tags.length > 0 && (
                        <span className="text-cyan-400 font-mono-hud">#{note.tags[0]}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Note viewer or creation (right) */}
          <div className="md:col-span-8 flex flex-col border border-cyan-500/20 rounded-xl bg-[#060c14] p-4 overflow-hidden">
            {selectedNote ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-cyan-200">{selectedNote.title}</h3>
                    <div className="text-[10px] text-slate-500 font-mono-hud mt-0.5">
                      Recorded: {new Date(selectedNote.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    >
                      + New Note
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedNote.content}
                </div>

                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedNote.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono-hud bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Create Note Form */
              <form onSubmit={addNote} className="flex flex-col h-full">
                <div className="text-xs font-mono-hud text-cyan-300 font-bold mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RECORD NEW ENTRY</span>
                </div>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document Title (e.g. Arc Reactor Schematics)"
                  className="bg-[#0a121e] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-sm text-cyan-100 placeholder:text-slate-500 mb-2 focus:outline-none focus:border-cyan-400"
                />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Log tactical contents, observations, or system notes..."
                  className="flex-1 bg-[#0a121e] border border-cyan-500/30 rounded-xl p-3.5 text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-sans"
                />

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Tags (comma-separated, e.g. system, research)"
                    className="flex-1 bg-[#0a121e] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs font-semibold tracking-wider transition-all"
                  >
                    Commit Entry
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
