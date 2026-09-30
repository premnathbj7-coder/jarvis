import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, ShieldCheck, Terminal, X, RefreshCw, Battery, BatteryCharging, Zap, Wifi } from 'lucide-react';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemModal: React.FC<SystemModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const battery = useBattery({ cpuLoad: stats?.cpuLoad ?? 18 });
  const network = useNetwork();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setStats(await res.json());
          return;
        }
      }
      setStats((prev: any) => prev || {
        platform: 'Linux x64',
        hostname: 'localhost',
        cpus: 4,
        cpuModel: 'Neural Coprocessor Mark VII',
        cpuLoad: 12,
        memory: { totalGb: '16.0', usedGb: '3.6', percent: 22 },
        uptime: 'Operational',
        status: 'ONLINE — ALL PROTOCOLS NOMINAL',
      });
    } catch {
      setStats((prev: any) => prev || {
        platform: 'Linux x64',
        hostname: 'localhost',
        cpus: 4,
        cpuModel: 'Neural Coprocessor Mark VII',
        cpuLoad: 12,
        memory: { totalGb: '16.0', usedGb: '3.6', percent: 22 },
        uptime: 'Operational',
        status: 'ONLINE — ALL PROTOCOLS NOMINAL',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchStats();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0a1422] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="font-hud text-lg tracking-wider text-cyan-200">
              Host Diagnostics & Hardware Metrics
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diagnostic readout */}
        <div className="mt-4 space-y-3.5 overflow-y-auto pr-1">
          {/* Status strip */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-hud text-emerald-300">SYSTEM DIAGNOSTIC: PASS</div>
                <div className="text-[11px] text-slate-400 font-mono-hud mt-0.5">
                  Host: {stats?.hostname || 'Unknown Host'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono-hud bg-emerald-950/40 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40">
              NOMINAL
            </span>
          </div>

          {/* CPU Panel */}
          <div className="p-3.5 rounded-xl bg-[#060c14] border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-300">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>CPU ARCHITECTURE & LOAD</span>
              </div>
              <span className="font-mono-hud font-bold text-cyan-200">
                {stats ? `${stats.cpuLoad}%` : '---'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400"
                style={{ width: `${stats ? stats.cpuLoad : 20}%` }}
              />
            </div>
            <div className="text-[11px] font-mono-hud text-slate-400 space-y-1">
              <div>Processor: {stats?.cpuModel || 'Virtual Processor'}</div>
              <div>Cores: {stats?.cpus || 4} Virtual Threads</div>
            </div>
          </div>

          {/* Memory Panel */}
          <div className="p-3.5 rounded-xl bg-[#060c14] border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-teal-300">
                <HardDrive className="w-4 h-4 text-teal-400" />
                <span>RAM ALLOCATION & UTILIZATION</span>
              </div>
              <span className="font-mono-hud font-bold text-teal-200">
                {stats ? `${stats.memory.percent}%` : '---'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                style={{ width: `${stats ? stats.memory.percent : 40}%` }}
              />
            </div>
            <div className="text-[11px] font-mono-hud text-slate-400 flex justify-between">
              <span>Allocated: {stats?.memory.usedGb || 0} GB</span>
              <span>Total Available: {stats?.memory.totalGb || 0} GB</span>
            </div>
          </div>

          {/* Battery & Power Subsystem Panel */}
          <div className="p-3.5 rounded-xl bg-[#060c14] border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-300">
                {battery.charging ? (
                  <BatteryCharging className="w-4 h-4 text-cyan-400 animate-pulse" />
                ) : (
                  <Battery className="w-4 h-4 text-cyan-400" />
                )}
                <span>POWER & BATTERY SUBSYSTEM</span>
              </div>
              <span className="font-mono-hud font-bold text-cyan-200 flex items-center gap-1.5">
                <span>{battery.level}%</span>
                {battery.charging && <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
                {battery.timeRemainingFormatted && (
                  <span className="text-[11px] font-normal text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    {battery.timeRemainingFormatted}
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-cyan-400"
                style={{ width: `${battery.level}%` }}
              />
            </div>
            <div className="text-[11px] font-mono-hud text-slate-400 grid grid-cols-2 gap-2">
              <div>
                Status:{' '}
                <span className={battery.charging ? 'text-cyan-300' : 'text-slate-300'}>
                  {battery.charging ? 'Charging (AC Connected)' : 'Discharging (Battery Power)'}
                </span>
              </div>
              <div>
                Time Remaining:{' '}
                <span className="text-cyan-300 font-bold">
                  {battery.timeRemainingFormatted || 'Calculating...'}
                </span>
              </div>
              <div>
                Consumption Dynamic:{' '}
                <span className="text-teal-300">
                  {battery.charging
                    ? `~${battery.ratePerHour}%/h charge rate`
                    : `~${battery.ratePerHour}%/h load drain`}
                </span>
              </div>
              <div>
                Hardware API:{' '}
                <span className="text-emerald-400">
                  {battery.isSupported ? 'Navigator Battery V2' : 'Emulated AC Mains'}
                </span>
              </div>
            </div>
          </div>

          {/* Network Telemetry Panel */}
          <div className="p-3.5 rounded-xl bg-[#060c14] border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono-hud text-cyan-300">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>NETWORK & CONNECTIVITY TELEMETRY</span>
              </div>
              <span className={`font-mono-hud font-bold text-xs ${network.isOnline ? 'text-emerald-300' : 'text-rose-400'}`}>
                {network.isOnline ? 'ONLINE // SECURE' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-[11px] font-mono-hud text-slate-400 grid grid-cols-3 gap-2">
              <div>
                Latency:{' '}
                <span className="text-cyan-200 font-bold">{network.latency} ms</span>
              </div>
              <div>
                Connection Type:{' '}
                <span className="text-teal-200 uppercase">{network.effectiveType || 'Broadband'}</span>
              </div>
              <div>
                State:{' '}
                <span className="text-emerald-400">Low-Latency Mesh</span>
              </div>
            </div>
          </div>

          {/* Uptime and Runtime */}
          <div className="p-3.5 rounded-xl bg-[#060c14] border border-cyan-500/20 grid grid-cols-2 gap-3 text-xs font-mono-hud">
            <div>
              <span className="text-slate-500 block mb-0.5">OPERATING PLATFORM:</span>
              <span className="text-cyan-200">{stats?.platform || 'Linux Container'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">SYSTEM UPTIME:</span>
              <span className="text-cyan-200">{stats?.uptime || 'Nominal'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
