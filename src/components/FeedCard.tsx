import { AlertTriangle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { ArticleItem } from './ArticleItem';
import { useFeedStore } from '../store/feedStore';
import type { FeedSource } from '../types';

type FeedCardProps = {
  feed: FeedSource;
  columns: number;
  onRefresh: (feed: FeedSource) => void;
};

export function FeedCard({ feed, columns, onRefresh }: FeedCardProps) {
  const runtime = useFeedStore((state) => state.runtime[feed.id]);
  const density = useFeedStore((state) => state.settings.density);
  const items = runtime?.data?.items ?? [];
  const favicon = faviconUrl(runtime?.data?.link ?? feed.url);
  const lastFetched = runtime?.lastFetched ? relativeTime(runtime.lastFetched) : 'Never';

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-feed-border bg-feed-card shadow-xl shadow-black/20">
      <header className="shrink-0 border-b border-feed-border px-4 py-3" style={{ borderTop: `3px solid ${feed.accentColor}` }}>
        <div className="flex min-w-0 items-center gap-3">
          <img src={favicon} alt="" className="h-5 w-5 shrink-0 rounded-sm" loading="lazy" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-white">{feed.label}</h2>
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] font-medium text-zinc-400">{items.length}</span>
              {runtime?.stale ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">Stale</span> : null}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Updated {lastFetched}</div>
          </div>
          <button
            type="button"
            onClick={() => onRefresh(feed)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-violet-500 hover:text-white"
            aria-label={`Refresh ${feed.label}`}
            title="Refresh"
          >
            <RefreshCw className={runtime?.loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {runtime?.loading && !runtime.data ? <SkeletonList /> : null}
        {runtime?.error ? (
          <div className="m-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Feed failed
            </div>
            <p className="mt-1 text-xs text-red-200/75">{runtime.error}</p>
            <button type="button" onClick={() => onRefresh(feed)} className="mt-3 rounded-md border border-red-400/40 px-3 py-1.5 text-xs font-medium hover:bg-red-400/10">
              Retry
            </button>
          </div>
        ) : null}
        {items.length ? (
          <div className={clsx('grid gap-2', columns >= 7 ? 'xl:grid-cols-2' : 'grid-cols-1')}>
            {items.map((article) => (
              <ArticleItem key={`${article.link}-${article.title}`} article={article} feed={feed} density={density} />
            ))}
          </div>
        ) : !runtime?.loading && !runtime?.error ? (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-zinc-500">No articles loaded yet.</div>
        ) : null}
      </div>
    </section>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3 p-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-3 rounded-md p-2">
          <div className="h-16 w-16 rounded-md bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-4/5 rounded bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-800" />
            <div className="h-3 w-2/3 rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function faviconUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}/favicon.ico`;
  } catch {
    return '/favicon.svg';
  }
}

function relativeTime(value: string): string {
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) {
    return 'unknown';
  }

  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}
