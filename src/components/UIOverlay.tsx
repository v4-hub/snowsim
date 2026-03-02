import React from 'react';
import { useSimulationStore } from '../store';
import { Wind, Snowflake, Trees, Eye, ChevronLeft, ChevronRight, Mountain } from 'lucide-react';

export default function UIOverlay() {
  const {
    windSpeed,
    windDirection,
    terrainRoughness,
    turbulenceIntensity,
    snowIntensity,
    cameraView,
    barriers,
    leftPanelOpen,
    setWindSpeed,
    setWindDirection,
    setTerrainRoughness,
    setTurbulenceIntensity,
    setSnowIntensity,
    setCameraView,
    updateBarrier,
    setLeftPanelOpen,
  } = useSimulationStore();

  if (!leftPanelOpen) {
    return (
      <button
        onClick={() => setLeftPanelOpen(true)}
        className="absolute top-4 left-4 z-20 p-2 bg-slate-900/90 text-white rounded-lg backdrop-blur-md border border-slate-700/50 shadow-2xl hover:bg-slate-800 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="absolute top-0 left-0 w-80 h-full bg-slate-900/90 text-slate-200 p-6 overflow-y-auto flex flex-col gap-6 backdrop-blur-md border-r border-slate-700/50 shadow-2xl z-10">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Snowflake className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Chicoutimi SnowSim</h1>
            <p className="text-xs text-slate-400">WE-UQ Enhanced Modeling</p>
          </div>
        </div>
        <button onClick={() => setLeftPanelOpen(false)} className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* EVT: Wind Event Modeling */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Wind className="w-4 h-4" /> EVT: Wind Event Modeling
        </h2>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label>Mean Wind Speed (U10)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="30"
              value={windSpeed}
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <input
              type="number"
              min="0"
              max="30"
              value={windSpeed}
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-right font-mono text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label>Wind Direction (°)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-180"
              max="180"
              value={windDirection}
              onChange={(e) => setWindDirection(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <input
              type="number"
              min="-180"
              max="180"
              value={windDirection}
              onChange={(e) => setWindDirection(Number(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-right font-mono text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-[10px] text-slate-500">0° is crosswind (West to East)</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label>Turbulence Intensity (TI %)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              value={turbulenceIntensity}
              onChange={(e) => setTurbulenceIntensity(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <input
              type="number"
              min="0"
              max="50"
              value={turbulenceIntensity}
              onChange={(e) => setTurbulenceIntensity(Number(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-right font-mono text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-[10px] text-slate-500">Stochastic gust fluctuation</p>
        </div>
      </div>

      {/* Site Conditions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Mountain className="w-4 h-4" /> Site Conditions
        </h2>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label>Terrain Roughness (z0)</label>
          </div>
          <select
            value={terrainRoughness}
            onChange={(e) => setTerrainRoughness(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value={0.01}>Smooth (0.01m)</option>
            <option value={0.03}>Open Terrain (0.03m)</option>
            <option value={0.1}>Agricultural (0.1m)</option>
            <option value={0.3}>Suburban (0.3m)</option>
            <option value={1.0}>Forest / Urban (1.0m)</option>
          </select>
          <p className="text-[10px] text-slate-500">Affects logarithmic wind profile</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label>Snow Intensity (pts)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="10000"
              max="100000"
              step="10000"
              value={snowIntensity}
              onChange={(e) => setSnowIntensity(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <input
              type="number"
              min="10000"
              max="100000"
              step="1000"
              value={snowIntensity}
              onChange={(e) => setSnowIntensity(Number(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-right font-mono text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Camera Controls */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" /> View
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(['birdseye', 'driver', 'side'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setCameraView(view)}
              className={`py-2 px-1 text-xs rounded-md transition-colors ${cameraView === view
                  ? 'bg-blue-600 text-white font-medium shadow-inner'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* SIM: Barrier Configuration */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Trees className="w-4 h-4" /> SIM: Vegetation Barriers
        </h2>

        {/* Left Side */}
        <BarrierControlPanel side="left" label="West Side (Upwind)" config={barriers.left} update={updateBarrier} />

        {/* Right Side */}
        <BarrierControlPanel side="right" label="East Side (Downwind)" config={barriers.right} update={updateBarrier} />

        {/* Median */}
        <BarrierControlPanel side="median" label="Road Median" config={barriers.median} update={updateBarrier} isMedian />

      </div>
    </div>
  );
}

interface BarrierControlPanelProps {
  side: 'left' | 'right' | 'median';
  label: string;
  config: { enabled: boolean; distance: number; height: number; density: number; type: string };
  update: (side: 'left' | 'right' | 'median', config: Record<string, unknown>) => void;
  isMedian?: boolean;
}

function BarrierControlPanel({ side, label, config, update, isMedian = false }: BarrierControlPanelProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.enabled}
            onChange={(e) => update(side, { enabled: e.target.checked })}
          />
          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
          {!isMedian && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Distance from road (m)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={config.distance}
                  onChange={(e) => update(side, { distance: Number(e.target.value) })}
                  className="flex-1 accent-emerald-500"
                />
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={config.distance}
                  onChange={(e) => update(side, { distance: Number(e.target.value) })}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-right font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tree Height / Growth (m)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={config.height}
                onChange={(e) => update(side, { height: Number(e.target.value) })}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="1"
                max="15"
                step="0.5"
                value={config.height}
                onChange={(e) => update(side, { height: Number(e.target.value) })}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-right font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Density (Porosity)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={config.density}
                onChange={(e) => update(side, { density: Number(e.target.value) })}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="0.1"
                max="1"
                step="0.05"
                value={config.density}
                onChange={(e) => update(side, { density: Number(e.target.value) })}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-right font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
