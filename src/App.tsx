import { useMemo } from 'react';
import { BeatGrid } from './components/BeatGrid';
import { IntensityChart } from './components/IntensityChart';
import { ElementsPanel, ProblemsPanel, SettingsPanel, SummaryPanel } from './components/Panels';
import { Toolbar } from './components/Toolbar';
import { problems } from './model/analysis';
import { useProject } from './store';

export default function App() {
  const project = useProject();
  const issues = useMemo(() => problems(project), [project]);

  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <div className="center">
          <IntensityChart />
          <BeatGrid />
        </div>
        <aside className="sidebar">
          <ProblemsPanel problems={issues} />
          <SummaryPanel />
          <ElementsPanel />
          <SettingsPanel />
        </aside>
      </main>
    </div>
  );
}
