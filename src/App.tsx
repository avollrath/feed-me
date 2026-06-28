import { useMemo, useState } from 'react';
import { FeedGrid } from './components/FeedGrid';
import { Header } from './components/Header';
import { Settings } from './components/Settings';
import { useFeeds } from './hooks/useFeeds';
import { useFeedStore } from './store/feedStore';

function App() {
  const runtime = useFeedStore((state) => state.runtime);
  const theme = useFeedStore((state) => state.settings.theme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loading = useMemo(() => Object.values(runtime).some((feed) => feed.loading), [runtime]);
  const { refreshAll, refreshFeed } = useFeeds();

  return (
    <div className={theme === 'dark' ? 'min-h-screen bg-feed-bg text-zinc-100' : 'min-h-screen bg-zinc-100 text-zinc-950'}>
      <Header onOpenSettings={() => setSettingsOpen(true)} onRefreshAll={refreshAll} loading={loading} />
      {loading ? <div className="fixed left-0 top-0 z-30 h-0.5 w-full animate-pulse bg-violet-600" /> : null}
      <main>
        <FeedGrid onRefreshFeed={refreshFeed} />
      </main>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
