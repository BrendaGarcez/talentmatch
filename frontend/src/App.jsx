import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import VagasPage from './pages/VagasPage';
import DashboardVagaPage from './pages/DashboardVagaPage';
import { Network } from 'lucide-react';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans">
        {/* Header clean */}
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-6 py-3.5 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-scifi_red p-2 rounded-lg shadow-red-sm">
                <Network className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-wide text-gray-900">
                MM<span className="text-scifi_red">match</span>
              </h1>
            </Link>
            {/*<div className="flex gap-4 items-center">
              <span className="text-xs font-semibold tracking-widest uppercase text-scifi_red bg-scifi_red_light border border-scifi_red/20 px-3 py-1.5 rounded-full">
                AI Pipeline Active
              </span>
            </div>*/}
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto">
          <Routes>
            <Route path="/" element={<VagasPage />} />
            <Route path="/vaga/:id" element={<DashboardVagaPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;