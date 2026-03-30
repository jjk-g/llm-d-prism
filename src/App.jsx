// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useState } from 'react';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import PrismHome from './components/PrismHome';
import Milestone1Dashboard from './components/Milestone1Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'inference-scheduling' | 'advanced'

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  return (
    <ErrorBoundary>
      {currentView === 'home' && <PrismHome onNavigate={handleNavigate} />}
      {currentView === 'inference-scheduling' && <Milestone1Dashboard onNavigateBack={() => handleNavigate('home')} onNavigate={handleNavigate} />}
      {currentView === 'advanced' && <Dashboard onNavigateBack={() => handleNavigate('home')} />}
      {currentView === 'pd-disaggregation' && <div className="p-8 text-center text-slate-400">P/D Disaggregation Coming Soon... <button onClick={() => handleNavigate('home')} className="underline">Back</button></div>}
      {currentView === 'wide-ep' && <div className="p-8 text-center text-slate-400">Wide-EP Coming Soon... <button onClick={() => handleNavigate('home')} className="underline">Back</button></div>}
    </ErrorBoundary>
  );
}

export default App;

