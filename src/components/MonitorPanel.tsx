import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronLeft, Activity, Eye, Snowflake, Wind, Shield, ShieldOff, AlertTriangle } from 'lucide-react';

// Visibility % → approximate distance (600m max reference for good weather)
function visibilityDistance(pct: number): string {
  const dist = Math.round((pct / 100) * 600);
  if (dist >= 500) return `≈ ${dist}m`;
  return `≈ ${dist}m`;
}

// SVG Semi-circle Gauge component
function Gauge({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const radius = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const circumference = Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  // Color: 5-tier system
  const getColor = (v: number) => {
    if (v > 85) return '#34d399'; // emerald
    if (v > 70) return '#4ade80'; // green
    if (v > 50) return '#fbbf24'; // amber
    if (v > 30) return '#fb923c'; // orange
    return '#f87171'; // red
  };
  const getStatus = (v: number) => {
    if (v > 85) return 'EXCELLENT';
    if (v > 70) return 'GOOD';
    if (v > 50) return 'MODERATE';
    if (v > 30) return 'POOR';
    return 'HAZARDOUS';
  };

  const color = getColor(clampedValue);
  const statusText = getStatus(clampedValue);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
        />
        {/* Value text */}
        <text x={cx} y={cy - 16} textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {clampedValue}%
        </text>
        {/* Status text */}
        <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize="8" fontWeight="600" letterSpacing="1.2" opacity="0.9">
          {statusText}
        </text>
        {/* Distance estimate */}
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="8" opacity="0.7">
          {visibilityDistance(clampedValue)}
        </text>
      </svg>
      <span className="text-[11px] text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

// Comparison bar showing with/without barriers
function ComparisonBar({ withBarrier, withoutBarrier, label }: { withBarrier: number; withoutBarrier: number; label: string }) {
  const improvement = withBarrier - withoutBarrier;
  const clampWith = Math.max(0, Math.min(100, withBarrier));
  const clampWithout = Math.max(0, Math.min(100, withoutBarrier));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-slate-400">{label}</span>
        {improvement > 0 ? (
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            +{improvement}% safer
          </span>
        ) : improvement === 0 ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30">
            No difference
          </span>
        ) : null}
      </div>
      {/* With Barriers */}
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${clampWith}%`,
              background: 'linear-gradient(90deg, #059669, #34d399)',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-white/90 font-semibold">
            {clampWith}%
          </span>
        </div>
      </div>
      {/* Without Barriers */}
      <div className="flex items-center gap-2">
        <ShieldOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${clampWithout}%`,
              background: 'linear-gradient(90deg, #dc2626, #f87171)',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-white/90 font-semibold">
            {clampWithout}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MonitorPanel() {
  const { rightPanelOpen, setRightPanelOpen, metrics, windSpeed, snowIntensity, terrainRoughness } = useSimulationStore();
  const [history, setHistory] = useState<any[]>([]);
  const [windProfile, setWindProfile] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = useSimulationStore.getState().metrics;
      setHistory((prev) => {
        const newHist = [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }), ...currentMetrics }];
        if (newHist.length > 20) newHist.shift();
        return newHist;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

  // Sticky edge toggle button (always visible on left edge of panel)
  const toggleButton = (
    <button
      onClick={() => setRightPanelOpen(!rightPanelOpen)}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-6 h-16 rounded-l-lg bg-slate-800/95 border border-r-0 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors backdrop-blur-md shadow-lg"
      style={{ right: rightPanelOpen ? '320px' : '0px', transition: 'right 0.3s ease' }}
    >
      <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${rightPanelOpen ? '' : 'rotate-180'}`} />
    </button>
  );

  if (!rightPanelOpen) {
    return toggleButton;
  }

  // Protection score = average improvement
  const avgImprovement = Math.round(
    ((metrics.forwardVisibility - metrics.baselineForwardVisibility) +
      (metrics.reverseVisibility - metrics.baselineReverseVisibility)) / 2
  );

  return (
    <>
      {toggleButton}
      <div className="absolute top-0 right-0 w-80 h-full bg-slate-900/90 text-slate-200 p-6 overflow-y-auto flex flex-col gap-5 backdrop-blur-md border-l border-slate-700/50 shadow-2xl z-10">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
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
        <div className="space-y-3">
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
                  <YAxis type="number" dataKey="height" stroke="#94a3b8" fontSize={10} reversed={true} />
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

        {/* Visibility Gauges */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4" /> Driver Visibility
          </h2>

          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="flex justify-around">
              <Gauge value={metrics.forwardVisibility} label="Forward" size={110} />
              <Gauge value={metrics.reverseVisibility} label="Reverse" size={110} />
            </div>
          </div>

          {/* Barrier Protection Score — always visible */}
          {avgImprovement > 0 ? (
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-emerald-300/70 uppercase tracking-wider font-semibold">Barrier Protection</div>
                <div className="text-xl font-mono font-bold text-emerald-400">+{avgImprovement}% <span className="text-xs font-normal text-emerald-300/60">visibility improvement</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-amber-300/70 uppercase tracking-wider font-semibold">No Barrier Advantage</div>
                <div className="text-xs text-amber-300/60">Enable vegetation barriers to improve visibility</div>
              </div>
            </div>
          )}
        </div>

        {/* With vs Without Barriers comparison */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" /> Barrier Effectiveness
          </h2>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-4">
            <ComparisonBar
              withBarrier={metrics.forwardVisibility}
              withoutBarrier={metrics.baselineForwardVisibility}
              label="Forward (Right Lane)"
            />
            <div className="border-t border-slate-700/40" />
            <ComparisonBar
              withBarrier={metrics.reverseVisibility}
              withoutBarrier={metrics.baselineReverseVisibility}
              label="Reverse (Left Lane)"
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Shield className="w-3 h-3 text-emerald-400" /> With Barriers
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <ShieldOff className="w-3 h-3 text-red-400" /> Without Barriers
            </div>
          </div>
        </div>

        {/* Visibility Trend */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" /> Visibility Trend
          </h2>

          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs text-slate-400">Forward / Reverse over time</span>
            </div>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <Line type="monotone" dataKey="forwardVisibility" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} name="Forward" />
                  <Line type="monotone" dataKey="reverseVisibility" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="Reverse" />
                  <YAxis domain={[0, 100]} hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded"></span> Forward</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded"></span> Reverse</span>
            </div>
          </div>
        </div>

        {/* Snow on Road Chart */}
        <div className="space-y-3">
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
    </>
  );
}
