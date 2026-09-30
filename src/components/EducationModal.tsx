import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Share2,
  X,
  Flame,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Brain,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Tag,
  Layers,
  Award,
} from 'lucide-react';

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  schedule: string;
  room: string;
  attendance: number;
  progress: number;
  nextExam: string;
  color: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  weight: string;
}

export interface EducationStats {
  dailyStudyHoursGoal: number;
  dailyStudyHoursDone: number;
  streakDays: number;
}

export interface AcademicNews {
  title: string;
  source: string;
  category: string;
  date: string;
  summary: string;
}

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNotes?: () => void;
  initialTab?: 'briefing' | 'notes' | 'courses' | 'assignments' | 'study';
}

export const EducationModal: React.FC<EducationModalProps> = ({
  isOpen,
  onClose,
  onOpenNotes,
  initialTab = 'briefing',
}) => {
  const [activeTab, setActiveTab] = useState<'briefing' | 'notes' | 'courses' | 'assignments' | 'study'>(initialTab);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<EducationStats>({
    dailyStudyHoursGoal: 4.0,
    dailyStudyHoursDone: 2.8,
    streakDays: 7,
  });
  const [academicNews, setAcademicNews] = useState<AcademicNews[]>([]);
  const [todayClasses, setTodayClasses] = useState<Course[]>([]);
  const [summaryVoiceText, setSummaryVoiceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // AI Note-Maker State
  const [noteTopic, setNoteTopic] = useState('');
  const [noteSubject, setNoteSubject] = useState('Computer Science & Technology');
  const [noteFormat, setNoteFormat] = useState('Comprehensive Study Guide');
  const [rawLectureText, setRawLectureText] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<any | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);
  const [educationNotesList, setEducationNotesList] = useState<any[]>([]);
  const [notesSearch, setNotesSearch] = useState('');

  // Course & Assignment creation modals
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseInstructor, setNewCourseInstructor] = useState('');
  const [newCourseSchedule, setNewCourseSchedule] = useState('');
  const [newCourseRoom, setNewCourseRoom] = useState('');

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignCourse, setNewAssignCourse] = useState('CS-301');
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [newAssignPriority, setNewAssignPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssignWeight, setNewAssignWeight] = useState('15% Coursework');

  // Study Pomodoro state
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(2);

  // Fetch education overview and daily updates
  const fetchEducationData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, updatesRes, notesRes] = await Promise.all([
        fetch('/api/education/overview').catch(() => null),
        fetch('/api/education/daily-updates').catch(() => null),
        fetch('/api/productivity/notes').catch(() => null),
      ]);

      if (overviewRes && overviewRes.ok) {
        const data = await overviewRes.json().catch(() => null);
        if (data) {
          if (data.courses) setCourses(data.courses);
          if (data.assignments) setAssignments(data.assignments);
          if (data.stats) setStats(data.stats);
        }
      }

      if (updatesRes && updatesRes.ok) {
        const updateData = await updatesRes.json().catch(() => null);
        if (updateData) {
          if (updateData.todayClasses) setTodayClasses(updateData.todayClasses);
          if (updateData.academicNews) setAcademicNews(updateData.academicNews);
          if (updateData.summaryVoiceText) setSummaryVoiceText(updateData.summaryVoiceText);
        }
      }

      if (notesRes && notesRes.ok) {
        const allNotes = await notesRes.json().catch(() => null);
        if (Array.isArray(allNotes)) {
          const eduNotes = allNotes.filter((n: any) => n.tags?.includes('education'));
          setEducationNotesList(eduNotes);
          if (!generatedNote && eduNotes.length > 0) {
            setGeneratedNote(eduNotes[0]);
          }
        }
      }
    } catch {
      // Graceful fallback during server warmup
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEducationData();
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Pomodoro countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroActive && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((s) => s - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0 && isPomodoroActive) {
      setIsPomodoroActive(false);
      setPomodoroSeconds(25 * 60);
      setCompletedSessions((c) => c + 1);
      // Credit 25 minutes to education stats
      fetch('/api/education/study-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 25 }),
      }).then(() => fetchEducationData());
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroSeconds]);

  // Generate AI Notes
  const handleGenerateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTopic.trim() && !rawLectureText.trim()) return;

    setIsGeneratingNotes(true);
    try {
      const res = await fetch('/api/education/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: noteTopic.trim() || 'Synthesized Lecture Topic',
          subject: noteSubject,
          format: noteFormat,
          rawText: rawLectureText.trim(),
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setGeneratedNote(newNote);
        setNoteTopic('');
        setRawLectureText('');
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to generate study notes:', err);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Toggle Assignment Status
  const toggleAssignmentStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/education/assignments/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to toggle assignment:', err);
    }
  };

  // Delete Assignment
  const deleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/education/assignments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    }
  };

  // Add Assignment
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim()) return;

    try {
      const res = await fetch('/api/education/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAssignTitle.trim(),
          courseCode: newAssignCourse,
          dueDate: newAssignDueDate ? new Date(newAssignDueDate).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString(),
          priority: newAssignPriority,
          weight: newAssignWeight || 'Coursework',
        }),
      });

      if (res.ok) {
        setShowAddAssignment(false);
        setNewAssignTitle('');
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to add assignment:', err);
    }
  };

  // Add Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) return;

    try {
      const res = await fetch('/api/education/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCourseCode.trim(),
          name: newCourseName.trim(),
          instructor: newCourseInstructor.trim(),
          schedule: newCourseSchedule.trim() || 'Mon, Wed 10:00 AM',
          room: newCourseRoom.trim() || 'Main Campus',
          color: 'cyan',
        }),
      });

      if (res.ok) {
        setShowAddCourse(false);
        setNewCourseCode('');
        setNewCourseName('');
        setNewCourseInstructor('');
        setNewCourseSchedule('');
        setNewCourseRoom('');
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to add course:', err);
    }
  };

  // Delete Course
  const deleteCourse = async (id: string) => {
    try {
      const res = await fetch(`/api/education/courses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchEducationData();
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  // Copy Note Text
  const copyNoteContent = () => {
    if (generatedNote?.content) {
      navigator.clipboard.writeText(generatedNote.content);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    }
  };

  // Download Note as Markdown
  const downloadNote = () => {
    if (generatedNote?.content) {
      const blob = new Blob([generatedNote.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedNote.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Format time remaining for assignment
  const getDueTimeText = (dueDateStr: string) => {
    const diffHours = (new Date(dueDateStr).getTime() - Date.now()) / (3600 * 1000);
    if (diffHours < 0) return 'OVERDUE';
    if (diffHours < 24) return `Due in ${Math.round(diffHours)} hours`;
    const days = Math.round(diffHours / 24);
    return `Due in ${days} day${days > 1 ? 's' : ''}`;
  };

  if (!isOpen) return null;

  const urgentAssignmentsCount = assignments.filter((a) => a.status !== 'completed' && a.priority === 'high').length;
  const filteredEduNotes = educationNotesList.filter(
    (n) =>
      n.title.toLowerCase().includes(notesSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(notesSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-6xl bg-[#08121e] border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,212,255,0.2)] flex flex-col h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-cyan-500/20 bg-[#050c16] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,212,255,0.3)]">
              <GraduationCap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-hud text-base sm:text-lg font-bold tracking-wider text-cyan-200">
                  ACADEMIC INTELLIGENCE & EDUCATION MATRIX
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-hud bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                  {stats.streakDays} DAY STREAK
                </span>
              </div>
              <div className="text-[10px] font-mono-hud text-slate-400 tracking-wider">
                Autonomous Study Note Synthesizer & Real-Time Coursework Telemetry
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEducationData}
              disabled={refreshing}
              className="px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-mono-hud flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,212,255,0.1)]"
              title="Audit & Refresh All Education Updates"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">CHECK UPDATES</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div className="px-5 border-b border-cyan-500/15 bg-[#060e1a] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 text-xs font-hud">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'briefing'
                ? 'border-cyan-400 text-cyan-200 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5'
            }`}
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>DAILY BRIEFING & ALL UPDATES</span>
            {urgentAssignmentsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/30 border border-rose-500 text-rose-300">
                {urgentAssignmentsCount} URGENT
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-cyan-400 text-cyan-200 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5'
            }`}
          >
            <Brain className="w-4 h-4 text-purple-400" />
            <span>AI NOTE-MAKER ("MAKE NOTES FOR ME")</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/30 border border-purple-400 text-purple-200">
              AI TUTOR
            </span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'courses'
                ? 'border-cyan-400 text-cyan-200 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5'
            }`}
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>ENROLLED COURSES ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'border-cyan-400 text-cyan-200 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ASSIGNMENTS & DEADLINES ({assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('study')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'study'
                ? 'border-cyan-400 text-cyan-200 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5'
            }`}
          >
            <Timer className="w-4 h-4 text-amber-400" />
            <span>STUDY POMODORO & HABIT</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#08121e]">
          {/* TAB 1: DAILY BRIEFING & ALL UPDATES */}
          {activeTab === 'briefing' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Daily Intelligence Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-[#0a1829] to-teal-950/40 border border-cyan-500/35 shadow-[0_0_20px_rgba(0,212,255,0.12)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shrink-0">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-hud text-xs font-bold text-cyan-300 tracking-wider">
                        J.A.R.V.I.S. DAILY ACADEMIC INTELLIGENCE BRIEF
                      </span>
                      <span className="text-[10px] font-mono-hud text-emerald-400 bg-emerald-950/40 px-2 py-0.2 rounded border border-emerald-500/30">
                        ALL COURSES AUDITED
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed max-w-3xl">
                      {summaryVoiceText ||
                        'Good day, sir. All academic parameters have been audited. You have active lectures scheduled today, 2 assignments due within 72 hours, and a 7-day study streak intact.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('notes')}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,212,255,0.2)] shrink-0"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>MAKE STUDY NOTES</span>
                </button>
              </div>

              {/* 4 Metric Telemetry Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#060c16] border border-cyan-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>TODAY'S CLASSES</span>
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-hud font-bold text-cyan-200">
                      {todayClasses.length}
                    </span>
                    <span className="text-[10px] font-mono-hud text-slate-400">LECTURES TODAY</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c16] border border-cyan-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>URGENT DEADLINES</span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-hud font-bold text-rose-300">
                      {urgentAssignmentsCount}
                    </span>
                    <span className="text-[10px] font-mono-hud text-slate-400">NEXT 48 HOURS</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c16] border border-cyan-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>DAILY STUDY GOAL</span>
                    <Timer className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-hud font-bold text-amber-300">
                      {stats.dailyStudyHoursDone}h
                    </span>
                    <span className="text-xs text-slate-400">/ {stats.dailyStudyHoursGoal}h</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                      style={{
                        width: `${Math.min(100, (stats.dailyStudyHoursDone / stats.dailyStudyHoursGoal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c16] border border-cyan-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>AVG SYLLABUS</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-hud font-bold text-emerald-300">
                      {courses.length > 0
                        ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)
                        : 75}
                      %
                    </span>
                    <span className="text-[10px] font-mono-hud text-slate-400">COMPLETED</span>
                  </div>
                </div>
              </div>

              {/* Today's Schedule & Urgent Tasks Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Today's Lectures (lg:col-span-7) */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-[#060c16] border border-cyan-500/20 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span className="font-hud text-xs font-bold text-cyan-200 tracking-wider">
                        TODAY'S LECTURES & TIMETABLE
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-hud text-slate-400">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {todayClasses.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-900/40 text-center text-xs text-slate-400 font-mono-hud">
                        No lectures scheduled for today. Time is clear for self-directed study and coursework.
                      </div>
                    ) : (
                      todayClasses.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg bg-[#0a1524] border border-cyan-500/25 flex items-center justify-between hover:border-cyan-400/50 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-hud font-bold text-xs text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-100">{c.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-hud mt-1 flex items-center gap-3">
                              <span>Instructor: {c.instructor}</span>
                              <span>•</span>
                              <span>Room: {c.room}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono-hud font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
                              {c.schedule.split(' ')[1] || c.schedule}
                            </span>
                            <div className="text-[9px] text-emerald-400 font-mono-hud mt-1">
                              Attendance: {c.attendance}%
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Deadlines Radar (lg:col-span-5) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-[#060c16] border border-cyan-500/20 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="font-hud text-xs font-bold text-amber-200 tracking-wider">
                        ACTIVE COURSEWORK & DEADLINES
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('assignments')}
                      className="text-[10px] font-mono-hud text-cyan-400 hover:underline"
                    >
                      VIEW ALL
                    </button>
                  </div>

                  <div className="space-y-2">
                    {assignments.slice(0, 4).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => toggleAssignmentStatus(a.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          a.status === 'completed'
                            ? 'bg-emerald-950/20 border-emerald-500/30 opacity-60'
                            : a.priority === 'high'
                            ? 'bg-rose-950/25 border-rose-500/40 hover:bg-rose-900/30'
                            : 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {a.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-medium truncate ${
                                a.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {a.title}
                            </div>
                            <div className="text-[10px] font-mono-hud text-slate-400">
                              <span className="text-cyan-400">{a.courseCode}</span> • {getDueTimeText(a.dueDate)}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono-hud px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            a.priority === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {a.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Global Education & Research Feed */}
              <div className="p-4 rounded-xl bg-[#060c16] border border-cyan-500/20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span className="font-hud text-xs font-bold text-teal-200 tracking-wider">
                      GLOBAL EDUCATION & RESEARCH INTELLIGENCE (DAILY UPDATE FEED)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-hud text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    LIVE ACADEMIC WIRE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {academicNews.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#08121f] border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono-hud mb-1">
                          <span className="text-cyan-400 font-semibold">{item.category}</span>
                          <span className="text-slate-500">{item.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 leading-snug">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.summary}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-hud text-slate-500">
                        <span>Source: {item.source}</span>
                        <span className="text-cyan-400 flex items-center gap-0.5">VERIFIED</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI NOTE-MAKER ("MAKING NOTES FOR ME") */}
          {activeTab === 'notes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full animate-fadeIn">
              {/* Left Column: Generator Form & Education Notes Repository list (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Note Generation Form */}
                <div className="p-4 rounded-xl bg-[#060c16] border border-purple-500/35 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="font-hud text-xs font-bold text-purple-200 tracking-wider">
                      J.A.R.V.I.S. AI NOTE-MAKER
                    </span>
                  </div>

                  <form onSubmit={handleGenerateNotes} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono-hud text-slate-400 mb-1">
                        TOPIC OR LECTURE SUBJECT:
                      </label>
                      <input
                        type="text"
                        value={noteTopic}
                        onChange={(e) => setNoteTopic(e.target.value)}
                        placeholder="e.g. Binary Search Trees & AVL Balancing, Quantum Superposition..."
                        className="w-full bg-[#0a1524] border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono-hud text-slate-400 mb-1">
                          SUBJECT AREA:
                        </label>
                        <select
                          value={noteSubject}
                          onChange={(e) => setNoteSubject(e.target.value)}
                          className="w-full bg-[#0a1524] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono-hud"
                        >
                          <option value="Computer Science & Technology">Computer Science</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Biology & Genetics">Biology</option>
                          <option value="History & Civilization">History</option>
                          <option value="Economics & Finance">Economics</option>
                          <option value="Engineering Systems">Engineering</option>
                          <option value="General Academics">General</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-hud text-slate-400 mb-1">
                          TARGET FORMAT:
                        </label>
                        <select
                          value={noteFormat}
                          onChange={(e) => setNoteFormat(e.target.value)}
                          className="w-full bg-[#0a1524] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono-hud"
                        >
                          <option value="Comprehensive Study Guide">Comprehensive Guide</option>
                          <option value="Exam Revision Cheatsheet">Exam Cheatsheet</option>
                          <option value="Lecture Summary & Bullets">Lecture Summary</option>
                          <option value="High-Yield Flashcards & Quiz">Flashcards & Quiz</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono-hud text-slate-400 mb-1">
                        PASTE RAW LECTURE TRANSCRIPT / TEXT (OPTIONAL):
                      </label>
                      <textarea
                        rows={3}
                        value={rawLectureText}
                        onChange={(e) => setRawLectureText(e.target.value)}
                        placeholder="Paste lecture excerpts, textbook excerpts, or audio transcripts to synthesize..."
                        className="w-full bg-[#0a1524] border border-cyan-500/30 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono-hud resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isGeneratingNotes || (!noteTopic.trim() && !rawLectureText.trim())}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-cyan-600 to-teal-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-hud tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isGeneratingNotes ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>SYNTHESIZING ACADEMIC NOTES...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          <span>GENERATE STUDY NOTES FOR ME</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Education Notes Repository Search & List */}
                <div className="p-4 rounded-xl bg-[#060c16] border border-cyan-500/20 flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="font-hud text-xs font-bold text-cyan-300 tracking-wider">
                      EDUCATION NOTE REPOSITORY ({educationNotesList.length})
                    </span>
                  </div>

                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={notesSearch}
                      onChange={(e) => setNotesSearch(e.target.value)}
                      placeholder="Search notes by subject or title..."
                      className="w-full bg-[#0a1524] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1.5 overflow-y-auto max-h-[260px] pr-1">
                    {filteredEduNotes.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 font-mono-hud">
                        No education notes yet. Generate your first one above!
                      </div>
                    ) : (
                      filteredEduNotes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => setGeneratedNote(note)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            generatedNote?.id === note.id
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                              : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="text-xs font-semibold truncate">{note.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono-hud flex items-center justify-between mt-1">
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            {note.tags && note.tags.length > 1 && (
                              <span className="text-purple-300">#{note.tags[1]}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Note Viewer & Export Matrix (lg:col-span-7) */}
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-[#060c16] border border-cyan-500/25 flex flex-col h-full min-h-[450px]">
                {generatedNote ? (
                  <div className="flex flex-col h-full">
                    {/* Note Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-cyan-200">
                          {generatedNote.title}
                        </h3>
                        <div className="text-[10px] font-mono-hud text-slate-400 mt-0.5">
                          Archived: {new Date(generatedNote.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={copyNoteContent}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-hud flex items-center gap-1 transition-colors"
                          title="Copy Full Note Markdown"
                        >
                          {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                          <span>{copiedNote ? 'COPIED' : 'COPY'}</span>
                        </button>

                        <button
                          onClick={downloadNote}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-hud flex items-center gap-1 transition-colors"
                          title="Download Markdown Document"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-400" />
                          <span>EXPORT .MD</span>
                        </button>
                      </div>
                    </div>

                    {/* Note Content Viewer */}
                    <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed selection:bg-purple-500/30 selection:text-purple-200">
                      {generatedNote.content}
                    </div>

                    {/* Tags Footer */}
                    {generatedNote.tags && generatedNote.tags.length > 0 && (
                      <div className="pt-3 border-t border-slate-800 mt-3 flex items-center gap-2 flex-wrap">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        {generatedNote.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono-hud bg-purple-950/40 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 font-mono-hud">
                    <Brain className="w-12 h-12 text-slate-700 mb-3" />
                    <div className="text-sm font-bold text-slate-400">NO STUDY NOTE ACTIVE</div>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm">
                      Enter any subject, lecture topic, or exam concept in the panel on the left and click "Generate Study Notes For Me".
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ENROLLED COURSES & SYLLABUS */}
          {activeTab === 'courses' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-hud font-bold text-cyan-200 tracking-wider">
                    ENROLLED COURSES & SYLLABUS PROGRESS TRACKER
                  </h3>
                  <div className="text-xs text-slate-400 font-mono-hud mt-0.5">
                    Track attendance, syllabus completion rates, and next exam warnings
                  </div>
                </div>

                <button
                  onClick={() => setShowAddCourse(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,212,255,0.15)]"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ADD COURSE</span>
                </button>
              </div>

              {/* Course Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl bg-[#060c16] border border-cyan-500/25 hover:border-cyan-400/50 transition-all shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono-hud font-bold text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                          {course.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono-hud text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                            {course.attendance}% ATTENDANCE
                          </span>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            title="Remove Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100">{course.name}</h4>
                      <div className="text-xs text-slate-400 font-mono-hud mt-1">
                        Instructor: <span className="text-slate-200">{course.instructor}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono-hud mt-0.5">
                        Schedule: <span className="text-cyan-300">{course.schedule}</span> ({course.room})
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono-hud mb-1.5">
                        <span className="text-slate-400">Syllabus Completion:</span>
                        <span className="text-cyan-300 font-bold">{course.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      <div className="p-2 rounded-lg bg-[#0a1524] border border-cyan-500/20 text-[10px] font-mono-hud flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">EXAM RADAR:</span>
                        <span className="text-amber-300 font-bold">{course.nextExam}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Course Modal */}
              {showAddCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                  <div className="w-full max-w-md bg-[#0a1524] border border-cyan-500/50 rounded-xl p-5 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <h4 className="font-hud text-sm font-bold text-cyan-200">ENROLL IN COURSE</h4>
                      <button onClick={() => setShowAddCourse(false)} className="text-slate-400 hover:text-cyan-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddCourse} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">COURSE CODE:</label>
                        <input
                          type="text"
                          required
                          value={newCourseCode}
                          onChange={(e) => setNewCourseCode(e.target.value)}
                          placeholder="e.g. CS-305 or MATH-210"
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">COURSE TITLE:</label>
                        <input
                          type="text"
                          required
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          placeholder="e.g. Operating Systems & Kernel Internals"
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">INSTRUCTOR / PROFESSOR:</label>
                        <input
                          type="text"
                          value={newCourseInstructor}
                          onChange={(e) => setNewCourseInstructor(e.target.value)}
                          placeholder="e.g. Dr. Alan Turing"
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 font-mono-hud mb-1">SCHEDULE:</label>
                          <input
                            type="text"
                            value={newCourseSchedule}
                            onChange={(e) => setNewCourseSchedule(e.target.value)}
                            placeholder="e.g. Tue, Thu 10:00 AM"
                            className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-mono-hud mb-1">ROOM / LINK:</label>
                          <input
                            type="text"
                            value={newCourseRoom}
                            onChange={(e) => setNewCourseRoom(e.target.value)}
                            placeholder="e.g. Hall 4B or Zoom"
                            className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddCourse(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-mono-hud"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 rounded-lg font-mono-hud"
                        >
                          Save Course
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ASSIGNMENTS & DEADLINES */}
          {activeTab === 'assignments' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-hud font-bold text-cyan-200 tracking-wider">
                    COURSEWORK & ACADEMIC DEADLINES MATRIX
                  </h3>
                  <div className="text-xs text-slate-400 font-mono-hud mt-0.5">
                    Track homework, project milestones, and exam submissions
                  </div>
                </div>

                <button
                  onClick={() => setShowAddAssignment(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 text-xs font-hud tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,212,255,0.15)]"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ADD ASSIGNMENT</span>
                </button>
              </div>

              {/* Assignment List */}
              <div className="space-y-2.5">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      assign.status === 'completed'
                        ? 'bg-[#060c16]/50 border-emerald-500/30 opacity-70'
                        : assign.priority === 'high'
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400/60'
                        : 'bg-[#060c16] border-cyan-500/25 hover:border-cyan-400/50'
                    }`}
                  >
                    <div
                      onClick={() => toggleAssignmentStatus(assign.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-3"
                    >
                      {assign.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0 hover:text-cyan-400" />
                      )}
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            assign.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'
                          }`}
                        >
                          {assign.title}
                        </div>
                        <div className="text-xs text-slate-400 font-mono-hud mt-0.5 flex items-center gap-2">
                          <span className="text-cyan-300 font-bold bg-cyan-950/50 px-1.5 py-0.2 rounded border border-cyan-500/30">
                            {assign.courseCode}
                          </span>
                          <span>{assign.weight}</span>
                          <span>•</span>
                          <span className={assign.priority === 'high' ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
                            {getDueTimeText(assign.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono-hud px-2 py-0.5 rounded border uppercase ${
                          assign.status === 'completed'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                            : assign.status === 'in_progress'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {assign.status.replace('_', ' ')}
                      </span>

                      <button
                        onClick={() => deleteAssignment(assign.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Assignment Modal */}
              {showAddAssignment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                  <div className="w-full max-w-md bg-[#0a1524] border border-cyan-500/50 rounded-xl p-5 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <h4 className="font-hud text-sm font-bold text-cyan-200">ADD COURSEWORK DEADLINE</h4>
                      <button onClick={() => setShowAddAssignment(false)} className="text-slate-400 hover:text-cyan-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddAssignment} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">ASSIGNMENT TITLE:</label>
                        <input
                          type="text"
                          required
                          value={newAssignTitle}
                          onChange={(e) => setNewAssignTitle(e.target.value)}
                          placeholder="e.g. Implement Dijkstra Algorithm..."
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 font-mono-hud mb-1">COURSE CODE:</label>
                          <select
                            value={newAssignCourse}
                            onChange={(e) => setNewAssignCourse(e.target.value)}
                            className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                          >
                            {courses.map((c) => (
                              <option key={c.id} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                            <option value="GENERAL">GENERAL</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 font-mono-hud mb-1">PRIORITY:</label>
                          <select
                            value={newAssignPriority}
                            onChange={(e) => setNewAssignPriority(e.target.value as any)}
                            className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                          >
                            <option value="high">High (Urgent)</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">DUE DATE:</label>
                        <input
                          type="datetime-local"
                          value={newAssignDueDate}
                          onChange={(e) => setNewAssignDueDate(e.target.value)}
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-mono-hud mb-1">WEIGHT / GRADE IMPACT:</label>
                        <input
                          type="text"
                          value={newAssignWeight}
                          onChange={(e) => setNewAssignWeight(e.target.value)}
                          placeholder="e.g. 15% of Final Grade"
                          className="w-full bg-[#060c16] border border-cyan-500/30 rounded-lg p-2 text-cyan-100"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddAssignment(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-mono-hud"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/50 text-cyan-200 rounded-lg font-mono-hud"
                        >
                          Save Assignment
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STUDY POMODORO & HABIT */}
          {activeTab === 'study' && (
            <div className="max-w-xl mx-auto space-y-6 py-4 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-[#060c16] border border-cyan-500/30 shadow-[0_0_30px_rgba(0,212,255,0.12)] text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono-hud mb-4">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>J.A.R.V.I.S. DEEP STUDY POMODORO MATRIX</span>
                </div>

                {/* Big Digital Clock */}
                <div className="text-6xl sm:text-7xl font-mono-hud font-bold text-cyan-200 tracking-wider my-4 drop-shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                  {Math.floor(pomodoroSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(pomodoroSeconds % 60).toString().padStart(2, '0')}
                </div>

                <div className="text-xs text-slate-400 font-mono-hud mb-6">
                  {isPomodoroActive
                    ? 'Session in progress: Acoustic frequencies focused, notifications minimized'
                    : '25-Minute High-Yield Study Sprint'}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-hud text-xs tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                  >
                    {isPomodoroActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPomodoroActive ? 'PAUSE SESSION' : 'START STUDY SPRINT'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPomodoroActive(false);
                      setPomodoroSeconds(25 * 60);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Reset to 25m"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Study Habit Overview */}
              <div className="p-4 rounded-xl bg-[#060c16] border border-slate-800 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-mono-hud">SESSIONS TODAY</div>
                  <div className="text-xl font-bold font-hud text-cyan-200 mt-1">{completedSessions}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-mono-hud">HOURS LOGGED</div>
                  <div className="text-xl font-bold font-hud text-amber-300 mt-1">{stats.dailyStudyHoursDone}h</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-mono-hud">HABIT STREAK</div>
                  <div className="text-xl font-bold font-hud text-emerald-300 mt-1 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                    {stats.streakDays} Days
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
