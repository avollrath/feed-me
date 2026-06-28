import { ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { defaultDisplayOptions } from '../store/feedStore';
import type { FeedArticle, FeedSource } from '../types';

type ArticleItemProps = {
  article: FeedArticle;
  feed: FeedSource;
  density: 'compact' | 'comfortable';
};

export function ArticleItem({ article, feed, density }: ArticleItemProps) {
  const displayOptions = { ...defaultDisplayOptions, ...feed.displayOptions };
  const showImage = feed.showImages && displayOptions.image && article.image;
  const showMeta = (displayOptions.author && article.author) || (displayOptions.time && article.pubDate) || (displayOptions.price && article.price);

  return (
    <article className={clsx('group flex min-w-0 gap-4 rounded-md border border-transparent transition hover:border-zinc-700 hover:bg-white/[0.03]', density === 'compact' ? 'p-3' : 'p-4')}>
      {showImage ? (
        <img src={article.image ?? ''} alt="" className="h-24 w-24 shrink-0 rounded-md object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : null}
      <div className="min-w-0 flex-1">
        {displayOptions.title ? (
          <a href={article.link} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-base font-semibold leading-snug text-zinc-100 hover:text-violet-300">
            <span className="line-clamp-3">{article.title}</span>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
          </a>
        ) : null}
        {showMeta ? (
          <div className={clsx('flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500', displayOptions.title ? 'mt-1' : '')}>
            {displayOptions.price && article.price ? <span className="font-semibold text-emerald-300">{article.price}</span> : null}
            {displayOptions.author && article.author ? <span className="truncate">{article.author}</span> : null}
            {displayOptions.time && article.pubDate ? <time dateTime={article.pubDate}>{relativeTime(article.pubDate)}</time> : null}
          </div>
        ) : null}
        {density === 'comfortable' && displayOptions.description && article.summary ? <p className={clsx('line-clamp-4 text-sm leading-relaxed text-zinc-400', displayOptions.title || showMeta ? 'mt-2' : '')}>{article.summary}</p> : null}
      </div>
    </article>
  );
}

function relativeTime(value: string): string {
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) {
    return '';
  }

  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}
