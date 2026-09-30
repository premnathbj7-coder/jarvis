import React, { useState, useEffect } from 'react';
import { Clock, Bell, Plus, Trash2, X, Play, AlertCircle } from 'lucide-react';

interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  active: boolean;
  createdAt: string;
}

interface ReminderItem {
  id: string;
  task: string;
  timeStr: string;
  completed: boolean;
  createdAt: string;
}

interface TimersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimerChange?: () => void;
}

export const TimersModal: React.FC<TimersModalProps> = ({ isOpen, onClose, onTimerChange }) => {
  const [activeTab, setActiveTab] = useState<'timers' | 'reminders'>('timers');
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Timer Form
  const [timerLabel, setTimerLabel] = useState('');
  const [timerDuration, setTimerDuration] = useState('60');

  // Reminder Form
  const [reminderTask, setReminderTask] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  const fetchTimers = async () => {
    try {
      const res = await fetch('/api/productivity/timers');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setTimers(await res.json());
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/productivity/reminders');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setReminders(await res.json());
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTimers();
      fetchReminders();
    }
  }, [isOpen]);

  // Client-side ticking countdown for active timers
  useEffect(() => {
    if (!isOpen || timers.length === 0) return;
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.active || t.remainingSeconds <= 0) return t;
          const nextSec = t.remainingSeconds - 1;
          if (nextSec === 0) {
            // alert sound / speech notification
            if ('speechSynthesis' in window) {
              const u = new SpeechSynthesisUtterance(`Sir, your timer for ${t.label} has concluded.`);
              window.speechSynthesis.speak(u);
            }
          }
          return { ...t, remainingSeconds: Math.max(0, nextSec) };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timers.length]);

  const addTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    const sec = parseInt(timerDuration, 10);
    if (isNaN(sec) || sec <= 0) return;

    try {
      const res = await fetch('/api/productivity/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: timerLabel.trim() || `${sec}s Timer`,
          seconds: sec,
        }),
      });
      if (res.ok) {
        setTimerLabel('');
        fetchTimers();
        onTimerChange?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTimer = async (id: string) => {
    try {
      await fetch(`/api/productivity/timers/${id}`, { method: 'DELETE' });
      fetchTimers();
      onTimerChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTask.trim()) return;

    try {
      const res = await fetch('/api/productivity/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: reminderTask.trim(),
          timeStr: reminderTime.trim() || 'At scheduled turn',
        }),
      });
      if (res.ok) {
        setReminderTask('');
        setReminderTime('');
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await fetch(`/api/productivity/reminders/${id}`, { method: 'DELETE' });
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              Temporal Protocols
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 my-4 border-b border-cyan-500/20 pb-3">
          <button
            onClick={() => setActiveTab('timers')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-hud tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'timers'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> COUNTDOWN TIMERS ({timers.length})
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-hud tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'reminders'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-cyan-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> REMINDERS ({reminders.length})
          </button>
        </div>

        {/* Timers Section */}
        {activeTab === 'timers' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <form onSubmit={addTimer} className="flex gap-2 mb-3">
              <input
                type="text"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                placeholder="Timer label (e.g. Focus Session)"
                className="flex-1 bg-[#060c14] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none"
              />
              <select
                value={timerDuration}
                onChange={(e) => setTimerDuration(e.target.value)}
                className="bg-[#060c14] border border-cyan-500/30 rounded-xl px-2 py-1.5 text-xs text-cyan-100 focus:outline-none"
              >
                <option value="30">30 sec</option>
                <option value="60">1 min</option>
                <option value="180">3 min</option>
                <option value="300">5 min</option>
                <option value="600">10 min</option>
                <option value="1500">25 min</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs font-semibold flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Start
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {timers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono-hud">
                  NO ACTIVE COUNTDOWNS IN PROGRESS.
                </div>
              ) : (
                timers.map((t) => {
                  const isDone = t.remainingSeconds === 0;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-rose-950/20 border-rose-500/50 text-rose-300'
                          : 'bg-[#0f1b2b]/70 border-cyan-500/30 text-cyan-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{t.label}</div>
                        <div className="text-xs font-mono-hud text-slate-400 mt-0.5">
                          {isDone ? 'COMPLETE — EXPIRED' : `Remaining: ${formatTime(t.remainingSeconds)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono-hud text-lg font-bold ${
                            isDone ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
                          }`}
                        >
                          {formatTime(t.remainingSeconds)}
                        </span>
                        <button
                          onClick={() => deleteTimer(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Reminders Section */}
        {activeTab === 'reminders' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <form onSubmit={addReminder} className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                value={reminderTask}
                onChange={(e) => setReminderTask(e.target.value)}
                placeholder="Reminder directive (e.g. Call Tony Stark)"
                className="bg-[#060c14] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  placeholder="Target schedule (e.g. 5:00 PM / Tomorrow)"
                  className="flex-1 bg-[#060c14] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {reminders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono-hud">
                  NO SCHEDULED REMINDERS LOGGED.
                </div>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-[#0f1b2b]/70 border-cyan-500/20 text-cyan-100"
                  >
                    <div>
                      <div className="text-xs font-semibold">{r.task}</div>
                      <div className="text-[10px] text-cyan-400 font-mono-hud mt-0.5">
                        {r.timeStr}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
