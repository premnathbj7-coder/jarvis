import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, ShieldCheck, Activity, Database, Clock } from 'lucide-react';

interface SystemStats {
  platform: string;
  hostname: string;
  cpus: number;
  cpuModel: string;
  cpuLoad: number;
  memory: {
    totalGb: string;
    usedGb: string;
    percent: number;
  };
  uptime: string;
  status: string;
}

interface StatusPanelProps {
  onOpenSystemModal?: () => void;
  memoryCount: number;
  activeTimersCount: number;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  onOpenSystemModal,
  memoryCount,
  activeTimersCount,
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load system diagnostics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onClick={onOpenSystemModal}
      className="w-full bg-[#160408]/85 border border-red-500/35 hover:border-yellow-400/60 rounded-xl p-3 backdrop-blur-md transition-all shadow-[0_0_20px_rgba(239,68,68,0.12)] cursor-pointer group"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </div>
          <span className="font-hud font-semibold text-yellow-300 tracking-wider">
            {loading ? 'CALIBRATING...' : stats?.status || 'ONLINE // STARK SECURE'}
          </span>
        </div>

        {/* CPU Metric */}
        <div className="flex items-center gap-2 text-amber-100">
          <Cpu className="w-3.5 h-3.5 text-red-400" />
          <span className="text-amber-200/70">CPU:</span>
          <span className="font-mono-hud text-yellow-300 font-bold">
            {stats ? `${stats.cpuLoad}%` : '18%'}
          </span>
          <div className="w-14 h-1.5 bg-red-950/80 rounded-full overflow-hidden border border-red-900/50">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${stats ? stats.cpuLoad : 18}%` }}
            />
          </div>
        </div>

        {/* Memory Metric */}
        <div className="flex items-center gap-2 text-amber-100">
          <HardDrive className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-amber-200/70">RAM:</span>
          <span className="font-mono-hud text-yellow-200 font-bold">
            {stats ? `${stats.memory.percent}%` : '42%'}
          </span>
          <span className="text-[10px] text-amber-200/60 hidden sm:inline">
            ({stats ? `${stats.memory.usedGb}/${stats.memory.totalGb} GB` : '4.2/16 GB'})
          </span>
        </div>

        {/* Local Memory Store */}
        <div className="flex items-center gap-1.5 text-amber-100">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-200/70">MEMORIES:</span>
          <span className="font-mono-hud text-yellow-300 font-bold">{memoryCount}</span>
        </div>

        {/* Active Timers */}
        {activeTimersCount > 0 && (
          <div className="flex items-center gap-1.5 text-yellow-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-mono-hud font-bold">{activeTimersCount} TIMERS ACTIVE</span>
          </div>
        )}

        {/* Platform info */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-amber-200/60 font-mono-hud">
          <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
          <span>{stats?.platform || 'LINUX-X64'}</span>
        </div>
      </div>
    </div>
  );
};
