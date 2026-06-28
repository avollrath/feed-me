import { useMemo, useState } from 'react';
import { FeedGrid } from './components/FeedGrid';
import { Header } from './components/Header';
import { useFeedStore } from './store/feedStore';

function App() {
  const runtime = useFeedStore((state) => state.runtime);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loading = useMemo(() => Object.values(runtime).some((feed) => feed.loading), [runtime]);

  return (
    <div className="min-h-screen bg-feed-bg text-zinc-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} onRefreshAll={() => undefined} loading={loading} />
      {loading ? <div className="fixed left-0 top-0 z-30 h-0.5 w-full animate-pulse bg-violet-600" /> : null}
      <main>
        <FeedGrid />
      </main>
      {settingsOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSettingsOpen(false)}>
          <aside className="ml-auto h-full w-full max-w-md border-l border-feed-border bg-feed-card p-5" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;
