import { RefreshCw, Settings } from 'lucide-react';

type HeaderProps = {
  onOpenSettings: () => void;
  onRefreshAll: () => void;
  loading: boolean;
};

export function Header({ onOpenSettings, onRefreshAll, loading }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-feed-border bg-feed-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-normal text-white">Feed Me</h1>
          <p className="text-xs text-zinc-500">Local RSS dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshAll}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-feed-border px-3 text-sm font-medium text-zinc-200 transition hover:border-violet-500 hover:text-white"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="hidden sm:inline">Refresh All</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-feed-border text-zinc-200 transition hover:border-violet-500 hover:text-white"
            aria-label="Open settings"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
