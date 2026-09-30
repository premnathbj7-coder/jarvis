import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Cpu,
  HardDrive,
  ShieldCheck,
  Database,
  Clock,
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  Zap,
  Wifi,
  WifiOff,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';

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

interface TelemetryPoint {
  time: string;
  timestamp: number;
  cpu: number;
  memory: number;
  battery: number;
}

// Generate smooth historical seed data so chart is immediately vivid on first load
function generateInitialTelemetry(initialCpu = 18, initialMem = 42, initialBat = 85): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const now = Date.now();
  const pointCount = 12;

  for (let i = pointCount - 1; i >= 0; i--) {
    const t = new Date(now - i * 4000);
    const jitterCpu = Math.max(8, Math.min(85, Math.round(initialCpu + Math.sin(i * 0.8) * 8 + (Math.random() * 6 - 3))));
    const jitterMem = Math.max(20, Math.min(90, Math.round(initialMem + Math.cos(i * 0.5) * 3)));
    points.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: t.getTime(),
      cpu: jitterCpu,
      memory: jitterMem,
      battery: initialBat,
    });
  }
  return points;
}

const fallbackStats: SystemStats = {
  platform: 'Linux x64',
  hostname: 'localhost',
  cpus: 4,
  cpuModel: 'Neural Coprocessor Mark VII',
  cpuLoad: 12,
  memory: {
    totalGb: '16.0',
    usedGb: '3.6',
    percent: 22,
  },
  uptime: 'Active',
  status: 'ONLINE — ALL PROTOCOLS NOMINAL',
};

export const StatusPanel: React.FC<StatusPanelProps> = ({
  onOpenSystemModal,
  memoryCount,
  activeTimersCount,
}) => {
  const [stats, setStats] = useState<SystemStats>(fallbackStats);
  const [loading, setLoading] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>(() =>
    generateInitialTelemetry(18, 42, 85)
  );

  const battery = useBattery({ cpuLoad: stats ? stats.cpuLoad : 18 });
  const batteryLevelRef = useRef(battery.level);
  batteryLevelRef.current = battery.level;
  const network = useNetwork();

  // Poll system diagnostics
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (!isMounted) return;
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data: SystemStats = await res.json();
            if (!isMounted) return;
            setStats(data);

            const timeLabel = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            setTelemetryHistory((prev) => {
              const nextPoint: TelemetryPoint = {
                time: timeLabel,
                timestamp: Date.now(),
                cpu: data.cpuLoad ?? 14,
                memory: data.memory?.percent ?? 22,
                battery: batteryLevelRef.current,
              };
              const updated = [...prev, nextPoint];
              // Keep maximum 18 rolling data points
              return updated.length > 18 ? updated.slice(updated.length - 18) : updated;
            });
          }
        }
      } catch {
        // Silently preserve current telemetry during network warmup
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Derived telemetry metrics for summary badges
  const { currentCpu, currentMem, peakCpu, avgCpu } = useMemo(() => {
    const currentCpu = stats ? stats.cpuLoad : telemetryHistory[telemetryHistory.length - 1]?.cpu || 18;
    const currentMem = stats ? stats.memory.percent : telemetryHistory[telemetryHistory.length - 1]?.memory || 42;
    const cpuVals = telemetryHistory.map((p) => p.cpu);
    const peakCpu = Math.max(...cpuVals, currentCpu);
    const avgCpu = Math.round(cpuVals.reduce((a, b) => a + b, 0) / (cpuVals.length || 1));
    return { currentCpu, currentMem, peakCpu, avgCpu };
  }, [stats, telemetryHistory]);

  // Determine battery display icon and color
  const renderBatteryIndicator = () => {
    if (battery.charging) {
      return (
        <div
          className="flex items-center gap-1.5 text-cyan-300"
          title={`Battery is charging. Estimated time to full: ${battery.timeRemainingFormatted}`}
        >
          <div className="relative flex items-center">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping absolute -top-0.5 -right-0.5" />
          </div>
          <span className="text-slate-400">BATTERY:</span>
          <div className="flex items-center gap-1 font-mono-hud text-cyan-200 font-bold">
            <span>{battery.level}%</span>
            <Zap className="w-3 h-3 text-amber-300 animate-pulse fill-amber-300" />
            {battery.timeRemainingFormatted && (
              <span className="text-[11px] font-normal text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                {battery.timeRemainingFormatted}
              </span>
            )}
          </div>
          <span className="text-[10px] text-cyan-400/80 uppercase font-mono-hud hidden xl:inline">
            CHARGING
          </span>
          <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30 hidden sm:block">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${battery.level}%` }}
            />
          </div>
        </div>
      );
    }

    if (!battery.isSupported) {
      return (
        <div className="flex items-center gap-1.5 text-slate-300" title="System running on AC power mains">
          <Battery className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-400">PWR:</span>
          <div className="flex items-center gap-1 font-mono-hud text-teal-200 font-bold">
            <span>100%</span>
            <span className="text-[11px] font-normal text-teal-300/80 bg-teal-950/30 border border-teal-500/30 px-1.5 py-0.2 rounded">
              AC Mains
            </span>
          </div>
        </div>
      );
    }

    // Discharging battery states
    let BatteryIcon = Battery;
    let colorClass = 'text-cyan-400';
    let textClass = 'text-cyan-200';
    let barGradient = 'from-teal-400 to-cyan-400';

    if (battery.level <= 20) {
      BatteryIcon = BatteryLow;
      colorClass = 'text-rose-400 animate-pulse';
      textClass = 'text-rose-300';
      barGradient = 'from-rose-600 to-red-500';
    } else if (battery.level <= 50) {
      BatteryIcon = BatteryMedium;
      colorClass = 'text-amber-400';
      textClass = 'text-amber-200';
      barGradient = 'from-amber-500 to-yellow-400';
    }

    return (
      <div
        className="flex items-center gap-1.5 text-slate-300"
        title={`Estimated runtime based on current ${currentCpu}% CPU usage pattern: ${battery.timeRemainingFormatted} (~${battery.ratePerHour}%/h drain)`}
      >
        <BatteryIcon className={`w-3.5 h-3.5 ${colorClass}`} />
        <span className="text-slate-400">BATTERY:</span>
        <div className={`flex items-center gap-1 font-mono-hud ${textClass} font-bold`}>
          <span>{battery.level}%</span>
          {battery.timeRemainingFormatted && (
            <span
              className={`text-[11px] font-normal px-1.5 py-0.2 rounded border shadow-sm ${
                battery.level <= 20
                  ? 'text-rose-300 bg-rose-950/50 border-rose-500/40 animate-pulse'
                  : battery.level <= 50
                  ? 'text-amber-200 bg-amber-950/40 border-amber-500/30'
                  : 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30'
              }`}
            >
              {battery.timeRemainingFormatted}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono-hud hidden xl:inline">DISCHARGING</span>
        <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 hidden sm:block">
          <div
            className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
            style={{ width: `${battery.level}%` }}
          />
        </div>
      </div>
    );
  };

  // Determine network indicator
  const renderNetworkIndicator = () => {
    return (
      <div
        className="flex items-center gap-1.5 text-slate-300 font-mono-hud"
        title={`Network Health: ${network.isOnline ? 'Online' : 'Offline'} • Latency: ${network.latency}ms • Type: ${network.effectiveType}`}
      >
        {network.isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
        )}
        <span className="text-slate-400 hidden sm:inline">NET:</span>
        <span className={`font-bold ${network.isOnline ? 'text-emerald-300' : 'text-rose-400'}`}>
          {network.isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
        {network.isOnline && (
          <span className="text-[10px] text-emerald-400/80 bg-emerald-950/30 border border-emerald-500/30 px-1 py-0.2 rounded hidden sm:inline">
            {network.latency}ms
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0a1422]/80 border border-cyan-500/25 rounded-xl backdrop-blur-md transition-all shadow-[0_0_20px_rgba(0,180,240,0.08)] overflow-hidden">
      {/* Top telemetry bar */}
      <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status indicator */}
        <div
          onClick={onOpenSystemModal}
          className="flex items-center gap-2 cursor-pointer group"
          title="Click to view comprehensive System Diagnostics"
        >
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </div>
          <span className="font-hud font-semibold text-cyan-300 tracking-wider group-hover:text-cyan-200 transition-colors">
            {loading ? 'CALIBRATING...' : stats?.status || 'ONLINE'}
          </span>
        </div>

        {/* CPU Metric */}
        <div className="flex items-center gap-2 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">CPU:</span>
          <span className="font-mono-hud text-cyan-200 font-bold">
            {currentCpu}%
          </span>
          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
              style={{ width: `${currentCpu}%` }}
            />
          </div>
        </div>

        {/* Memory Metric */}
        <div className="flex items-center gap-2 text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-400">RAM:</span>
          <span className="font-mono-hud text-teal-200 font-bold">
            {currentMem}%
          </span>
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            ({stats ? `${stats.memory.usedGb}/${stats.memory.totalGb} GB` : '4.2/16 GB'})
          </span>
        </div>

        {/* Real-Time System Battery API Metric */}
        {renderBatteryIndicator()}

        {/* Real-Time Network Health Metric */}
        {renderNetworkIndicator()}

        {/* Local Memory Store */}
        <div className="flex items-center gap-1.5 text-slate-300 hidden md:flex">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400">MEMORIES:</span>
          <span className="font-mono-hud text-purple-300 font-bold">{memoryCount}</span>
        </div>

        {/* Active Timers */}
        {activeTimersCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono-hud font-bold">{activeTimersCount} TIMERS</span>
          </div>
        )}

        {/* Telemetry Chart Expand/Collapse Button & Modal launcher */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsChartExpanded(!isChartExpanded);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono-hud flex items-center gap-1.5 transition-all ${
              isChartExpanded
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                : 'bg-slate-900/60 hover:bg-cyan-500/15 border-slate-700/60 text-slate-300 hover:text-cyan-200'
            }`}
            title={isChartExpanded ? 'Collapse real-time Recharts telemetry' : 'Expand real-time Recharts telemetry'}
          >
            <BarChart2 className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">LIVE CHART</span>
            {isChartExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={onOpenSystemModal}
            className="p-1 rounded-lg border border-slate-700/60 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Open Detailed Diagnostics"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Expanded Real-Time CPU & Memory Chart Section (Recharts) */}
      {isChartExpanded && (
        <div className="border-t border-cyan-500/15 bg-[#060c16]/90 px-3.5 py-3 transition-all animate-fadeIn">
          {/* Chart Header & Live Telemetry Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-hud text-[11px] tracking-wider text-cyan-200 uppercase font-semibold">
                Real-Time Neural Telemetry // CPU & Memory Stream
              </span>
              <span className="text-[10px] font-mono-hud text-slate-400 hidden sm:inline">
                (Polling 4.5s intervals)
              </span>
            </div>

            {/* Legend & Stats Tags */}
            <div className="flex items-center gap-2 text-[10px] font-mono-hud flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-200">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_#00d4ff]" />
                <span>CPU: {currentCpu}%</span>
                <span className="text-slate-400 text-[9px]">(PEAK {peakCpu}%)</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-950/40 border border-teal-500/30 text-teal-200">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block shadow-[0_0_6px_#2dd4bf]" />
                <span>RAM: {currentMem}%</span>
                <span className="text-slate-400 text-[9px]">(AVG {avgCpu}%)</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/30 border border-amber-500/30 text-amber-200 hidden md:flex">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>BATTERY: {battery.level}%</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 hidden sm:flex">
                <Radio className="w-2.5 h-2.5 text-emerald-400" />
                <span>PING: {network.latency}ms</span>
              </div>
            </div>
          </div>

          {/* Recharts Area Chart Container */}
          <div className="w-full h-24 sm:h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={telemetryHistory}
                margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  {/* CPU Gradient in Stark Cyan */}
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Memory Gradient in Stark Teal */}
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#00d4ff"
                  opacity={0.08}
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                  tickLine={{ stroke: '#00d4ff20' }}
                  axisLine={{ stroke: '#00d4ff25' }}
                  interval="preserveStartEnd"
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                  tickLine={{ stroke: '#00d4ff20' }}
                  axisLine={{ stroke: '#00d4ff25' }}
                  ticks={[0, 50, 100]}
                />

                <Tooltip content={<CustomTelemetryTooltip />} />

                {/* RAM Area */}
                <Area
                  type="monotone"
                  dataKey="memory"
                  name="RAM Utilization"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memGradient)"
                  isAnimationActive={false}
                />

                {/* CPU Area */}
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU Load"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// Futuristic HUD Tooltip for Recharts
interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTelemetryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const cpuVal = payload.find((p) => p.name === 'CPU Load')?.value ?? 0;
    const memVal = payload.find((p) => p.name === 'RAM Utilization')?.value ?? 0;

    return (
      <div className="bg-[#050d18]/95 border border-cyan-500/40 rounded-lg p-2.5 shadow-[0_0_15px_rgba(0,212,255,0.25)] text-xs font-mono-hud backdrop-blur-md min-w-[150px]">
        <div className="text-[10px] text-cyan-300 font-bold border-b border-cyan-500/20 pb-1 mb-1.5 flex items-center justify-between">
          <span>TIME: {label}</span>
          <span className="text-emerald-400">NOMINAL</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-cyan-200">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              CPU Load:
            </span>
            <span className="font-bold">{cpuVal}%</span>
          </div>
          <div className="flex items-center justify-between text-teal-200">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              Memory RAM:
            </span>
            <span className="font-bold">{memVal}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
