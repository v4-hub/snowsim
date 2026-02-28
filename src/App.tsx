import React from 'react';
import Simulation from './components/Simulation';
import UIOverlay from './components/UIOverlay';
import MonitorPanel from './components/MonitorPanel';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      <Simulation />
      <UIOverlay />
      <MonitorPanel />
    </div>
  );
}

