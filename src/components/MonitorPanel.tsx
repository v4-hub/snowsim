import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { ChevronRight, ChevronLeft, Activity, Eye, Snowflake, Wind } from 'lucide-react';

export default function MonitorPanel() {
  const { rightPanelOpen, setRightPanelOpen, metrics, windSpeed, snowIntensity, terrainRoughness } = useSimulationStore();
  const [history, setHistory] = useState<any[]>([]);
  const [windProfile, setWindProfile] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = useSimulationStore.getState().metrics;
      setHistory((prev) => {
        const newHist = [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }), ...currentMetrics }];
        if (newHist.length > 20) newHist.shift(); // Keep last 20 points
        return newHist;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Generate Wind Profile Data (Height vs Speed)
    const profile = [];
    for (let h = 1; h <= 30; h += 2) {
      const zRef = 10;
      const height = Math.max(h, terrainRoughness + 0.01);
      const profileFactor = Math.log(height / terrainRoughness) / Math.log(zRef / terrainRoughness);
      const speed = windSpeed * Math.max(0, profileFactor);
      profile.push({ height: h, speed: Number(speed.toFixed(1)) });
    }
    setWindProfile(profile);
  }, [windSpeed, terrainRoughness]);

  if (!rightPanelOpen) {
    return (
      <button
        onClick={() => setRightPanelOpen(true)}
        className="absolute top-4 right-4 z-20 p-2 bg-slate-900/90 text-white rounded-lg backdrop-blur-md border border-slate-700/50 shadow-2xl hover:bg-slate-800 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-slate-900/90 text-slate-200 p-6 overflow-y-auto flex flex-col gap-6 backdrop-blur-md border-l border-slate-700/50 shadow-2xl z-10">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <button onClick={() => setRightPanelOpen(false)} className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-lg font-bold text-white tracking-tight">EDP Monitor</h1>
            <p className="text-xs text-slate-400">Engineering Demand Params</p>
          </div>
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Current Wind (Gust)</div>
          <div className="text-lg font-mono text-blue-400">{metrics.currentWindSpeed} <span className="text-xs">m/s</span></div>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1">Snow Intensity</div>
          <div className="text-lg font-mono text-blue-400">{(snowIntensity / 1000).toFixed(0)}k <span className="text-xs">pts</span></div>
        </div>
      </div>

      {/* Wind Profile Chart */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Wind className="w-4 h-4" /> Log Wind Profile
        </h2>

        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400">Height (m) vs Speed (m/s)</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={windProfile} layout="vertical" margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" dataKey="speed" stroke="#94a3b8" fontSize={10} tickCount={4} />
                <YAxis type="number" dataKey="height" stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '12px' }}
                  formatter={(value: number) => [`${value} m/s`, 'Speed']}
                  labelFormatter={(label) => `Height: ${label}m`}
                />
                <Line type="monotone" dataKey="speed" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2, fill: '#60a5fa' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visibility Charts */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" /> Visibility
        </h2>
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> With Barriers</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" style={{ borderTop: '1px dashed' }}></span> No Barriers</span>
        </div>

        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400">Forward (Right Lane)</span>
            <div className="flex items-center gap-2">
              {(() => {
                const delta = metrics.forwardVisibility - metrics.baselineForwardVisibility;
                if (delta === 0) return null;
                return (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta}%
                  </span>
                );
              })()}
              <span className="text-lg font-mono text-emerald-400">{metrics.forwardVisibility}%</span>
            </div>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <Line type="monotone" dataKey="forwardVisibility" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} name="With Barriers" />
                <Line type="monotone" dataKey="baselineForwardVisibility" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="No Barriers" />
                <YAxis domain={[0, 100]} hide />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400">Reverse (Left Lane)</span>
            <div className="flex items-center gap-2">
              {(() => {
                const delta = metrics.reverseVisibility - metrics.baselineReverseVisibility;
                if (delta === 0) return null;
                return (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta}%
                  </span>
                );
              })()}
              <span className="text-lg font-mono text-emerald-400">{metrics.reverseVisibility}%</span>
            </div>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <Line type="monotone" dataKey="reverseVisibility" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} name="With Barriers" />
                <Line type="monotone" dataKey="baselineReverseVisibility" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="No Barriers" />
                <YAxis domain={[0, 100]} hide />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Snow on Road Chart */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Snowflake className="w-4 h-4" /> Road Conditions
        </h2>

        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400">Snow Volume in Road</span>
            <span className="text-lg font-mono text-blue-400">{metrics.snowOnRoad} <span className="text-xs">pts</span></span>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorSnow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="snowOnRoad" stroke="#60a5fa" fillOpacity={1} fill="url(#colorSnow)" isAnimationActive={false} />
                <YAxis hide domain={['auto', 'auto']} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
