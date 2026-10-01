import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle, X } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskChange?: () => void;
  highlightTaskId?: string;
}

export const TasksModal: React.FC<TasksModalProps> = ({
  isOpen,
  onClose,
  onTaskChange,
  highlightTaskId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/productivity/tasks');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTasks(data);
          }
        }
      }
    } catch {
      // Graceful fallback during server warmup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      const res = await fetch('/api/productivity/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        setNewText('');
        fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const res = await fetch(`/api/productivity/tasks/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/productivity/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              Task Directive Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Form */}
        <form onSubmit={addTask} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Assign new operational task..."
            className="flex-1 bg-[#060c14] border border-cyan-500/30 rounded-xl px-4 py-2 text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-300 flex items-center gap-1.5 text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        {/* Task List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-cyan-300 font-mono-hud">
              SCANNING LOCAL TASK STORE...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono-hud">
              NO ACTIVE DIRECTIVES LOGGED. ALL OBJECTIVES COMPLETE.
            </div>
          ) : (
            tasks.map((task) => {
              const isTargeted = task.id === highlightTaskId;
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isTargeted
                      ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_20px_rgba(0,212,255,0.35)] ring-1 ring-cyan-400'
                      : task.completed
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                      : 'bg-[#0f1b2b]/70 border-cyan-500/20 text-slate-200 hover:border-cyan-500/40'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm ${
                          task.completed ? 'line-through text-slate-500' : 'text-cyan-100 font-medium'
                        }`}
                      >
                        {task.text}
                      </span>
                      {isTargeted && (
                        <span className="text-[10px] font-mono-hud text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/50">
                          SELECTED FROM OMNIBAR
                        </span>
                      )}
                    </div>
                  </button>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-2"
                  title="Purge task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};
