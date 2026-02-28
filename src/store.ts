import { create } from 'zustand';

interface BarrierConfig {
  enabled: boolean;
  distance: number; // Distance from road center
  height: number;
  density: number; // 0 to 1
  type: 'conifer' | 'shrub' | 'fence';
}

interface SimulationMetrics {
  snowOnRoad: number;
  forwardVisibility: number;
  reverseVisibility: number;
  currentWindSpeed: number; // Fluctuating wind speed
}

interface SimulationState {
  // EVT: Wind Event Modeling
  windSpeed: number; // Mean wind speed at 10m reference height
  windDirection: number; // Degrees, 0 is along X axis, 90 is along Z axis
  terrainRoughness: number; // z0 in meters (Logarithmic wind profile)
  turbulenceIntensity: number; // Percentage (0-50%)
  snowIntensity: number;
  
  // View
  cameraView: 'driver' | 'birdseye' | 'side';
  
  // SIM: Barrier Configuration
  barriers: {
    left: BarrierConfig;
    right: BarrierConfig;
    median: BarrierConfig;
  };
  
  // EDP: Engineering Demand Parameters (Metrics)
  metrics: SimulationMetrics;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  
  // Actions
  setWindSpeed: (speed: number) => void;
  setWindDirection: (dir: number) => void;
  setTerrainRoughness: (z0: number) => void;
  setTurbulenceIntensity: (ti: number) => void;
  setSnowIntensity: (intensity: number) => void;
  setCameraView: (view: 'driver' | 'birdseye' | 'side') => void;
  updateBarrier: (side: 'left' | 'right' | 'median', config: Partial<BarrierConfig>) => void;
  setMetrics: (metrics: SimulationMetrics) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  windSpeed: 15, // m/s
  windDirection: 0, 
  terrainRoughness: 0.03, // Open terrain default
  turbulenceIntensity: 15, // 15% default TI
  snowIntensity: 50000,
  cameraView: 'birdseye',
  barriers: {
    left: { enabled: true, distance: 15, height: 8, density: 0.8, type: 'conifer' },
    right: { enabled: false, distance: 15, height: 8, density: 0.8, type: 'conifer' },
    median: { enabled: false, distance: 0, height: 2, density: 0.5, type: 'shrub' },
  },
  metrics: {
    snowOnRoad: 0,
    forwardVisibility: 100,
    reverseVisibility: 100,
    currentWindSpeed: 15,
  },
  leftPanelOpen: true,
  rightPanelOpen: true,
  setWindSpeed: (speed) => set({ windSpeed: speed }),
  setWindDirection: (dir) => set({ windDirection: dir }),
  setTerrainRoughness: (z0) => set({ terrainRoughness: z0 }),
  setTurbulenceIntensity: (ti) => set({ turbulenceIntensity: ti }),
  setSnowIntensity: (intensity) => set({ snowIntensity: intensity }),
  setCameraView: (view) => set({ cameraView: view }),
  updateBarrier: (side, config) =>
    set((state) => ({
      barriers: {
        ...state.barriers,
        [side]: { ...state.barriers[side], ...config },
      },
    })),
  setMetrics: (metrics) => set({ metrics }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
}));
